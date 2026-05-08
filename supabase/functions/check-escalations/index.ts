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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate: require CRON_SECRET
    const CRON_SECRET = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Running escalation check...");

    // Get all active escalation rules
    const { data: rules, error: rulesError } = await supabase
      .from("escalation_rules")
      .select("*")
      .eq("is_active", true);

    if (rulesError || !rules?.length) {
      return new Response(JSON.stringify({ message: "No active escalation rules" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let escalatedCount = 0;

    for (const rule of rules) {
      const severities = rule.severity_filter || ["Critical", "High"];
      const minutesThreshold = rule.escalate_after_minutes || 30;
      const cutoff = new Date(Date.now() - minutesThreshold * 60 * 1000).toISOString();

      // Find unacknowledged alerts matching this rule
      const { data: alerts } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", rule.user_id)
        .eq("status", "open")
        .in("severity", severities)
        .lt("detected_at", cutoff);

      if (!alerts?.length) continue;

      // Escalate — update status and notify
      for (const alert of alerts) {
        await supabase.from("alerts").update({
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
        }).eq("id", alert.id);

        // Add case note about auto-escalation
        await supabase.from("case_notes").insert({
          alert_id: alert.id,
          user_id: rule.user_id,
          content: `⚡ Auto-escalated by rule "${rule.name}" after ${minutesThreshold} minutes without acknowledgment.`,
          note_type: "escalation",
        });

        escalatedCount++;
      }

      // Send notification if channel configured
      if (rule.notify_channel_id) {
        const { data: channel } = await supabase
          .from("notification_channels")
          .select("*")
          .eq("id", rule.notify_channel_id)
          .single();

        if (channel) {
          const config = channel.config as any;
          const message = `⚡ *Escalation Alert*\n${alerts.length} ${severities.join("/")} alerts auto-escalated by rule "${rule.name}" after ${minutesThreshold}min without acknowledgment.`;

          if (channel.channel_type === "slack" && config.webhook_url && isSafeWebhookUrl(config.webhook_url)) {
            await fetch(config.webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: message }),
            });
          } else if (channel.channel_type === "discord" && config.webhook_url && isSafeWebhookUrl(config.webhook_url)) {
            await fetch(config.webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: message }),
            });
          }
        }
      }
    }

    console.log(`Escalation complete. ${escalatedCount} alerts escalated.`);

    return new Response(JSON.stringify({ success: true, escalated: escalatedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Escalation error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
