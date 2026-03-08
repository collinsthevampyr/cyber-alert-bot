import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Support both JWT auth (dashboard) and API key auth (n8n)
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

    const { alertId } = await req.json();
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

    // If already analyzed, return cached result
    if (alert.analysis && alert.remediation) {
      return new Response(JSON.stringify({
        analysis: alert.analysis,
        remediation: alert.remediation,
        cached: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's monitoring config for context
    const { data: config } = await supabaseAdmin
      .from("monitoring_config")
      .select("tools_list")
      .eq("user_id", userId)
      .single();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: `You are a senior cybersecurity analyst providing expert threat analysis and actionable remediation guidance. 

You must return ONLY valid JSON in this exact format (no markdown, no backticks):
{
  "analysis": "A detailed human-readable analysis of the threat. Include: what the threat is, why it matters, who is affected, potential impact if unaddressed, attack vectors, and any relevant context about the technology. Write 3-5 paragraphs like a senior security engineer would in an incident report.",
  "remediation": "Step-by-step remediation recommendations. Include: immediate actions (within 24 hours), short-term fixes (within 1 week), long-term improvements. Be specific with commands, configuration changes, patch versions, or tool settings where applicable. Format as numbered steps."
}`,
          },
          {
            role: "user",
            content: `Analyze this cybersecurity alert and provide expert-level analysis and remediation:

**Tool/Technology:** ${alert.tool_name}
**Severity:** ${alert.severity}
**Alert Summary:** ${alert.summary}
**Source URL:** ${alert.source_url || "N/A"}
**Detected At:** ${alert.detected_at}
**User's Monitored Stack:** ${config?.tools_list?.join(", ") || "Unknown"}

Consider:
1. How this threat specifically impacts the "${alert.tool_name}" technology
2. Whether other tools in the user's stack (${config?.tools_list?.join(", ") || "unknown"}) could be affected
3. The severity level "${alert.severity}" and what urgency of response is needed
4. Real-world attack scenarios and exploitation likelihood
5. Industry best practices for remediation`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "No AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI analysis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save analysis to the alert
    await supabaseAdmin
      .from("alerts")
      .update({
        analysis: parsed.analysis,
        remediation: parsed.remediation,
      })
      .eq("id", alertId);

    return new Response(JSON.stringify({
      analysis: parsed.analysis,
      remediation: parsed.remediation,
      cached: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
