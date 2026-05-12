import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle, ExternalLink, Shield, Brain, Loader2, Lightbulb,
  ShieldCheck, Send, Search, Filter, X, ChevronRight, Clock, Wrench, Globe, ArrowLeft
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export const AlertHistory = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [toolFilter, setToolFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAlerts();
    const ch = supabase.channel("alerts_updates").on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => loadAlerts()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    let r = alerts;
    if (search) { const q = search.toLowerCase(); r = r.filter(a => a.summary?.toLowerCase().includes(q) || a.tool_name?.toLowerCase().includes(q)); }
    if (sevFilter !== "all") r = r.filter(a => a.severity?.toLowerCase() === sevFilter);
    if (toolFilter !== "all") r = r.filter(a => a.tool_name === toolFilter);
    setFiltered(r);
  }, [alerts, search, sevFilter, toolFilter]);

  // Keep selectedAlert in sync with alerts data
  useEffect(() => {
    if (selectedAlert) {
      const updated = alerts.find(a => a.id === selectedAlert.id);
      if (updated) setSelectedAlert(updated);
    }
  }, [alerts]);

  const loadAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("alerts").select("*").eq("user_id", user.id).order("detected_at", { ascending: false }).limit(50);
    setAlerts(data || []);
    setLoading(false);
  };

  const tools = [...new Set(alerts.map(a => a.tool_name))].filter(Boolean);
  const hasFilters = search || sevFilter !== "all" || toolFilter !== "all";

  const analyze = async (id: string) => {
    setAnalyzingIds(p => new Set(p).add(id));
    try {
      const { data, error } = await supabase.functions.invoke("analyze-alert", { body: { alertId: id } });
      if (error) {
        let msg = error.message || "Edge Function error";
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } else if (ctx && typeof ctx.text === "function") {
            const body = await ctx.text();
            if (body) msg = body;
          }
        } catch {}
        throw new Error(msg);
      }
      if (!data || data.error) throw new Error(data?.error || "Analysis returned no data");
      const updatedAlert = { analysis: data.analysis, remediation: data.remediation };
      setAlerts(p => p.map(a => a.id === id ? { ...a, ...updatedAlert } : a));
      setSelectedAlert((prev: any) => prev?.id === id ? { ...prev, ...updatedAlert } : prev);
      toast({ title: data.cached ? "Cached analysis" : "Analysis complete" });
    } catch (e: any) {
      console.error("Analysis error:", e);
      toast({ title: "Analysis failed", description: e.message || "Unknown error", variant: "destructive" });
    } finally {
      setAnalyzingIds(p => { const n = new Set(p); n.delete(id); return n; });
    }
  };

  const send = async (id: string) => {
    setSendingIds(p => new Set(p).add(id));
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", { body: { alertId: id } });
      if (error) throw error;
      toast({ title: "Sent", description: `${data.sent}/${data.total} channels.` });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    setSendingIds(p => { const n = new Set(p); n.delete(id); return n; });
  };

  const sevColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "critical": return "bg-destructive/10 text-destructive border-destructive/30";
      case "high": return "bg-warning/10 text-warning border-warning/30";
      case "medium": return "bg-info/10 text-info border-info/30";
      case "low": return "bg-success/10 text-success border-success/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const sevBorder = (s: string) => {
    switch (s.toLowerCase()) {
      case "critical": return "border-l-destructive";
      case "high": return "border-l-warning";
      case "medium": return "border-l-info";
      case "low": return "border-l-success";
      default: return "border-l-border";
    }
  };

  if (loading) return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Loading alerts...</CardContent></Card>;

  // ── Detail View ──
  if (selectedAlert) {
    const alert = selectedAlert;
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setSelectedAlert(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">Alert detail</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-xs ${sevColor(alert.severity)}`}>{alert.severity}</Badge>
              <Badge variant="outline" className="text-xs">{alert.tool_name}</Badge>
              {alert.analysis && <Badge variant="outline" className="text-xs border-primary/20 text-primary">Analyzed</Badge>}
              {alert.sent_to_slack && <Badge variant="outline" className="text-xs border-success/20 text-success">Notified</Badge>}
            </div>
            <p className="text-sm text-foreground leading-relaxed">{alert.summary}</p>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Detected</p>
                <p className="text-foreground">{format(new Date(alert.detected_at), "MMM d, yyyy · HH:mm")}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Wrench className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Source tool</p>
                <p className="text-foreground">{alert.tool_name}</p>
              </div>
            </div>
            {alert.source_url && (
              <div className="flex items-start gap-2.5 sm:col-span-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Source URL</p>
                  <a href={alert.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-2 text-sm break-all">
                    {alert.source_url}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Analysis */}
          {alert.analysis ? (
            <>
              <Separator />
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2"><Lightbulb className="w-3.5 h-3.5" /> AI Analysis</p>
                  <div className="rounded-md bg-muted/40 border border-border p-3">
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{alert.analysis}</p>
                  </div>
                </div>
                {alert.remediation && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2"><ShieldCheck className="w-3.5 h-3.5" /> Remediation Steps</p>
                    <div className="rounded-md bg-success/5 border border-success/10 p-3">
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{alert.remediation}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* Actions */}
          <Separator />
          <div className="flex flex-wrap gap-2">
            {!alert.analysis ? (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); analyze(alert.id); }} disabled={analyzingIds.has(alert.id)}>
                {analyzingIds.has(alert.id) ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analyzing...</> : <><Brain className="w-3.5 h-3.5 mr-1.5" /> Analyze with AI</>}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); analyze(alert.id); }} disabled={analyzingIds.has(alert.id)}>
                {analyzingIds.has(alert.id) ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Re-analyzing...</> : <><Brain className="w-3.5 h-3.5 mr-1.5" /> Re-analyze</>}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => send(alert.id)} disabled={sendingIds.has(alert.id)}>
              {sendingIds.has(alert.id) ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sending...</> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Send to channels</>}
            </Button>
            {alert.source_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={alert.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open source</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── List View ──
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" /> Alerts
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">Click an alert to view full details and AI analysis</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {hasFilters ? `${filtered.length} of ${alerts.length}` : alerts.length}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={`text-xs ${showFilters ? "border-primary" : ""}`}>
              <Filter className="w-3 h-3 mr-1" /> Filter
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 text-xs h-8" />
            </div>
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="w-full sm:w-32 text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={toolFilter} onValueChange={setToolFilter}>
              <SelectTrigger className="w-full sm:w-36 text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tools</SelectItem>
                {tools.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setSearch(""); setSevFilter("all"); setToolFilter("all"); }}><X className="w-3 h-3 mr-1" /> Clear</Button>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">{hasFilters ? "No matching alerts" : "No alerts yet"}</p>
            <p className="text-xs text-muted-foreground mt-1">{hasFilters ? "Adjust your filters" : "Run a scan to detect threats"}</p>
          </div>
        ) : (
          <ScrollArea className="h-[520px]">
            <div className="space-y-1.5 pr-3">
              {filtered.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`w-full text-left border rounded-md border-l-2 ${sevBorder(alert.severity)} hover:bg-secondary/40 transition-colors group`}
                >
                  <div className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${sevColor(alert.severity)}`}>{alert.severity}</Badge>
                        <span className="text-xs font-medium text-foreground">{alert.tool_name}</span>
                        {alert.analysis && <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">Analyzed</Badge>}
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed truncate">{alert.summary}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
