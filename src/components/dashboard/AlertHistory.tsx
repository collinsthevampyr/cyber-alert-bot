import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ExternalLink, Shield, Brain, ChevronDown, ChevronUp, Loader2, Lightbulb, ShieldCheck, Send, Search, Filter, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const AlertHistory = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [toolFilter, setToolFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAlerts();

    const channel = supabase
      .channel("alerts_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => loadAlerts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    let results = alerts;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(a =>
        a.summary?.toLowerCase().includes(q) ||
        a.tool_name?.toLowerCase().includes(q) ||
        a.analysis?.toLowerCase().includes(q)
      );
    }

    if (severityFilter !== "all") {
      results = results.filter(a => a.severity?.toLowerCase() === severityFilter);
    }

    if (toolFilter !== "all") {
      results = results.filter(a => a.tool_name === toolFilter);
    }

    setFilteredAlerts(results);
  }, [alerts, searchQuery, severityFilter, toolFilter]);

  const loadAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("detected_at", { ascending: false })
      .limit(50);

    setAlerts(data || []);
    setLoading(false);
  };

  const uniqueTools = [...new Set(alerts.map(a => a.tool_name))].filter(Boolean);

  const clearFilters = () => {
    setSearchQuery("");
    setSeverityFilter("all");
    setToolFilter("all");
  };

  const hasActiveFilters = searchQuery || severityFilter !== "all" || toolFilter !== "all";

  const analyzeAlert = async (alertId: string) => {
    setAnalyzingIds((prev) => new Set(prev).add(alertId));
    try {
      const { data, error } = await supabase.functions.invoke("analyze-alert", {
        body: { alertId },
      });
      if (error) throw error;
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, analysis: data.analysis, remediation: data.remediation } : a
        )
      );
      setExpandedIds((prev) => new Set(prev).add(alertId));
      toast({
        title: data.cached ? "Analysis Retrieved" : "Analysis Complete",
        description: data.cached ? "Showing cached analysis." : "AI analysis and remediation generated.",
      });
    } catch (error: any) {
      toast({ title: "Analysis Failed", description: error.message || "Could not analyze this alert.", variant: "destructive" });
    }
    setAnalyzingIds((prev) => { const next = new Set(prev); next.delete(alertId); return next; });
  };

  const sendAlert = async (alertId: string) => {
    setSendingIds((prev) => new Set(prev).add(alertId));
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: { alertId },
      });
      if (error) throw error;
      toast({ title: "Notifications Sent", description: `Sent to ${data.sent}/${data.total} channels.` });
    } catch (error: any) {
      toast({ title: "Send Failed", description: error.message || "Could not send notifications.", variant: "destructive" });
    }
    setSendingIds((prev) => { const next = new Set(prev); next.delete(alertId); return next; });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical": return "bg-[hsl(var(--critical))]/10 text-[hsl(var(--critical))] border-[hsl(var(--critical))]/20";
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20";
      case "low": return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20";
      default: return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getSeverityGradient = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical": return "from-destructive/20 to-destructive/5 border-destructive/30 hover:border-destructive/50";
      case "high": return "from-[hsl(25,95%,53%)]/20 to-[hsl(25,95%,53%)]/5 border-[hsl(25,95%,53%)]/30 hover:border-[hsl(25,95%,53%)]/50";
      case "medium": return "from-[hsl(var(--warning))]/20 to-[hsl(var(--warning))]/5 border-[hsl(var(--warning))]/30 hover:border-[hsl(var(--warning))]/50";
      case "low": return "from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5 border-[hsl(var(--success))]/30 hover:border-[hsl(var(--success))]/50";
      default: return "from-secondary/20 to-secondary/5 border-secondary/30 hover:border-secondary/50";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" /> Alert History
          </CardTitle>
          <CardDescription>Recent security threats detected</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:border-primary/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="w-5 h-5 text-destructive animate-pulse" />
              </div>
              Alert History
            </CardTitle>
            <CardDescription className="mt-1">Recent security threats — click "Analyze" for AI-powered remediation</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {hasActiveFilters ? `${filteredAlerts.length}/${alerts.length}` : alerts.length}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "border-primary text-primary" : ""}
            >
              <Filter className="w-4 h-4 mr-1" /> Filter
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-3 rounded-lg border border-border/50 bg-background/50 space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={toolFilter} onValueChange={setToolFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Tool" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tools</SelectItem>
                  {uniqueTools.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                <X className="w-3 h-3 mr-1" /> Clear filters
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="inline-flex p-4 rounded-full bg-muted/50">
              <Shield className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-foreground">
                {hasActiveFilters ? "No matching alerts" : "No alerts yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "Configure your monitoring settings and run a scan to detect threats"}
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {filteredAlerts.map((alert, index) => (
                <Collapsible
                  key={alert.id}
                  open={expandedIds.has(alert.id)}
                  onOpenChange={() => toggleExpand(alert.id)}
                >
                  <div
                    className={`border rounded-lg overflow-hidden transition-all bg-gradient-to-br ${getSeverityGradient(alert.severity)} animate-fade-in hover:shadow-md`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="p-3 sm:p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`${getSeverityColor(alert.severity)} font-semibold shadow-sm`}>
                              {alert.severity}
                            </Badge>
                            <span className="text-sm font-bold text-foreground">{alert.tool_name}</span>
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed">{alert.summary}</p>
                          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                            <span className="font-medium">
                              {formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}
                            </span>
                            {alert.sent_to_slack && (
                              <Badge variant="outline" className="text-xs">✓ Sent</Badge>
                            )}
                            {alert.analysis && (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                <Brain className="w-3 h-3 mr-1" /> Analyzed
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs bg-accent/5 hover:bg-accent/15 border-accent/20 text-accent"
                            onClick={(e) => { e.stopPropagation(); sendAlert(alert.id); }}
                            disabled={sendingIds.has(alert.id)}
                          >
                            {sendingIds.has(alert.id) ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                            ) : (
                              <><Send className="w-3.5 h-3.5" /> Send</>
                            )}
                          </Button>
                          {alert.source_url && (
                            <Button variant="ghost" size="sm" asChild className="hover:bg-primary/10">
                              <a href={alert.source_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs bg-primary/5 hover:bg-primary/15 border-primary/20 text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (alert.analysis) toggleExpand(alert.id);
                              else analyzeAlert(alert.id);
                            }}
                            disabled={analyzingIds.has(alert.id)}
                          >
                            {analyzingIds.has(alert.id) ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                            ) : alert.analysis ? (
                              <><Brain className="w-3.5 h-3.5" /> {expandedIds.has(alert.id) ? "Hide" : "View"}</>
                            ) : (
                              <><Brain className="w-3.5 h-3.5" /> Analyze</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <CollapsibleContent>
                      {alert.analysis && (
                        <div className="border-t border-border/30 bg-background/40 backdrop-blur-sm">
                          <div className="p-4 space-y-4">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                <div className="p-1 rounded bg-primary/10">
                                  <Lightbulb className="w-3.5 h-3.5 text-primary" />
                                </div>
                                Threat Analysis
                              </h4>
                              <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap bg-background/50 rounded-lg p-3 border border-border/30">
                                {alert.analysis}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                <div className="p-1 rounded bg-accent/10">
                                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                                </div>
                                Remediation Steps
                              </h4>
                              <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap bg-background/50 rounded-lg p-3 border border-border/30">
                                {alert.remediation}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground hover:text-primary"
                              onClick={() => {
                                setAlerts((prev) =>
                                  prev.map((a) => a.id === alert.id ? { ...a, analysis: null, remediation: null } : a)
                                );
                                analyzeAlert(alert.id);
                              }}
                              disabled={analyzingIds.has(alert.id)}
                            >
                              <Brain className="w-3 h-3 mr-1" /> Re-analyze
                            </Button>
                          </div>
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
