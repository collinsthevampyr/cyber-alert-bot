import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ArrowUpRight, Eye, Brain, Workflow, Server,
  Bell, Lock, Target, Zap, Clock, BarChart3, Twitter, Linkedin,
} from "lucide-react";

const industries = [
  "Banking", "Government", "Healthcare", "Fintech", "Defense",
  "Critical Infrastructure", "Telecom", "Energy", "Insurance", "SaaS",
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Gardien" className="w-6 h-6" />
            <span className="text-base font-bold tracking-tight">GARDIEN</span>
          </button>
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-eyebrow text-muted-foreground">
            <a href="#platform" className="hover:text-foreground transition-colors">Platform</a>
            <a href="#intel" className="hover:text-foreground transition-colors">Intel</a>
            <a href="#industries" className="hover:text-foreground transition-colors">Industries</a>
            <button onClick={() => navigate("/docs")} className="hover:text-foreground transition-colors">Docs</button>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="hidden sm:inline text-xs uppercase tracking-eyebrow text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </button>
            <Button
              onClick={() => navigate("/signup")}
              className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 text-xs uppercase tracking-eyebrow font-semibold h-9 px-4"
            >
              Request Demo
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative border-b border-border">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
               style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 pt-24 pb-20 lg:pt-36 lg:pb-32">
            <div className="max-w-4xl animate-fade-in-up">
              <p className="text-xs uppercase tracking-eyebrow text-primary mb-6 flex items-center gap-2">
                <span className="w-8 h-px bg-primary" /> Continuous Threat Operations
              </p>
              <h1 className="text-5xl sm:text-6xl lg:text-[80px] font-bold leading-[0.95] tracking-display">
                Active Security Monitoring.
                <br />
                <span className="text-muted-foreground">Built For Real Threats.</span>
              </h1>
              <p className="mt-8 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                Gardien is the AI-driven Security Operations Center that detects, triages, and remediates threats the moment they appear — before adversaries weaponize them against you.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate("/signup")}
                  className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-7 text-xs uppercase tracking-eyebrow font-semibold"
                >
                  Request Demo <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="rounded-none border-foreground/30 bg-transparent text-foreground hover:bg-foreground hover:text-background h-12 px-7 text-xs uppercase tracking-eyebrow font-semibold"
                >
                  Access Platform
                </Button>
              </div>
            </div>

            {/* Terminal mock */}
            <div className="mt-20 lg:mt-28 max-w-5xl mx-auto border border-border bg-card">
              <div className="flex items-center gap-2 px-4 h-9 border-b border-border">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                <span className="ml-3 font-mono text-[11px] text-muted-foreground">gardien — soc/live-feed</span>
              </div>
              <div className="p-6 font-mono text-xs sm:text-sm space-y-2 text-muted-foreground">
                <div><span className="text-primary">▸</span> [03:47:12] Wazuh ingest · 1,284 events normalized</div>
                <div><span className="text-primary">▸</span> [03:47:14] CVE-2026-2841 · weaponization detected · <span className="text-foreground font-semibold">CRITICAL</span></div>
                <div><span className="text-primary">▸</span> [03:47:15] Playbook "Isolate &amp; Notify" → executed in 312ms</div>
                <div><span className="text-primary">▸</span> [03:47:16] Slack #soc-ops · message delivered · ack pending</div>
                <div className="text-foreground"><span className="text-primary">▸</span> [03:47:18] Status: <span className="text-primary">ACTIVE DEFENSE</span> · 0 unhandled · MTTR 4m 12s</div>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF STRIP */}
        <section id="industries" className="border-b border-border overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
            <p className="text-[11px] uppercase tracking-eyebrow text-muted-foreground mb-6">
              Used across the world's most targeted industries
            </p>
            <div className="relative">
              <div className="flex gap-3 animate-marquee whitespace-nowrap">
                {[...industries, ...industries].map((name, i) => (
                  <span key={i} className="px-4 py-2 border border-border text-sm text-foreground/80 shrink-0">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE — alternating */}
        <section id="platform" className="border-b border-border">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24 lg:py-32 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-xs uppercase tracking-eyebrow text-primary mb-4">01 — Detection</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-display leading-tight">
                See threats before they detonate.
              </h2>
              <p className="mt-6 text-muted-foreground leading-relaxed max-w-lg">
                Continuous scanning across CVE feeds, threat intel sources, and your live SIEM telemetry. Gardien correlates signal across the noise and surfaces what matters in seconds — not shifts.
              </p>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate("/signup"); }} className="mt-8 inline-flex items-center gap-2 text-sm uppercase tracking-eyebrow text-primary hover:text-foreground transition-colors">
                Explore detection <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
            <div className="aspect-[5/4] border border-border bg-card relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "100% 24px" }} />
              <div className="relative h-full p-6 font-mono text-[11px] text-muted-foreground space-y-1.5">
                <div className="text-foreground">$ gardien scan --live</div>
                <div>▸ feeds: 14 active · 2,847 records/min</div>
                <div>▸ siem: wazuh · splunk · sentinel</div>
                <div className="text-primary">⚠ CVE-2026-1182 · weaponized · severity 9.8</div>
                <div className="text-primary">⚠ Lateral movement detected · host-04</div>
                <div>▸ ai-triage: 12 escalated · 142 suppressed</div>
                <div>▸ playbooks: 3 executed · 0 failures</div>
                <div className="text-foreground pt-3">█</div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-[#0d0d0d]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24 lg:py-32 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="lg:order-2">
              <p className="text-xs uppercase tracking-eyebrow text-primary mb-4">02 — Response</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-display leading-tight">
                Automate the first 90 seconds.
              </h2>
              <p className="mt-6 text-muted-foreground leading-relaxed max-w-lg">
                Playbooks, escalations, and notifications fire the moment a signal crosses your threshold. Slack, Discord, email, webhook — your team is in the loop while the attacker is still mapping your perimeter.
              </p>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate("/signup"); }} className="mt-8 inline-flex items-center gap-2 text-sm uppercase tracking-eyebrow text-primary hover:text-foreground transition-colors">
                See playbooks <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
            <div className="lg:order-1 aspect-[5/4] border border-border bg-background relative overflow-hidden">
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-6">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className="border-r border-b border-border/50" />
                ))}
              </div>
              <div className="relative h-full p-8 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-eyebrow text-muted-foreground">Active Incident</div>
                  <div className="text-2xl font-bold tracking-display">INC-2841</div>
                </div>
                <div className="space-y-3 font-mono text-[11px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Severity</span><span className="text-primary font-semibold">CRITICAL</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">MTTA</span><span>00:00:08</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Playbook</span><span>isolate-host</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-foreground">Contained</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TENSION STATS */}
        <section className="border-b border-border">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24 lg:py-32">
            <div className="max-w-3xl mb-16">
              <p className="text-xs uppercase tracking-eyebrow text-primary mb-4">The Reality</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-display leading-tight">
                Adversaries move in hours.
                <br />
                <span className="text-muted-foreground">Most defenses move in months.</span>
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 border border-border">
              {[
                { stat: "< 24h", label: "Average time from CVE disclosure to active exploitation in the wild." },
                { stat: "97 days", label: "Median enterprise patch cycle for critical infrastructure vulnerabilities." },
                { stat: "11,000+", label: "New CVEs published every quarter — most never reach a security team's radar." },
                { stat: "1 in 3", label: "Breaches start from a known, unpatched vulnerability sitting in a dashboard." },
              ].map(({ stat, label }) => (
                <div key={stat} className="p-8 lg:p-10 border-r border-b sm:border-b-0 lg:border-b-0 last:border-r-0 sm:[&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r border-border bg-card">
                  <div className="text-4xl lg:text-5xl font-bold tracking-display text-foreground">{stat}</div>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CAPABILITIES — 3 col icon grid */}
        <section className="border-b border-border bg-[#0d0d0d]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24 lg:py-32">
            <div className="max-w-2xl mb-16">
              <p className="text-xs uppercase tracking-eyebrow text-primary mb-4">Deploy</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-display leading-tight">
                A complete SOC, operational on day one.
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {[
                { icon: Eye, title: "Continuous Scanning", desc: "Threat intel, CVE feeds, and live telemetry monitored every 5 minutes." },
                { icon: Brain, title: "AI Triage", desc: "Severity, blast radius, and remediation steps generated per alert." },
                { icon: Workflow, title: "Automated Playbooks", desc: "Multi-step response actions execute the moment conditions match." },
                { icon: Target, title: "Incident Lifecycle", desc: "Group, assign, track, and close incidents with full audit trails." },
                { icon: Server, title: "SIEM Integrations", desc: "Wazuh, Splunk, Elastic, Sentinel — ingest and correlate in real time." },
                { icon: Bell, title: "Multi-channel Alerts", desc: "Slack, Discord, email, webhooks with escalation and SLA tracking." },
                { icon: Clock, title: "MTTA / MTTR", desc: "Performance metrics tracked per analyst, per shift, per severity." },
                { icon: BarChart3, title: "Live Analytics", desc: "Trend lines, severity breakdowns, and scan health in one pane." },
                { icon: Lock, title: "Secure By Design", desc: "RLS, RBAC, signed webhooks, SSRF protection, full audit logs." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-[#0d0d0d] p-8 group">
                  <Icon className="w-6 h-6 text-primary mb-6 stroke-[1.25]" />
                  <h3 className="text-base font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INTEL FEED */}
        <section id="intel" className="border-b border-border">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24 lg:py-32">
            <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
              <div>
                <p className="text-xs uppercase tracking-eyebrow text-primary mb-4">Latest Intel</p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-display leading-tight">
                  From the operations floor.
                </h2>
              </div>
              <a href="#" onClick={(e) => e.preventDefault()} className="text-xs uppercase tracking-eyebrow text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                All advisories <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { tag: "Rapid Reaction", title: "CVE-2026-1182: Weaponized within 6 hours of disclosure", date: "May 12, 2026" },
                { tag: "Threat Brief", title: "Lateral movement patterns observed across financial sector", date: "May 09, 2026" },
                { tag: "Advisory", title: "Wazuh agent telemetry gap exposes Linux endpoints", date: "May 04, 2026" },
              ].map(({ tag, title, date }) => (
                <article key={title} className="group cursor-pointer">
                  <div className="aspect-[16/10] bg-card border border-border mb-5 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(45deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "8px 8px" }} />
                    <div className="absolute bottom-4 left-4 font-mono text-[10px] text-primary uppercase tracking-eyebrow">{tag}</div>
                  </div>
                  <p className="text-[10px] uppercase tracking-eyebrow text-muted-foreground mb-3">{date}</p>
                  <h3 className="text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER CTA */}
        <section className="border-b border-border">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-28 lg:py-40 text-center">
            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-display leading-[0.95] max-w-4xl mx-auto">
              Threats don't stop.
              <br />
              <span className="text-primary">Neither should Gardien.</span>
            </h2>
            <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/signup")}
                className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-xs uppercase tracking-eyebrow font-semibold"
              >
                Request Demo <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/login")}
                className="rounded-none border-foreground/30 bg-transparent hover:bg-foreground hover:text-background h-12 px-8 text-xs uppercase tracking-eyebrow font-semibold"
              >
                Access Platform
              </Button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/favicon.png" alt="Gardien" className="w-5 h-5" />
                <span className="font-bold tracking-tight">GARDIEN</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                Active security monitoring built for real threats.
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-eyebrow text-muted-foreground mb-4">Platform</p>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#platform" className="hover:text-primary transition-colors">Detection</a></li>
                <li><a href="#platform" className="hover:text-primary transition-colors">Response</a></li>
                <li><button onClick={() => navigate("/docs")} className="hover:text-primary transition-colors">Docs</button></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-eyebrow text-muted-foreground mb-4">Company</p>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#intel" className="hover:text-primary transition-colors">Intel</a></li>
                <li><button onClick={() => navigate("/support")} className="hover:text-primary transition-colors">Support</button></li>
                <li><button onClick={() => navigate("/login")} className="hover:text-primary transition-colors">Sign in</button></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-eyebrow text-muted-foreground mb-4">Follow</p>
              <div className="flex gap-3">
                <a href="#" aria-label="LinkedIn" className="w-9 h-9 border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="#" aria-label="X" className="w-9 h-9 border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] uppercase tracking-eyebrow text-muted-foreground">
              <span>© 2026 Gardien. All rights reserved.</span>
              <span className="font-mono normal-case tracking-normal">status: <span className="text-primary">operational</span></span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;