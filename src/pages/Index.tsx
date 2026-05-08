import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, ArrowRight, Brain, BarChart3,
  MessageSquare, Mail, Hash, Zap, Bell, Lock, Eye,
  Workflow, AlertTriangle, FileSearch, Server,
  Clock, Users, BookOpen, Target, Layers
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Gardien" className="w-7 h-7" />
            <span className="text-lg font-semibold tracking-tight text-foreground">Gardien</span>
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
              Full-stack SOC platform powered by AI
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] text-balance">
              Your AI Security Operations Center — in one platform
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Continuous threat scanning, AI-driven triage, automated playbooks, SIEM integration, and multi-channel alerts — from detection to remediation in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" onClick={() => navigate("/signup")} className="text-sm px-6">
                Start monitoring free
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
                { value: "5 min", label: "Fastest scan interval" },
                { value: "10+", label: "SOC modules" },
                { value: "3", label: "Alert channels" },
                { value: "AI", label: "Powered triage & analysis" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core capabilities */}
        <section className="container mx-auto px-4 py-20 sm:py-28">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              A complete SOC in your browser
            </h2>
            <p className="text-muted-foreground mt-3">
              Everything security teams need — detection, investigation, response, and reporting.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden max-w-5xl mx-auto">
            {[
              { icon: <Eye className="w-5 h-5" />, title: "Continuous scanning", desc: "Scans CVEs, threat feeds, and advisories as fast as every 5 minutes across your entire stack." },
              { icon: <Brain className="w-5 h-5" />, title: "AI threat analysis", desc: "On-demand AI assessment with severity ratings, impact context, and step-by-step remediation guidance." },
              { icon: <AlertTriangle className="w-5 h-5" />, title: "Alert triage & enrichment", desc: "Prioritize, assign, and enrich alerts with IOC data. Mark false positives and track SLA compliance." },
              { icon: <Workflow className="w-5 h-5" />, title: "Automated playbooks", desc: "Define response playbooks with multi-step actions that trigger automatically on matching conditions." },
              { icon: <Target className="w-5 h-5" />, title: "Incident management", desc: "Group related alerts into incidents, track status, assign ownership, and manage the full lifecycle." },
              { icon: <Server className="w-5 h-5" />, title: "SIEM integrations", desc: "Connect Splunk, Elastic, Sentinel, and other SIEMs. Ingest logs and correlate events in real time." },
              { icon: <Bell className="w-5 h-5" />, title: "Multi-channel alerts", desc: "Slack, Discord, and Email with severity-based formatting, escalation rules, and SLA tracking." },
              { icon: <Clock className="w-5 h-5" />, title: "Escalation & SLA", desc: "Auto-escalate unacknowledged alerts. Track response times against configurable SLA targets per severity." },
              { icon: <Users className="w-5 h-5" />, title: "Shift handover", desc: "Structured shift summaries with open alerts, key findings, and pending actions for seamless team transitions." },
              { icon: <BarChart3 className="w-5 h-5" />, title: "SOC metrics & analytics", desc: "MTTD, MTTR, alert volume trends, severity breakdown, and scan success rates — all in real time." },
              { icon: <Zap className="w-5 h-5" />, title: "API, MCP & n8n", desc: "REST API, MCP Server for AI agents, and native n8n integration for custom automation workflows." },
              { icon: <Lock className="w-5 h-5" />, title: "Secure by design", desc: "Row-level security, API key auth, webhook secrets, role-based access, and full admin audit logging." },
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
                Up and running in three steps
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-12 max-w-3xl mx-auto">
              {[
                { n: "1", title: "Configure your stack", desc: "Add the tools and technologies you use. Set scan frequency from 5 minutes to daily." },
                { n: "2", title: "Connect your channels", desc: "Wire up Slack, Discord, or email. Configure escalation rules and SLA thresholds." },
                { n: "3", title: "Detect & respond", desc: "AI scans continuously, triages alerts, runs playbooks, and sends actionable notifications." },
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

        {/* Integrations */}
        <section className="container mx-auto px-4 py-20 sm:py-28">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Connects to your existing tools
            </h2>
            <p className="text-muted-foreground mt-3">
              Alert channels, SIEM platforms, and automation workflows.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
            {[
              { icon: <MessageSquare className="w-5 h-5" />, name: "Slack" },
              { icon: <Hash className="w-5 h-5" />, name: "Discord" },
              { icon: <Mail className="w-5 h-5" />, name: "Email" },
              { icon: <Layers className="w-5 h-5" />, name: "Splunk" },
              { icon: <Layers className="w-5 h-5" />, name: "Elastic" },
              { icon: <Layers className="w-5 h-5" />, name: "Sentinel" },
              { icon: <Workflow className="w-5 h-5" />, name: "n8n" },
              { icon: <BookOpen className="w-5 h-5" />, name: "REST API" },
              { icon: <FileSearch className="w-5 h-5" />, name: "MCP Server" },
            ].map(({ icon, name }) => (
              <div key={name} className="flex items-center gap-3 px-5 py-3 rounded-lg border border-border bg-card">
                <span className="text-primary">{icon}</span>
                <span className="font-medium text-sm text-foreground">{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="container mx-auto px-4 py-20 sm:py-28 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
              Stop firefighting. Start monitoring.
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Free to get started. Full SOC capabilities from day one.
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
              <img src="/favicon.png" alt="Gardien" className="w-4 h-4" />
              <span>© 2026 Gardien</span>
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
