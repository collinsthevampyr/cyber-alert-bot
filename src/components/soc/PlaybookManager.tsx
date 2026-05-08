import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Loader2, Trash2, GripVertical, Play } from "lucide-react";

export const PlaybookManager = () => {
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [triggerSeverity, setTriggerSeverity] = useState("Critical");
  const [triggerTool, setTriggerTool] = useState("");
  const [stepTitle, setStepTitle] = useState("");
  const [stepDesc, setStepDesc] = useState("");
  const [stepType, setStepType] = useState("manual");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("playbooks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPlaybooks(data || []);
    setLoading(false);
  };

  const loadSteps = async (playbookId: string) => {
    const { data } = await supabase.from("playbook_steps").select("*").eq("playbook_id", playbookId).order("step_order", { ascending: true });
    setSteps(data || []);
  };

  const createPlaybook = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("playbooks").insert({
      user_id: user.id,
      name,
      description: desc,
      trigger_conditions: { severity: triggerSeverity, tool_name: triggerTool || undefined },
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setName(""); setDesc(""); setDialogOpen(false); toast({ title: "Playbook created" }); load(); }
    setCreating(false);
  };

  const addStep = async () => {
    if (!stepTitle.trim() || !selected) return;
    const { error } = await supabase.from("playbook_steps").insert({
      playbook_id: selected.id,
      step_order: steps.length + 1,
      title: stepTitle,
      description: stepDesc,
      action_type: stepType,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setStepTitle(""); setStepDesc(""); loadSteps(selected.id); }
  };

  const deleteStep = async (stepId: string) => {
    await supabase.from("playbook_steps").delete().eq("id", stepId);
    if (selected) loadSteps(selected.id);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("playbooks").update({ is_active: !active }).eq("id", id);
    load();
  };

  const deletePlaybook = async (id: string) => {
    await supabase.from("playbooks").delete().eq("id", id);
    if (selected?.id === id) { setSelected(null); setSteps([]); }
    load();
    toast({ title: "Playbook deleted" });
  };

  const executePlaybook = async (playbookId: string, alertId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("playbook_executions").insert({
      playbook_id: playbookId,
      user_id: user.id,
      alert_id: alertId || null,
      status: "running",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Playbook execution started" });
  };

  if (loading) return <Card><CardContent className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Incident Response Playbooks</h3>
          <p className="text-xs text-muted-foreground">Define step-by-step runbooks for threat types</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs"><Plus className="w-3 h-3 mr-1" /> New Playbook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-sm">Create Playbook</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Playbook name" value={name} onChange={e => setName(e.target.value)} className="text-sm" />
              <Textarea placeholder="Description..." value={desc} onChange={e => setDesc(e.target.value)} className="text-sm min-h-[60px]" />
              <Select value={triggerSeverity} onValueChange={setTriggerSeverity}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Trigger severity" /></SelectTrigger>
                <SelectContent>
                  {["Critical", "High", "Medium", "Low"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Trigger tool name (optional)" value={triggerTool} onChange={e => setTriggerTool(e.target.value)} className="text-sm" />
              <Button className="w-full text-xs" onClick={createPlaybook} disabled={creating}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> Playbooks</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px]">
              {playbooks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No playbooks defined</p>
              ) : (
                <div className="space-y-2">
                  {playbooks.map(pb => (
                    <div key={pb.id}
                      className={`border rounded-md p-3 hover:bg-secondary/30 transition-colors cursor-pointer ${selected?.id === pb.id ? "border-primary bg-secondary/20" : ""}`}
                      onClick={() => { setSelected(pb); loadSteps(pb.id); }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{pb.name}</p>
                          <Badge variant="outline" className="text-[10px]">{(pb.trigger_conditions as any)?.severity || "Any"}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={pb.is_active} onCheckedChange={() => toggleActive(pb.id, pb.is_active)} />
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); deletePlaybook(pb.id); }}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {pb.description && <p className="text-xs text-muted-foreground mt-1 truncate">{pb.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{selected ? `Steps — ${selected.name}` : "Select a playbook"}</CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-3">
                <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => executePlaybook(selected.id)}>
                  <Play className="w-3 h-3 mr-1" /> Execute Playbook
                </Button>
                <ScrollArea className="h-52">
                  {steps.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No steps defined</p>
                  ) : (
                    <div className="space-y-1.5">
                      {steps.map((step, i) => (
                        <div key={step.id} className="flex items-start gap-2 bg-muted/30 rounded p-2">
                          <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">{step.title}</p>
                            {step.description && <p className="text-[10px] text-muted-foreground">{step.description}</p>}
                            <Badge variant="outline" className="text-[10px] mt-1">{step.action_type}</Badge>
                          </div>
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0" onClick={() => deleteStep(step.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="space-y-2 border-t pt-3">
                  <Input placeholder="Step title" value={stepTitle} onChange={e => setStepTitle(e.target.value)} className="text-xs h-8" />
                  <Textarea placeholder="Step description" value={stepDesc} onChange={e => setStepDesc(e.target.value)} className="text-xs min-h-[40px]" />
                  <div className="flex gap-2">
                    <Select value={stepType} onValueChange={setStepType}>
                      <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="automated">Automated</SelectItem>
                        <SelectItem value="approval">Requires Approval</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="text-xs h-8" onClick={addStep} disabled={!stepTitle.trim()}>Add Step</Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-12">Select a playbook to manage steps</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
