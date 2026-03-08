import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, BookOpen, Settings as SettingsIcon } from "lucide-react";
import { MonitoringConfig } from "@/components/dashboard/MonitoringConfig";
import { ScanStatus } from "@/components/dashboard/ScanStatus";
import { AlertHistory } from "@/components/dashboard/AlertHistory";
import { N8nIntegration } from "@/components/dashboard/N8nIntegration";
import { NotificationChannels } from "@/components/dashboard/NotificationChannels";
import { DashboardAnalytics } from "@/components/dashboard/DashboardAnalytics";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) navigate("/login");
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Shield className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 bg-background">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold tracking-tight text-foreground">SecureWatch</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/docs")} className="text-muted-foreground hover:text-foreground">
              <BookOpen className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline text-xs">Docs</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground">
              <SettingsIcon className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline text-xs">Settings</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline text-xs">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <DashboardAnalytics />
        <ScanStatus />
        <div className="grid lg:grid-cols-2 gap-6">
          <MonitoringConfig />
          <NotificationChannels />
        </div>
        <AlertHistory />
        <N8nIntegration />
      </main>
    </div>
  );
};

export default Dashboard;
