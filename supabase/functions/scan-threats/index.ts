import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("Starting threat scan for authenticated user:", userId);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user's monitoring config
    const { data: config, error: configError } = await supabaseClient
      .from("monitoring_config")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (configError || !config) {
      console.error("Config error:", configError);
      return new Response(
        JSON.stringify({ error: "Monitoring configuration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.is_active || config.tools_list.length === 0) {
      return new Response(
        JSON.stringify({ message: "Monitoring is not active or no tools configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create scan history record
    const { data: scan, error: scanError } = await supabaseClient
      .from("scan_history")
      .insert({
        user_id: userId,
        status: "running",
        alerts_found: 0,
      })
      .select()
      .single();

    if (scanError || !scan) {
      console.error("Scan creation error:", scanError);
      return new Response(
        JSON.stringify({ error: "Failed to create scan record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Scan created:", scan.id);

    // Analyze each tool using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const alerts = [];

    for (const tool of config.tools_list) {
      console.log("Analyzing threats for:", tool);

      try {
        // Use AI to analyze cybersecurity threats for this tool
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
                content: `Search for recent cybersecurity threats, vulnerabilities, CVEs, and security advisories related to: ${tool}. 
                
Focus on:
- Security vulnerabilities and CVEs
- Data breaches and incidents
- Security updates and patches
- Zero-day exploits
- Official security advisories

Only include threats from the last 7 days. If no recent threats exist, indicate hasThreats as false.`,
              },
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI request failed for ${tool}:`, await aiResponse.text());
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;

        if (!content) {
          console.log(`No AI response for ${tool}`);
          continue;
        }

        console.log(`AI response for ${tool}:`, content);

        // Parse AI response
        let analysisResult;
        try {
          // Remove markdown code blocks if present
          const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          analysisResult = JSON.parse(cleanContent);
        } catch (parseError) {
          console.error(`Failed to parse AI response for ${tool}:`, parseError);
          console.log("Raw content:", content);
          continue;
        }

        // Process threats
        if (analysisResult.hasThreats && analysisResult.threats?.length > 0) {
          for (const threat of analysisResult.threats) {
            // Insert alert into database
            const { data: alert, error: alertError } = await supabaseClient
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

            if (!alertError && alert) {
              alerts.push(alert);
              console.log(`Alert created for ${tool}:`, alert.id);

              // Send to Slack if webhook configured
              if (config.slack_webhook_url) {
                try {
                  const slackMessage = {
                    text: `🔔 *Cyber Alert Detected*\n*Tool:* ${tool}\n*Severity:* ${threat.severity}\n*Summary:* ${threat.summary}\n*Source:* ${threat.source || "N/A"}\n*Time:* ${new Date().toISOString()}`,
                  };

                  const slackResponse = await fetch(config.slack_webhook_url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(slackMessage),
                  });

                  if (slackResponse.ok) {
                    // Update alert as sent to Slack
                    await supabaseClient
                      .from("alerts")
                      .update({ sent_to_slack: true })
                      .eq("id", alert.id);

                    console.log(`Slack notification sent for alert ${alert.id}`);
                  } else {
                    console.error("Failed to send Slack notification:", await slackResponse.text());
                  }
                } catch (slackError) {
                  console.error("Slack notification error:", slackError);
                }
              }
            }
          }
        }
      } catch (toolError) {
        console.error(`Error analyzing ${tool}:`, toolError);
      }
    }

    // Update scan status
    await supabaseClient
      .from("scan_history")
      .update({
        status: "completed",
        scan_completed_at: new Date().toISOString(),
        alerts_found: alerts.length,
      })
      .eq("id", scan.id);

    console.log(`Scan completed. Found ${alerts.length} alerts.`);

    // Send alerts to notification channels
    if (alerts.length > 0) {
      // Send to notification_channels (Slack, Discord, Email)
      const { data: channels } = await supabaseClient
        .from("notification_channels")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (channels && channels.length > 0) {
        for (const alert of alerts) {
          for (const channel of channels) {
            try {
              const chConfig = channel.config as any;
              if (channel.channel_type === "slack" && chConfig.webhook_url) {
                await fetch(chConfig.webhook_url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    text: `🔔 *Cyber Alert*\n*Tool:* ${alert.tool_name}\n*Severity:* ${alert.severity}\n*Summary:* ${alert.summary}\n*Source:* ${alert.source_url || "N/A"}\n*Time:* ${new Date().toISOString()}`,
                  }),
                });
              } else if (channel.channel_type === "discord" && chConfig.webhook_url) {
                await fetch(chConfig.webhook_url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    embeds: [{
                      title: "🔔 Security Alert",
                      color: ({ Critical: 0xff0000, High: 0xff6600, Medium: 0xffcc00, Low: 0x00cc00 } as any)[alert.severity] || 0x808080,
                      fields: [
                        { name: "Tool", value: alert.tool_name, inline: true },
                        { name: "Severity", value: alert.severity, inline: true },
                        { name: "Summary", value: alert.summary },
                      ],
                      timestamp: new Date().toISOString(),
                      footer: { text: "SecureWatch AI" },
                    }],
                  }),
                });
              } else if (channel.channel_type === "email") {
                console.log(`Email queued for ${chConfig.email_address}: ${alert.summary}`);
              }
            } catch (chErr) {
              console.error(`Channel ${channel.name} error:`, chErr);
            }
          }
        }
        console.log(`Notifications sent to ${channels.length} channels.`);
      }

      // Legacy Slack webhook from monitoring config
      if (config.slack_webhook_url) {
        for (const alert of alerts) {
          try {
            await fetch(config.slack_webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: `🔔 *Cyber Alert*\n*Tool:* ${alert.tool_name}\n*Severity:* ${alert.severity}\n*Summary:* ${alert.summary}\n*Source:* ${alert.source_url || "N/A"}`,
              }),
            });
          } catch (e) {
            console.error("Legacy Slack error:", e);
          }
        }
      }

      // Trigger registered webhooks
      const { data: webhooks } = await supabaseClient
        .from("webhooks")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (webhooks) {
        for (const webhook of webhooks) {
          if (webhook.events?.includes("alert.created")) {
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
              await supabaseClient.from("webhooks").update({ last_triggered_at: new Date().toISOString() }).eq("id", webhook.id);
            } catch (whErr) {
              console.error("Webhook delivery failed:", whErr);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scan completed. Found ${alerts.length} new alerts.`,
        scanId: scan.id,
        alertsFound: alerts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scan error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
