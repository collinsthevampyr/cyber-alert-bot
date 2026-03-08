import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, accept, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function authenticateRequest(req: Request): Promise<string | null> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return null;
  const { data } = await supabaseAdmin.rpc("validate_api_key", { p_api_key: apiKey });
  if (!data) return null;
  supabaseAdmin.rpc("touch_api_key", { p_api_key: apiKey }).then(() => {});
  return data;
}

// MCP JSON-RPC handler
async function handleMcpRequest(body: any, userId: string) {
  const { method, params, id } = body;

  // Initialize
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "SecureWatch AI", version: "1.0.0" },
      },
    };
  }

  // List tools
  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "list_alerts",
            description: "List recent security alerts with optional filters for severity and tool name",
            inputSchema: {
              type: "object",
              properties: {
                severity: { type: "string", enum: ["Critical", "High", "Medium", "Low"], description: "Filter by severity" },
                tool_name: { type: "string", description: "Filter by tool/technology name" },
                limit: { type: "number", description: "Max results (default 20)", default: 20 },
              },
            },
          },
          {
            name: "trigger_scan",
            description: "Trigger a new security threat scan across all configured tools",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "get_scan_history",
            description: "Get recent scan history with results",
            inputSchema: {
              type: "object",
              properties: { limit: { type: "number", description: "Max results", default: 10 } },
            },
          },
          {
            name: "get_config",
            description: "Get the current monitoring configuration including tools list and scan frequency",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "update_config",
            description: "Update monitoring configuration - add/remove tools, change scan frequency, or toggle active status",
            inputSchema: {
              type: "object",
              properties: {
                tools_list: { type: "array", items: { type: "string" }, description: "List of tools to monitor" },
                scan_frequency: { type: "string", enum: ["15min", "hourly", "daily"], description: "How often to scan" },
                is_active: { type: "boolean", description: "Enable/disable monitoring" },
              },
            },
          },
          {
            name: "add_tool",
            description: "Add a single tool/technology to the monitoring list",
            inputSchema: {
              type: "object",
              properties: { tool_name: { type: "string", description: "Name of the tool to add" } },
              required: ["tool_name"],
            },
          },
          {
            name: "remove_tool",
            description: "Remove a tool/technology from the monitoring list",
            inputSchema: {
              type: "object",
              properties: { tool_name: { type: "string", description: "Name of the tool to remove" } },
              required: ["tool_name"],
            },
          },
          {
            name: "get_alert_summary",
            description: "Get a summary of alerts by severity and tool for the dashboard",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
    };
  }

  // Call tool
  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments || {};

    try {
      let result: any;

      switch (toolName) {
        case "list_alerts": {
          let query = supabaseAdmin
            .from("alerts")
            .select("*")
            .eq("user_id", userId)
            .order("detected_at", { ascending: false })
            .limit(args.limit || 20);
          if (args.severity) query = query.eq("severity", args.severity);
          if (args.tool_name) query = query.eq("tool_name", args.tool_name);
          const { data, error } = await query;
          if (error) throw error;
          result = { alerts: data, count: data?.length || 0 };
          break;
        }

        case "trigger_scan": {
          const { data: config } = await supabaseAdmin
            .from("monitoring_config")
            .select("*")
            .eq("user_id", userId)
            .single();
          if (!config || !config.is_active || config.tools_list.length === 0) {
            result = { error: "Monitoring not active or no tools configured" };
            break;
          }

          const { data: scan } = await supabaseAdmin
            .from("scan_history")
            .insert({ user_id: userId, status: "running", alerts_found: 0 })
            .select()
            .single();

          // Run AI analysis
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          const alerts: any[] = [];

          for (const tool of config.tools_list) {
            try {
              const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    { role: "system", content: `Cybersecurity analyst. Return JSON only: {"hasThreats": boolean, "threats": [{"severity": "Critical"|"High"|"Medium"|"Low", "summary": "max 200 chars", "source": "url"}]}` },
                    { role: "user", content: `Recent cybersecurity threats for: ${tool}. Last 7 days.` },
                  ],
                }),
              });
              if (!aiResponse.ok) continue;
              const aiData = await aiResponse.json();
              const content = aiData.choices?.[0]?.message?.content;
              if (!content) continue;
              const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              const parsed = JSON.parse(clean);
              if (parsed.hasThreats && parsed.threats?.length > 0) {
                for (const threat of parsed.threats) {
                  const { data: alert } = await supabaseAdmin
                    .from("alerts")
                    .insert({ user_id: userId, scan_id: scan!.id, tool_name: tool, severity: threat.severity || "Medium", summary: threat.summary, source_url: threat.source || null, sent_to_slack: false })
                    .select().single();
                  if (alert) alerts.push(alert);
                }
              }
            } catch (e) { console.error(`Error for ${tool}:`, e); }
          }

          await supabaseAdmin.from("scan_history").update({ status: "completed", scan_completed_at: new Date().toISOString(), alerts_found: alerts.length }).eq("id", scan!.id);
          result = { scan_id: scan!.id, alerts_found: alerts.length, message: `Scan complete. ${alerts.length} alerts found.` };
          break;
        }

        case "get_scan_history": {
          const { data } = await supabaseAdmin
            .from("scan_history")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(args.limit || 10);
          result = { scans: data };
          break;
        }

        case "get_config": {
          const { data } = await supabaseAdmin
            .from("monitoring_config")
            .select("id, tools_list, scan_frequency, is_active, created_at, updated_at")
            .eq("user_id", userId)
            .single();
          result = data || { error: "No configuration found" };
          break;
        }

        case "update_config": {
          const updateData: any = {};
          if (args.tools_list) updateData.tools_list = args.tools_list;
          if (args.scan_frequency) updateData.scan_frequency = args.scan_frequency;
          if (args.is_active !== undefined) updateData.is_active = args.is_active;

          const { data } = await supabaseAdmin
            .from("monitoring_config")
            .upsert({ user_id: userId, ...updateData })
            .select("id, tools_list, scan_frequency, is_active")
            .single();
          result = { config: data, message: "Configuration updated" };
          break;
        }

        case "add_tool": {
          const { data: existing } = await supabaseAdmin
            .from("monitoring_config")
            .select("tools_list")
            .eq("user_id", userId)
            .single();
          const currentTools = existing?.tools_list || [];
          if (currentTools.includes(args.tool_name)) {
            result = { message: `${args.tool_name} is already being monitored` };
          } else {
            const newTools = [...currentTools, args.tool_name];
            await supabaseAdmin.from("monitoring_config").upsert({ user_id: userId, tools_list: newTools }).select();
            result = { message: `Added ${args.tool_name} to monitoring`, tools_list: newTools };
          }
          break;
        }

        case "remove_tool": {
          const { data: existing2 } = await supabaseAdmin
            .from("monitoring_config")
            .select("tools_list")
            .eq("user_id", userId)
            .single();
          const current = existing2?.tools_list || [];
          const filtered = current.filter((t: string) => t !== args.tool_name);
          await supabaseAdmin.from("monitoring_config").upsert({ user_id: userId, tools_list: filtered }).select();
          result = { message: `Removed ${args.tool_name} from monitoring`, tools_list: filtered };
          break;
        }

        case "get_alert_summary": {
          const { data: alerts } = await supabaseAdmin
            .from("alerts")
            .select("severity, tool_name")
            .eq("user_id", userId);
          
          const bySeverity: Record<string, number> = {};
          const byTool: Record<string, number> = {};
          for (const a of alerts || []) {
            bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
            byTool[a.tool_name] = (byTool[a.tool_name] || 0) + 1;
          }
          result = { total: alerts?.length || 0, by_severity: bySeverity, by_tool: byTool };
          break;
        }

        default:
          return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown tool: ${toolName}` } };
      }

      return {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }], isError: true },
      };
    }
  }

  // Notifications (no response needed)
  if (method === "notifications/initialized") {
    return null;
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // GET for server info
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      name: "SecureWatch AI MCP Server",
      version: "1.0.0",
      description: "MCP server for cybersecurity threat monitoring. Authenticate with x-api-key header.",
      capabilities: ["list_alerts", "trigger_scan", "get_scan_history", "get_config", "update_config", "add_tool", "remove_tool", "get_alert_summary"],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const userId = await authenticateRequest(req);
    if (!userId) {
      return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Unauthorized. Include x-api-key header." } }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const result = await handleMcpRequest(body, userId);

    if (result === null) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MCP error:", error);
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32603, message: error instanceof Error ? error.message : "Internal error" },
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
