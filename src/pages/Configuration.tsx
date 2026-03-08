import { MonitoringConfig } from "@/components/dashboard/MonitoringConfig";
import { NotificationChannels } from "@/components/dashboard/NotificationChannels";
import { N8nIntegration } from "@/components/dashboard/N8nIntegration";

const Configuration = () => {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage monitoring tools, notifications, and integrations</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <MonitoringConfig />
        <NotificationChannels />
      </div>

      <N8nIntegration />
    </div>
  );
};

export default Configuration;
