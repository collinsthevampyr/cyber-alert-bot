import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, PieChart as PieChartIcon, Activity } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

export const DashboardAnalytics = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [alertsRes, scansRes] = await Promise.all([
      supabase.from("alerts").select("*").eq("user_id", user.id).order("detected_at", { ascending: false }),
      supabase.from("scan_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    setAlerts(alertsRes.data || []);
    setScans(scansRes.data || []);
    setLoading(false);
  };

  // Alert trends over last 7 days
  const alertTrends = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return { date: format(date, "MMM dd"), start: startOfDay(date).getTime(), critical: 0, high: 0, medium: 0, low: 0 };
    });

    alerts.forEach((alert) => {
      const alertTime = new Date(alert.detected_at).getTime();
      const day = days.find((d, i) => {
        const nextStart = i < days.length - 1 ? days[i + 1].start : Infinity;
        return alertTime >= d.start && alertTime < nextStart;
      });
      if (day) {
        const sev = alert.severity?.toLowerCase() as keyof typeof day;
        if (sev in day && typeof day[sev] === "number") {
          (day as any)[sev]++;
        }
      }
    });

    return days;
  })();

  // Severity distribution
  const severityDistribution = (() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    alerts.forEach((a) => {
      const sev = a.severity?.toLowerCase();
      if (sev in counts) counts[sev]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).filter(d => d.value > 0);
  })();

  const SEVERITY_COLORS: Record<string, string> = {
    Critical: "hsl(0, 84%, 60%)",
    High: "hsl(25, 95%, 53%)",
    Medium: "hsl(38, 92%, 50%)",
    Low: "hsl(142, 76%, 36%)",
  };

  // Scan success rate
  const scanStats = (() => {
    const completed = scans.filter(s => s.status === "completed").length;
    const errored = scans.filter(s => s.status === "error").length;
    const running = scans.filter(s => s.status === "running").length;
    const total = scans.length;
    return { completed, errored, running, total, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  })();

  // Scan timeline
  const scanTimeline = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return { date: format(date, "MMM dd"), start: startOfDay(date).getTime(), success: 0, failed: 0, alerts: 0 };
    });

    scans.forEach((scan) => {
      const scanTime = new Date(scan.created_at).getTime();
      const day = days.find((d, i) => {
        const nextStart = i < days.length - 1 ? days[i + 1].start : Infinity;
        return scanTime >= d.start && scanTime < nextStart;
      });
      if (day) {
        if (scan.status === "completed") day.success++;
        else if (scan.status === "error") day.failed++;
        day.alerts += scan.alerts_found || 0;
      }
    });

    return days;
  })();

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-8 text-center text-muted-foreground">Loading analytics...</CardContent>
      </Card>
    );
  }

  const hasData = alerts.length > 0 || scans.length > 0;

  if (!hasData) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Run your first scan to see analytics data here.
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }} className="text-xs">
            {p.dataKey.charAt(0).toUpperCase() + p.dataKey.slice(1)}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Alerts", value: alerts.length, color: "text-destructive" },
          { label: "Total Scans", value: scans.length, color: "text-primary" },
          { label: "Scan Success", value: `${scanStats.successRate}%`, color: "text-[hsl(var(--success))]" },
          { label: "Critical Alerts", value: alerts.filter(a => a.severity?.toLowerCase() === "critical").length, color: "text-destructive" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alert Trends */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all hover:border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Alert Trends (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={alertTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 20%)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(189, 20%, 60%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(189, 20%, 60%)", fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="critical" stackId="a" fill="hsl(0, 84%, 60%)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="high" stackId="a" fill="hsl(25, 95%, 53%)" />
                <Bar dataKey="medium" stackId="a" fill="hsl(38, 92%, 50%)" />
                <Bar dataKey="low" stackId="a" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-2 justify-center flex-wrap">
              {["Critical", "High", "Medium", "Low"].map(s => (
                <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: SEVERITY_COLORS[s] }} />
                  {s}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all hover:border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-primary" /> Severity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {severityDistribution.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie data={severityDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {severityDistribution.map((entry) => (
                        <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || "#666"} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {severityDistribution.map(({ name, value }) => (
                    <div key={name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background: SEVERITY_COLORS[name] }} />
                      <span className="text-sm text-foreground">{name}</span>
                      <Badge variant="secondary" className="text-xs">{value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No alerts to analyze</p>
            )}
          </CardContent>
        </Card>

        {/* Scan Timeline */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all hover:border-primary/20 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Scan Activity (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={scanTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 20%)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(189, 20%, 60%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(189, 20%, 60%)", fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="success" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="failed" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="alerts" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              {[
                { label: "Successful", color: "hsl(142, 76%, 36%)" },
                { label: "Failed", color: "hsl(0, 84%, 60%)" },
                { label: "Alerts Found", color: "hsl(38, 92%, 50%)" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
