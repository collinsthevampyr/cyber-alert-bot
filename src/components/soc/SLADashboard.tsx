import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, AlertTriangle, CheckCircle, Timer } from "lucide-react";
import { differenceInMinutes } from "date-fns";

export const SLADashboard = () => {
  const [sla, setSla] = useState<any | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    critical_ack: "15", critical_resolve: "60",
    high_ack: "30", high_resolve: "240",
    medium_ack: "60", medium_resolve: "480",
    low_ack: "120", low_resolve: "1440",
  });
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("sla_config").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("alerts").select("*").eq("user_id", user.id).in("status", ["open", "acknowledged", "investigating"]).order("detected_at", { ascending: true }),
    ]);
    if (s) {
      setSla(s);
      setConfig({
        critical_ack: String(s.critical_ack_minutes),
        critical_resolve: String(s.critical_resolve_minutes),
        high_ack: String(s.high_ack_minutes),
        high_resolve: String(s.high_resolve_minutes),
        medium_ack: String(s.medium_ack_minutes),
        medium_resolve: String(s.medium_resolve_minutes),
        low_ack: String(s.low_ack_minutes),
        low_resolve: String(s.low_resolve_minutes),
      });
    }
    setAlerts(a || []);
    setLoading(false);
  };

  const saveSLA = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      user_id: user.id,
      critical_ack_minutes: parseInt(config.critical_ack),
      critical_resolve_minutes: parseInt(config.critical_resolve),
      high_ack_minutes: parseInt(config.high_ack),
      high_resolve_minutes: parseInt(config.high_resolve),
      medium_ack_minutes: parseInt(config.medium_ack),
      medium_resolve_minutes: parseInt(config.medium_resolve),
      low_ack_minutes: parseInt(config.low_ack),
      low_resolve_minutes: parseInt(config.low_resolve),
    };
    const { error } = sla
      ? await supabase.from("sla_config").update(payload).eq("id", sla.id)
      : await supabase.from("sla_config").insert(payload);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "SLA config saved" }); load(); }
    setSaving(false);
  };

  const getSLAStatus = (alert: any) => {
    if (!sla) return { ackStatus: "unknown", resolveStatus: "unknown" };
    const sev = alert.severity?.toLowerCase();
    const ackTarget = sla[`${sev}_ack_minutes`] || 60;
    const resolveTarget = sla[`${sev}_resolve_minutes`] || 480;
    const now = new Date();
    const detected = new Date(alert.detected_at);
    const ackMinutes = alert.acknowledged_at
      ? differenceInMinutes(new Date(alert.acknowledged_at), detected)
      : differenceInMinutes(now, detected);
    const resolveMinutes = alert.resolved_at
      ? differenceInMinutes(new Date(alert.resolved_at), detected)
      : differenceInMinutes(now, detected);

    return {
      ackStatus: alert.acknowledged_at
        ? (ackMinutes <= ackTarget ? "met" : "breached")
        : (ackMinutes > ackTarget ? "breached" : "at_risk"),
      resolveStatus: alert.resolved_at
        ? (resolveMinutes <= resolveTarget ? "met" : "breached")
        : (resolveMinutes > resolveTarget ? "breached" : "at_risk"),
      ackMinutes,
      resolveMinutes,
      ackTarget,
      resolveTarget,
    };
  };

  const breached = alerts.filter(a => {
    const s = getSLAStatus(a);
    return s.ackStatus === "breached" || s.resolveStatus === "breached";
  });

  const atRisk = alerts.filter(a => {
    const s = getSLAStatus(a);
    return s.ackStatus === "at_risk" || s.resolveStatus === "at_risk";
  });

  if (loading) return <Card><CardContent className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">SLA Tracking</h3>
        <p className="text-xs text-muted-foreground">Monitor time-to-acknowledge and time-to-resolve metrics</p>
      </div>

      {/* SLA summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{breached.length}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" /> SLA Breached</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-warning">{atRisk.length}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Timer className="w-3 h-3" /> At Risk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-success">{alerts.length - breached.length - atRisk.length}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> On Track</p>
          </CardContent>
        </Card>
      </div>

      {/* SLA config */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Clock className="w-4 h-4" /> SLA Targets (minutes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(["critical", "high", "medium", "low"] as const).map(sev => (
              <div key={sev} className="grid grid-cols-3 gap-2 items-center">
                <span className="text-xs font-medium capitalize text-foreground">{sev}</span>
                <div className="flex items-center gap-1">
                  <Input type="number" value={config[`${sev}_ack`]} onChange={e => setConfig(p => ({ ...p, [`${sev}_ack`]: e.target.value }))}
                    className="text-xs h-7" min={1} />
                  <span className="text-[10px] text-muted-foreground shrink-0">ack</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input type="number" value={config[`${sev}_resolve`]} onChange={e => setConfig(p => ({ ...p, [`${sev}_resolve`]: e.target.value }))}
                    className="text-xs h-7" min={1} />
                  <span className="text-[10px] text-muted-foreground shrink-0">resolve</span>
                </div>
              </div>
            ))}
            <Button size="sm" className="text-xs" onClick={saveSLA} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Save SLA Config
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Breached alerts */}
      {breached.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> SLA Breached Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {breached.slice(0, 10).map(a => {
                const s = getSLAStatus(a);
                return (
                  <div key={a.id} className="border border-destructive/20 rounded p-2 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs text-foreground truncate">{a.summary}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{a.severity}</Badge>
                        <span>ACK: {s.ackMinutes}m / {s.ackTarget}m</span>
                        <span>RES: {s.resolveMinutes}m / {s.resolveTarget}m</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
