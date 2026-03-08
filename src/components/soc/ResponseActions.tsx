import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Shield, Ban, UserX, Server, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ACTION_TYPES = [
  { value: "block_ip", label: "Block IP", icon: Ban },
  { value: "disable_account", label: "Disable Account", icon: UserX },
  { value: "isolate_host", label: "Isolate Host", icon: Server },
  { value: "block_domain", label: "Block Domain", icon: Ban },
  { value: "custom", label: "Custom Action", icon: Zap },
];

export const ResponseActions = () => {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionType, setActionType] = useState("block_ip");
  const [target, setTarget] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase.channel("response_actions_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "response_actions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("response_actions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setActions(data || []);
    setLoading(false);
  };

  const createAction = async () => {
    if (!target.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("response_actions").insert({
      user_id: user.id,
      action_type: actionType,
      target,
      status: "pending",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setTarget(""); toast({ title: "Response action queued" }); load(); }
    setCreating(false);
  };

  const executeAction = async (id: string) => {
    // Simulate execution — in production this would call an integration
    await supabase.from("response_actions").update({
      status: "executed",
      executed_at: new Date().toISOString(),
      result: { message: "Action executed successfully (simulated)" },
    }).eq("id", id);
    toast({ title: "Action executed" });
    load();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-warning/10 text-warning border-warning/30";
      case "executed": return "bg-success/10 text-success border-success/30";
      case "failed": return "bg-destructive/10 text-destructive border-destructive/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) return <Card><CardContent className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Automated Response Actions</h3>
        <p className="text-xs text-muted-foreground">Block IPs, disable accounts, isolate hosts via integrations</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger className="w-40 text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Target (IP, hostname, account...)" value={target} onChange={e => setTarget(e.target.value)} className="text-xs h-8 flex-1" />
            <Button size="sm" className="text-xs h-8" onClick={createAction} disabled={creating || !target.trim()}>
              <Plus className="w-3 h-3 mr-1" /> Queue Action
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Shield className="w-4 h-4" /> Action History ({actions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No response actions taken</p>
            ) : (
              <div className="space-y-2">
                {actions.map(action => {
                  const typeInfo = ACTION_TYPES.find(t => t.value === action.action_type);
                  const Icon = typeInfo?.icon || Zap;
                  return (
                    <div key={action.id} className="border rounded-md p-3 flex items-center justify-between">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground">{typeInfo?.label || action.action_type}</span>
                          <Badge variant="outline" className={`text-[10px] ${statusColor(action.status)}`}>{action.status}</Badge>
                        </div>
                        <p className="text-xs text-foreground/80 font-mono">{action.target}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}</p>
                      </div>
                      {action.status === "pending" && (
                        <Button size="sm" variant="outline" className="text-xs h-7 shrink-0" onClick={() => executeAction(action.id)}>
                          <Zap className="w-3 h-3 mr-1" /> Execute
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
