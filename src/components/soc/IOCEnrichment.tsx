import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, Globe, Hash, Server, Loader2, Plus, Shield, AlertTriangle } from "lucide-react";

export const IOCEnrichment = () => {
  const [iocs, setIocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState<Set<string>>(new Set());
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState("ip");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("iocs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    setIocs(data || []);
    setLoading(false);
  };

  const addIOC = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("iocs").insert({
      user_id: user.id,
      ioc_type: newType,
      ioc_value: newValue,
      source: "manual",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setNewValue(""); toast({ title: "IOC added" }); load(); }
    setAdding(false);
  };

  const enrichIOC = async (ioc: any) => {
    setEnriching(p => new Set(p).add(ioc.id));
    try {
      const { data, error } = await supabase.functions.invoke("analyze-alert", {
        body: {
          alertId: ioc.alert_id,
          customPrompt: `Analyze this indicator of compromise (IOC) and provide threat intelligence enrichment:
Type: ${ioc.ioc_type}
Value: ${ioc.ioc_value}

Provide: reputation score (malicious/suspicious/clean/unknown), known associations, geographic data if IP, WHOIS data if domain, malware families if hash. Return JSON: {"reputation": "malicious|suspicious|clean|unknown", "details": "...", "risk_score": 0-100}`,
        },
      });

      let enrichmentData = {};
      let reputation = "unknown";
      try {
        const parsed = JSON.parse(data?.analysis || "{}");
        enrichmentData = parsed;
        reputation = parsed.reputation || "unknown";
      } catch {
        enrichmentData = { raw: data?.analysis };
      }

      await supabase.from("iocs").update({
        enrichment_data: enrichmentData,
        enriched_at: new Date().toISOString(),
        reputation,
      }).eq("id", ioc.id);

      toast({ title: "IOC enriched" });
      load();
    } catch (e: any) {
      toast({ title: "Enrichment failed", description: e.message, variant: "destructive" });
    }
    setEnriching(p => { const n = new Set(p); n.delete(ioc.id); return n; });
  };

  const repColor = (r: string) => {
    switch (r?.toLowerCase()) {
      case "malicious": return "bg-destructive/10 text-destructive border-destructive/30";
      case "suspicious": return "bg-warning/10 text-warning border-warning/30";
      case "clean": return "bg-success/10 text-success border-success/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const typeIcon = (t: string) => {
    switch (t) {
      case "ip": return <Server className="w-3 h-3" />;
      case "domain": return <Globe className="w-3 h-3" />;
      case "hash": return <Hash className="w-3 h-3" />;
      default: return <Search className="w-3 h-3" />;
    }
  };

  if (loading) return <Card><CardContent className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">IOC Enrichment</h3>
        <p className="text-xs text-muted-foreground">Look up IPs, domains, and file hashes against threat intelligence</p>
      </div>

      {/* Add IOC */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-28 text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ip">IP Address</SelectItem>
                <SelectItem value="domain">Domain</SelectItem>
                <SelectItem value="hash">File Hash</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Enter IOC value..." value={newValue} onChange={e => setNewValue(e.target.value)} className="text-xs h-8 flex-1" />
            <Button size="sm" className="text-xs h-8" onClick={addIOC} disabled={adding || !newValue.trim()}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* IOC List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Shield className="w-4 h-4" /> Indicators ({iocs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            {iocs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No IOCs tracked yet</p>
            ) : (
              <div className="space-y-2">
                {iocs.map(ioc => (
                  <div key={ioc.id} className="border rounded-md p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {typeIcon(ioc.ioc_type)}
                          <Badge variant="outline" className="text-[10px]">{ioc.ioc_type.toUpperCase()}</Badge>
                          {ioc.reputation && (
                            <Badge variant="outline" className={`text-[10px] ${repColor(ioc.reputation)}`}>{ioc.reputation}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-mono text-foreground break-all">{ioc.ioc_value}</p>
                        {ioc.enrichment_data && Object.keys(ioc.enrichment_data as object).length > 0 && (
                          <div className="bg-muted/30 rounded p-2 mt-1">
                            <p className="text-[10px] text-foreground/80 whitespace-pre-wrap">
                              {typeof (ioc.enrichment_data as any).details === "string"
                                ? (ioc.enrichment_data as any).details
                                : (ioc.enrichment_data as any).raw || JSON.stringify(ioc.enrichment_data, null, 2)}
                            </p>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Source: {ioc.source || "unknown"} {ioc.enriched_at ? `· Enriched` : "· Not enriched"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-7 shrink-0" onClick={() => enrichIOC(ioc)} disabled={enriching.has(ioc.id)}>
                        {enriching.has(ioc.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3 mr-1" />}
                        Enrich
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
