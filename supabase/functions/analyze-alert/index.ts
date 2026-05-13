import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  const defaults = PROVIDER_DEFAULTS[provider];
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
  if (!defaults) return null;
  return {
    provider,
    url: defaults.url,
    apiKey: customAiConfig.api_key,
    model: customAiConfig.model || defaults.model,
    format: defaults.format,
  };
}

async function callAIProvider(aiConfig: AIConfig, systemPrompt: string, userPrompt: string): Promise<{ ok: boolean; status: number; content?: string; errText?: string }> {
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
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!resp.ok) return { ok: false, status: resp.status, errText: await resp.text() };
    const data = await resp.json();
    const content = data.content?.[0]?.text ?? null;
    return { ok: true, status: 200, content };
  }
  if (aiConfig.format === "google") {
    const url = `${aiConfig.url}/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      }),
    });
    if (!resp.ok) return { ok: false, status: resp.status, errText: await resp.text() };
    const data = await resp.json();
    const content = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? null;
    return { ok: true, status: 200, content };
  }
  // OpenAI-compatible
  const resp = await fetch(aiConfig.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiConfig.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) return { ok: false, status: resp.status, errText: await resp.text() };
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? null;
  return { ok: true, status: 200, content };
}

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

    // Get user's monitoring config for context and AI provider settings
    const { data: config } = await supabaseAdmin
      .from("monitoring_config")
      .select("tools_list, custom_ai_config")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const aiConfig = getAIConfig(config?.custom_ai_config);
    if (!aiConfig) {
      return new Response(JSON.stringify({ error: "AI API key not configured. Please add your AI provider API key in Configuration → AI Provider." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`Using AI provider: ${aiConfig.provider} (model: ${aiConfig.model})`);

    const systemPrompt = `You are a senior cybersecurity analyst providing expert threat analysis and actionable remediation guidance. 

You must return ONLY valid JSON in this exact format (no markdown, no backticks):
{
  "analysis": "A detailed human-readable analysis of the threat. Include: what the threat is, why it matters, who is affected, potential impact if unaddressed, attack vectors, and any relevant context about the technology. Write 3-5 paragraphs like a senior security engineer would in an incident report.",
  "remediation": "Step-by-step remediation recommendations. Include: immediate actions (within 24 hours), short-term fixes (within 1 week), long-term improvements. Be specific with commands, configuration changes, patch versions, or tool settings where applicable. Format as numbered steps."
}`;

    const rawEventStr = alert.raw_event ? JSON.stringify(alert.raw_event).slice(0, 4000) : "";
    const metaStr = alert.event_metadata ? JSON.stringify(alert.event_metadata).slice(0, 1500) : "";

    const userPrompt = `Analyze this cybersecurity alert and provide expert-level analysis and remediation:

**Tool/Technology:** ${alert.tool_name}
**Severity:** ${alert.severity}
**Alert Summary:** ${alert.summary}
**Source URL:** ${alert.source_url || "N/A"}
**Detected At:** ${alert.detected_at}
**User's Monitored Stack:** ${config?.tools_list?.join(", ") || "Unknown"}
${metaStr ? `\n**Event Metadata (host, rule, IP, agent, etc.):**\n${metaStr}\n` : ""}${rawEventStr ? `\n**Raw SIEM Event (truncated):**\n${rawEventStr}\n` : ""}

Consider:
1. How this threat specifically impacts the "${alert.tool_name}" technology
2. Whether other tools in the user's stack (${config?.tools_list?.join(", ") || "unknown"}) could be affected
3. The severity level "${alert.severity}" and what urgency of response is needed
4. Real-world attack scenarios and exploitation likelihood
5. Industry best practices for remediation`;

    const aiResult = await callAIProvider(aiConfig, systemPrompt, userPrompt);

    if (!aiResult.ok) {
      console.error("AI error:", aiResult.status, aiResult.errText);

      if (aiResult.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResult.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `AI analysis failed (${aiConfig.provider} ${aiResult.status}): ${(aiResult.errText || "").slice(0, 300)}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = aiResult.content;

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
