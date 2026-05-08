import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Key, Webhook, Plus, Trash2, Copy, Eye, EyeOff, Zap, Code, TestTube, Loader2 } from "lucide-react";

export const N8nIntegration = () => {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookName, setNewWebhookName] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const { toast } = useToast();

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiUrl = `https://${projectId}.supabase.co/functions/v1/api`;
  const mcpUrl = `https://${projectId}.supabase.co/functions/v1/mcp-server`;

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [k, w] = await Promise.all([
      supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("webhooks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setApiKeys(k.data || []);
    setWebhooks(w.data || []);
  };

  const generateKey = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const key = `sw_${crypto.randomUUID().replace(/-/g, "")}`;
    const { error } = await supabase.from("api_keys").insert({ user_id: user.id, name: newKeyName || "Default", api_key: key });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setGeneratedKey(key); setNewKeyName(""); toast({ title: "Key created", description: "Copy it now." }); load(); }
    setLoading(false);
  };

  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied", description: `${label} copied.` }); };
  const mask = (k: string) => `${k.slice(0, 6)}${"•".repeat(16)}${k.slice(-4)}`;

  const addWebhook = async () => {
    if (!newWebhookUrl) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("webhooks").insert({ user_id: user.id, url: newWebhookUrl, name: newWebhookName || "n8n Webhook", events: ["alert.created"] });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setNewWebhookUrl(""); setNewWebhookName(""); toast({ title: "Webhook added" }); load(); }
  };

  const testWebhook = async (wh: any) => {
    setTestingId(wh.id);
    try {
      const r = await fetch(wh.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "test", timestamp: new Date().toISOString(), sample_alert: { tool_name: "Test", severity: "Medium", summary: "Sample alert for webhook verification.", detected_at: new Date().toISOString() } }) });
      if (r.ok) toast({ title: "Delivered", description: "Test payload sent." }); else toast({ title: "Failed", description: `Status ${r.status}`, variant: "destructive" });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    setTestingId(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-muted-foreground" /> API & Webhooks</CardTitle>
        <CardDescription className="text-xs">n8n integration and external tools</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="keys" className="space-y-3">
          <TabsList className="h-8">
            <TabsTrigger value="keys" className="text-xs gap-1"><Key className="w-3 h-3" /> Keys</TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs gap-1"><Webhook className="w-3 h-3" /> Webhooks</TabsTrigger>
            <TabsTrigger value="docs" className="text-xs gap-1"><Code className="w-3 h-3" /> Reference</TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Key name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} className="text-xs" />
              <Button size="sm" variant="outline" onClick={generateKey} disabled={loading}><Plus className="w-3 h-3 mr-1" /> Generate</Button>
            </div>
            {generatedKey && (
              <div className="p-2.5 rounded-md border border-primary/20 bg-primary/5 space-y-1.5">
                <p className="text-xs font-medium text-primary">New key — copy now</p>
                <div className="flex items-center gap-2">
                  <code className="text-[10px] font-mono bg-background px-2 py-1 rounded flex-1 break-all">{generatedKey}</code>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { copy(generatedKey, "Key"); setGeneratedKey(null); }}><Copy className="w-3 h-3" /></Button>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-2.5 rounded-md border border-border text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5"><span className="font-medium">{k.name}</span><Badge variant={k.is_active ? "default" : "secondary"} className="text-[9px] px-1">{k.is_active ? "Active" : "Off"}</Badge></div>
                    <code className="text-[10px] text-muted-foreground font-mono">{visibleKeys.has(k.id) ? k.api_key : mask(k.api_key)}</code>
                  </div>
                  <div className="flex gap-0.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { const n = new Set(visibleKeys); n.has(k.id) ? n.delete(k.id) : n.add(k.id); setVisibleKeys(n); }}>{visibleKeys.has(k.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(k.api_key, "Key")}><Copy className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={async () => { await supabase.from("api_keys").delete().eq("id", k.id); load(); }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
              {apiKeys.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No API keys yet.</p>}
            </div>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-3">
            <div className="space-y-2">
              <Input placeholder="Name" value={newWebhookName} onChange={(e) => setNewWebhookName(e.target.value)} className="text-xs" />
              <div className="flex gap-2">
                <Input placeholder="https://..." value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} className="text-xs" />
                <Button size="sm" variant="outline" onClick={addWebhook} disabled={!newWebhookUrl}><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              {webhooks.map((wh) => (
                <div key={wh.id} className="flex items-center justify-between p-2.5 rounded-md border border-border text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5"><span className="font-medium">{wh.name}</span>{wh.events?.map((e: string) => <Badge key={e} variant="outline" className="text-[9px] px-1">{e}</Badge>)}</div>
                    <p className="text-[10px] text-muted-foreground truncate">{wh.url}</p>
                  </div>
                  <div className="flex gap-0.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={testingId === wh.id} onClick={() => testWebhook(wh)}>
                      {testingId === wh.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={async () => { await supabase.from("webhooks").delete().eq("id", wh.id); load(); }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
              {webhooks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No webhooks configured.</p>}
            </div>
          </TabsContent>

          <TabsContent value="docs" className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">REST API</p>
                <div className="space-y-1">
                  {[
                    { m: "GET", p: "/alerts", d: "List alerts" },
                    { m: "POST", p: "/alerts/:id/analyze", d: "AI analysis" },
                    { m: "POST", p: "/alerts/:id/send", d: "Send to channels" },
                    { m: "GET", p: "/scans", d: "Scan history" },
                    { m: "POST", p: "/scans/trigger", d: "Trigger scan" },
                    { m: "GET", p: "/config", d: "Get config" },
                    { m: "PUT", p: "/config", d: "Update config" },
                  ].map(({ m, p, d }) => (
                    <div key={p + m} className="flex items-center gap-2 text-xs py-1">
                      <Badge variant="outline" className={`text-[9px] font-mono w-10 justify-center ${m === "POST" || m === "PUT" ? "text-primary" : ""}`}>{m}</Badge>
                      <code className="font-mono text-foreground">{p}</code>
                      <span className="text-muted-foreground ml-auto">{d}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => copy(apiUrl, "API URL")}>
                  <Copy className="w-3 h-3 mr-1.5" /> Copy API URL
                </Button>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">MCP Server</p>
                <p className="text-xs text-muted-foreground mb-2">For n8n AI agents via Model Context Protocol.</p>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => copy(mcpUrl, "MCP URL")}>
                  <Copy className="w-3 h-3 mr-1.5" /> Copy MCP URL
                </Button>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Authentication</p>
                <p className="text-xs text-muted-foreground">Include <code className="px-1 py-0.5 rounded bg-muted text-foreground">x-api-key</code> header in all requests.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
