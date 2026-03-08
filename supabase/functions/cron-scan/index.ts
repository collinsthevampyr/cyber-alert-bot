import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Check if an alert should be suppressed based on active suppression rules
async function checkSuppression(supabase: any, userId: string, toolName: string, threat: any): Promise<boolean> {
  const { data: rules } = await supabase
    .from("suppression_rules")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!rules?.length) return false;

  const now = new Date();

  for (const rule of rules) {
    // Skip expired rules
    if (rule.expires_at && new Date(rule.expires_at) < now) continue;

    const conditions = rule.conditions as any;
    if (!conditions) continue;

    let matches = true;

    // Check tool_name condition
    if (conditions.tool_name && conditions.tool_name.toLowerCase() !== toolName.toLowerCase()) {
      matches = false;
    }

    // Check severity condition
    if (conditions.severity && threat.severity && conditions.severity.toLowerCase() !== threat.severity.toLowerCase()) {
      matches = false;
    }

    // Check keyword condition (substring match in summary)
    if (conditions.keyword && threat.summary && !threat.summary.toLowerCase().includes(conditions.keyword.toLowerCase())) {
      matches = false;
    }

    if (matches) return true;
  }

  return false;
}

// Maps frequency config to minutes
const FREQUENCY_MINUTES: Record<string, number> = {
  "15min": 15,
  "30min": 30,
  "hourly": 60,
  "6hours": 360,
  "daily": 1440,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    console.log("⏰ Cron scan triggered at", new Date().toISOString());

    // Get all active monitoring configs
    const { data: configs, error: configError } = await supabase
      .from("monitoring_config")
      .select("*")
      .eq("is_active", true);

    if (configError || !configs?.length) {
      console.log("No active monitoring configs found.");
      return new Response(JSON.stringify({ message: "No active configs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalScanned = 0;
    let totalAlerts = 0;

    for (const config of configs) {
      // Check if this user is due for a scan based on their frequency
      const freqMinutes = FREQUENCY_MINUTES[config.scan_frequency] || 60;
      const cutoff = new Date(Date.now() - freqMinutes * 60 * 1000).toISOString();

      // Check last scan time for this user
      const { data: lastScans } = await supabase
        .from("scan_history")
        .select("scan_started_at")
        .eq("user_id", config.user_id)
        .order("scan_started_at", { ascending: false })
        .limit(1);

      if (lastScans?.length && lastScans[0].scan_started_at > cutoff) {
        console.log(`Skipping user ${config.user_id} — last scan within ${freqMinutes}min window`);
        continue;
      }

      if (!config.tools_list?.length) {
        console.log(`Skipping user ${config.user_id} — no tools configured`);
        continue;
      }

      console.log(`🔍 Scanning for user ${config.user_id} (${config.tools_list.length} tools, freq: ${config.scan_frequency})`);

      // Create scan record
      const { data: scan, error: scanError } = await supabase
        .from("scan_history")
        .insert({ user_id: config.user_id, status: "running", alerts_found: 0 })
        .select()
        .single();

      if (scanError || !scan) {
        console.error(`Failed to create scan for user ${config.user_id}:`, scanError);
        continue;
      }

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
                  content: `You are a cybersecurity threat analyst. Analyze recent security threats, vulnerabilities, and breaches related to specific technologies. 
Return ONLY valid JSON in this exact format (no markdown, no backticks):
{
  "hasThreats": boolean,
  "threats": [
    {
      "severity": "Critical" | "High" | "Medium" | "Low",
      "summary": "Brief description of the threat (max 200 chars)",
      "source": "https://example.com/source"
    }
  ]
}
If no recent threats found, return: {"hasThreats": false, "threats": []}`,
                },
                {
                  role: "user",
                  content: `Search for recent cybersecurity threats, vulnerabilities, CVEs, and security advisories related to: ${tool}. Focus on threats from the last 7 days. If none, set hasThreats to false.`,
                },
              ],
            }),
          });

          if (!aiResponse.ok) {
            console.error(`AI failed for ${tool}:`, await aiResponse.text());
            continue;
          }

          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (!content) continue;

          let result;
          try {
            const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            result = JSON.parse(clean);
          } catch {
            console.error(`Parse error for ${tool}`);
            continue;
          }

          if (result.hasThreats && result.threats?.length) {
            for (const threat of result.threats) {
              // Check suppression rules before inserting
              const shouldSuppress = await checkSuppression(supabase, config.user_id, tool, threat);
              if (shouldSuppress) {
                console.log(`Suppressed alert for ${tool}: ${threat.summary?.substring(0, 50)}`);
                continue;
              }

              // Check for duplicate alerts (same tool + similar summary in last 24h)
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              const { data: existing } = await supabase
                .from("alerts")
                .select("id")
                .eq("user_id", config.user_id)
                .eq("tool_name", tool)
                .eq("summary", (threat.summary || "Security threat detected").substring(0, 200))
                .gte("detected_at", oneDayAgo)
                .limit(1);

              if (existing?.length) {
                console.log(`Duplicate suppressed for ${tool}: ${threat.summary?.substring(0, 50)}`);
                continue;
              }

              const { data: alert, error: alertErr } = await supabase
                .from("alerts")
                .insert({
                  user_id: config.user_id,
                  scan_id: scan.id,
                  tool_name: tool,
                  severity: threat.severity || "Medium",
                  summary: threat.summary || "Security threat detected",
                  source_url: threat.source || null,
                })
                .select()
                .single();

              if (!alertErr && alert) alerts.push(alert);
            }
          }
        } catch (err) {
          console.error(`Error scanning ${tool}:`, err);
        }
      }

      // Update scan record
      await supabase.from("scan_history").update({
        status: "completed",
        scan_completed_at: new Date().toISOString(),
        alerts_found: alerts.length,
      }).eq("id", scan.id);

      // Auto-correlate alerts into incidents
      if (alerts.length >= 2) {
        await autoCorrelateAlerts(supabase, config.user_id, alerts);
      }

      // Send notifications if alerts found
      if (alerts.length > 0) {
        const { data: channels } = await supabase
          .from("notification_channels")
          .select("*")
          .eq("user_id", config.user_id)
          .eq("is_active", true);

        if (channels?.length) {
          for (const alert of alerts) {
            for (const ch of channels) {
              try {
                const cfg = ch.config as any;
                const msg = `🔔 *Auto-Scan Alert*\n*Tool:* ${alert.tool_name}\n*Severity:* ${alert.severity}\n*Summary:* ${alert.summary}`;

                if (ch.channel_type === "slack" && cfg.webhook_url) {
                  await fetch(cfg.webhook_url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: msg }),
                  });
                } else if (ch.channel_type === "discord" && cfg.webhook_url) {
                  await fetch(cfg.webhook_url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: msg }),
                  });
                }
              } catch (chErr) {
                console.error(`Notification error:`, chErr);
              }
            }
          }
        }

        // Legacy slack webhook
        if (config.slack_webhook_url) {
          for (const alert of alerts) {
            try {
              await fetch(config.slack_webhook_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: `🔔 *Auto-Scan Alert*\n*Tool:* ${alert.tool_name}\n*Severity:* ${alert.severity}\n*Summary:* ${alert.summary}`,
                }),
              });
            } catch {}
          }
        }
      }

      totalScanned++;
      totalAlerts += alerts.length;
      console.log(`✅ User ${config.user_id}: ${alerts.length} alerts`);
    }

    // Run escalation checks and SIEM ingestion
    try {
      const baseUrl = Deno.env.get("SUPABASE_URL");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` };

      await Promise.all([
        fetch(`${baseUrl}/functions/v1/check-escalations`, { method: "POST", headers }),
        fetch(`${baseUrl}/functions/v1/siem-ingest`, { method: "POST", headers }),
      ]);
      console.log("Escalation + SIEM ingest triggered.");
    } catch (e) {
      console.error("Post-scan triggers failed:", e);
    }

    const summary = `Cron complete: ${totalScanned} users scanned, ${totalAlerts} alerts generated.`;
    console.log(summary);

    return new Response(JSON.stringify({ success: true, message: summary, scanned: totalScanned, alerts: totalAlerts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cron scan error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
