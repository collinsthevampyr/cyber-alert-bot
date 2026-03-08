import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";

export const ScanStatus = () => {
  const [lastScan, setLastScan] = useState<any>(null);
  const [totalAlerts, setTotalAlerts] = useState(0);

  useEffect(() => {
    loadScanStatus();
    const channel = supabase.channel("scan_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "scan_history" }, () => loadScanStatus())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadScanStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: scans } = await supabase.from("scan_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
    if (scans?.length) setLastScan(scans[0]);
    const { count } = await supabase.from("alerts").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    setTotalAlerts(count || 0);
  };

  const statusIcon = (() => {
    if (!lastScan) return <Activity className="w-4 h-4 text-muted-foreground" />;
    if (lastScan.status === "completed") return <CheckCircle className="w-4 h-4 text-success" />;
    if (lastScan.status === "running") return <Activity className="w-4 h-4 text-info animate-pulse" />;
    if (lastScan.status === "error") return <AlertTriangle className="w-4 h-4 text-destructive" />;
    return <Activity className="w-4 h-4 text-muted-foreground" />;
  })();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">Scan status</CardTitle>
          {statusIcon}
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xl font-semibold text-foreground">
            {lastScan ? lastScan.status.charAt(0).toUpperCase() + lastScan.status.slice(1) : "No scans"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{lastScan?.error_message || "Operational"}</p>
          {lastScan?.status === "running" && <Progress value={66} className="h-0.5 mt-3" />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">Last scan</CardTitle>
          <Clock className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xl font-semibold text-foreground">
            {lastScan ? formatDistanceToNow(new Date(lastScan.scan_started_at), { addSuffix: true }) : "Never"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lastScan ? `${lastScan.alerts_found} alerts found` : "Configure to start"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">Total alerts</CardTitle>
          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xl font-semibold text-foreground tabular-nums">{totalAlerts}</p>
          <p className="text-xs text-muted-foreground mt-0.5">All time</p>
        </CardContent>
      </Card>
    </div>
  );
};
