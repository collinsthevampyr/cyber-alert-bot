import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface AlertData {
  id: string;
  tool_name: string;
  severity: string;
  summary: string;
  source_url?: string | null;
  analysis?: string | null;
  remediation?: string | null;
  detected_at: string;
}

function formatAlertText(alert: AlertData): string {
  let text = `🔔 *Security Alert*\n\n*Tool:* ${alert.tool_name}\n*Severity:* ${alert.severity}\n*Summary:* ${alert.summary}`;
  if (alert.source_url) text += `\n*Source:* ${alert.source_url}`;
  text += `\n*Detected:* ${alert.detected_at}`;
  if (alert.analysis) text += `\n\n📊 *Analysis:*\n${alert.analysis}`;
  if (alert.remediation) text += `\n\n🛡️ *Remediation:*\n${alert.remediation}`;
  return text;
}

function formatDiscordEmbed(alert: AlertData) {
  const colorMap: Record<string, number> = {
    critical: 0xff0000,
    high: 0xff6600,
    medium: 0xffcc00,
    low: 0x00cc00,
  };
  const fields = [
    { name: "Tool", value: alert.tool_name, inline: true },
    { name: "Severity", value: alert.severity, inline: true },
    { name: "Summary", value: alert.summary },
  ];
  if (alert.source_url) fields.push({ name: "Source", value: alert.source_url, inline: false });
  if (alert.analysis) fields.push({ name: "📊 Analysis", value: alert.analysis.substring(0, 1024), inline: false });
  if (alert.remediation) fields.push({ name: "🛡️ Remediation", value: alert.remediation.substring(0, 1024), inline: false });

  return {
    embeds: [{
      title: "🔔 Security Alert Detected",
      color: colorMap[alert.severity.toLowerCase()] || 0x808080,
      fields,
      timestamp: alert.detected_at,
      footer: { text: "Gardien AI" },
    }],
  };
}

function formatEmailHtml(alert: AlertData): string {
  const severityColors: Record<string, string> = {
    critical: "#ff0000",
    high: "#ff6600",
    medium: "#ffcc00",
    low: "#00cc00",
  };
  const color = severityColors[alert.severity.toLowerCase()] || "#808080";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">🔔 Security Alert</h2>
      </div>
      <div style="border: 1px solid #e0e0e0; padding: 20px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; font-weight: bold;">Tool:</td><td>${alert.tool_name}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Severity:</td><td><span style="background: ${color}; color: white; padding: 2px 8px; border-radius: 4px;">${alert.severity}</span></td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Detected:</td><td>${new Date(alert.detected_at).toLocaleString()}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
          <strong>Summary:</strong><br/>${alert.summary}
        </div>
        ${alert.source_url ? `<p><a href="${alert.source_url}" style="color: #0066cc;">View Source →</a></p>` : ""}
        ${alert.analysis ? `<div style="margin-top: 16px; padding: 12px; background: #e8f4f8; border-radius: 4px; border-left: 4px solid #0088cc;"><strong>📊 Analysis:</strong><br/><pre style="white-space: pre-wrap; font-family: inherit;">${alert.analysis}</pre></div>` : ""}
        ${alert.remediation ? `<div style="margin-top: 16px; padding: 12px; background: #e8f8e8; border-radius: 4px; border-left: 4px solid #00cc44;"><strong>🛡️ Remediation:</strong><br/><pre style="white-space: pre-wrap; font-family: inherit;">${alert.remediation}</pre></div>` : ""}
        <p style="color: #888; font-size: 12px; margin-top: 20px;">Sent by Gardien AI</p>
      </div>
    </div>`;
}

async function sendToChannel(channel: any, alert: AlertData): Promise<{ success: boolean; error?: string }> {
  const config = channel.config as any;

  try {
    switch (channel.channel_type) {
      case "slack": {
        if (!isSafeWebhookUrl(config.webhook_url)) return { success: false, error: "Unsafe webhook URL blocked" };
        const resp = await fetch(config.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: formatAlertText(alert) }),
        });
        if (!resp.ok) return { success: false, error: `Slack: ${resp.status}` };
        return { success: true };
      }

      case "discord": {
        if (!isSafeWebhookUrl(config.webhook_url)) return { success: false, error: "Unsafe webhook URL blocked" };
        const resp = await fetch(config.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formatDiscordEmbed(alert)),
        });
        if (!resp.ok) return { success: false, error: `Discord: ${resp.status}` };
        return { success: true };
      }

      case "email": {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (!RESEND_API_KEY) {
          console.log(`Email skipped (no RESEND_API_KEY): ${config.email_address}`);
          return { success: false, error: "Email service not configured (RESEND_API_KEY missing)" };
        }

        const emailResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: config.from_address || "SecureWatch <alerts@securewatch.io>",
            to: [config.email_address],
            subject: `🔔 [${alert.severity}] Security Alert: ${alert.tool_name}`,
            html: formatEmailHtml(alert),
          }),
        });

        if (!emailResp.ok) {
          const errText = await emailResp.text();
          return { success: false, error: `Email: ${emailResp.status} - ${errText}` };
        }
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown channel type: ${channel.channel_type}` };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Send alert to all active channels for a user
export async function sendAlertToAllChannels(userId: string, alert: AlertData) {
  const { data: channels } = await supabaseAdmin
    .from("notification_channels")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!channels || channels.length === 0) return { sent: 0, results: [] };

  const results = [];
  for (const channel of channels) {
    const result = await sendToChannel(channel, alert);
    results.push({ channel_id: channel.id, channel_type: channel.channel_type, name: channel.name, ...result });
  }

  return { sent: results.filter((r) => r.success).length, total: channels.length, results };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    let userId: string | null = null;
    const apiKey = req.headers.get("x-api-key");
    if (apiKey) {
      const { data } = await supabaseAdmin.rpc("validate_api_key", { p_api_key: apiKey });
      userId = data;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const anonClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await anonClient.auth.getUser();
        userId = user?.id ?? null;
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { alertId, channelIds } = await req.json();
    if (!alertId) {
      return new Response(JSON.stringify({ error: "alertId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the alert
    const { data: alert, error: alertError } = await supabaseAdmin
      .from("alerts")
      .select("*")
      .eq("id", alertId)
      .eq("user_id", userId)
      .single();

    if (alertError || !alert) {
      return new Response(JSON.stringify({ error: "Alert not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let channels;
    if (channelIds && Array.isArray(channelIds) && channelIds.length > 0) {
      // Send to specific channels
      const { data } = await supabaseAdmin
        .from("notification_channels")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .in("id", channelIds);
      channels = data;
    } else {
      // Send to all active channels
      const { data } = await supabaseAdmin
        .from("notification_channels")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);
      channels = data;
    }

    if (!channels || channels.length === 0) {
      return new Response(JSON.stringify({ error: "No active notification channels configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    for (const channel of channels) {
      const result = await sendToChannel(channel, alert);
      results.push({ channel_id: channel.id, channel_type: channel.channel_type, name: channel.name, ...result });
    }

    return new Response(JSON.stringify({
      success: true,
      sent: results.filter((r) => r.success).length,
      total: channels.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
