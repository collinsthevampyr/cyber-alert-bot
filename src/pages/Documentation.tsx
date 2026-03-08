import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, ArrowLeft, Search, BookOpen, Zap, Bell, Webhook,
  Key, Scan, Brain, Settings, ChevronRight, ExternalLink,
  AlertTriangle, CheckCircle, Info, Code, MessageSquare, Mail, Hash
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  content: React.ReactNode;
}

const Documentation = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("getting-started");
  const [searchQuery, setSearchQuery] = useState("");

  const sections: DocSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <BookOpen className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to SecureWatch AI</h2>
            <p className="text-muted-foreground leading-relaxed">
              SecureWatch AI is a cyber threat monitoring platform that continuously scans for security 
              vulnerabilities across your configured tools and sends intelligent alerts through your preferred 
              notification channels.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Quick Start Guide</h3>
            <div className="space-y-3">
              {[
                { step: 1, title: "Configure Monitoring", desc: "Select the security tools you want to monitor and set your scan frequency." },
                { step: 2, title: "Set Up Notifications", desc: "Add Slack, Discord, or Email channels to receive alert notifications." },
                { step: 3, title: "Run Your First Scan", desc: "Trigger a manual scan or wait for the automated schedule to detect threats." },
                { step: 4, title: "Review & Analyze Alerts", desc: "View detected threats, run AI analysis, and follow remediation steps." },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-4 p-4 rounded-lg bg-secondary/50 border border-border/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                    {step}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "monitoring",
      title: "Monitoring Configuration",
      icon: <Settings className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Monitoring Configuration</h2>
            <p className="text-muted-foreground leading-relaxed">
              Configure which security tools to monitor and how frequently scans should run.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Supported Tools</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: "Shodan", desc: "Internet-connected device scanner" },
                { name: "VirusTotal", desc: "File and URL threat analyzer" },
                { name: "Have I Been Pwned", desc: "Data breach checker" },
                { name: "AbuseIPDB", desc: "IP address reputation database" },
                { name: "GreyNoise", desc: "Internet noise analyzer" },
                { name: "URLScan.io", desc: "Website security scanner" },
              ].map(({ name, desc }) => (
                <div key={name} className="p-3 rounded-lg border border-border/50 bg-card">
                  <p className="font-medium text-foreground text-sm">{name}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Scan Frequency</h3>
            <p className="text-muted-foreground text-sm">Choose how often scans should run automatically:</p>
            <ul className="space-y-2 text-sm">
              {["Every 15 minutes", "Every 30 minutes", "Hourly (default)", "Every 6 hours", "Daily"].map(f => (
                <li key={f} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-primary" /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex gap-2 items-start">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Tip:</strong> Start with hourly scans and adjust based on your security needs. More frequent scans consume more resources.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "notifications",
      title: "Notification Channels",
      icon: <Bell className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Notification Channels</h2>
            <p className="text-muted-foreground leading-relaxed">
              Configure where you want to receive alerts when threats are detected. You can set up multiple channels simultaneously.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: <MessageSquare className="w-5 h-5 text-primary" />,
                title: "Slack",
                badge: "Webhook",
                steps: [
                  "Go to your Slack workspace settings",
                  "Navigate to Apps → Incoming Webhooks",
                  "Create a new webhook and select a channel",
                  "Copy the webhook URL (starts with https://hooks.slack.com/services/)",
                  "Paste the URL in the Notification Channels section",
                ],
              },
              {
                icon: <Hash className="w-5 h-5 text-[hsl(var(--accent))]" />,
                title: "Discord",
                badge: "Webhook",
                steps: [
                  "Open your Discord server settings",
                  "Go to Integrations → Webhooks",
                  "Create a new webhook and select a channel",
                  "Copy the webhook URL (starts with https://discord.com/api/webhooks/)",
                  "Paste the URL in the Notification Channels section",
                ],
              },
              {
                icon: <Mail className="w-5 h-5 text-[hsl(var(--warning))]" />,
                title: "Email",
                badge: "SMTP",
                steps: [
                  "Enter the email address where you want to receive alerts",
                  "Verify it's a valid email format",
                  "Send a test notification to confirm delivery",
                  "Check your spam folder if the test doesn't arrive",
                ],
              },
            ].map(({ icon, title, badge, steps }) => (
              <Card key={title} className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {icon}
                    <CardTitle className="text-base">{title}</CardTitle>
                    <Badge variant="outline" className="text-xs">{badge}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="text-primary font-mono text-xs mt-0.5">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="p-4 rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Important:</strong> Always use the "Send Test" button after adding a channel to verify it's working correctly.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "scans",
      title: "Scans & Alerts",
      icon: <Scan className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Scans & Alerts</h2>
            <p className="text-muted-foreground leading-relaxed">
              Understand how scans work and how to interpret and act on detected alerts.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Scan Lifecycle</h3>
            <div className="space-y-2">
              {[
                { status: "Running", color: "bg-primary/20 text-primary", desc: "Scan is actively checking configured tools" },
                { status: "Completed", color: "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]", desc: "Scan finished successfully, results available" },
                { status: "Error", color: "bg-destructive/20 text-destructive", desc: "Scan encountered an issue — check error details" },
              ].map(({ status, color, desc }) => (
                <div key={status} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <Badge className={`${color} border-0 text-xs`}>{status}</Badge>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Alert Severity Levels</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { level: "Critical", color: "border-destructive/50 bg-destructive/5", desc: "Immediate action required — active exploitation detected" },
                { level: "High", color: "border-[hsl(var(--warning))]/50 bg-[hsl(var(--warning))]/5", desc: "Significant risk — address within 24 hours" },
                { level: "Medium", color: "border-primary/50 bg-primary/5", desc: "Moderate risk — plan remediation this week" },
                { level: "Low", color: "border-border bg-secondary/30", desc: "Informational — review when convenient" },
              ].map(({ level, color, desc }) => (
                <div key={level} className={`p-3 rounded-lg border ${color}`}>
                  <p className="font-medium text-foreground text-sm mb-1">{level}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">AI Analysis</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Each alert can be analyzed by AI to provide a detailed breakdown and remediation suggestions.
              Click the <Badge variant="outline" className="text-xs mx-1"><Brain className="w-3 h-3 inline mr-1" />Analyze</Badge> button 
              on any alert to get AI-powered insights including threat context, impact assessment, and step-by-step remediation.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Manual Alert Sending</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You can manually forward any alert to all your active notification channels by clicking the 
              <Badge variant="outline" className="text-xs mx-1"><Bell className="w-3 h-3 inline mr-1" />Send</Badge> button. 
              Alerts are also sent automatically after each scan completes.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "n8n",
      title: "n8n Integration",
      icon: <Zap className="w-4 h-4" />,
      badge: "Advanced",
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">n8n Integration</h2>
            <p className="text-muted-foreground leading-relaxed">
              Connect SecureWatch AI with n8n for advanced workflow automation. Use the REST API or MCP Server to build custom security pipelines.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Integration Methods</h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  title: "REST API",
                  desc: "Standard HTTP endpoints for managing configs, triggering scans, and querying alerts.",
                  endpoints: [
                    "GET /config — Retrieve monitoring configuration",
                    "POST /scan — Trigger a new threat scan",
                    "GET /alerts — List all detected alerts",
                    "GET /alerts/:id — Get specific alert details",
                    "POST /alerts/:id/send — Send alert to notification channels",
                    "GET /notification-channels — List notification channels",
                  ],
                },
                {
                  title: "MCP Server",
                  desc: "Model Context Protocol server for AI agent integration with specialized security tools.",
                  endpoints: [
                    "get_monitoring_config — Read monitoring settings",
                    "trigger_scan — Start a new security scan",
                    "list_alerts — Query alerts with filters",
                    "analyze_alert — Run AI analysis on an alert",
                    "send_alert — Forward alert to channels",
                    "list_notification_channels — View configured channels",
                  ],
                },
              ].map(({ title, desc, endpoints }) => (
                <Card key={title} className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Code className="w-4 h-4 text-primary" /> {title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-background/80 rounded-lg p-3 font-mono text-xs space-y-1">
                      {endpoints.map((ep, i) => (
                        <p key={i} className="text-muted-foreground">{ep}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Authentication</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              All API and MCP requests require an API key. Generate one from the n8n Integration panel 
              on your dashboard. Include it in the <code className="px-1.5 py-0.5 rounded bg-secondary text-foreground text-xs">x-api-key</code> header of every request.
            </p>
            <div className="bg-background/80 rounded-lg p-3 font-mono text-xs text-muted-foreground">
              <p className="text-primary/70"># Example cURL request</p>
              <p>curl -H "x-api-key: your_api_key" \</p>
              <p className="pl-4">https://your-project.supabase.co/functions/v1/api/alerts</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Webhooks</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Set up outbound webhooks to receive real-time event notifications in your n8n workflows. 
              Supported events: <code className="px-1.5 py-0.5 rounded bg-secondary text-foreground text-xs">alert.created</code>,{" "}
              <code className="px-1.5 py-0.5 rounded bg-secondary text-foreground text-xs">scan.completed</code>,{" "}
              <code className="px-1.5 py-0.5 rounded bg-secondary text-foreground text-xs">scan.failed</code>
            </p>
            <p className="text-muted-foreground text-sm">
              Use the <strong>Test Webhook</strong> button to send a sample payload and verify your n8n workflow receives it correctly.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "api-reference",
      title: "API Reference",
      icon: <Code className="w-4 h-4" />,
      badge: "Developer",
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">API Reference</h2>
            <p className="text-muted-foreground leading-relaxed">
              Complete reference for the SecureWatch AI REST API.
            </p>
          </div>

          {[
            {
              method: "GET",
              path: "/config",
              desc: "Returns the current monitoring configuration including active tools and scan frequency.",
              response: `{
  "tools_list": ["shodan", "virustotal"],
  "scan_frequency": "hourly",
  "is_active": true
}`,
            },
            {
              method: "POST",
              path: "/scan",
              desc: "Triggers a new threat scan using the configured tools. Returns the scan ID.",
              response: `{
  "scan_id": "uuid",
  "status": "running",
  "started_at": "2026-03-08T09:00:00Z"
}`,
            },
            {
              method: "GET",
              path: "/alerts",
              desc: "Lists all detected alerts for the authenticated user, ordered by detection time.",
              response: `[{
  "id": "uuid",
  "tool_name": "shodan",
  "severity": "high",
  "summary": "Open port detected",
  "detected_at": "2026-03-08T09:00:00Z"
}]`,
            },
            {
              method: "POST",
              path: "/alerts/:id/send",
              desc: "Sends a specific alert to all active notification channels.",
              response: `{
  "success": true,
  "channels_notified": 3
}`,
            },
          ].map(({ method, path, desc, response }) => (
            <Card key={path} className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs border-0 ${method === "GET" ? "bg-primary/20 text-primary" : "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"}`}>
                    {method}
                  </Badge>
                  <code className="text-sm text-foreground font-mono">{path}</code>
                </div>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-1">Response:</p>
                <pre className="bg-background/80 rounded-lg p-3 font-mono text-xs text-muted-foreground overflow-x-auto">
                  {response}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      ),
    },
    {
      id: "security",
      title: "Security Best Practices",
      icon: <Shield className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Security Best Practices</h2>
            <p className="text-muted-foreground leading-relaxed">
              Follow these guidelines to ensure your SecureWatch AI setup is secure.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { title: "Rotate API Keys Regularly", desc: "Generate new API keys periodically and deactivate old ones. Never share keys in public repositories." },
              { title: "Use Webhook Secrets", desc: "When configuring n8n webhooks, always set a webhook secret to verify payload authenticity." },
              { title: "Monitor Alert Channels", desc: "Ensure your notification channels are active and tested. A misconfigured channel means missed critical alerts." },
              { title: "Review Scan Results", desc: "Don't ignore low-severity alerts — they can indicate reconnaissance activity that precedes larger attacks." },
              { title: "Keep Integrations Updated", desc: "Regularly check that your webhook URLs and API endpoints are active and responding." },
            ].map(({ title, desc }) => (
              <div key={title} className="p-4 rounded-lg border border-border/50 bg-card">
                <div className="flex gap-3">
                  <CheckCircle className="w-4 h-4 text-[hsl(var(--success))] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = searchQuery
    ? sections.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sections;

  const activeContent = sections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <header className="relative border-b border-border/50 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">Documentation</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-card border-border/50"
                />
              </div>
              <nav className="space-y-1">
                {filteredSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => { setActiveSection(section.id); setSearchQuery(""); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      activeSection === section.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {section.icon}
                      <span>{section.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {section.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{section.badge}</Badge>
                      )}
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Card className="border-border/50">
              <CardContent className="p-6 lg:p-8">
                {activeContent?.content}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Documentation;
