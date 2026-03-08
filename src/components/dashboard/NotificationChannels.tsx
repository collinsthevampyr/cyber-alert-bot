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
const EMAIL_PATTERN = /^[^\\s@]+@[^\\s@]+\.[^\\s@]+$/;

interface NotificationChannel {
  id: string;
  channel_type: string;
  name: string;
  config: any;
  is_active: boolean;
  created_at: string;
}

const channelIcons: Record<string, any> = {
  slack: MessageSquare,
  discord: Hash,
  email: Mail,
};

const channelLabels: Record<string, string> = {
  slack: "Slack",
  discord: "Discord",
  email: "Email",
};

export const NotificationChannels = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState("slack");
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadChannels(); }, []);

  const loadChannels = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notification_channels")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setChannels((data as NotificationChannel[]) || []);
    setLoading(false);
  };

  const validate = (): string | null => {
    if (!newValue.trim()) return "Value is required";
    if (newType === "slack" && !SLACK_WEBHOOK_PATTERN.test(newValue.trim())) return "Invalid Slack webhook URL";
    if (newType === "discord" && !DISCORD_WEBHOOK_PATTERN.test(newValue.trim())) return "Invalid Discord webhook URL";
    if (newType === "email" && !EMAIL_PATTERN.test(newValue.trim())) return "Invalid email address";
    return null;
  };

  const addChannel = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setAdding(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const config = newType === "email"
      ? { email_address: newValue.trim() }
      : { webhook_url: newValue.trim() };

    const { error: insertError } = await supabase
      .from("notification_channels")
      .insert({
        user_id: user.id,
        channel_type: newType,
        name: newName.trim() || `My ${channelLabels[newType]}`,
        config,
        is_active: true,
      });

    if (insertError) {
      toast({ title: "Error", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: "Channel Added", description: `${channelLabels[newType]} notification channel added.` });
      setNewValue("");
      setNewName("");
      loadChannels();
    }
    setAdding(false);
  };

  const toggleChannel = async (id: string, isActive: boolean) => {
    await supabase.from("notification_channels").update({ is_active: !isActive }).eq("id", id);
    setChannels(prev => prev.map(c => c.id === id ? { ...c, is_active: !isActive } : c));
  };

  const deleteChannel = async (id: string) => {
    await supabase.from("notification_channels").delete().eq("id", id);
    setChannels(prev => prev.filter(c => c.id !== id));
    toast({ title: "Deleted", description: "Notification channel removed." });
  };

  const testChannel = async (channel: NotificationChannel) => {
    try {
      if (channel.channel_type === "slack") {
        const resp = await fetch(channel.config.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "🧪 *Test Notification*\nSecureWatch AI is connected successfully!" }),
        });
        if (resp.ok) toast({ title: "Success", description: "Test message sent to Slack!" });
        else throw new Error("Failed to send");
      } else if (channel.channel_type === "discord") {
        const resp = await fetch(channel.config.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [{ title: "🧪 Test Notification", description: "SecureWatch AI is connected successfully!", color: 0x00cc44 }],
          }),
        });
        if (resp.ok) toast({ title: "Success", description: "Test message sent to Discord!" });
        else throw new Error("Failed to send");
      } else if (channel.channel_type === "email") {
        toast({ title: "Email", description: `Email notifications will be sent to ${channel.config.email_address}` });
      }
    } catch (e: any) {
      toast({ title: "Test Failed", description: e.message || "Could not send test", variant: "destructive" });
    }
  };

  const getPlaceholder = () => {
    if (newType === "slack") return "https://hooks.slack.com/services/T.../B.../xxx";
    if (newType === "discord") return "https://discord.com/api/webhooks/...";
    return "alerts@example.com";
  };

  const getInputLabel = () => {
    if (newType === "email") return "Email Address";
    return "Webhook URL";
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="p-2 rounded-lg bg-accent/10">
            <Bell className="w-5 h-5 text-accent" />
          </div>
          Notification Channels
        </CardTitle>
        <CardDescription>Configure where alerts are sent — Slack, Discord, or Email</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing channels */}
        {channels.length > 0 && (
          <div className="space-y-3">
            {channels.map((channel) => {
              const Icon = channelIcons[channel.channel_type] || Bell;
              return (
                <div key={channel.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-primary/10">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{channel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {channelLabels[channel.channel_type]}
                        {channel.channel_type === "email" && ` · ${channel.config.email_address}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => testChannel(channel)}>
                      <TestTube className="w-3.5 h-3.5" />
                    </Button>
                    <Switch checked={channel.is_active} onCheckedChange={() => toggleChannel(channel.id, channel.is_active)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => deleteChannel(channel.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add new channel */}
        <div className="space-y-3 p-4 rounded-lg border border-dashed border-border/50 bg-muted/20">
          <Label className="text-sm font-semibold">Add Notification Channel</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={newType} onValueChange={(v) => { setNewType(v); setError(null); setNewValue(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="slack">🔗 Slack</SelectItem>
                <SelectItem value="discord">💬 Discord</SelectItem>
                <SelectItem value="email">📧 Email</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Channel name (optional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{getInputLabel()}</Label>
            <Input
              placeholder={getPlaceholder()}
              value={newValue}
              onChange={(e) => { setNewValue(e.target.value); setError(null); }}
              className={error ? "border-destructive" : ""}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <Button onClick={addChannel} disabled={adding} className="gap-2 bg-gradient-to-r from-primary to-primary/80">
            <Plus className="w-4 h-4" />
            {adding ? "Adding..." : "Add Channel"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
