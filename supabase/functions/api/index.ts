import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function authenticateRequest(req: Request): Promise<string | null> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return null;

  const { data, error } = await supabaseAdmin.rpc("validate_api_key", { p_api_key: apiKey });
  if (error || !data) return null;

  // Touch the key to update last_used_at (fire and forget)
  supabaseAdmin.rpc("touch_api_key", { p_api_key: apiKey }).then(() => {});

  return data;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await authenticateRequest(req);
    if (!userId) {
      return errorResponse("Invalid or missing API key. Include x-api-key header.", 401);
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Path: /api/<resource>[/<id>]
    // After edge function routing, path starts after function name
    const resource = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];
    const resourceId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

    // Simple path matching from the end of the URL
    const path = url.pathname;

    // ===== ALERTS =====
    if (path.endsWith("/alerts") && req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const severity = url.searchParams.get("severity");
      const toolName = url.searchParams.get("tool_name");

      let query = supabaseAdmin
        .from("alerts")
        .select("*")
        .eq("user_id", userId)
        .order("detected_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (severity) query = query.eq("severity", severity);
      if (toolName) query = query.eq("tool_name", toolName);

      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ alerts: data, count: data?.length || 0 });
    }

    // ===== ALERT ANALYSIS =====
    if (path.includes("/alerts/") && path.endsWith("/analyze") && req.method === "POST") {
      const parts = path.split("/");
      const alertIdx = parts.indexOf("alerts");
      const alertId = parts[alertIdx + 1];

      // Call analyze-alert edge function
      const analyzeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-alert`;
      const resp = await fetch(analyzeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": req.headers.get("x-api-key") || "",
        },
        body: JSON.stringify({ alertId }),
      });

      const data = await resp.json();
      return jsonResponse(data, resp.status);
    }

    // ===== SCANS =====
    if (path.endsWith("/scans") && req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const { data, error } = await supabaseAdmin
        .from("scan_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ scans: data });
    }

    if (path.endsWith("/scans/trigger") && req.method === "POST") {
      // Trigger a new scan by calling scan-threats function
      const scanFnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/scan-threats`;
      
      // Get the user's JWT-like auth - we'll use service role to create scan directly
      const { data: config } = await supabaseAdmin
        .from("monitoring_config")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!config) {
        return errorResponse("No monitoring configuration found. Configure tools first.", 404);
      }

      if (!config.is_active || config.tools_list.length === 0) {
        return errorResponse("Monitoring is not active or no tools configured.", 400);
      }

      // Create scan record
      const { data: scan, error: scanError } = await supabaseAdmin
        .from("scan_history")
        .insert({ user_id: userId, status: "running", alerts_found: 0 })
        .select()
        .single();

      if (scanError) return errorResponse("Failed to create scan", 500);

      // Process tools with AI (same logic as scan-threats)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const alerts: any[] = [];

      for (const tool of config.tools_list) {
        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `You are a cybersecurity threat analyst. Return ONLY valid JSON: {"hasThreats": boolean, "threats": [{"severity": "Critical"|"High"|"Medium"|"Low", "summary": "max 200 chars", "source": "url"}]}`,
                },
                {
                  role: "user",
                  content: `Recent cybersecurity threats for: ${tool}. Focus on CVEs, breaches, patches, zero-days from the last 7 days.`,
                },
              ],
            }),
          });

          if (!aiResponse.ok) continue;
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (!content) continue;

          const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const result = JSON.parse(cleanContent);

          if (result.hasThreats && result.threats?.length > 0) {
            for (const threat of result.threats) {
              const { data: alert } = await supabaseAdmin
                .from("alerts")
                .insert({
                  user_id: userId,
                  scan_id: scan.id,
                  tool_name: tool,
                  severity: threat.severity || "Medium",
                  summary: threat.summary || "Security threat detected",
                  source_url: threat.source || null,
                  sent_to_slack: false,
                })
                .select()
                .single();
              if (alert) alerts.push(alert);
            }
          }
        } catch (e) {
          console.error(`Error analyzing ${tool}:`, e);
        }
      }

      await supabaseAdmin
        .from("scan_history")
        .update({ status: "completed", scan_completed_at: new Date().toISOString(), alerts_found: alerts.length })
        .eq("id", scan.id);

      // Trigger webhooks for new alerts
      if (alerts.length > 0) {
        const { data: webhooks } = await supabaseAdmin
          .from("webhooks")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true);

        if (webhooks) {
          for (const webhook of webhooks) {
            if (webhook.events.includes("alert.created")) {
              try {
                await fetch(webhook.url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event: "alert.created",
                    scan_id: scan.id,
                    alerts,
                    timestamp: new Date().toISOString(),
                  }),
                });
                await supabaseAdmin.from("webhooks").update({ last_triggered_at: new Date().toISOString() }).eq("id", webhook.id);
              } catch (e) {
                console.error("Webhook delivery failed:", e);
              }
            }
          }
        }
      }

      return jsonResponse({ success: true, scan_id: scan.id, alerts_found: alerts.length, alerts });
    }

    // ===== CONFIG =====
    if (path.endsWith("/config") && req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("monitoring_config")
        .select("id, tools_list, scan_frequency, is_active, created_at, updated_at")
        .eq("user_id", userId)
        .single();

      if (error) return errorResponse("No configuration found", 404);
      return jsonResponse({ config: data });
    }

    if (path.endsWith("/config") && req.method === "PUT") {
      const body = await req.json();
      const { tools_list, scan_frequency, is_active } = body;

      const updateData: any = {};
      if (tools_list !== undefined) {
        if (!Array.isArray(tools_list)) return errorResponse("tools_list must be an array");
        if (tools_list.length > 50) return errorResponse("Maximum 50 tools allowed");
        for (const t of tools_list) {
          if (typeof t !== "string" || t.length > 100) return errorResponse("Invalid tool name");
        }
        updateData.tools_list = tools_list;
      }
      if (scan_frequency !== undefined) {
        if (!["15min", "hourly", "daily"].includes(scan_frequency)) {
          return errorResponse("Invalid frequency. Use: 15min, hourly, daily");
        }
        updateData.scan_frequency = scan_frequency;
      }
      if (is_active !== undefined) updateData.is_active = !!is_active;

      const { data, error } = await supabaseAdmin
        .from("monitoring_config")
        .upsert({ user_id: userId, ...updateData })
        .select("id, tools_list, scan_frequency, is_active")
        .single();

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ config: data });
    }

    // ===== WEBHOOKS =====
    if (path.endsWith("/webhooks") && req.method === "GET") {
      const { data } = await supabaseAdmin
        .from("webhooks")
        .select("id, name, url, events, is_active, last_triggered_at, created_at")
        .eq("user_id", userId);
      return jsonResponse({ webhooks: data || [] });
    }

    if (path.endsWith("/webhooks") && req.method === "POST") {
      const body = await req.json();
      if (!body.url) return errorResponse("url is required");

      const { data, error } = await supabaseAdmin
        .from("webhooks")
        .insert({
          user_id: userId,
          url: body.url,
          name: body.name || "n8n Webhook",
          events: body.events || ["alert.created"],
          is_active: true,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ webhook: data }, 201);
    }

    if (path.includes("/webhooks/") && req.method === "DELETE") {
      const id = pathParts[pathParts.length - 1];
      const { error } = await supabaseAdmin
        .from("webhooks")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ success: true });
    }

    // ===== NOTIFICATION CHANNELS =====
    if (path.endsWith("/notification-channels") && req.method === "GET") {
      const { data } = await supabaseAdmin
        .from("notification_channels")
        .select("id, channel_type, name, is_active, created_at")
        .eq("user_id", userId);
      return jsonResponse({ channels: data || [] });
    }

    // ===== SEND ALERT TO CHANNELS =====
    if (path.includes("/alerts/") && path.endsWith("/send") && req.method === "POST") {
      const parts = path.split("/");
      const alertIdx = parts.indexOf("alerts");
      const alertId = parts[alertIdx + 1];

      const sendUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`;
      const resp = await fetch(sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": req.headers.get("x-api-key") || "",
        },
        body: JSON.stringify({ alertId }),
      });
      const data = await resp.json();
      return jsonResponse(data, resp.status);
    }

    return errorResponse("Not found. Available endpoints: /alerts, /alerts/:id/analyze, /alerts/:id/send, /scans, /scans/trigger, /config, /webhooks, /notification-channels", 404);
  } catch (error) {
    console.error("API error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});
