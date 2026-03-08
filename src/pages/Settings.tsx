import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Mail, Building2, Briefcase, Loader2 } from "lucide-react";

const Settings = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, company_name, job_title")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setCompanyName(profile.company_name || "");
        setJobTitle(profile.job_title || "");
      }
      setLoading(false);
    })();
  }, [navigate]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, company_name: companyName, job_title: jobTitle })
      .eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Saved", description: "Profile updated." });
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast({ title: "Error", description: "Minimum 8 characters.", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Error", description: "Passwords don't match.", variant: "destructive" }); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated", description: "Password changed." }); setNewPassword(""); setConfirmPassword(""); }
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

  if (loading) return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Account</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and security settings</p>
      </div>

      {/* Profile */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> Organization profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs">Company</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle" className="text-xs">Job title</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Security Engineer" className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <p className="text-sm text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Member since {new Date(user?.created_at).toLocaleDateString()}</p>
            </div>
            <Button type="submit" size="sm" disabled={savingProfile}>
              {savingProfile ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Saving</> : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground" /> Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="np" className="text-xs">New password</Label><Input id="np" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} /></div>
            <div className="space-y-1.5"><Label htmlFor="cp" className="text-xs">Confirm</Label><Input id="cp" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} /></div>
            <Button type="submit" size="sm" disabled={changingPassword}>
              {changingPassword ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Updating</> : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> Change email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangeEmail} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="ne" className="text-xs">New email</Label><Input id="ne" type="email" placeholder="new@company.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required /></div>
            <Button type="submit" size="sm" disabled={changingEmail}>
              {changingEmail ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Sending</> : "Update email"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
