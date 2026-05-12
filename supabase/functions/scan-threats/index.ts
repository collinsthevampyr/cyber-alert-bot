import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isSafeWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.)/.test(host)) return false;
    if (['localhost', 'metadata.google.internal', '[::1]'].includes(host)) return false;
    return true;
  } catch { return false; }
}

interface AIConfig {
  provider: string;
  url: string;
  apiKey: string;
  model: string;
  format: "openai" | "anthropic" | "google";
}

const PROVIDER_DEFAULTS: Record<string, { url: string; model: string; format: "openai" | "anthropic" | "google" }> = {
  openai:     { url: "https://api.openai.com/v1/chat/completions",         model: "gpt-4o-mini",              format: "openai" },
  deepseek:   { url: "https://api.deepseek.com/v1/chat/completions",       model: "deepseek-chat",            format: "openai" },
  groq:       { url: "https://api.groq.com/openai/v1/chat/completions",    model: "llama-3.3-70b-versatile",  format: "openai" },
  mistral:    { url: "https://api.mistral.ai/v1/chat/completions",         model: "mistral-large-latest",     format: "openai" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions",      model: "openai/gpt-4o-mini",       format: "openai" },
  anthropic:  { url: "https://api.anthropic.com/v1/messages",              model: "claude-3-5-sonnet-latest", format: "anthropic" },
  google:     { url: "https://generativelanguage.googleapis.com/v1beta/models", model: "gemini-2.0-flash",    format: "google" },
};

function getAIConfig(customAiConfig: any): AIConfig | null {
  if (!customAiConfig?.api_key) return null;
  const provider = (customAiConfig.provider || "openai").toLowerCase();
  if (provider === "custom") {
    const url = customAiConfig.base_url;
    if (!url) return null;
    return {
      provider: "custom",
      url,
      apiKey: customAiConfig.api_key,
      model: customAiConfig.model || "gpt-4o-mini",
      format: "openai",
    };
  }
  const defaults = PROVIDER_DEFAULTS[provider];
  if (!defaults) return null;
  return {
    provider,
    url: defaults.url,
    apiKey: customAiConfig.api_key,
    model: customAiConfig.model || defaults.model,
    format: defaults.format,
  };
}

async function callAI(aiConfig: AIConfig, messages: { role: string; content: string }[]): Promise<string | null> {
  const systemMsg = messages.find(m => m.role === "system")?.content || "";
  const userMsg = messages.filter(m => m.role !== "system").map(m => m.content).join("\n\n");

  if (aiConfig.format === "anthropic") {
    const resp = await fetch(aiConfig.url, {
      method: "POST",
      headers: {
        "x-api-key": aiConfig.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        max_tokens: 4096,
        system: systemMsg,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!resp.ok) { console.error("AI request failed:", resp.status, await resp.text()); return null; }
    const data = await resp.json();
    return data.content?.[0]?.text ?? null;
  }
  if (aiConfig.format === "google") {
    const url = `${aiConfig.url}/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { role: "system", parts: [{ text: systemMsg }] },
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
      }),
    });
    if (!resp.ok) { console.error("AI request failed:", resp.status, await resp.text()); return null; }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? null;
  }
  // OpenAI-compatible
  const response = await fetch(aiConfig.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: aiConfig.model, messages }),
  });
  if (!response.ok) {
    const errText = await response.text();
    console.error("AI request failed:", response.status, errText);
    return null;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { data: configs, error: configError } = await supabaseClient
      .from("monitoring_config")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1);

    const config = configs?.[0] ?? null;

    if (configError || !config) {
      console.error("Config error:", configError);
      return new Response(
        JSON.stringify({ error: "Monitoring configuration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.is_active || !config.tools_list || config.tools_list.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          alertsFound: 0,
          message: "No tools configured. Add tools to monitor in Configuration → Monitoring.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Require user's own AI API key
    const aiConfig = getAIConfig(config.custom_ai_config);
    if (!aiConfig) {
      return new Response(
        JSON.stringify({ error: "AI API key not configured. Please add your AI provider API key in Configuration → AI Provider." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log(`Using AI provider: ${aiConfig.provider} (model: ${aiConfig.model})`);

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
    const alerts: any[] = [];

    for (const tool of config.tools_list) {
      console.log("Analyzing threats for:", tool);

      try {
        const content = await callAI(aiConfig, [
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
        ]);

        if (!content) {
          console.log(`No AI response for ${tool}`);
          continue;
        }

        console.log(`AI response for ${tool}:`, content);

        let analysisResult;
        try {
          const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          analysisResult = JSON.parse(cleanContent);
        } catch (parseError) {
          console.error(`Failed to parse AI response for ${tool}:`, parseError);
          continue;
        }

        if (analysisResult.hasThreats && analysisResult.threats?.length > 0) {
          for (const threat of analysisResult.threats) {
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

    // Auto-analyze each alert with AI and send notifications
    if (alerts.length > 0) {
      for (const alert of alerts) {
        try {
          console.log(`🤖 Auto-analyzing alert ${alert.id}...`);
          const analysisContent = await callAI(aiConfig, [
            {
              role: "system",
              content: `You are a senior cybersecurity analyst. Return ONLY valid JSON (no markdown, no backticks):
{
  "analysis": "Detailed analysis of the threat (3-5 paragraphs)",
  "remediation": "Step-by-step remediation as numbered steps"
}`,
            },
            {
              role: "user",
              content: `Analyze this cybersecurity alert:\n\nTool: ${alert.tool_name}\nSeverity: ${alert.severity}\nSummary: ${alert.summary}\nSource: ${alert.source_url || "N/A"}\nUser's Stack: ${config.tools_list.join(", ")}`,
            },
          ]);

          if (analysisContent) {
            try {
              const clean = analysisContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              const parsed = JSON.parse(clean);
              await supabaseClient.from("alerts").update({
                analysis: parsed.analysis,
                remediation: parsed.remediation,
              }).eq("id", alert.id);
              alert.analysis = parsed.analysis;
              alert.remediation = parsed.remediation;
              console.log(`✅ Auto-analysis complete for alert ${alert.id}`);
            } catch { console.error(`Failed to parse analysis for alert ${alert.id}`); }
          }
        } catch (e) {
          console.error(`Auto-analysis error for ${alert.id}:`, e);
        }
      }

      // Send to notification channels
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
              const analysisBlock = alert.analysis ? `\n\n📊 *AI Agent Analysis:*\n${alert.analysis}` : "";
              const remediationBlock = alert.remediation ? `\n\n🛡️ *Remediation:*\n${alert.remediation}` : "";

              if (channel.channel_type === "slack" && chConfig.webhook_url && isSafeWebhookUrl(chConfig.webhook_url)) {
                await fetch(chConfig.webhook_url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    text: `🤖 *AI Agent Analysis*\n\n*Tool:* ${alert.tool_name}\n*Severity:* ${alert.severity}\n*Summary:* ${alert.summary}\n*Source:* ${alert.source_url || "N/A"}${analysisBlock}${remediationBlock}\n\n_Analyzed at ${new Date().toISOString()}_`,
                  }),
                });
              } else if (channel.channel_type === "discord" && chConfig.webhook_url && isSafeWebhookUrl(chConfig.webhook_url)) {
                const fields = [
                  { name: "Tool", value: alert.tool_name, inline: true },
                  { name: "Severity", value: alert.severity, inline: true },
                  { name: "Summary", value: alert.summary },
                ];
                if (alert.analysis) fields.push({ name: "📊 AI Analysis", value: alert.analysis.substring(0, 1024), inline: false });
                if (alert.remediation) fields.push({ name: "🛡️ Remediation", value: alert.remediation.substring(0, 1024), inline: false });

                await fetch(chConfig.webhook_url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    embeds: [{
                      title: "🤖 AI Agent Analysis",
                      color: ({ Critical: 0xff0000, High: 0xff6600, Medium: 0xffcc00, Low: 0x00cc00 } as any)[alert.severity] || 0x808080,
                      fields,
                      timestamp: new Date().toISOString(),
                      footer: { text: "Gardien AI Agent" },
                    }],
                  }),
                });
              } else if (channel.channel_type === "email") {
                console.log(`Email queued for ${chConfig.email_address}: AI Agent Analysis - ${alert.summary}`);
              }
            } catch (chErr) {
              console.error(`Channel ${channel.name} error:`, chErr);
            }
          }
        }
        console.log(`Notifications sent to ${channels.length} channels with AI analysis.`);
      }

      // Legacy Slack webhook
      if (config.slack_webhook_url && isSafeWebhookUrl(config.slack_webhook_url)) {
        for (const alert of alerts) {
          try {
            const analysisBlock = alert.analysis ? `\n\n📊 *AI Agent Analysis:*\n${alert.analysis}` : "";
            const remediationBlock = alert.remediation ? `\n\n🛡️ *Remediation:*\n${alert.remediation}` : "";
            await fetch(config.slack_webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: `🤖 *AI Agent Analysis*\n\n*Tool:* ${alert.tool_name}\n*Severity:* ${alert.severity}\n*Summary:* ${alert.summary}\n*Source:* ${alert.source_url || "N/A"}${analysisBlock}${remediationBlock}`,
              }),
            });
          } catch (e) {
            console.error("Legacy Slack error:", e);
          }
        }
      }

      // Trigger webhooks
      const { data: webhooks } = await supabaseClient
        .from("webhooks")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (webhooks) {
        for (const webhook of webhooks) {
          if (webhook.events?.includes("alert.created") && isSafeWebhookUrl(webhook.url)) {
            try {
              const bodyStr = JSON.stringify({
                event: "alert.created",
                title: "AI Agent Analysis",
                scan_id: scan.id,
                alerts: alerts.map(a => ({ ...a })),
                timestamp: new Date().toISOString(),
              });
              const headers: Record<string, string> = { "Content-Type": "application/json" };
              if (webhook.secret) {
                const encoder = new TextEncoder();
                const key = await crypto.subtle.importKey('raw', encoder.encode(webhook.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
                const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyStr));
                headers['X-Gardien-Signature'] = `sha256=${Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
              }
              await fetch(webhook.url, { method: "POST", headers, body: bodyStr });
              await supabaseClient.from("webhooks").update({ last_triggered_at: new Date().toISOString() }).eq("id", webhook.id);
            } catch (whErr) {
              console.error("Webhook delivery failed:", whErr);
            }
          }
        }
      }
    }

    const summaryMessage = alerts.length > 0
      ? `Scan completed. Found ${alerts.length} new alert${alerts.length === 1 ? "" : "s"}.`
      : `Scan completed. No new threats detected for: ${config.tools_list.join(", ")}.`;

    return new Response(
      JSON.stringify({
        success: true,
        message: summaryMessage,
        scanId: scan.id,
        alertsFound: alerts.length,
        toolsScanned: config.tools_list.length,
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
