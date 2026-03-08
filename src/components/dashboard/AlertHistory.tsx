import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink, Shield, Brain, ChevronDown, ChevronUp, Loader2, Lightbulb, ShieldCheck, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const AlertHistory = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadAlerts();

    const channel = supabase
      .channel("alerts_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => loadAlerts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("detected_at", { ascending: false })
      .limit(10);

    setAlerts(data || []);
    setLoading(false);
  };

  const analyzeAlert = async (alertId: string) => {
    setAnalyzingIds((prev) => new Set(prev).add(alertId));

    try {
      const { data, error } = await supabase.functions.invoke("analyze-alert", {
        body: { alertId },
      });

      if (error) throw error;

      // Update alert in state with analysis
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, analysis: data.analysis, remediation: data.remediation } : a
        )
      );

      // Auto-expand
      setExpandedIds((prev) => new Set(prev).add(alertId));

      toast({
        title: data.cached ? "Analysis Retrieved" : "Analysis Complete",
        description: data.cached ? "Showing cached analysis." : "AI analysis and remediation generated.",
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze this alert.",
        variant: "destructive",
      });
    }

    setAnalyzingIds((prev) => {
      const next = new Set(prev);
      next.delete(alertId);
      return next;
    });
  };

  const sendAlert = async (alertId: string) => {
    setSendingIds((prev) => new Set(prev).add(alertId));
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: { alertId },
      });
      if (error) throw error;
      toast({
        title: "Notifications Sent",
        description: `Sent to ${data.sent}/${data.total} channels.`,
      });
    } catch (error: any) {
      toast({
        title: "Send Failed",
        description: error.message || "Could not send notifications.",
        variant: "destructive",
      });
    }
    setSendingIds((prev) => {
      const next = new Set(prev);
      next.delete(alertId);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical": return "bg-critical/10 text-critical border-critical/20";
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      case "low": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getSeverityGradient = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical": return "from-destructive/20 to-destructive/5 border-destructive/30 hover:border-destructive/50";
      case "high": return "from-orange-500/20 to-orange-500/5 border-orange-500/30 hover:border-orange-500/50";
      case "medium": return "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50";
      case "low": return "from-green-500/20 to-green-500/5 border-green-500/30 hover:border-green-500/50";
      default: return "from-secondary/20 to-secondary/5 border-secondary/30 hover:border-secondary/50";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            Alert History
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="w-5 h-5 text-destructive animate-pulse" />
              </div>
              Alert History
            </CardTitle>
            <CardDescription>Recent security threats detected — click "Analyze" for AI-powered remediation</CardDescription>
          </div>
          {alerts.length > 0 && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {alerts.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="inline-flex p-4 rounded-full bg-muted/50">
              <Shield className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-foreground">No alerts yet</p>
              <p className="text-sm text-muted-foreground">
                Configure your monitoring settings and run a scan to detect threats
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <Collapsible
                  key={alert.id}
                  open={expandedIds.has(alert.id)}
                  onOpenChange={() => toggleExpand(alert.id)}
                >
                  <div
                    className={`border rounded-lg overflow-hidden transition-all bg-gradient-to-br ${getSeverityGradient(alert.severity)} animate-fade-in hover:shadow-md`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`${getSeverityColor(alert.severity)} font-semibold shadow-sm`}
                            >
                              {alert.severity}
                            </Badge>
                            <span className="text-sm font-bold text-foreground">{alert.tool_name}</span>
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed">{alert.summary}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="font-medium">
                              {formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}
                            </span>
                            {alert.sent_to_slack && (
                              <Badge variant="outline" className="text-xs">✓ Sent to Slack</Badge>
                            )}
                            {alert.analysis && (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                <Brain className="w-3 h-3 mr-1" /> Analyzed
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
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
                              if (alert.analysis) {
                                toggleExpand(alert.id);
                              } else {
                                analyzeAlert(alert.id);
                              }
                            }}
                            disabled={analyzingIds.has(alert.id)}
                          >
                            {analyzingIds.has(alert.id) ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...
                              </>
                            ) : alert.analysis ? (
                              <>
                                <Brain className="w-3.5 h-3.5" />
                                {expandedIds.has(alert.id) ? "Hide" : "View"} Analysis
                              </>
                            ) : (
                              <>
                                <Brain className="w-3.5 h-3.5" /> Analyze
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <CollapsibleContent>
                      {alert.analysis && (
                        <div className="border-t border-border/30 bg-background/40 backdrop-blur-sm">
                          <div className="p-4 space-y-4">
                            {/* Analysis Section */}
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

                            {/* Remediation Section */}
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

                            {/* Re-analyze button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground hover:text-primary"
                              onClick={() => {
                                // Clear cached analysis and re-analyze
                                setAlerts((prev) =>
                                  prev.map((a) => a.id === alert.id ? { ...a, analysis: null, remediation: null } : a)
                                );
                                analyzeAlert(alert.id);
                              }}
                              disabled={analyzingIds.has(alert.id)}
                            >
                              <Brain className="w-3 h-3 mr-1" /> Re-analyze with latest context
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
