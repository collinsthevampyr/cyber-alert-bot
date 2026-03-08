import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriage } from "@/components/soc/AlertTriage";
import { IncidentManager } from "@/components/soc/IncidentManager";
import { PlaybookManager } from "@/components/soc/PlaybookManager";
import { IOCEnrichment } from "@/components/soc/IOCEnrichment";
import { EscalationRules } from "@/components/soc/EscalationRules";
import { SLADashboard } from "@/components/soc/SLADashboard";
import { ResponseActions } from "@/components/soc/ResponseActions";
import { SIEMIntegrations } from "@/components/soc/SIEMIntegrations";

const SOCWorkspace = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">SOC Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">Investigate, triage, and respond to security incidents</p>
      </div>

      <Tabs defaultValue="triage" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="triage" className="text-xs">Alert Triage</TabsTrigger>
          <TabsTrigger value="incidents" className="text-xs">Incidents</TabsTrigger>
          <TabsTrigger value="playbooks" className="text-xs">Playbooks</TabsTrigger>
          <TabsTrigger value="ioc" className="text-xs">IOC Enrichment</TabsTrigger>
          <TabsTrigger value="escalation" className="text-xs">Escalation</TabsTrigger>
          <TabsTrigger value="sla" className="text-xs">SLA Tracking</TabsTrigger>
          <TabsTrigger value="response" className="text-xs">Response Actions</TabsTrigger>
          <TabsTrigger value="siem" className="text-xs">SIEM</TabsTrigger>
        </TabsList>

        <TabsContent value="triage"><AlertTriage /></TabsContent>
        <TabsContent value="incidents"><IncidentManager /></TabsContent>
        <TabsContent value="playbooks"><PlaybookManager /></TabsContent>
        <TabsContent value="ioc"><IOCEnrichment /></TabsContent>
        <TabsContent value="escalation"><EscalationRules /></TabsContent>
        <TabsContent value="sla"><SLADashboard /></TabsContent>
        <TabsContent value="response"><ResponseActions /></TabsContent>
        <TabsContent value="siem"><SIEMIntegrations /></TabsContent>
      </Tabs>
    </div>
  );
};

export default SOCWorkspace;
