import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, Trash2, Database, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SIEM_TYPES = [
  { value: "splunk", label: "Splunk" },
  { value: "sentinel", label: "Microsoft Sentinel" },
  { value: "elastic", label: "Elastic SIEM" },
  { value: "qradar", label: "IBM QRadar" },
  { value: "chronicle", label: "Google Chronicle" },
  { value: "wazuh", label: "Wazuh" },
  { value: "custom", label: "Custom / Syslog" },
];

export const SIEMIntegrations = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [siemType, setSiemType] = useState("splunk");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [wazuhUser, setWazuhUser] = useState("");
  const [wazuhPass, setWazuhPass] = useState("");
  const [wazuhIndexerUrl, setWazuhIndexerUrl] = useState("");
  const [skipTlsVerify, setSkipTlsVerify] = useState(false);
  const [wazuhCaCert, setWazuhCaCert] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("siem_integrations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setIntegrations(data || []);
    setLoading(false);
  };

  const createIntegration = async () => {
    if (!name.trim() || !endpoint.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const resolvedApiKey = siemType === "wazuh" && wazuhUser && wazuhPass
      ? btoa(`${wazuhUser}:${wazuhPass}`)
      : apiKey || undefined;
    const configPayload: any = { endpoint, api_key: resolvedApiKey };
    if (siemType === "wazuh") {
      if (wazuhIndexerUrl.trim()) configPayload.indexer_url = wazuhIndexerUrl.trim();
      if (skipTlsVerify) configPayload.skip_tls_verify = true;
      if (skipTlsVerify && wazuhCaCert.trim()) configPayload.wazuh_ca_cert = wazuhCaCert.trim();
    }
    const { error } = await supabase.from("siem_integrations").insert({
      user_id: user.id,
      name,
      siem_type: siemType,
      config: configPayload,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setName(""); setEndpoint(""); setApiKey(""); setWazuhUser(""); setWazuhPass(""); setWazuhIndexerUrl(""); setSkipTlsVerify(false); setWazuhCaCert(""); setDialogOpen(false); toast({ title: "SIEM integration added" }); load(); }
    setCreating(false);
  };

  const toggleIntegration = async (id: string, active: boolean) => {
    await supabase.from("siem_integrations").update({ is_active: !active }).eq("id", id);
    load();
  };

  const deleteIntegration = async (id: string) => {
    await supabase.from("siem_integrations").delete().eq("id", id);
    load();
    toast({ title: "Integration removed" });
  };

  const testIntegration = async (integration: any) => {
    setTestingId(integration.id);
    toast({ title: "Syncing...", description: `Triggering SIEM ingestion for ${integration.name}...` });

    try {
      const { data, error } = await supabase.functions.invoke("siem-ingest", {
        body: { integrationId: integration.id },
      });

      if (error) throw error;

      const result = data?.results?.find((item: any) => item.integrationId === integration.id);

      if (!data?.ok) {
        throw new Error(result?.error || data?.error || "Check SIEM endpoint configuration");
      }

      toast({
        title: "Sync complete",
        description: `Fetched ${result?.fetched || 0} events and ingested ${result?.ingested || 0} alerts`,
      });
      load();
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message || "Check SIEM endpoint configuration", variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  if (loading) return <Card><CardContent className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">SIEM Integration</h3>
          <p className="text-xs text-muted-foreground">Ingest logs from Splunk, Sentinel, Elastic, and more</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs"><Plus className="w-3 h-3 mr-1" /> Add SIEM</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-sm">Add SIEM Integration</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Integration name" value={name} onChange={e => setName(e.target.value)} className="text-sm" />
              <Select value={siemType} onValueChange={setSiemType}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Endpoint URL" value={endpoint} onChange={e => setEndpoint(e.target.value)} className="text-sm" />
              {siemType === "wazuh" ? (
                <>
                  <p className="text-[10px] text-muted-foreground">Enter your Wazuh Manager API URL (e.g. https://your-wazuh:55000)</p>
                  <Input placeholder="Wazuh username" value={wazuhUser} onChange={e => setWazuhUser(e.target.value)} className="text-sm" />
                  <Input placeholder="Wazuh password" value={wazuhPass} onChange={e => setWazuhPass(e.target.value)} className="text-sm" type="password" />
                  <p className="text-[10px] text-muted-foreground">Credentials will be Base64-encoded automatically</p>
                  <Input placeholder="Wazuh Indexer URL (optional, e.g. https://your-wazuh:9200)" value={wazuhIndexerUrl} onChange={e => setWazuhIndexerUrl(e.target.value)} className="text-sm" />
                  <p className="text-[10px] text-muted-foreground">💡 For best results, add your Wazuh Indexer URL — alerts are stored there, not in the Manager API</p>
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="skip-tls"
                      checked={skipTlsVerify}
                      onCheckedChange={(checked) => setSkipTlsVerify(checked === true)}
                    />
                    <label htmlFor="skip-tls" className="text-xs text-muted-foreground cursor-pointer">
                      Trust Wazuh self-signed certificate
                    </label>
                  </div>
                  {skipTlsVerify && (
                    <>
                      <Textarea placeholder="Paste Wazuh root CA certificate PEM (-----BEGIN CERTIFICATE-----...)" value={wazuhCaCert} onChange={e => setWazuhCaCert(e.target.value)} className="text-xs font-mono min-h-24" />
                      <p className="text-[10px] text-muted-foreground">Lovable Cloud must trust the Wazuh CA explicitly; full TLS bypass is blocked by the runtime.</p>
                    </>
                  )}
                </>
              ) : (
                <Input placeholder="API Key (optional)" value={apiKey} onChange={e => setApiKey(e.target.value)} className="text-sm" type="password" />
              )}
              <Button className="w-full text-xs" onClick={createIntegration} disabled={creating || !name.trim() || !endpoint.trim() || (siemType === "wazuh" && skipTlsVerify && !wazuhCaCert.trim())}>
                {creating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Add Integration
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Database className="w-4 h-4" /> Connected SIEMs ({integrations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {integrations.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No SIEM integrations</p>
                <p className="text-xs text-muted-foreground mt-1">Connect to Splunk, Sentinel, or other SIEMs to ingest logs</p>
              </div>
            ) : (
              <div className="space-y-2">
                {integrations.map(int => {
                  const typeInfo = SIEM_TYPES.find(t => t.value === int.siem_type);
                  return (
                    <div key={int.id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{int.name}</p>
                            <Badge variant="outline" className="text-[10px]">{typeInfo?.label || int.siem_type}</Badge>
                            <Badge variant="outline" className={`text-[10px] ${int.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                              {int.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{(int.config as any)?.endpoint}</p>
                          {int.last_sync_at && (
                            <p className="text-[10px] text-muted-foreground">Last sync: {formatDistanceToNow(new Date(int.last_sync_at), { addSuffix: true })}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => testIntegration(int)} disabled={testingId === int.id}>
                            {testingId === int.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Activity className="w-3 h-3 mr-1" />} Test
                          </Button>
                          <Switch checked={int.is_active} onCheckedChange={() => toggleIntegration(int.id, int.is_active)} />
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteIntegration(int.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
