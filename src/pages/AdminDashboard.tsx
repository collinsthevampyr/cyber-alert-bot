import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { useNavigate } from "react-router-dom";
import {
  Users, AlertTriangle, ScanLine, TicketCheck, TrendingUp,
  Shield, ShieldCheck, Search, Loader2, Send, Mail, Trash2,
  UserPlus, ChevronRight, Clock, Building2, Edit3, Save, X
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const AdminDashboard = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [siteContent, setSiteContent] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchTickets, setSearchTickets] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [responseText, setResponseText] = useState("");
  const [responding, setResponding] = useState(false);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingContent, setSavingContent] = useState(false);
  const [newRoleEmail, setNewRoleEmail] = useState("");
  const [newRole, setNewRole] = useState<string>("admin");
  const [addingRole, setAddingRole] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/dashboard");
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadUsers(), loadTickets(), loadAlerts(), loadContent(), loadRoles()]);
    setLoading(false);
  };

  const loadStats = async () => {
    const { data } = await supabase.rpc("admin_get_stats");
    setStats(data);
  };

  const loadUsers = async () => {
    const { data } = await supabase.rpc("admin_list_users");
    setUsers(data || []);
  };

  const loadTickets = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets(data || []);
  };

  const loadAlerts = async () => {
    const { data } = await supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(100);
    setAlerts(data || []);
  };

  const loadContent = async () => {
    const { data } = await supabase.from("site_content").select("*").order("content_key");
    setSiteContent(data || []);
  };

  const loadRoles = async () => {
    const { data } = await supabase.from("user_roles").select("*");
    setRoles(data || []);
  };

  const respondToTicket = async () => {
    if (!selectedTicket || !responseText.trim()) return;
    setResponding(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("support_tickets").update({
      admin_response: responseText,
      responded_by: user?.id,
      responded_at: new Date().toISOString(),
      status: "resolved",
    }).eq("id", selectedTicket.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Response sent" }); setResponseText(""); loadTickets(); setSelectedTicket(null); }
    setResponding(false);
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    await supabase.from("support_tickets").update({ status }).eq("id", ticketId);
    loadTickets();
  };

  const saveContent = async (key: string) => {
    setSavingContent(true);
    const { data: { user } } = await supabase.auth.getUser();
    const existing = siteContent.find(c => c.content_key === key);
    if (existing) {
      await supabase.from("site_content").update({ content_value: editValue, updated_by: user?.id }).eq("id", existing.id);
    } else {
      await supabase.from("site_content").insert({ content_key: key, content_value: editValue, updated_by: user?.id });
    }
    toast({ title: "Content saved" });
    setEditingContent(null);
    loadContent();
    setSavingContent(false);
  };

  const addRole = async () => {
    if (!newRoleEmail.trim()) return;
    setAddingRole(true);
    const foundUser = users.find(u => u.email === newRoleEmail.trim());
    if (!foundUser) { toast({ title: "User not found", description: "That email isn't registered.", variant: "destructive" }); setAddingRole(false); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: foundUser.id, role: newRole as any });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Role assigned" }); setNewRoleEmail(""); loadRoles(); }
    setAddingRole(false);
  };

  const removeRole = async (roleId: string) => {
    await supabase.from("user_roles").delete().eq("id", roleId);
    toast({ title: "Role removed" });
    loadRoles();
  };

  const getUserEmail = (userId: string) => users.find(u => u.id === userId)?.email || userId.slice(0, 8) + "...";
  const getUserMeta = (userId: string) => users.find(u => u.id === userId)?.raw_user_meta_data || {};

  const filteredUsers = searchUsers
    ? users.filter(u => u.email?.toLowerCase().includes(searchUsers.toLowerCase()) || u.raw_user_meta_data?.full_name?.toLowerCase().includes(searchUsers.toLowerCase()))
    : users;

  const filteredTickets = searchTickets
    ? tickets.filter(t => t.subject?.toLowerCase().includes(searchTickets.toLowerCase()) || getUserEmail(t.user_id).toLowerCase().includes(searchTickets.toLowerCase()))
    : tickets;

  if (adminLoading || loading) {
    return <div className="flex items-center justify-center py-20"><Shield className="w-8 h-8 text-primary animate-pulse" /></div>;
  }

  if (!isAdmin) return null;

  const statCards = [
    { label: "Total users", value: stats?.total_users || 0, icon: Users, color: "text-primary" },
    { label: "Total alerts", value: stats?.total_alerts || 0, icon: AlertTriangle, color: "text-warning" },
    { label: "Total scans", value: stats?.total_scans || 0, icon: ScanLine, color: "text-info" },
    { label: "Open tickets", value: stats?.open_tickets || 0, icon: TicketCheck, color: "text-destructive" },
    { label: "Signups (7d)", value: stats?.recent_signups_7d || 0, icon: TrendingUp, color: "text-success" },
    { label: "Alerts today", value: stats?.alerts_today || 0, icon: AlertTriangle, color: "text-warning" },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage users, content, and support tickets</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(s => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs">Support</TabsTrigger>
          <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs">Roles</TabsTrigger>
        </TabsList>

        {/* ── Users Tab ── */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-base">Registered users</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Search by email or name..." value={searchUsers} onChange={(e) => setSearchUsers(e.target.value)} className="pl-8 text-xs h-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {filteredUsers.map(u => {
                    const meta = u.raw_user_meta_data || {};
                    const userRoles = roles.filter(r => r.user_id === u.id);
                    return (
                      <div key={u.id} className="flex items-center justify-between p-2.5 rounded-md border border-border text-sm hover:bg-secondary/30 transition-colors">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{meta.full_name || u.email}</span>
                            {userRoles.map(r => (
                              <Badge key={r.id} variant="outline" className="text-[10px]">{r.role}</Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            {meta.company_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{meta.company_name}</span>}
                            {meta.account_type && <Badge variant="outline" className="text-[9px]">{meta.account_type}</Badge>}
                            <span>Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground text-right shrink-0">
                          {u.last_sign_in_at && <p>Last login {formatDistanceToNow(new Date(u.last_sign_in_at), { addSuffix: true })}</p>}
                          {u.email_confirmed_at ? <Badge variant="outline" className="text-[9px] border-success/30 text-success">Verified</Badge> : <Badge variant="outline" className="text-[9px] border-warning/30 text-warning">Unverified</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Support Tab ── */}
        <TabsContent value="tickets">
          {selectedTicket ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedTicket(null)}><X className="w-4 h-4" /></Button>
                  <CardTitle className="text-base">Ticket detail</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${selectedTicket.status === "open" ? "border-warning/30 text-warning" : selectedTicket.status === "resolved" ? "border-success/30 text-success" : "border-muted-foreground"}`}>
                      {selectedTicket.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{selectedTicket.priority}</Badge>
                  </div>
                  <h3 className="font-medium text-foreground">{selectedTicket.subject}</h3>
                  <p className="text-xs text-muted-foreground">From: {getUserEmail(selectedTicket.user_id)} · {format(new Date(selectedTicket.created_at), "MMM d, yyyy HH:mm")}</p>
                </div>
                <Separator />
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
                {selectedTicket.admin_response && (
                  <div className="bg-primary/5 border border-primary/10 rounded-md p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Admin response</p>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{selectedTicket.admin_response}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">{selectedTicket.responded_at && format(new Date(selectedTicket.responded_at), "MMM d, yyyy HH:mm")}</p>
                  </div>
                )}
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Reply to user</p>
                  <Textarea placeholder="Type your response..." value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={4} />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={respondToTicket} disabled={responding || !responseText.trim()}>
                      {responding ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sending</> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Send response</>}
                    </Button>
                    <Select value={selectedTicket.status} onValueChange={(v) => { updateTicketStatus(selectedTicket.id, v); setSelectedTicket({ ...selectedTicket, status: v }); }}>
                      <SelectTrigger className="w-32 text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-base">Support tickets</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search tickets..." value={searchTickets} onChange={(e) => setSearchTickets(e.target.value)} className="pl-8 text-xs h-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <TicketCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No tickets</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-1">
                      {filteredTickets.map(t => (
                        <button key={t.id} onClick={() => setSelectedTicket(t)} className="w-full text-left p-2.5 rounded-md border border-border hover:bg-secondary/30 transition-colors group">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${t.status === "open" ? "border-warning/30 text-warning" : t.status === "resolved" ? "border-success/30 text-success" : ""}`}>{t.status}</Badge>
                                <span className="text-sm font-medium text-foreground truncate">{t.subject}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{getUserEmail(t.user_id)} · {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Content Tab ── */}
        <TabsContent value="content">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Site content (CMS)</CardTitle>
              <p className="text-xs text-muted-foreground">Edit landing page text and app copy without code changes</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { key: "hero_title", label: "Hero title", desc: "Main headline on landing page" },
                  { key: "hero_subtitle", label: "Hero subtitle", desc: "Supporting text below the headline" },
                  { key: "hero_cta", label: "CTA button text", desc: "Main call-to-action button label" },
                  { key: "features_heading", label: "Features heading", desc: "Section title for features" },
                  { key: "footer_text", label: "Footer text", desc: "Copyright or footer message" },
                  { key: "support_email", label: "Support email", desc: "Email address shown for support" },
                ].map(item => {
                  const existing = siteContent.find(c => c.content_key === item.key);
                  const isEditing = editingContent === item.key;
                  return (
                    <div key={item.key} className="p-3 rounded-md border border-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                        </div>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingContent(null)}><X className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" className="h-7 w-7" onClick={() => saveContent(item.key)} disabled={savingContent}>
                              {savingContent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditingContent(item.key); setEditValue(existing?.content_value || ""); }}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      {isEditing ? (
                        <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={2} className="text-sm" />
                      ) : (
                        <p className="text-sm text-foreground/70">{existing?.content_value || <span className="italic text-muted-foreground">Not set</span>}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Roles Tab ── */}
        <TabsContent value="roles">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Role management</CardTitle>
              <p className="text-xs text-muted-foreground">Assign admin or moderator roles to users</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="User email..." value={newRoleEmail} onChange={(e) => setNewRoleEmail(e.target.value)} className="text-sm" />
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="w-full sm:w-36 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addRole} disabled={addingRole} className="shrink-0">
                  {addingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-1.5" /> Assign</>}
                </Button>
              </div>
              <Separator />
              <div className="space-y-1">
                {roles.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2.5 rounded-md border border-border text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{getUserEmail(r.user_id)}</span>
                      <Badge variant="outline" className="text-[10px]">{r.role}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeRole(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {roles.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No roles assigned</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
