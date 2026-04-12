import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const BodySchema = z.object({
  integrationId: z.string().uuid().optional(),
});

type IntegrationResult = {
  integrationId: string;
  name: string;
  siemType: string;
  fetched: number;
  ingested: number;
  ok: boolean;
  error?: string;
  diagnostics?: {
    mode?: "indexer" | "manager";
    endpointHost?: string;
    indexerHost?: string;
  };
};

function respond(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: jsonHeaders,
  });
}

async function parseBody(req: Request) {
  if (req.method !== "POST") return {};
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};

  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000, skipTls = false): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions: any = { ...init, signal: controller.signal };

  // Use Deno.createHttpClient to skip TLS verification for self-signed certs
  if (skipTls && typeof (Deno as any).createHttpClient === "function") {
    try {
      const httpClient = (Deno as any).createHttpClient({ caCerts: [], certErrors: false });
      fetchOptions.client = httpClient;
      console.log(`Using Deno HTTP client with TLS verification disabled for: ${url}`);
    } catch (e) {
      console.warn("Could not create custom HTTP client, falling back to default:", e);
    }
  }

  try {
    return await fetch(url, fetchOptions);
  } catch (err) {
    // If TLS still fails and skip_tls enabled, try HTTP as last resort
    if (skipTls && url.startsWith("https://")) {
      const httpUrl = url.replace(/^https:\/\//, "http://");
      console.log(`HTTPS failed with skip_tls, trying HTTP fallback: ${httpUrl}`);
      clearTimeout(timeoutId);
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), timeoutMs);
      try {
        return await fetch(httpUrl, { ...init, signal: controller2.signal });
      } finally {
        clearTimeout(timeoutId2);
      }
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getHost(value?: string) {
  if (!value) return undefined;

  try {
    return new URL(value).host;
  } catch {
    return undefined;
  }
}

function parseJsonOrText<T = any>(text: string): T | string | null {
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out";
  }

  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function formatWazuhError(error: unknown, mode: "indexer" | "manager") {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes("timed out")) {
    return mode === "indexer"
      ? "Could not reach the Wazuh Indexer URL from Lovable Cloud. Check that port 9200 is publicly reachable."
      : "Could not reach the Wazuh Manager API from Lovable Cloud. Check that the API URL and port are publicly reachable.";
  }

  return message;
}

