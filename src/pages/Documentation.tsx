import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, ArrowLeft, Search, BookOpen, Zap, Bell,
  Scan, Brain, Settings, ChevronRight,
  CheckCircle, Info, Code, MessageSquare, Mail, Hash, AlertTriangle, Lock
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
      icon: <BookOpen className="w-3.5 h-3.5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to SecureWatch</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SecureWatch is a cyber threat monitoring platform that scans for vulnerabilities across your configured tools and delivers intelligent alerts through multiple channels.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Quick start</h3>
            {[
              { step: 1, title: "Configure monitoring", desc: "Select tools to monitor and set scan frequency." },
              { step: 2, title: "Set up notifications", desc: "Add Slack, Discord, or Email channels." },
              { step: 3, title: "Run a scan", desc: "Trigger manually or wait for the schedule." },
              { step: 4, title: "Review alerts", desc: "Analyze threats and follow remediation steps." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3 p-3 rounded-md border border-border">
                <span className="text-xs font-bold text-muted-foreground w-5 h-5 rounded-full border border-border flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "monitoring",
      title: "Monitoring",
      icon: <Settings className="w-3.5 h-3.5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Monitoring Configuration</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">Configure which tools to monitor and scan frequency.</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Supported tools</h3>
            <div className="grid grid-cols-2 gap-2">
              {["Shodan", "VirusTotal", "Have I Been Pwned", "AbuseIPDB", "GreyNoise", "URLScan.io"].map(n => (
                <div key={n} className="p-2.5 rounded-md border border-border text-sm text-foreground">{n}</div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Frequencies</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {["Every 15 minutes", "Every 30 minutes", "Hourly (default)", "Every 6 hours", "Daily"].map(f => (
                <li key={f} className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-primary" /> {f}</li>
              ))}
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: <Bell className="w-3.5 h-3.5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Notification Channels</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">Configure where alerts are delivered.</p>
          </div>
          {[
            { icon: <MessageSquare className="w-4 h-4" />, title: "Slack", steps: ["Create Incoming Webhook in Slack", "Select a channel", "Copy the webhook URL", "Paste in notification settings"] },
            { icon: <Hash className="w-4 h-4" />, title: "Discord", steps: ["Go to Server Settings → Integrations → Webhooks", "Create webhook and select channel", "Copy URL", "Paste in notification settings"] },
            { icon: <Mail className="w-4 h-4" />, title: "Email", steps: ["Enter email address", "Send test notification", "Check spam folder if needed"] },
          ].map(({ icon, title, steps }) => (
            <div key={title} className="space-y-2">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">{icon} {title}</h3>
              <ol className="space-y-1 text-xs text-muted-foreground ml-6">
                {steps.map((s, i) => <li key={i}>{i + 1}. {s}</li>)}
              </ol>
            </div>
          ))}
          <div className="p-3 rounded-md border border-warning/20 bg-warning/5">
            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Tip:</span> Always send a test after adding a channel.</p>
          </div>
        </div>
      ),
    },
    {
      id: "alerts",
      title: "Alerts",
      icon: <Scan className="w-3.5 h-3.5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Scans & Alerts</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">How scans work and how to act on alerts.</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Severity levels</h3>
            <div className="space-y-1.5">
              {[
                { level: "Critical", desc: "Immediate action required", color: "text-destructive" },
                { level: "High", desc: "Address within 24 hours", color: "text-warning" },
                { level: "Medium", desc: "Plan remediation this week", color: "text-info" },
                { level: "Low", desc: "Review when convenient", color: "text-muted-foreground" },
              ].map(({ level, desc, color }) => (
                <div key={level} className="flex items-center gap-3 p-2 rounded-md border border-border text-sm">
                  <span className={`font-medium ${color}`}>{level}</span>
                  <span className="text-muted-foreground text-xs">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">AI Analysis</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Click Analyze on any alert for threat context, impact assessment, and remediation steps.</p>
          </div>
        </div>
      ),
    },
    {
      id: "api",
      title: "API & n8n",
      icon: <Zap className="w-3.5 h-3.5" />,
      badge: "Developer",
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">API Integration</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">REST API and MCP Server for automation.</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Endpoints</h3>
            <div className="space-y-1 font-mono text-xs">
              {[
                "GET  /config",
                "POST /scan",
                "GET  /alerts",
                "POST /alerts/:id/analyze",
                "POST /alerts/:id/send",
                "GET  /notification-channels",
              ].map(e => <p key={e} className="text-muted-foreground py-0.5">{e}</p>)}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">Authentication</h3>
            <p className="text-xs text-muted-foreground">Include <code className="px-1 py-0.5 rounded bg-muted text-foreground">x-api-key</code> header with every request.</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">Webhooks</h3>
            <p className="text-xs text-muted-foreground">Events: <code className="px-1 py-0.5 rounded bg-muted text-foreground">alert.created</code>, <code className="px-1 py-0.5 rounded bg-muted text-foreground">scan.completed</code></p>
          </div>
        </div>
      ),
    },
    {
      id: "security",
      title: "Security",
      icon: <Lock className="w-3.5 h-3.5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Security Practices</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">Guidelines for a secure setup.</p>
          </div>
          <div className="space-y-2">
            {[
              { t: "Rotate API keys regularly", d: "Generate new keys and deactivate old ones." },
              { t: "Use webhook secrets", d: "Verify payload authenticity in n8n workflows." },
              { t: "Test notification channels", d: "Ensure channels are active to avoid missed alerts." },
              { t: "Don't ignore low-severity alerts", d: "They can indicate reconnaissance activity." },
            ].map(({ t, d }) => (
              <div key={t} className="flex gap-2.5 p-2.5 rounded-md border border-border text-sm">
                <CheckCircle className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground text-xs">{t}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = searchQuery ? sections.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())) : sections;
  const active = sections.find(s => s.id === activeSection);

  return (
    <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-56 flex-shrink-0">
            <div className="lg:sticky lg:top-20 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-xs h-8" />
              </div>
              <nav className="space-y-0.5">
                {filteredSections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSection(s.id); setSearchQuery(""); }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-xs transition-colors ${
                      activeSection === s.id ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">{s.icon}<span>{s.title}</span></div>
                    {s.badge && <Badge variant="outline" className="text-[9px] px-1">{s.badge}</Badge>}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <Card>
              <CardContent className="p-6">{active?.content}</CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
