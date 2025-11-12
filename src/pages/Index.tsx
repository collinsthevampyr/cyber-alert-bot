import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Bell, Zap, Lock, Sparkles, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <header className="relative border-b border-border/50 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <Shield className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />
              <Sparkles className="w-3 h-3 text-accent absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              SecureWatch AI
            </h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/login")}
              className="hover-scale"
            >
              Login
            </Button>
            <Button 
              onClick={() => navigate("/signup")}
              className="hover-scale bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
            >
              Get Started
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-20">
        <div className="text-center space-y-8 mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Security Intelligence</span>
          </div>
          <h1 className="text-6xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Stay Ahead of
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Cybersecurity Threats
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Automated threat monitoring with instant Slack alerts for your entire technology stack.
            Never miss a critical security update again.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/signup")}
              className="hover-scale bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl text-base px-8 py-6"
            >
              Start Monitoring Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate("/login")}
              className="hover-scale border-primary/20 hover:bg-primary/10 hover:text-primary text-base px-8 py-6"
            >
              Sign In
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-primary/20 animate-fade-in">
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Real-time Monitoring</h3>
              <p className="text-muted-foreground leading-relaxed">
                Continuously scans cybersecurity news, CVEs, and threat intelligence feeds 24/7.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-accent/20 animate-fade-in delay-100">
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/10">
                <Bell className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-2xl font-bold">Instant Alerts</h3>
              <p className="text-muted-foreground leading-relaxed">
                Get notified immediately via Slack when threats affecting your tools are detected.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-primary/20 animate-fade-in delay-200">
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">AI-Powered Analysis</h3>
              <p className="text-muted-foreground leading-relaxed">
                Intelligent threat assessment with severity ratings and plain-English summaries.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
