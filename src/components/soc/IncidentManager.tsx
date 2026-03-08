import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Plus, Layers, Loader2, AlertCircle, MessageSquare, CheckCircle } from "lucide-react";

export const IncidentManager = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState("Medium");
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [incidentAlerts, setIncidentAlerts] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: inc }, { data: al }] = await Promise.all([
      supabase.from("incidents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("alerts").select("*").eq("user_id", user.id).is("incident_id", null).order("detected_at", { ascending: false }).limit(50),
    ]);
    setIncidents(inc || []);
    setAlerts(al || []);
    setLoading(false);
  };

  const createIncident = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("incidents").insert({
      user_id: user.id,
      title: newTitle,
      description: newDesc,
      severity: newSeverity,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setNewTitle(""); setNewDesc(""); setDialogOpen(false); toast({ title: "Incident created" }); load(); }
    setCreating(false);
  };

  const correlateAlert = async (alertId: string, incidentId: string) => {
    const { error } = await supabase.from("alerts").update({ incident_id: incidentId }).eq("id", alertId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Alert linked to incident" }); load(); if (selectedIncident?.id === incidentId) loadIncidentDetails(incidentId); }
  };

  const loadIncidentDetails = async (incidentId: string) => {
    const [{ data: al }, { data: cn }] = await Promise.all([
      supabase.from("alerts").select("*").eq("incident_id", incidentId).order("detected_at", { ascending: false }),
      supabase.from("case_notes").select("*").eq("incident_id", incidentId).order("created_at", { ascending: true }),
    ]);
    setIncidentAlerts(al || []);
    setNotes(cn || []);
  };

  const addNote = async () => {
    if (!noteText.trim() || !selectedIncident) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("case_notes").insert({
      incident_id: selectedIncident.id,
      user_id: user.id,
      content: noteText,
      note_type: "handover",
    });
    setNoteText("");
    loadIncidentDetails(selectedIncident.id);
  };

  const updateIncidentStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "resolved") updates.resolved_at = new Date().toISOString();
    if (status === "closed") updates.closed_at = new Date().toISOString();
    await supabase.from("incidents").update(updates).eq("id", id);
    load();
    toast({ title: `Incident ${status}` });
  };

  const sevColor = (s: string) => {
    switch (s?.toLowerCase()) {
      case "critical": return "bg-destructive/10 text-destructive border-destructive/30";
      case "high": return "bg-warning/10 text-warning border-warning/30";
      case "medium": return "bg-info/10 text-info border-info/30";
      default: return "bg-success/10 text-success border-success/30";
    }
  };

  if (loading) return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Incidents</h3>
          <p className="text-xs text-muted-foreground">Group related alerts into incidents for coordinated response</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs"><Plus className="w-3 h-3 mr-1" /> New Incident</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-sm">Create Incident</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Incident title" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="text-sm" />
              <Textarea placeholder="Description..." value={newDesc} onChange={e => setNewDesc(e.target.value)} className="text-sm min-h-[80px]" />
              <Select value={newSeverity} onValueChange={setNewSeverity}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Critical", "High", "Medium", "Low"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button className="w-full text-xs" onClick={createIncident} disabled={creating}>
                {creating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Incidents list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><Layers className="w-4 h-4" /> Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {incidents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No incidents created yet</p>
              ) : (
                <div className="space-y-2">
                  {incidents.map(inc => (
                    <button
                      key={inc.id}
                      onClick={() => { setSelectedIncident(inc); loadIncidentDetails(inc.id); }}
                      className={`w-full text-left border rounded-md p-3 hover:bg-secondary/30 transition-colors ${selectedIncident?.id === inc.id ? "border-primary bg-secondary/20" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-[10px] ${sevColor(inc.severity)}`}>{inc.severity}</Badge>
                        <span className="text-[10px] text-muted-foreground capitalize">{inc.status}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{inc.title}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(inc.created_at), { addSuffix: true })}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Incident detail / correlation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {selectedIncident ? selectedIncident.title : "Select an incident"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedIncident ? (
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {["open", "investigating", "resolved", "closed"].map(s => (
                    <Button key={s} size="sm" variant={selectedIncident.status === s ? "default" : "outline"} className="text-xs h-7 capitalize"
                      onClick={() => updateIncidentStatus(selectedIncident.id, s)}>{s}</Button>
                  ))}
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Correlated Alerts ({incidentAlerts.length})</p>
                  <ScrollArea className="h-28">
                    {incidentAlerts.map(a => (
                      <div key={a.id} className="flex items-center gap-2 py-1 text-xs">
                        <Badge variant="outline" className={`text-[10px] ${sevColor(a.severity)}`}>{a.severity}</Badge>
                        <span className="truncate text-foreground/80">{a.summary}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Link unassigned alert</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {alerts.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-2">No unassigned alerts</p>
                    ) : alerts.map(a => (
                      <button key={a.id} onClick={() => correlateAlert(a.id, selectedIncident.id)}
                        className="w-full text-left flex items-center gap-2 py-1.5 px-2 rounded hover:bg-secondary/40 text-xs cursor-pointer">
                        <AlertCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{a.tool_name}: {a.summary}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Shift Handover Notes</p>
                  <ScrollArea className="h-24">
                    {notes.map(n => (
                      <div key={n.id} className="bg-muted/40 rounded p-2 mb-1">
                        <p className="text-xs">{n.content}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                      </div>
                    ))}
                  </ScrollArea>
                  <div className="flex gap-2 mt-2">
                    <Textarea placeholder="Handover note..." value={noteText} onChange={e => setNoteText(e.target.value)} className="text-xs min-h-[40px]" />
                    <Button size="sm" className="text-xs shrink-0" onClick={addNote} disabled={!noteText.trim()}>Add</Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-12">Select an incident to view details, correlate alerts, and add notes</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
