import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Lock, Mail, Shield, Loader2, LogOut } from "lucide-react";

const Settings = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUser(user);
      setLoading(false);
    })();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast({ title: "Error", description: "Minimum 6 characters.", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Error", description: "Passwords don't match.", variant: "destructive" }); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated", description: "Password changed successfully." }); setNewPassword(""); setConfirmPassword(""); }
    setChangingPassword(false);
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Confirmation sent", description: "Check both email addresses." }); setNewEmail(""); }
    setChangingEmail(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Shield className="w-8 h-8 text-primary animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 bg-background">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold tracking-tight text-foreground">Account settings</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Email</span><p className="font-medium">{user?.email}</p></div>
            <div><span className="text-muted-foreground">Member since</span><p className="font-medium">{new Date(user?.created_at).toLocaleDateString()}</p></div>
            <div><span className="text-muted-foreground">Last sign in</span><p className="font-medium">{new Date(user?.last_sign_in_at).toLocaleString()}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground" /> Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="np" className="text-xs">New password</Label><Input id="np" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} /></div>
              <div className="space-y-1.5"><Label htmlFor="cp" className="text-xs">Confirm</Label><Input id="cp" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} /></div>
              <Button type="submit" size="sm" disabled={changingPassword}>
                {changingPassword ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Updating</> : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> Change email</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangeEmail} className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="ne" className="text-xs">New email</Label><Input id="ne" type="email" placeholder="new@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required /></div>
              <Button type="submit" size="sm" disabled={changingEmail}>
                {changingEmail ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Sending</> : "Update email"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardContent className="pt-6">
            <Button variant="destructive" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }} className="w-full">
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign out
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
