import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Bell, Zap, Lock, Sparkles, ArrowRight, Brain, BarChart3,
  MessageSquare, Mail, Hash, CheckCircle, Users, Globe
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-border/50 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <Shield className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />
              <Sparkles className="w-3 h-3 text-accent absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              SecureWatch AI
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/login")} className="hidden sm:flex">
              Login
            </Button>
            <Button
              onClick={() => navigate("/signup")}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg text-sm sm:text-base"
            >
              Get Started
              <ArrowRight className="ml-1 sm:ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 sm:py-24">
          <div className="text-center space-y-6 sm:space-y-8 mb-16 sm:mb-24 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Security Intelligence</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Stay Ahead of
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Cybersecurity Threats
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Automated threat monitoring with AI-powered analysis and instant alerts across Slack, Discord, and Email. Never miss a critical security vulnerability again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
              <Button
                size="lg"
                onClick={() => navigate("/signup")}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl text-base px-8 py-6"
              >
                Start Monitoring Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/login")}
                className="border-primary/20 hover:bg-primary/10 hover:text-primary text-base px-8 py-6"
              >
                Sign In
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-primary" />
                <span>Enterprise-grade security</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-primary" />
                <span>Real-time scanning</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-primary" />
                <span>AI analysis & remediation</span>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: <Zap className="w-7 h-7 text-primary" />,
                title: "Real-time Monitoring",
                desc: "Continuously scans cybersecurity news, CVEs, and threat intelligence feeds 24/7 across your entire tech stack.",
                gradient: "from-primary/20 to-primary/5",
                border: "hover:border-primary/20",
              },
              {
                icon: <Bell className="w-7 h-7 text-accent" />,
                title: "Multi-Channel Alerts",
                desc: "Instant notifications via Slack, Discord, and Email when threats affecting your tools are detected.",
                gradient: "from-accent/20 to-accent/5",
                border: "hover:border-accent/20",
              },
              {
                icon: <Brain className="w-7 h-7 text-primary" />,
                title: "AI-Powered Analysis",
                desc: "Intelligent threat assessment with severity ratings, impact analysis, and step-by-step remediation guides.",
                gradient: "from-primary/20 to-primary/5",
                border: "hover:border-primary/20",
              },
              {
                icon: <BarChart3 className="w-7 h-7 text-accent" />,
                title: "Dashboard Analytics",
                desc: "Visual analytics with alert trends, severity breakdowns, and scan success rates at a glance.",
                gradient: "from-accent/20 to-accent/5",
                border: "hover:border-accent/20",
              },
              {
                icon: <Zap className="w-7 h-7 text-primary" />,
                title: "n8n & API Integration",
                desc: "REST API and MCP Server for connecting n8n workflows, AI agents, and custom automation pipelines.",
                gradient: "from-primary/20 to-primary/5",
                border: "hover:border-primary/20",
              },
              {
                icon: <Lock className="w-7 h-7 text-accent" />,
                title: "Secure by Design",
                desc: "API key authentication, webhook secrets, and role-based access to keep your security operations safe.",
                gradient: "from-accent/20 to-accent/5",
                border: "hover:border-accent/20",
              },
            ].map(({ icon, title, desc, gradient, border }, i) => (
              <Card
                key={title}
                className={`border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 ${border} animate-fade-in`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <CardContent className="p-6 sm:p-8 space-y-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center border border-border/20`}>
                    {icon}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-16 sm:py-24">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 text-primary border-primary/20">How It Works</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Up and Running in Minutes</h2>
              <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
                Get started with three simple steps — no complex setup required.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { step: "01", title: "Configure", desc: "Add the tools and technologies you want to monitor for threats." },
                { step: "02", title: "Connect", desc: "Set up Slack, Discord, or email to receive instant alert notifications." },
                { step: "03", title: "Protect", desc: "AI scans for threats 24/7 and sends you actionable alerts with remediation." },
              ].map(({ step, title, desc }) => (
                <div key={step} className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20">
                    <span className="text-xl font-bold text-primary">{step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Notification Channels */}
        <section className="container mx-auto px-4 py-16 sm:py-24">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-primary border-primary/20">Integrations</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Alerts Where You Need Them</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: <MessageSquare className="w-8 h-8" />, name: "Slack", desc: "Webhook integration" },
              { icon: <Hash className="w-8 h-8" />, name: "Discord", desc: "Rich embeds" },
              { icon: <Mail className="w-8 h-8" />, name: "Email", desc: "HTML formatted" },
            ].map(({ icon, name, desc }) => (
              <div key={name} className="flex flex-col items-center p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all">
                <div className="text-primary mb-3">{icon}</div>
                <h3 className="font-bold text-lg text-foreground">{name}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative border-t border-border/30 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="container mx-auto px-4 py-16 sm:py-24 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Secure Your Stack?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-lg">
              Start monitoring your technology stack for cyber threats today. Free to get started, no credit card required.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl text-base px-10 py-6"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/30 bg-card/50">
          <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>© 2026 SecureWatch AI</span>
            </div>
            <div className="flex gap-4">
              <Button variant="link" className="text-muted-foreground p-0 h-auto text-sm" onClick={() => navigate("/docs")}>
                Documentation
              </Button>
              <Button variant="link" className="text-muted-foreground p-0 h-auto text-sm" onClick={() => navigate("/login")}>
                Sign In
              </Button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
