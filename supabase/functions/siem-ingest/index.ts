import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authenticatedUserId = claimsData.claims.sub as string;
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🔄 SIEM ingestion triggered at", new Date().toISOString());

    // Get active SIEM integrations (scoped to user if manual test)
    let query = supabase.from("siem_integrations").select("*").eq("is_active", true);
    if (authenticatedUserId) {
      query = query.eq("user_id", authenticatedUserId);
    }
    const { data: integrations, error } = await query;

    if (error || !integrations?.length) {
      return new Response(JSON.stringify({ message: "No active SIEM integrations" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalIngested = 0;

    for (const integration of integrations) {
      const config = integration.config as any;
      if (!config?.endpoint) {
        console.log(`Skipping ${integration.name}: no endpoint configured`);
        continue;
      }

      if (!isSafeExternalUrl(config.endpoint)) {
        console.log(`Skipping ${integration.name}: unsafe endpoint URL blocked`);
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
            // Wazuh supports two modes:
            // 1. Manager API (port 55000): authenticate + fetch via API
            // 2. Indexer API (port 9200, OpenSearch): query wazuh-alerts-* index directly
            const baseUrl = config.endpoint.replace(/\/+$/, "");
            const indexerMode = config.indexer_url ? true : false;
            const indexerUrl = (config.indexer_url || "").replace(/\/+$/, "");

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

                const idxResp = await fetch(`${indexerUrl}/wazuh-alerts-*/_search`, {
                  method: "POST",
                  headers: idxHeaders,
                  body: JSON.stringify(searchBody),
                });

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
                  console.error(`Wazuh Indexer error for ${integration.name}: ${idxResp.status}`, body);
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
                  const authResp = await fetch(authUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Basic ${config.api_key || ""}`,
                    },
                  });

                  if (authResp.ok) {
                    const authData = await authResp.json();
                    wazuhToken = authData.data?.token || authData.token || (typeof authData === "string" ? authData : null);
                    if (wazuhToken) {
                      console.log(`Wazuh auth succeeded for ${integration.name}`);
                      break;
                    }
                  } else {
                    const body = await authResp.text();
                    console.error(`Wazuh auth ${authResp.status} at ${authUrl}:`, body);
                  }
                }

                if (!wazuhToken) {
                  console.error(`Wazuh: could not authenticate for ${integration.name}. Ensure the endpoint is your Wazuh Manager API URL (e.g. https://your-wazuh:55000). If you use Wazuh Indexer, add the Indexer URL in the config.`);
                  break;
                }

                // Step 2: Fetch recent alerts via Manager API
                // Wazuh Manager doesn't have /alerts endpoint; use /vulnerability or /manager/logs
                // The best option is /manager/logs or /agents summary
                const summaryResp = await fetch(`${baseUrl}/overview/agents`, {
                  headers: { Authorization: `Bearer ${wazuhToken}` },
                });
                if (summaryResp.ok) {
                  const summaryData = await summaryResp.json();
                  console.log(`Wazuh Manager overview: ${JSON.stringify(summaryData.data?.affected_items?.length || 0)} items`);
                }
                // Consume response
                if (!summaryResp.ok) await summaryResp.text();

                // Try fetching syscheck / rootcheck results as "alerts"
                const logResp = await fetch(`${baseUrl}/manager/logs?limit=50&sort=-timestamp`, {
                  headers: { Authorization: `Bearer ${wazuhToken}` },
                });
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
              console.error(`Wazuh error for ${integration.name}:`, wErr);
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
          }
        }

        // Update last_sync_at
        await supabase.from("siem_integrations").update({
          last_sync_at: new Date().toISOString(),
        }).eq("id", integration.id);

        console.log(`✅ ${integration.name}: ${events.length} events fetched, ${totalIngested} ingested`);
      } catch (err) {
        console.error(`Error ingesting from ${integration.name}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, ingested: totalIngested }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SIEM ingest error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
