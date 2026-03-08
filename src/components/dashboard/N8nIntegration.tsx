import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Key, Webhook, Plus, Trash2, Copy, Eye, EyeOff, ExternalLink, Zap, Code, AlertCircle, TestTube, Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const N8nIntegration = () => {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookName, setNewWebhookName] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const { toast } = useToast();

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiBaseUrl = `https://${projectId}.supabase.co/functions/v1/api`;
  const mcpBaseUrl = `https://${projectId}.supabase.co/functions/v1/mcp-server`;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [keysRes, webhooksRes] = await Promise.all([
      supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("webhooks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    setApiKeys(keysRes.data || []);
    setWebhooks(webhooksRes.data || []);
  };

  const generateApiKey = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const key = `sw_${crypto.randomUUID().replace(/-/g, "")}`;

    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      name: newKeyName || "Default",
      api_key: key,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setGeneratedKey(key);
      setNewKeyName("");
      toast({ title: "API Key Created", description: "Copy it now — it won't be shown again in full." });
      loadData();
    }
    setLoading(false);
  };

  const deleteApiKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "API key removed." });
      loadData();
    }
  };

  const addWebhook = async () => {
    if (!newWebhookUrl) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("webhooks").insert({
      user_id: user.id,
      url: newWebhookUrl,
      name: newWebhookName || "n8n Webhook",
      events: ["alert.created"],
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewWebhookUrl("");
      setNewWebhookName("");
      toast({ title: "Webhook Added", description: "You'll receive alert notifications at this URL." });
      loadData();
    }
  };

  const deleteWebhook = async (id: string) => {
    const { error } = await supabase.from("webhooks").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Webhook removed." });
      loadData();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const toggleKeyVisibility = (id: string) => {
    const next = new Set(visibleKeys);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setVisibleKeys(next);
  };

  const maskKey = (key: string) => `${key.slice(0, 6)}${"•".repeat(20)}${key.slice(-4)}`;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          n8n & API Integration
        </CardTitle>
        <CardDescription>Connect n8n workflows and external tools to your security monitoring</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="api-keys" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api-keys" className="gap-1">
              <Key className="w-3.5 h-3.5" /> API Keys
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-1">
              <Webhook className="w-3.5 h-3.5" /> Webhooks
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-1">
              <Code className="w-3.5 h-3.5" /> Docs
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-4">
            <Alert className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                API keys authenticate n8n workflows and external apps to your SecureWatch AI account.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Input
                placeholder="Key name (e.g., n8n Production)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
              <Button onClick={generateApiKey} disabled={loading} className="gap-1 whitespace-nowrap bg-gradient-to-r from-primary to-primary/80">
                <Plus className="w-4 h-4" /> Generate
              </Button>
            </div>

            {generatedKey && (
              <Alert className="bg-accent/10 border-accent/30">
                <AlertCircle className="h-4 w-4 text-accent" />
                <AlertDescription className="space-y-2">
                  <p className="font-medium text-accent">New API key created — copy it now!</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-background/50 px-3 py-1.5 rounded text-xs font-mono flex-1 break-all">{generatedKey}</code>
                    <Button size="icon" variant="outline" onClick={() => { copyToClipboard(generatedKey, "API key"); setGeneratedKey(null); }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/20 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{key.name}</span>
                      <Badge variant={key.is_active ? "default" : "secondary"} className="text-xs">
                        {key.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground font-mono">
                      {visibleKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                    </code>
                    {key.last_used_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last used: {new Date(key.last_used_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => toggleKeyVisibility(key.id)}>
                      {visibleKeys.has(key.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(key.api_key, "API key")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="hover:text-destructive" onClick={() => deleteApiKey(key.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {apiKeys.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No API keys yet. Generate one to get started.</p>
              )}
            </div>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <Alert className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Webhooks push real-time alerts to n8n workflows. Use n8n's <strong>Webhook</strong> trigger node to receive alerts.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Input
                placeholder="Webhook name (e.g., Alert Pipeline)"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="https://your-n8n-instance.com/webhook/..."
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  type="url"
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                />
                <Button onClick={addWebhook} disabled={!newWebhookUrl} className="gap-1 whitespace-nowrap bg-gradient-to-r from-primary to-primary/80">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {webhooks.map((wh) => (
                <div key={wh.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/20 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{wh.name}</span>
                      <Badge variant={wh.is_active ? "default" : "secondary"} className="text-xs">
                        {wh.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{wh.url}</p>
                    <div className="flex gap-1 mt-1">
                      {wh.events?.map((e: string) => (
                        <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                      ))}
                    </div>
                    {wh.last_triggered_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last triggered: {new Date(wh.last_triggered_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="hover:text-destructive" onClick={() => deleteWebhook(wh.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {webhooks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No webhooks configured. Add one to receive real-time alerts.</p>
              )}
            </div>
          </TabsContent>

          {/* Documentation Tab */}
          <TabsContent value="docs" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> REST API Endpoints
                </h3>
                <p className="text-sm text-muted-foreground">Use these endpoints with n8n's HTTP Request node:</p>
                <div className="space-y-2">
                  {[
                    { method: "GET", path: "/alerts", desc: "List alerts (query: severity, tool_name, limit, offset)" },
                    { method: "POST", path: "/alerts/:id/analyze", desc: "AI-analyze an alert — returns expert analysis & remediation steps" },
                    { method: "GET", path: "/scans", desc: "Get scan history" },
                    { method: "POST", path: "/scans/trigger", desc: "Trigger a new security scan" },
                    { method: "GET", path: "/config", desc: "Get monitoring configuration" },
                    { method: "PUT", path: "/config", desc: "Update configuration (body: tools_list, scan_frequency, is_active)" },
                    { method: "GET", path: "/webhooks", desc: "List registered webhooks" },
                    { method: "POST", path: "/webhooks", desc: "Register a new webhook (body: url, name)" },
                  ].map(({ method, path, desc }) => (
                    <div key={path + method} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className={`text-[10px] font-mono shrink-0 ${method === "POST" ? "bg-primary/10 text-primary" : method === "PUT" ? "bg-accent/10 text-accent" : ""}`}>
                        {method}
                      </Badge>
                      <div>
                        <code className="text-xs font-mono">{path}</code>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => copyToClipboard(apiBaseUrl, "API URL")}>
                    <Copy className="w-3 h-3" /> Copy API URL
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Code className="w-4 h-4 text-primary" /> MCP Server (for n8n AI Agents)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Connect n8n AI agents to your security monitoring using the MCP protocol.
                </p>
                <div className="bg-background rounded-md p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">MCP Server URL:</p>
                  <code className="text-xs font-mono break-all">{mcpBaseUrl}</code>
                </div>
                <div className="bg-background rounded-md p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Available MCP Tools:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li><code>list_alerts</code> — List & filter security alerts</li>
                    <li><code>analyze_alert</code> — Deep AI analysis with expert remediation</li>
                    <li><code>analyze_all_unanalyzed</code> — Batch-analyze unanalyzed alerts</li>
                    <li><code>trigger_scan</code> — Run a new threat scan</li>
                    <li><code>get_scan_history</code> — View past scans</li>
                    <li><code>get_config</code> / <code>update_config</code> — Manage monitoring</li>
                    <li><code>add_tool</code> / <code>remove_tool</code> — Manage monitored tools</li>
                    <li><code>get_alert_summary</code> — Dashboard statistics</li>
                  </ul>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => copyToClipboard(mcpBaseUrl, "MCP URL")}>
                    <Copy className="w-3 h-3" /> Copy MCP URL
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" /> Authentication
                </h3>
                <p className="text-sm text-muted-foreground">
                  All API and MCP requests require the <code className="bg-background px-1 rounded text-xs">x-api-key</code> header:
                </p>
                <pre className="bg-background rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre">{`curl -X GET "${apiBaseUrl}/alerts" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}</pre>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2 hover:bg-primary/10 hover:text-primary border-primary/20"
                onClick={() => window.open("https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/", "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
                n8n HTTP Request Node Docs
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
