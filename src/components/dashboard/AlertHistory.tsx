import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export const AlertHistory = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("alerts_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alerts",
        },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-critical/10 text-critical border-critical/20";
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "low":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getSeverityGradient = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "from-destructive/20 to-destructive/5 border-destructive/30 hover:border-destructive/50";
      case "high":
        return "from-orange-500/20 to-orange-500/5 border-orange-500/30 hover:border-orange-500/50";
      case "medium":
        return "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50";
      case "low":
        return "from-green-500/20 to-green-500/5 border-green-500/30 hover:border-green-500/50";
      default:
        return "from-secondary/20 to-secondary/5 border-secondary/30 hover:border-secondary/50";
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
            <CardDescription>Recent security threats detected</CardDescription>
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
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 space-y-3 hover-scale transition-all bg-gradient-to-br ${getSeverityGradient(alert.severity)} animate-fade-in hover:shadow-md`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
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
                          <Badge variant="outline" className="text-xs">
                            ✓ Sent to Slack
                          </Badge>
                        )}
                      </div>
                    </div>
                    {alert.source_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="hover-scale hover:bg-primary/10"
                      >
                        <a href={alert.source_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
