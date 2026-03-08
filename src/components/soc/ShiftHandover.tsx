import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ClipboardList, ArrowRightLeft, Sparkles } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export const ShiftHandover = () => {
  const [handovers, setHandovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState("");
  const [keyFindings, setKeyFindings] = useState("");
  const [pendingActions, setPendingActions] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("shift_handovers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setHandovers(data || []);
    setLoading(false);
  };

  const generateSummary = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch current shift stats
      const now = new Date();
      const shiftStart = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8-hour shift

      const [alertsRes, incidentsRes, actionsRes] = await Promise.all([
        supabase.from("alerts").select("*").eq("user_id", user.id).gte("created_at", shiftStart.toISOString()),
        supabase.from("incidents").select("*").eq("user_id", user.id).gte("created_at", shiftStart.toISOString()),
        supabase.from("response_actions").select("*").eq("user_id", user.id).gte("created_at", shiftStart.toISOString()),
      ]);

      const alerts = alertsRes.data || [];
      const incidents = incidentsRes.data || [];
      const actions = actionsRes.data || [];

      const openAlerts = alerts.filter(a => a.status === "open");
      const escalated = alerts.filter(a => a.status === "acknowledged");
      const resolved = alerts.filter(a => a.status === "resolved" || a.status === "closed");
      const criticalAlerts = alerts.filter(a => a.severity === "Critical" || a.severity === "High");

      const autoSummary = [
        `Shift period: ${format(shiftStart, "HH:mm")} – ${format(now, "HH:mm")} (${format(now, "MMM d, yyyy")})`,
        `Total alerts: ${alerts.length} (${openAlerts.length} open, ${escalated.length} escalated, ${resolved.length} resolved)`,
        criticalAlerts.length > 0 ? `⚠️ ${criticalAlerts.length} Critical/High severity alerts requiring attention` : "No critical alerts during this shift",
        incidents.length > 0 ? `${incidents.length} incidents created/updated` : "No new incidents",
        actions.length > 0 ? `${actions.length} response actions executed` : "No response actions taken",
      ].join("\n");

      const findingsList = criticalAlerts.map(a => `• [${a.severity}] ${a.tool_name}: ${a.summary}`).join("\n") || "No critical findings this shift.";

      const pendingList = openAlerts.map(a => `• [${a.severity}] ${a.tool_name}: ${a.summary} (${a.status})`).join("\n") || "No pending actions.";

      setSummary(autoSummary);
      setKeyFindings(findingsList);
      setPendingActions(pendingList);
      toast({ title: "Summary generated", description: "Review and edit before submitting" });
    } catch (err) {
      toast({ title: "Error generating summary", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const createHandover = async () => {
    if (!summary.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    const now = new Date();
    const shiftStart = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    // Count stats
    const { count: openCount } = await supabase.from("alerts").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "open");
    const { count: escCount } = await supabase.from("alerts").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "acknowledged");
    const { count: resCount } = await supabase.from("alerts").select("*", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["resolved", "closed"]).gte("created_at", shiftStart.toISOString());

    const { error } = await supabase.from("shift_handovers").insert({
      user_id: user.id,
      shift_start: shiftStart.toISOString(),
      shift_end: now.toISOString(),
      open_alerts_count: openCount || 0,
      escalated_count: escCount || 0,
      resolved_count: resCount || 0,
      summary,
      key_findings: keyFindings || null,
      pending_actions: pendingActions || null,
      notes: notes || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Handover submitted" });
      setSummary(""); setKeyFindings(""); setPendingActions(""); setNotes("");
      load();
    }
    setCreating(false);
  };

  if (loading) return <Card><CardContent className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ArrowRightLeft className="w-4 h-4" /> Create Shift Handover
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" className="text-xs" onClick={generateSummary} disabled={generating}>
            {generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            Auto-generate Summary
          </Button>

          <div>
            <label className="text-xs font-medium text-foreground">Shift Summary *</label>
            <Textarea placeholder="Overview of shift activity..." value={summary} onChange={e => setSummary(e.target.value)} className="text-sm mt-1" rows={4} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Key Findings</label>
            <Textarea placeholder="Critical discoveries, patterns noticed..." value={keyFindings} onChange={e => setKeyFindings(e.target.value)} className="text-sm mt-1" rows={3} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Pending Actions</label>
            <Textarea placeholder="Items requiring follow-up by next shift..." value={pendingActions} onChange={e => setPendingActions(e.target.value)} className="text-sm mt-1" rows={3} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Additional Notes</label>
            <Textarea placeholder="Context, tooling issues, etc." value={notes} onChange={e => setNotes(e.target.value)} className="text-sm mt-1" rows={2} />
          </div>
          <Button className="w-full text-xs" onClick={createHandover} disabled={creating || !summary.trim()}>
            {creating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Submit Handover
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" /> Handover History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {handovers.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No handovers yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first shift handover above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {handovers.map(h => (
                  <div key={h.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(h.shift_start), "MMM d HH:mm")} → {format(new Date(h.shift_end), "HH:mm")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[10px]">Open: {h.open_alerts_count}</Badge>
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning">Escalated: {h.escalated_count}</Badge>
                      <Badge variant="outline" className="text-[10px] bg-success/10 text-success">Resolved: {h.resolved_count}</Badge>
                    </div>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{h.summary}</p>
                    {h.key_findings && (
                      <div className="text-xs bg-muted/50 p-2 rounded">
                        <span className="font-medium">Key Findings:</span>
                        <p className="text-muted-foreground whitespace-pre-wrap mt-0.5">{h.key_findings}</p>
                      </div>
                    )}
                    {h.pending_actions && (
                      <div className="text-xs bg-warning/5 p-2 rounded border border-warning/20">
                        <span className="font-medium">⚡ Pending Actions:</span>
                        <p className="text-muted-foreground whitespace-pre-wrap mt-0.5">{h.pending_actions}</p>
                      </div>
                    )}
                    {h.notes && <p className="text-[10px] text-muted-foreground italic">{h.notes}</p>}
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