function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.)/.test(host)) return false;
    if (['localhost', 'metadata.google.internal', '[::1]'].includes(host)) return false;
    return true;
  } catch { return false; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await parseBody(req);
    const parsedBody = BodySchema.safeParse(rawBody ?? {});

    if (!parsedBody.success) {
      return respond({
        ok: false,
        error: "Invalid request payload",
        details: parsedBody.error.flatten(),
      });
    }

    const { integrationId } = parsedBody.data;

    // Authenticate: accept CRON_SECRET or valid user JWT
    const CRON_SECRET = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;

    if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
      // Cron/scheduled call - proceed with service role
    } else if (authHeader?.startsWith("Bearer ")) {
      // Try user JWT auth (for manual "Test" button calls)
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        return respond({
          ok: false,
          error: "Unauthorized",
        });
      }
      authenticatedUserId = claimsData.claims.sub as string;
    } else {
      return respond({
        ok: false,
        error: "Unauthorized",
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🔄 SIEM ingestion triggered at", new Date().toISOString());

    // Get SIEM integrations (manual tests can target a single integration even if inactive)
    let query = supabase.from("siem_integrations").select("*");
    if (authenticatedUserId) {
      query = query.eq("user_id", authenticatedUserId);
    }
    if (integrationId) {
      query = query.eq("id", integrationId);
    } else {
      query = query.eq("is_active", true);
    }
    const { data: integrations, error } = await query;

    if (error || !integrations?.length) {
      return respond({
        ok: false,
        error: integrationId ? "Integration not found" : "No active SIEM integrations",
        ingested: 0,
        results: [],
      });
    }

    let totalIngested = 0;
    const results: IntegrationResult[] = [];

    for (const integration of integrations) {
      const config = integration.config as any;
      const result: IntegrationResult = {
        integrationId: integration.id,
        name: integration.name,
        siemType: integration.siem_type,
        fetched: 0,
        ingested: 0,
        ok: true,
      };

      if (!config?.endpoint) {
        console.log(`Skipping ${integration.name}: no endpoint configured`);
        result.ok = false;
        result.error = "No endpoint configured";
        results.push(result);
        continue;
      }

      if (!isSafeExternalUrl(config.endpoint)) {
        console.log(`Skipping ${integration.name}: unsafe endpoint URL blocked`);
        result.ok = false;
        result.error = "Endpoint URL is blocked for security reasons";
        results.push(result);
        continue;
      }

      try {
        let events: any[] = [];

        switch (integration.siem_type) {
          case "splunk": {
            // Splunk REST API - search for recent security events
            const searchQuery = "search index=main sourcetype=syslog earliest=-15m | head 100";
            const resp = await fetch(`${config.endpoint}/services/search/jobs/export`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${config.api_key || ""}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: `search=${encodeURIComponent(searchQuery)}&output_mode=json`,
            });
            if (resp.ok) {
              const text = await resp.text();
              // Splunk returns newline-delimited JSON
              events = text.trim().split("\n").filter(Boolean).map(line => {
                try { return JSON.parse(line); } catch { return null; }
              }).filter(Boolean);
            } else {
              console.error(`Splunk error for ${integration.name}: ${resp.status}`);
            }
            break;
          }

          case "sentinel": {
            // Microsoft Sentinel - Log Analytics query
            const query = "SecurityAlert | where TimeGenerated > ago(15m) | take 100";
            const resp = await fetch(`${config.endpoint}/query`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${config.api_key || ""}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ query }),
            });
            if (resp.ok) {
              const data = await resp.json();
              events = data.tables?.[0]?.rows?.map((row: any[], i: number) => ({
                _raw: JSON.stringify(row),
                severity: row[4] || "Medium",
                summary: row[2] || `Sentinel alert #${i}`,
              })) || [];
            } else {
              console.error(`Sentinel error for ${integration.name}: ${resp.status}`);
            }
            break;
          }

          case "elastic": {
            // Elastic SIEM - search recent alerts
            const resp = await fetch(`${config.endpoint}/.siem-signals-*/_search`, {
              method: "POST",
              headers: {
                Authorization: config.api_key ? `ApiKey ${config.api_key}` : "",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: { range: { "@timestamp": { gte: "now-15m" } } },
                size: 100,
              }),
            });
            if (resp.ok) {
              const data = await resp.json();
              events = data.hits?.hits?.map((hit: any) => hit._source) || [];
            } else {
              console.error(`Elastic error for ${integration.name}: ${resp.status}`);
            }
            break;
          }

          case "qradar": {
            // QRadar - AQL search
            const aql = "SELECT * FROM events WHERE INOFFENSE(offense_id) LAST 15 MINUTES LIMIT 100";
            const resp = await fetch(`${config.endpoint}/api/ariel/searches`, {
              method: "POST",
              headers: {
                SEC: config.api_key || "",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ query_expression: aql }),
            });
            if (resp.ok) {
              const data = await resp.json();
              events = data.events || [];
            } else {
              console.error(`QRadar error for ${integration.name}: ${resp.status}`);
            }
            break;
          }

          case "chronicle": {
            // Google Chronicle - UDM search
            const resp = await fetch(`${config.endpoint}/v2/detect/rules:search`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${config.api_key || ""}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ time_range: { start_time: new Date(Date.now() - 15 * 60 * 1000).toISOString(), end_time: new Date().toISOString() } }),
            });
            if (resp.ok) {
              const data = await resp.json();
              events = data.detections || [];
            } else {
              console.error(`Chronicle error for ${integration.name}: ${resp.status}`);
            }
            break;
          }

          case "wazuh": {
            const baseUrl = config.endpoint.replace(/\/+$/, "");
            const indexerUrl = (config.indexer_url || "").replace(/\/+$/, "");
            const wazuhMode: "indexer" | "manager" = indexerUrl ? "indexer" : "manager";
            const skipTls = !!config.skip_tls_verify;
            result.diagnostics = {
              mode: wazuhMode,
              endpointHost: getHost(baseUrl),
              indexerHost: getHost(indexerUrl),
            };

            try {
              if (indexerUrl) {
                // --- Wazuh Indexer (OpenSearch) mode ---
                console.log(`Wazuh Indexer mode for ${integration.name}: ${indexerUrl}`);
                const timeRange = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const searchBody = {
                  query: {
                    bool: {
                      must: [
                        { range: { "timestamp": { gte: timeRange } } }
                      ]
                    }
                  },
                  size: 50,
                  sort: [{ "timestamp": { order: "desc" } }]
                };

                const idxHeaders: Record<string, string> = {
                  "Content-Type": "application/json",
                };
                if (config.api_key) {
                  idxHeaders["Authorization"] = `Basic ${config.api_key}`;
                }

                const idxResp = await fetchWithTimeout(`${indexerUrl}/wazuh-alerts-*/_search`, {
                  method: "POST",
                  headers: idxHeaders,
                  body: JSON.stringify(searchBody),
                }, 8000, skipTls);

                if (idxResp.ok) {
                  const idxData = await idxResp.json();
                  const hits = idxData.hits?.hits || [];
                  console.log(`Wazuh Indexer: ${hits.length} hits returned`);
                  events = hits.map((hit: any) => {
                    const src = hit._source || {};
                    return {
                      summary: src.rule?.description || src.full_log?.substring(0, 200) || "Wazuh alert",
                      severity: mapWazuhLevel(src.rule?.level || 0),
                      _raw: JSON.stringify(src),
                    };
                  });
                } else {
                  const body = await idxResp.text();
                  throw new Error(`Indexer request failed with ${idxResp.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
                }
              } else {
                // --- Wazuh Manager API mode ---
                // Step 1: Authenticate to get JWT token
                // Try common API paths
                let wazuhToken: string | null = null;
                const authPaths = [
                  `${baseUrl}/security/user/authenticate`,
                  `${baseUrl}/security/user/authenticate?raw=true`,
                ];

                for (const authUrl of authPaths) {
                  console.log(`Trying Wazuh auth: ${authUrl}`);
                  const authResp = await fetchWithTimeout(authUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Basic ${config.api_key || ""}`,
                    },
                  }, 8000, skipTls);

                  const authText = await authResp.text();

                  if (authResp.ok) {
                    const authData = parseJsonOrText<{ data?: { token?: string }; token?: string }>(authText);
                    wazuhToken = typeof authData === "string"
                      ? authData.replace(/^"|"$/g, "").trim()
                      : authData?.data?.token || authData?.token || null;

                    if (wazuhToken) {
                      console.log(`Wazuh auth succeeded for ${integration.name}`);
                      break;
                    }
                  } else {
                    console.error(`Wazuh auth ${authResp.status} at ${authUrl}:`, authText);
                  }
                }

                if (!wazuhToken) {
                  throw new Error("Could not authenticate with the Wazuh Manager API. Verify the manager URL, username, and password.");
                }

                // Step 2: Fetch recent alerts via Manager API
                // Wazuh Manager doesn't have /alerts endpoint; use /vulnerability or /manager/logs
                // The best option is /manager/logs or /agents summary
                const summaryResp = await fetchWithTimeout(`${baseUrl}/overview/agents`, {
                  headers: { Authorization: `Bearer ${wazuhToken}` },
                }, 8000, skipTls);
                if (summaryResp.ok) {
                  const summaryData = await summaryResp.json();
                  console.log(`Wazuh Manager overview: ${JSON.stringify(summaryData.data?.affected_items?.length || 0)} items`);
                }
                // Consume response
                if (!summaryResp.ok) await summaryResp.text();

                // Try fetching syscheck / rootcheck results as "alerts"
                const logResp = await fetchWithTimeout(`${baseUrl}/manager/logs?limit=50&sort=-timestamp`, {
                  headers: { Authorization: `Bearer ${wazuhToken}` },
                }, 8000, skipTls);
                if (logResp.ok) {
                  const logData = await logResp.json();
                  events = (logData.data?.affected_items || []).map((item: any) => ({
                    summary: item.description || item.tag || "Wazuh manager log",
                    severity: mapWazuhLevel(item.level ? parseInt(item.level) : 3),
                    _raw: JSON.stringify(item),
                  }));
                  console.log(`Wazuh Manager logs: ${events.length} events`);
                } else {
                  console.error(`Wazuh Manager logs error: ${logResp.status}`);
                  await logResp.text();
                }
              }
            } catch (wErr) {
              throw new Error(formatWazuhError(wErr, wazuhMode));
            }
            break;
          }

          case "custom": {
            // Custom syslog/webhook - just fetch the endpoint
            const resp = await fetch(config.endpoint, {
              method: "GET",
              headers: config.api_key ? { Authorization: `Bearer ${config.api_key}` } : {},
            });
            if (resp.ok) {
              const data = await resp.json();
              events = Array.isArray(data) ? data : data.events || data.logs || [data];
            } else {
              console.error(`Custom SIEM error for ${integration.name}: ${resp.status}`);
            }
            break;
          }
        }

        result.fetched = events.length;

        // Convert SIEM events to alerts
        if (events.length > 0) {
          for (const event of events.slice(0, 50)) { // cap at 50 per integration per cycle
            const summary = event.summary || event.message || event._raw?.substring(0, 200) || "SIEM event ingested";
            const severity = mapSeverity(event.severity || event.risk_level || "medium");

            // Check for duplicates (same summary + tool within last hour)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { data: existing } = await supabase
              .from("alerts")
              .select("id")
              .eq("user_id", integration.user_id)
              .eq("tool_name", `SIEM:${integration.name}`)
              .eq("summary", summary.substring(0, 200))
              .gte("detected_at", oneHourAgo)
              .limit(1);

            if (existing?.length) continue; // skip duplicate

            await supabase.from("alerts").insert({
              user_id: integration.user_id,
              tool_name: `SIEM:${integration.name}`,
              severity,
              summary: summary.substring(0, 200),
              source_url: config.endpoint,
            });
            totalIngested++;
            result.ingested++;
          }
        }

        // Update last_sync_at
        await supabase.from("siem_integrations").update({
          last_sync_at: new Date().toISOString(),
        }).eq("id", integration.id);

        console.log(`✅ ${integration.name}: ${events.length} events fetched, ${result.ingested} ingested`);
        results.push(result);
      } catch (err) {
        console.error(`Error ingesting from ${integration.name}:`, err);
        result.ok = false;
        result.error = getErrorMessage(err);
        results.push(result);
      }
    }

    const failedResults = results.filter((item) => !item.ok);

    return respond({
      ok: failedResults.length === 0,
      ingested: totalIngested,
      error: failedResults[0]?.error,
      results,
    });
  } catch (error) {
    console.error("SIEM ingest error:", error);
    return respond({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

function mapSeverity(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("crit") || lower === "10" || lower === "fatal") return "Critical";
  if (lower.includes("high") || lower === "8" || lower === "9") return "High";
  if (lower.includes("med") || lower === "5" || lower === "6" || lower === "7") return "Medium";
  return "Low";
}

function mapWazuhLevel(level: number): string {
  if (level >= 12) return "Critical";
  if (level >= 8) return "High";
  if (level >= 4) return "Medium";
  return "Low";
}
