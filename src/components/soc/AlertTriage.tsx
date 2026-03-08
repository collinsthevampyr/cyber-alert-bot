import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle, CheckCircle, Eye, EyeOff, Clock, UserCheck, XCircle,
  MessageSquare, Shield, Loader2, ChevronRight
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "open", label: "Open", icon: AlertCircle, color: "text-warning" },
  { value: "acknowledged", label: "Acknowledged", icon: Eye, color: "text-info" },
  { value: "investigating", label: "Investigating", icon: UserCheck, color: "text-primary" },
  { value: "resolved", label: "Resolved", icon: CheckCircle, color: "text-success" },
  { value: "closed", label: "Closed", icon: XCircle, color: "text-muted-foreground" },
  { value: "false_positive", label: "False Positive", icon: EyeOff, color: "text-muted-foreground" },
];

export const AlertTriage = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [allCounts, setAllCounts] = useState({ open: 0, acknowledged: 0, investigating: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState<any[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadAlerts(); }, [statusFilter]);

  const loadAlerts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load filtered alerts
    let q = supabase.from("alerts").select("*").eq("user_id", user.id).order("detected_at", { ascending: false }).limit(100);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);

    // Load all alerts for global counts
    const [filtered, all] = await Promise.all([
      q,
      supabase.from("alerts").select("id, status").eq("user_id", user.id),
    ]);

    setAlerts(filtered.data || []);
    const allAlerts = all.data || [];
    setAllCounts({
      open: allAlerts.filter(a => a.status === "open").length,
      acknowledged: allAlerts.filter(a => a.status === "acknowledged").length,
      investigating: allAlerts.filter(a => a.status === "investigating").length,
      total: allAlerts.length,
    });
    setLoading(false);
  };

  const loadNotes = async (alertId: string) => {
    const { data } = await supabase.from("case_notes").select("*").eq("alert_id", alertId).order("created_at", { ascending: true });
    setNotes(data || []);
  };

  const updateStatus = async (alertId: string, status: string) => {
    const updates: any = { status };
    if (status === "acknowledged") updates.acknowledged_at = new Date().toISOString();
    if (status === "resolved") updates.resolved_at = new Date().toISOString();
    if (status === "closed") updates.closed_at = new Date().toISOString();
    if (status === "false_positive") updates.is_false_positive = true;

    const { error } = await supabase.from("alerts").update(updates).eq("id", alertId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Alert ${status.replace("_", " ")}` });
    loadAlerts();
    if (selectedAlert?.id === alertId) setSelectedAlert({ ...selectedAlert, ...updates });
  };

  const addNote = async () => {
    if (!noteText.trim() || !selectedAlert) return;
    setSavingNote(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("case_notes").insert({
      alert_id: selectedAlert.id,
      user_id: user.id,
      content: noteText,
      note_type: "investigation",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setNoteText(""); loadNotes(selectedAlert.id); toast({ title: "Note added" }); }
    setSavingNote(false);
  };

  const createSuppression = async (alert: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("suppression_rules").insert({
      user_id: user.id,
      name: `Suppress: ${alert.tool_name} - ${alert.summary.substring(0, 50)}`,
      conditions: { tool_name: alert.tool_name, summary_contains: alert.summary.substring(0, 50) },
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      await updateStatus(alert.id, "false_positive");
      toast({ title: "Suppression rule created", description: "Similar alerts will be suppressed" });
    }
  };

  const sevColor = (s: string) => {
    switch (s?.toLowerCase()) {
      case "critical": return "bg-destructive/10 text-destructive border-destructive/30";
      case "high": return "bg-warning/10 text-warning border-warning/30";
      case "medium": return "bg-info/10 text-info border-info/30";
      case "low": return "bg-success/10 text-success border-success/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusColor = (s: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === s);
    return opt?.color || "text-muted-foreground";
  };

  const counts = {
    open: alerts.filter(a => a.status === "open").length,
    acknowledged: alerts.filter(a => a.status === "acknowledged").length,
    investigating: alerts.filter(a => a.status === "investigating").length,
  };

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Open", count: counts.open, color: "text-warning" },
          { label: "Acknowledged", count: counts.acknowledged, color: "text-info" },
          { label: "Investigating", count: counts.investigating, color: "text-primary" },
          { label: "Total", count: alerts.length, color: "text-foreground" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{statusFilter === "all" || s.label === "Total" ? s.count : "—"}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">Alert Triage Queue</CardTitle>
              <CardDescription className="text-xs">Acknowledge, investigate, and resolve alerts</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No alerts with this status</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-1.5 pr-3">
                {alerts.map(alert => (
                  <div key={alert.id} className="border rounded-md hover:bg-secondary/30 transition-colors">
                    <div className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] ${sevColor(alert.severity)}`}>{alert.severity}</Badge>
                          <Badge variant="outline" className="text-[10px]">{alert.tool_name}</Badge>
                          <span className={`text-[10px] font-medium ${statusColor(alert.status)}`}>
                            {STATUS_OPTIONS.find(o => o.value === alert.status)?.label || alert.status}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 truncate">{alert.summary}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {alert.status === "open" && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(alert.id, "acknowledged")}>
                            <Eye className="w-3 h-3 mr-1" /> Ack
                          </Button>
                        )}
                        <Select onValueChange={(v) => updateStatus(alert.id, v)}>
                          <SelectTrigger className="w-24 text-xs h-7"><SelectValue placeholder="Status" /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedAlert(alert); loadNotes(alert.id); }}>
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle className="text-sm">Case Notes — {alert.tool_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <p className="text-xs text-muted-foreground">{alert.summary}</p>
                              <Separator />
                              <ScrollArea className="h-48">
                                {notes.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
                                ) : (
                                  <div className="space-y-2">
                                    {notes.map(n => (
                                      <div key={n.id} className="bg-muted/40 rounded p-2">
                                        <p className="text-xs text-foreground">{n.content}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </ScrollArea>
                              <div className="flex gap-2">
                                <Textarea placeholder="Add investigation note..." value={noteText} onChange={e => setNoteText(e.target.value)} className="text-xs min-h-[60px]" />
                              </div>
                              <div className="flex justify-between">
                                <Button size="sm" variant="outline" className="text-xs" onClick={() => createSuppression(alert)}>
                                  <EyeOff className="w-3 h-3 mr-1" /> Suppress Similar
                                </Button>
                                <Button size="sm" className="text-xs" onClick={addNote} disabled={savingNote || !noteText.trim()}>
                                  {savingNote ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Add Note
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
