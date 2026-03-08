import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, ArrowRight, Brain, BarChart3,
  MessageSquare, Mail, Hash, Zap, Bell, Lock, Eye
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight text-foreground">SecureWatch</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/docs")} className="text-muted-foreground hover:text-foreground">
              Docs
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground hover:text-foreground">
              Sign in
            </Button>
            <Button size="sm" onClick={() => navigate("/signup")}>
              Get started
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 pt-20 pb-24 sm:pt-32 sm:pb-32">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="outline" className="text-xs font-medium tracking-wide text-muted-foreground border-border">
              AI-powered threat intelligence
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] text-balance">
              Cyber threat monitoring that works while you sleep
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Continuous vulnerability scanning with AI analysis and instant multi-channel alerts. 
              Configure once, stay protected always.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" onClick={() => navigate("/signup")} className="text-sm px-6">
                Start monitoring
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="text-sm px-6">
                Sign in
              </Button>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-y border-border bg-card/50">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
              {[
                { value: "24/7", label: "Continuous scanning" },
                { value: "6+", label: "Security tools" },
                { value: "3", label: "Alert channels" },
                { value: "<1min", label: "Alert latency" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-20 sm:py-28">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Everything you need to stay ahead of threats
            </h2>
            <p className="text-muted-foreground mt-3">
              From detection to remediation, in one platform.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden max-w-5xl mx-auto">
            {[
              { icon: <Eye className="w-5 h-5" />, title: "Real-time scanning", desc: "Monitors CVEs, threat feeds, and security advisories across your configured tools continuously." },
              { icon: <Bell className="w-5 h-5" />, title: "Multi-channel alerts", desc: "Slack, Discord, and Email notifications with severity-based formatting and rich context." },
              { icon: <Brain className="w-5 h-5" />, title: "AI analysis", desc: "On-demand threat assessment with severity ratings, impact context, and remediation steps." },
              { icon: <BarChart3 className="w-5 h-5" />, title: "Analytics dashboard", desc: "Alert trends, severity breakdown, and scan success rates visualized over time." },
              { icon: <Zap className="w-5 h-5" />, title: "API & n8n integration", desc: "REST API and MCP Server for building custom workflows and connecting AI agents." },
              { icon: <Lock className="w-5 h-5" />, title: "Secure by default", desc: "API key auth, webhook secrets, and per-user data isolation with row-level security." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-card p-6 sm:p-8 space-y-3">
                <div className="text-primary">{icon}</div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-card/30">
          <div className="container mx-auto px-4 py-20 sm:py-28">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Three steps to protection
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-12 max-w-3xl mx-auto">
              {[
                { n: "1", title: "Configure", desc: "Add the tools and technologies in your stack that you want monitored." },
                { n: "2", title: "Connect", desc: "Set up Slack, Discord, or email channels for alert delivery." },
                { n: "3", title: "Protect", desc: "AI scans continuously and sends actionable alerts with remediation." },
              ].map(({ n, title, desc }) => (
                <div key={n} className="space-y-3">
                  <span className="text-4xl font-bold text-border">{n}</span>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Channels */}
        <section className="container mx-auto px-4 py-20 sm:py-28">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Alerts where you already work
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-4 max-w-lg mx-auto">
            {[
              { icon: <MessageSquare className="w-5 h-5" />, name: "Slack" },
              { icon: <Hash className="w-5 h-5" />, name: "Discord" },
              { icon: <Mail className="w-5 h-5" />, name: "Email" },
            ].map(({ icon, name }) => (
              <div key={name} className="flex items-center gap-3 px-6 py-4 rounded-lg border border-border bg-card">
                <span className="text-primary">{icon}</span>
                <span className="font-medium text-foreground">{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="container mx-auto px-4 py-20 sm:py-28 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
              Start monitoring your stack today
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Free to get started. No credit card required.
            </p>
            <Button size="lg" onClick={() => navigate("/signup")} className="text-sm px-8">
              Get started free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border">
          <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>© 2026 SecureWatch</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => navigate("/docs")} className="hover:text-foreground transition-colors">Docs</button>
              <button onClick={() => navigate("/login")} className="hover:text-foreground transition-colors">Sign in</button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
