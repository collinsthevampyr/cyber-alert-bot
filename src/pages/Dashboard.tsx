import { DashboardAnalytics } from "@/components/dashboard/DashboardAnalytics";
import { ScanStatus } from "@/components/dashboard/ScanStatus";
import { AlertHistory } from "@/components/dashboard/AlertHistory";

const Dashboard = () => {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Threat overview and recent activity</p>
      </div>

      <DashboardAnalytics />
      <ScanStatus />
      <AlertHistory />
    </div>
  );
};

export default Dashboard;
