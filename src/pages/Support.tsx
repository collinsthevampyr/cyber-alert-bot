import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { TicketCheck, Plus, Loader2, Send, ChevronRight, Mail, Clock, MessageSquare, ArrowLeft } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const Support = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadTickets();
    loadSupportEmail();
    const ch = supabase.channel("user_tickets").on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => loadTickets()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  const loadSupportEmail = async () => {
    const { data } = await supabase.from("site_content").select("content_value").eq("content_key", "support_email").maybeSingle();
    setSupportEmail(data?.content_value || "support@securewatch.io");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("support_tickets").insert({ user_id: user.id, subject, message, priority });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Ticket submitted", description: "We'll respond as soon as possible." }); setSubject(""); setMessage(""); setPriority("normal"); setShowForm(false); loadTickets(); }
    setSubmitting(false);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "open": return "border-warning/30 text-warning";
      case "in_progress": return "border-info/30 text-info";
      case "resolved": return "border-success/30 text-success";
      case "closed": return "border-muted-foreground text-muted-foreground";
      default: return "";
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  // ── Ticket Detail ──
  if (selectedTicket) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to tickets
        </Button>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-xs ${statusColor(selectedTicket.status)}`}>{selectedTicket.status}</Badge>
              <Badge variant="outline" className="text-xs">{selectedTicket.priority}</Badge>
            </div>
            <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
            <p className="text-xs text-muted-foreground">{format(new Date(selectedTicket.created_at), "MMM d, yyyy · HH:mm")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 rounded-md p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Your message</p>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{selectedTicket.message}</p>
            </div>
            {selectedTicket.admin_response ? (
              <div className="bg-primary/5 border border-primary/10 rounded-md p-3">
                <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1"><Send className="w-3 h-3" /> Admin response</p>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{selectedTicket.admin_response}</p>
                {selectedTicket.responded_at && <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(selectedTicket.responded_at), "MMM d, yyyy · HH:mm")}</p>}
              </div>
            ) : (
              <div className="bg-muted/20 rounded-md p-3 text-center">
                <Clock className="w-5 h-5 text-muted-foreground/40 mx-auto mb-1" />
                <p className="text-sm text-muted-foreground">Awaiting response from our team</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Support</h1>
          <p className="text-sm text-muted-foreground mt-1">Get help from our team or check ticket status</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${supportEmail}`}><Mail className="w-3.5 h-3.5 mr-1.5" /> Email us</a>
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New ticket
          </Button>
        </div>
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Submit a ticket</CardTitle>
            <CardDescription className="text-xs">Describe your issue and we'll get back to you</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="subject" className="text-xs">Subject</Label>
                <Input id="subject" placeholder="Brief summary of your issue" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority" className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs">Message</Label>
                <Textarea id="message" placeholder="Describe the issue in detail..." value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Submitting</> : "Submit ticket"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Ticket List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <TicketCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No tickets yet</p>
              <p className="text-xs text-muted-foreground mt-1">Submit a ticket if you need help</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {tickets.map(t => (
                  <button key={t.id} onClick={() => setSelectedTicket(t)} className="w-full text-left p-2.5 rounded-md border border-border hover:bg-secondary/30 transition-colors group">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${statusColor(t.status)}`}>{t.status}</Badge>
                          <span className="text-sm font-medium text-foreground truncate">{t.subject}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.admin_response && <Badge variant="outline" className="text-[9px] border-success/30 text-success">Replied</Badge>}
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Support;
