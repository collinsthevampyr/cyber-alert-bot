import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Trash2, MessageSquare, Mail, Hash, TestTube } from "lucide-react";

const SLACK_WEBHOOK_PATTERN = /^https:\/\/hooks\.slack\.com\/services\//;
const DISCORD_WEBHOOK_PATTERN = /^https:\/\/discord(app)?\.com\/api\/webhooks\//;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Channel { id: string; channel_type: string; name: string; config: any; is_active: boolean; created_at: string; }

const icons: Record<string, any> = { slack: MessageSquare, discord: Hash, email: Mail };
const labels: Record<string, string> = { slack: "Slack", discord: "Discord", email: "Email" };

export const NotificationChannels = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState("slack");
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("notification_channels").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setChannels((data as Channel[]) || []);
    setLoading(false);
  };

  const validate = (): string | null => {
    if (!newValue.trim()) return "Required";
    if (newType === "slack" && !SLACK_WEBHOOK_PATTERN.test(newValue.trim())) return "Invalid Slack webhook URL";
    if (newType === "discord" && !DISCORD_WEBHOOK_PATTERN.test(newValue.trim())) return "Invalid Discord webhook URL";
    if (newType === "email" && !EMAIL_PATTERN.test(newValue.trim())) return "Invalid email";
    return null;
  };

  const addChannel = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setAdding(true); setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const config = newType === "email" ? { email_address: newValue.trim() } : { webhook_url: newValue.trim() };
    const { error: e } = await supabase.from("notification_channels").insert({ user_id: user.id, channel_type: newType, name: newName.trim() || `My ${labels[newType]}`, config, is_active: true });
    if (e) toast({ title: "Error", description: e.message, variant: "destructive" });
    else { toast({ title: "Added", description: `${labels[newType]} channel created.` }); setNewValue(""); setNewName(""); load(); }
    setAdding(false);
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("notification_channels").update({ is_active: !active }).eq("id", id);
    setChannels(prev => prev.map(c => c.id === id ? { ...c, is_active: !active } : c));
  };

  const remove = async (id: string) => {
    await supabase.from("notification_channels").delete().eq("id", id);
    setChannels(prev => prev.filter(c => c.id !== id));
  };

  const test = async (ch: Channel) => {
    try {
      if (ch.channel_type === "slack") {
        const r = await fetch(ch.config.webhook_url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "✓ Gardien test notification" }) });
        if (r.ok) toast({ title: "Sent", description: "Test delivered to Slack." }); else throw new Error("Failed");
      } else if (ch.channel_type === "discord") {
        const r = await fetch(ch.config.webhook_url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ embeds: [{ title: "Test Notification", description: "SecureWatch connected.", color: 0x3d9a50 }] }) });
        if (r.ok) toast({ title: "Sent", description: "Test delivered to Discord." }); else throw new Error("Failed");
      } else {
        toast({ title: "Email", description: `Notifications will be sent to ${ch.config.email_address}` });
      }
    } catch { toast({ title: "Failed", description: "Could not deliver test.", variant: "destructive" }); }
  };

  const placeholder = newType === "slack" ? "https://hooks.slack.com/services/..." : newType === "discord" ? "https://discord.com/api/webhooks/..." : "alerts@example.com";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" /> Notifications
        </CardTitle>
        <CardDescription className="text-xs">Slack, Discord, Email channels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {channels.length > 0 && (
          <div className="space-y-2">
            {channels.map((ch) => {
              const Icon = icons[ch.channel_type] || Bell;
              return (
                <div key={ch.id} className="flex items-center justify-between p-2.5 rounded-md border border-border text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{ch.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {labels[ch.channel_type]}{ch.channel_type === "email" ? ` · ${ch.config.email_address}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => test(ch)}><TestTube className="w-3 h-3" /></Button>
                    <Switch checked={ch.is_active} onCheckedChange={() => toggle(ch.id, ch.is_active)} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => remove(ch.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2.5 p-3 rounded-md border border-dashed border-border">
          <Label className="text-xs">Add channel</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select value={newType} onValueChange={(v) => { setNewType(v); setError(null); setNewValue(""); }}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Name (optional)" value={newName} onChange={(e) => setNewName(e.target.value)} className="text-xs" />
          </div>
          <Input placeholder={placeholder} value={newValue} onChange={(e) => { setNewValue(e.target.value); setError(null); }} className={`text-xs ${error ? "border-destructive" : ""}`} />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button size="sm" variant="outline" onClick={addChannel} disabled={adding} className="w-full">
            <Plus className="w-3 h-3 mr-1.5" /> {adding ? "Adding..." : "Add channel"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
