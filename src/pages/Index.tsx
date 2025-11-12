import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Bell, Zap, Lock, Activity, Scan } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            SecureWatch AI
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Automated cybersecurity threat monitoring powered by AI. Stay ahead of vulnerabilities
            affecting your tech stack with real-time alerts.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/signup")}>
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Comprehensive Threat Monitoring
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Monitor security news, vendor advisories, and threat intelligence feeds for your
              specific tools and technologies.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Scan className="w-12 h-12 text-primary mb-4" />
                <CardTitle>AI-Powered Analysis</CardTitle>
                <CardDescription>
                  Advanced AI filters and analyzes threats, providing clear summaries and severity
                  ratings for each alert.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Bell className="w-12 h-12 text-primary mb-4" />
                <CardTitle>Instant Slack Alerts</CardTitle>
                <CardDescription>
                  Receive real-time notifications in your Slack workspace when critical
                  vulnerabilities are detected.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="w-12 h-12 text-primary mb-4" />
                <CardTitle>Automated Scanning</CardTitle>
                <CardDescription>
                  Configure scan frequency from every 15 minutes to daily. Manual scans available
                  anytime.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">How It Works</h2>
          
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Configure Your Stack
                </h3>
                <p className="text-muted-foreground">
                  Enter the tools, platforms, and technologies you want to monitor - from WordPress
                  and AWS to Splunk and SentinelOne.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Connect Slack</h3>
                <p className="text-muted-foreground">
                  Add your Slack webhook URL to receive notifications directly in your team's
                  channel.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Automated Protection
                </h3>
                <p className="text-muted-foreground">
                  AI continuously monitors cybersecurity news and alerts you only about threats
                  relevant to your stack.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="container mx-auto text-center">
          <Lock className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Stay Ahead of Cyber Threats
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start monitoring your tech stack for security vulnerabilities today. Free to get
            started.
          </p>
          <Button size="lg" onClick={() => navigate("/signup")}>
            Create Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 SecureWatch AI. Powered by Lovable Cloud.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
