import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

interface MetricData {
  severity: string;
  mtta: number; // minutes
  mttr: number; // minutes
  count: number;
}

interface DailyMetric {
  date: string;
  mtta: number;
  mttr: number;
  alertCount: number;
}

export const SOCMetrics = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [overallMTTA, setOverallMTTA] = useState(0);
  const [overallMTTR, setOverallMTTR] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch all alerts for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: alerts } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true });

    if (!alerts?.length) {
      setLoading(false);
      return;
    }

    setTotalAlerts(alerts.length);

    // Calculate per-severity metrics
    const severityMap: Record<string, { ttaSum: number; ttrSum: number; ttaCount: number; ttrCount: number }> = {};
    const dailyMap: Record<string, { ttaSum: number; ttrSum: number; ttaCount: number; ttrCount: number; total: number }> = {};

    let globalTTASum = 0, globalTTACount = 0, globalTTRSum = 0, globalTTRCount = 0;

    for (const alert of alerts) {
      const sev = alert.severity || "Medium";
      if (!severityMap[sev]) severityMap[sev] = { ttaSum: 0, ttrSum: 0, ttaCount: 0, ttrCount: 0 };

      const dayKey = format(new Date(alert.created_at), "yyyy-MM-dd");
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { ttaSum: 0, ttrSum: 0, ttaCount: 0, ttrCount: 0, total: 0 };
      dailyMap[dayKey].total++;

      // MTTA: time from created_at to acknowledged_at
      if (alert.acknowledged_at) {
        const tta = differenceInMinutes(new Date(alert.acknowledged_at), new Date(alert.created_at));
        if (tta >= 0) {
          severityMap[sev].ttaSum += tta;
          severityMap[sev].ttaCount++;
          dailyMap[dayKey].ttaSum += tta;
          dailyMap[dayKey].ttaCount++;
          globalTTASum += tta;
          globalTTACount++;
        }
      }

      // MTTR: time from created_at to resolved_at or closed_at
      const resolvedAt = alert.resolved_at || alert.closed_at;
      if (resolvedAt) {
        const ttr = differenceInMinutes(new Date(resolvedAt), new Date(alert.created_at));
        if (ttr >= 0) {
          severityMap[sev].ttrSum += ttr;
          severityMap[sev].ttrCount++;
          dailyMap[dayKey].ttrSum += ttr;
          dailyMap[dayKey].ttrCount++;
          globalTTRSum += ttr;
          globalTTRCount++;
        }
      }
    }

    const sevOrder = ["Critical", "High", "Medium", "Low"];
    const metricsArr: MetricData[] = sevOrder
      .filter(s => severityMap[s])
      .map(s => ({
        severity: s,
        mtta: severityMap[s].ttaCount > 0 ? Math.round(severityMap[s].ttaSum / severityMap[s].ttaCount) : 0,
        mttr: severityMap[s].ttrCount > 0 ? Math.round(severityMap[s].ttrSum / severityMap[s].ttrCount) : 0,
        count: (alerts || []).filter(a => a.severity === s).length,
      }));

    const dailyArr: DailyMetric[] = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        mtta: d.ttaCount > 0 ? Math.round(d.ttaSum / d.ttaCount) : 0,
        mttr: d.ttrCount > 0 ? Math.round(d.ttrSum / d.ttrCount) : 0,
        alertCount: d.total,
      }));

    setMetrics(metricsArr);
    setDailyMetrics(dailyArr);
    setOverallMTTA(globalTTACount > 0 ? Math.round(globalTTASum / globalTTACount) : 0);
    setOverallMTTR(globalTTRCount > 0 ? Math.round(globalTTRSum / globalTTRCount) : 0);
    setLoading(false);
  };

  const formatTime = (mins: number) => {
    if (mins === 0) return "N/A";
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.round(mins / 60)}h ${mins % 60}m`;
    return `${Math.round(mins / 1440)}d ${Math.round((mins % 1440) / 60)}h`;
  };

  const sevColor = (s: string) => {
    switch (s) {
      case "Critical": return "bg-destructive/10 text-destructive";
      case "High": return "bg-warning/10 text-warning";
      case "Medium": return "bg-primary/10 text-primary";
      case "Low": return "bg-success/10 text-success";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) return <Card><CardContent className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">SOC Performance Metrics</h3>
        <p className="text-xs text-muted-foreground">MTTA, MTTR, and efficiency tracking over the last 30 days</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <BarChart3 className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold text-foreground">{totalAlerts}</p>
            <p className="text-[10px] text-muted-foreground">Total Alerts (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">{formatTime(overallMTTA)}</p>
            <p className="text-[10px] text-muted-foreground">Avg MTTA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold text-foreground">{formatTime(overallMTTR)}</p>
            <p className="text-[10px] text-muted-foreground">Avg MTTR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <BarChart3 className="w-4 h-4 mx-auto mb-1 text-warning" />
            <p className="text-lg font-bold text-foreground">
              {totalAlerts > 0 ? Math.round(((metrics.reduce((s, m) => s + (m.mttr > 0 ? 1 : 0), 0)) / Math.max(totalAlerts, 1)) * 100) : 0}%
            </p>
            <p className="text-[10px] text-muted-foreground">Resolution Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Severity Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Performance by Severity</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No acknowledged/resolved alerts to measure yet</p>
          ) : (
            <div className="space-y-2">
              {metrics.map(m => (
                <div key={m.severity} className="flex items-center gap-3 p-2 border rounded-md">
                  <Badge className={`text-[10px] ${sevColor(m.severity)}`}>{m.severity}</Badge>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs font-medium text-foreground">{m.count}</p>
                      <p className="text-[10px] text-muted-foreground">Alerts</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{formatTime(m.mtta)}</p>
                      <p className="text-[10px] text-muted-foreground">MTTA</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{formatTime(m.mttr)}</p>
                      <p className="text-[10px] text-muted-foreground">MTTR</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Daily Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {dailyMetrics.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No daily data yet</p>
            ) : (
              <div className="space-y-1">
                {dailyMetrics.slice(-14).map(d => (
                  <div key={d.date} className="flex items-center gap-2 text-xs py-1 border-b border-muted/30">
                    <span className="text-muted-foreground w-20">{format(new Date(d.date), "MMM d")}</span>
                    <Badge variant="outline" className="text-[10px]">{d.alertCount} alerts</Badge>
                    <span className="text-muted-foreground">MTTA: {formatTime(d.mtta)}</span>
                    <span className="text-muted-foreground">MTTR: {formatTime(d.mttr)}</span>
                    {/* Visual bar */}
                    <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded"
                        style={{ width: `${Math.min(100, (d.alertCount / Math.max(...dailyMetrics.map(x => x.alertCount), 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
