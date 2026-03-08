import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ExternalLink, Shield, Brain, Loader2, Lightbulb, ShieldCheck, Send, Search, Filter, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

export const AlertHistory = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [toolFilter, setToolFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
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
      if (error) throw error;
      setAlerts(p => p.map(a => a.id === id ? { ...a, analysis: data.analysis, remediation: data.remediation } : a));
      setExpandedIds(p => new Set(p).add(id));
      toast({ title: data.cached ? "Cached analysis" : "Analysis complete" });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    setAnalyzingIds(p => { const n = new Set(p); n.delete(id); return n; });
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

  const toggle = (id: string) => setExpandedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" /> Alerts
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">Detected threats — analyze and forward to channels</CardDescription>
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
            <div className="space-y-2 pr-3">
              {filtered.map((alert) => (
                <Collapsible key={alert.id} open={expandedIds.has(alert.id)} onOpenChange={() => toggle(alert.id)}>
                  <div className={`border rounded-md border-l-2 ${sevBorder(alert.severity)} transition-colors`}>
                    <div className="p-3 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${sevColor(alert.severity)}`}>{alert.severity}</Badge>
                            <span className="text-xs font-medium text-foreground">{alert.tool_name}</span>
                            {alert.analysis && <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">Analyzed</Badge>}
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed">{alert.summary}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); send(alert.id); }} disabled={sendingIds.has(alert.id)}>
                            {sendingIds.has(alert.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3 mr-1" /> Send</>}
                          </Button>
                          {alert.source_url && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={alert.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); alert.analysis ? toggle(alert.id) : analyze(alert.id); }} disabled={analyzingIds.has(alert.id)}>
                            {analyzingIds.has(alert.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Brain className="w-3 h-3 mr-1" /> {alert.analysis ? (expandedIds.has(alert.id) ? "Hide" : "View") : "Analyze"}</>}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <CollapsibleContent>
                      {alert.analysis && (
                        <div className="border-t border-border px-3 py-3 space-y-3 bg-muted/30">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1"><Lightbulb className="w-3 h-3" /> Analysis</p>
                            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{alert.analysis}</p>
                          </div>
                          {alert.remediation && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1"><ShieldCheck className="w-3 h-3" /> Remediation</p>
                              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{alert.remediation}</p>
                            </div>
                          )}
                          <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground h-6" onClick={() => { setAlerts(p => p.map(a => a.id === alert.id ? { ...a, analysis: null, remediation: null } : a)); analyze(alert.id); }}>
                            <Brain className="w-2.5 h-2.5 mr-1" /> Re-analyze
                          </Button>
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
