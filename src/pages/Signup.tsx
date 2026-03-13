import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Building2, User, Mail, Lock, Briefcase, UserCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountType = "individual" | "organization" | null;

const Signup = () => {
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: accountType === "organization" ? companyName : "",
          job_title: accountType === "organization" ? jobTitle : "",
          account_type: accountType,
        },
      },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created", description: "Check your email to verify your account, then sign in." });
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight text-foreground">SecureWatch</span>
        </div>

        <Card className="border-border">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Create an account</CardTitle>
            <CardDescription>
              {!accountType
                ? "Choose how you'd like to get started"
                : accountType === "individual"
                  ? "Set up your personal threat monitoring account"
                  : "Set up threat monitoring for your organization"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!accountType ? (
              <div className="space-y-3">
                <button
                  onClick={() => setAccountType("individual")}
                  className="w-full flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <UserCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Individual</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      For security researchers, freelancers, and independent professionals
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setAccountType("organization")}
                  className="w-full flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Organization</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      For teams and companies managing security across infrastructure
                    </p>
                  </div>
                </button>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={() => navigate("/login")} className="text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline">
                    Sign in
                  </button>
                </p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Account type indicator */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <button
                      type="button"
                      onClick={() => setAccountType(null)}
                      className="hover:text-foreground transition-colors"
                    >
                      ← Back
                    </button>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-1.5">
                      {accountType === "individual"
                        ? <><UserCircle className="w-3.5 h-3.5" /> Individual account</>
                        : <><Building2 className="w-3.5 h-3.5" /> Organization account</>
                      }
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="Jane Smith"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {accountType === "organization" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company name</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="companyName"
                            placeholder="Acme Corp"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="jobTitle">Your role</Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="jobTitle"
                            placeholder="Security Engineer"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">{accountType === "organization" ? "Work email" : "Email"}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={accountType === "organization" ? "jane@acme.com" : "you@example.com"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</>
                      : accountType === "organization" ? "Create organization account" : "Create account"
                    }
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By signing up you agree to our Terms of Service and Privacy Policy.
                  </p>
                </form>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={() => navigate("/login")} className="text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline">
                    Sign in
                  </button>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
