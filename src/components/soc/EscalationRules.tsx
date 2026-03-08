import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Trash2, Bell, Clock } from "lucide-react";

export const EscalationRules = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [severity, setSeverity] = useState("Critical");
  const [channelId, setChannelId] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from("escalation_rules").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("notification_channels").select("*").eq("user_id", user.id),
    ]);
    setRules(r || []);
    setChannels(c || []);
    setLoading(false);
  };

  const createRule = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("escalation_rules").insert({
      user_id: user.id,
      name,
      severity_filter: [severity],
      escalate_after_minutes: parseInt(minutes),
      notify_channel_id: channelId || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setName(""); toast({ title: "Escalation rule created" }); load(); }
    setCreating(false);
  };

  const toggleRule = async (id: string, active: boolean) => {
    await supabase.from("escalation_rules").update({ is_active: !active }).eq("id", id);
    load();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("escalation_rules").delete().eq("id", id);
    load();
    toast({ title: "Rule deleted" });
  };

  if (loading) return <Card><CardContent className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Escalation Rules</h3>
        <p className="text-xs text-muted-foreground">Auto-escalate unacknowledged alerts after a time threshold</p>
      </div>

      {/* Create rule */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Input placeholder="Rule name" value={name} onChange={e => setName(e.target.value)} className="text-sm" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Critical", "High", "Medium", "Low"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} className="text-xs h-8" min={1} />
              <span className="text-xs text-muted-foreground shrink-0">min</span>
            </div>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Notify channel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No channel</SelectItem>
                {channels.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="text-xs" onClick={createRule} disabled={creating || !name.trim()}>
            <Plus className="w-3 h-3 mr-1" /> Create Rule
          </Button>
        </CardContent>
      </Card>

      {/* Rules list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Bell className="w-4 h-4" /> Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[350px]">
            {rules.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No escalation rules defined</p>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id} className="border rounded-md p-3 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{rule.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{(rule.severity_filter as string[])?.join(", ")}</Badge>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {rule.escalate_after_minutes}m</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule.id, rule.is_active)} />
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
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
