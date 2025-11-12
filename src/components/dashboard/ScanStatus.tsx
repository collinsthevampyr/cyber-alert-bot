import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const ScanStatus = () => {
  const [lastScan, setLastScan] = useState<any>(null);
  const [totalAlerts, setTotalAlerts] = useState(0);

  useEffect(() => {
    loadScanStatus();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel("scan_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scan_history",
        },
        () => {
          loadScanStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadScanStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: scans } = await supabase
      .from("scan_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (scans && scans.length > 0) {
      setLastScan(scans[0]);
    }

    const { count } = await supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    setTotalAlerts(count || 0);
  };

  const getStatusIcon = () => {
    if (!lastScan) return <Activity className="w-5 h-5 text-muted-foreground" />;
    
    switch (lastScan.status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "running":
        return <Activity className="w-5 h-5 text-info animate-pulse" />;
      case "error":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      default:
        return <Activity className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Scan Status</CardTitle>
          {getStatusIcon()}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {lastScan ? lastScan.status.charAt(0).toUpperCase() + lastScan.status.slice(1) : "No scans yet"}
          </div>
          <p className="text-xs text-muted-foreground">
            {lastScan?.error_message || "System operational"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Scan</CardTitle>
          <Clock className="w-5 h-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {lastScan ? formatDistanceToNow(new Date(lastScan.scan_started_at), { addSuffix: true }) : "Never"}
          </div>
          <p className="text-xs text-muted-foreground">
            {lastScan ? `${lastScan.alerts_found} alerts found` : "Configure monitoring to start"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          <AlertTriangle className="w-5 h-5 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAlerts}</div>
          <p className="text-xs text-muted-foreground">All time</p>
        </CardContent>
      </Card>
    </div>
  );
};
