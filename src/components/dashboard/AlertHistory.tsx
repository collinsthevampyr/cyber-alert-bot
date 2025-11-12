import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          Alert History
        </CardTitle>
        <CardDescription>Recent security threats detected</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No alerts yet. Configure monitoring to start detecting threats.
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="border border-border rounded-lg p-4 hover:bg-card/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <span className="font-medium text-foreground">{alert.tool_name}</span>
                    </div>
                    <p className="text-sm text-foreground">{alert.summary}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}</span>
                      {alert.sent_to_slack && (
                        <Badge variant="outline" className="text-xs">
                          Sent to Slack
                        </Badge>
                      )}
                    </div>
                  </div>
                  {alert.source_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
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
        )}
      </CardContent>
    </Card>
  );
};
