import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Auth
    let userId: string | null = null;
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

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { iocId, iocType, iocValue } = await req.json();
    if (!iocValue || !iocType) {
      return new Response(JSON.stringify({ error: "iocType and iocValue required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enrichment: any = { sources: [], timestamp: new Date().toISOString() };
    let reputation = "unknown";
    let riskScore = 0;

    // 1. VirusTotal lookup (if API key available)
    const VT_KEY = Deno.env.get("VIRUSTOTAL_API_KEY");
    if (VT_KEY) {
      try {
        let vtUrl = "";
        if (iocType === "ip") vtUrl = `https://www.virustotal.com/api/v3/ip_addresses/${iocValue}`;
        else if (iocType === "domain") vtUrl = `https://www.virustotal.com/api/v3/domains/${iocValue}`;
        else if (iocType === "hash") vtUrl = `https://www.virustotal.com/api/v3/files/${iocValue}`;
        else if (iocType === "url") {
          const urlId = btoa(iocValue).replace(/=/g, "");
          vtUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;
        }

        if (vtUrl) {
          const vtResp = await fetch(vtUrl, {
            headers: { "x-apikey": VT_KEY },
          });
          if (vtResp.ok) {
            const vtData = await vtResp.json();
            const stats = vtData.data?.attributes?.last_analysis_stats;
            if (stats) {
              const malicious = stats.malicious || 0;
              const suspicious = stats.suspicious || 0;
              const total = malicious + suspicious + (stats.harmless || 0) + (stats.undetected || 0);
              enrichment.virustotal = {
                malicious, suspicious,
                harmless: stats.harmless || 0,
                undetected: stats.undetected || 0,
                detection_ratio: total > 0 ? `${malicious}/${total}` : "N/A",
              };
              enrichment.sources.push("VirusTotal");
              riskScore = Math.max(riskScore, Math.min(100, (malicious / Math.max(total, 1)) * 100));
            }
          } else {
            console.log(`VT lookup failed: ${vtResp.status}`);
          }
        }
      } catch (e) {
        console.error("VT error:", e);
      }
    }

    // 2. AbuseIPDB lookup (IPs only, if API key available)
    const ABUSE_KEY = Deno.env.get("ABUSEIPDB_API_KEY");
    if (ABUSE_KEY && iocType === "ip") {
      try {
        const abuseResp = await fetch(
          `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(iocValue)}&maxAgeInDays=90`,
          { headers: { Key: ABUSE_KEY, Accept: "application/json" } }
        );
        if (abuseResp.ok) {
          const abuseData = await abuseResp.json();
          const d = abuseData.data;
          enrichment.abuseipdb = {
            abuse_confidence: d?.abuseConfidenceScore || 0,
            total_reports: d?.totalReports || 0,
            country: d?.countryCode || "Unknown",
            isp: d?.isp || "Unknown",
            domain: d?.domain || "Unknown",
            is_tor: d?.isTor || false,
          };
          enrichment.sources.push("AbuseIPDB");
          riskScore = Math.max(riskScore, d?.abuseConfidenceScore || 0);
        }
      } catch (e) {
        console.error("AbuseIPDB error:", e);
      }
    }

    // 3. AI-powered MITRE ATT&CK mapping + analysis (always available)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: `You are a threat intelligence analyst. Analyze the given IOC and return ONLY valid JSON (no markdown):
{
  "reputation": "malicious" | "suspicious" | "clean" | "unknown",
  "risk_score": 0-100,
  "summary": "Brief threat assessment",
  "mitre_techniques": ["T1234 - Technique Name"],
  "known_campaigns": ["Campaign names if any"],
  "geo_info": "Geographic/ISP info if IP",
  "recommendations": ["Action items"]
}`,
              },
              {
                role: "user",
                content: `Analyze this IOC:\nType: ${iocType}\nValue: ${iocValue}\n\nProvide threat intelligence including MITRE ATT&CK mapping, known campaigns, and risk assessment.`,
              },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(clean);
            enrichment.ai_analysis = parsed;
            enrichment.mitre_techniques = parsed.mitre_techniques || [];
            enrichment.sources.push("AI/MITRE ATT&CK");
            if (!VT_KEY && !ABUSE_KEY) {
              // If no external APIs, use AI reputation
              reputation = parsed.reputation || "unknown";
              riskScore = parsed.risk_score || 0;
            }
          }
        }
      } catch (e) {
        console.error("AI enrichment error:", e);
      }
    }

    // Determine final reputation
    if (riskScore >= 70) reputation = "malicious";
    else if (riskScore >= 40) reputation = "suspicious";
    else if (riskScore > 0 && enrichment.sources.length > 0) reputation = "clean";

    enrichment.risk_score = Math.round(riskScore);

    // Update IOC if ID provided
    if (iocId) {
      await supabaseAdmin.from("iocs").update({
        enrichment_data: enrichment,
        enriched_at: new Date().toISOString(),
        reputation,
      }).eq("id", iocId).eq("user_id", userId);
    }

    return new Response(JSON.stringify({
      enrichment,
      reputation,
      risk_score: Math.round(riskScore),
      sources: enrichment.sources,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Enrichment error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
