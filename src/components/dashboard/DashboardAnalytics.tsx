import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, PieChart as PieChartIcon, Activity } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

export const DashboardAnalytics = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [a, s] = await Promise.all([
        supabase.from("alerts").select("*").eq("user_id", user.id).order("detected_at", { ascending: false }),
        supabase.from("scan_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setAlerts(a.data || []);
      setScans(s.data || []);
      setLoading(false);
    })();
  }, []);

  const alertTrends = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return { date: format(date, "MMM dd"), start: startOfDay(date).getTime(), critical: 0, high: 0, medium: 0, low: 0 };
    });
    alerts.forEach((alert) => {
      const t = new Date(alert.detected_at).getTime();
      const day = days.find((d, i) => t >= d.start && t < (i < days.length - 1 ? days[i + 1].start : Infinity));
      if (day) { const s = alert.severity?.toLowerCase(); if (s in day) (day as any)[s]++; }
    });
    return days;
  })();

  const severityDist = (() => {
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    alerts.forEach((a) => { const s = a.severity?.toLowerCase(); if (s in c) c[s]++; });
    return Object.entries(c).map(([n, v]) => ({ name: n.charAt(0).toUpperCase() + n.slice(1), value: v })).filter(d => d.value > 0);
  })();

  const SEV_COLORS: Record<string, string> = { Critical: "#e54545", High: "#e57a1a", Medium: "#d4a017", Low: "#3d9a50" };

  const scanTimeline = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return { date: format(date, "MMM dd"), start: startOfDay(date).getTime(), success: 0, failed: 0, alerts: 0 };
    });
    scans.forEach((scan) => {
      const t = new Date(scan.created_at).getTime();
      const day = days.find((d, i) => t >= d.start && t < (i < days.length - 1 ? days[i + 1].start : Infinity));
      if (day) { if (scan.status === "completed") day.success++; else if (scan.status === "error") day.failed++; day.alerts += scan.alerts_found || 0; }
    });
    return days;
  })();

  const scanStats = (() => {
    const completed = scans.filter(s => s.status === "completed").length;
    const total = scans.length;
    return { completed, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  })();

  if (loading) return <div className="h-20 flex items-center justify-center text-sm text-muted-foreground">Loading analytics...</div>;
  if (alerts.length === 0 && scans.length === 0) return null;

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md text-xs">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>{p.dataKey}: {p.value}</p>
        ))}
      </div>
    );
  };

  const axisStyle = { fill: "hsl(215, 12%, 52%)", fontSize: 11 };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total alerts", value: alerts.length },
          { label: "Total scans", value: scans.length },
          { label: "Scan success", value: `${scanStats.rate}%` },
          { label: "Critical", value: alerts.filter(a => a.severity?.toLowerCase() === "critical").length },
        ].map(({ label, value }) => (
          <Card key={label} className="bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" /> Alert trends — 7 days
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={alertTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 16%)" />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="critical" stackId="a" fill="#e54545" />
                <Bar dataKey="high" stackId="a" fill="#e57a1a" />
                <Bar dataKey="medium" stackId="a" fill="#d4a017" />
                <Bar dataKey="low" stackId="a" fill="#3d9a50" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2">
              {["Critical", "High", "Medium", "Low"].map(s => (
                <div key={s} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-2 h-2 rounded-sm" style={{ background: SEV_COLORS[s] }} /> {s}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <PieChartIcon className="w-3.5 h-3.5" /> Severity breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {severityDist.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="45%" height={200}>
                  <PieChart>
                    <Pie data={severityDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} strokeWidth={0}>
                      {severityDist.map((e) => <Cell key={e.name} fill={SEV_COLORS[e.name] || "#555"} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {severityDist.map(({ name, value }) => (
                    <div key={name} className="flex items-center gap-2 text-sm">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: SEV_COLORS[name] }} />
                      <span className="text-foreground">{name}</span>
                      <span className="text-muted-foreground ml-auto tabular-nums">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-center text-sm text-muted-foreground py-8">No alerts yet</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Activity className="w-3.5 h-3.5" /> Scan activity — 7 days
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={scanTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 16%)" />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="success" stroke="#3d9a50" strokeWidth={1.5} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="failed" stroke="#e54545" strokeWidth={1.5} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="alerts" stroke="#d4a017" strokeWidth={1.5} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2">
              {[{ l: "Successful", c: "#3d9a50" }, { l: "Failed", c: "#e54545" }, { l: "Alerts", c: "#d4a017" }].map(({ l, c }) => (
                <div key={l} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-2 h-2 rounded-full" style={{ background: c }} /> {l}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
