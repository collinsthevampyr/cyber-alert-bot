import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, X, Plus, PlayCircle, Loader2 } from "lucide-react";

const TOOL_NAME_PATTERN = /^[a-zA-Z0-9\s._\-/()]+$/;
const MAX_TOOLS = 50;

export const MonitoringConfig = () => {
  const [tools, setTools] = useState<string[]>([]);
  const [newTool, setNewTool] = useState("");
  const [toolError, setToolError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState("hourly");
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("monitoring_config").select("*").eq("user_id", user.id).single();
    if (data) { setTools(data.tools_list || []); setFrequency(data.scan_frequency); }
  };

  const addTool = () => {
    const t = newTool.trim();
    if (!t) { setToolError("Required"); return; }
    if (!TOOL_NAME_PATTERN.test(t)) { setToolError("Invalid characters"); return; }
    if (tools.includes(t)) { setToolError("Already added"); return; }
    if (tools.length >= MAX_TOOLS) { setToolError("Maximum reached"); return; }
    setToolError(null);
    setTools([...tools, t]);
    setNewTool("");
  };

  const saveConfig = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("monitoring_config").upsert({ user_id: user.id, tools_list: tools, scan_frequency: frequency, is_active: true });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Saved", description: "Configuration updated." });
    setLoading(false);
  };

  const runScan = async () => {
    setScanLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-threats", { body: { manual: true } });
      if (error) throw error;
      toast({ title: "Scan started", description: data?.message || "Running now." });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setScanLoading(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" /> Monitoring
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">Tools and scan schedule</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={runScan} disabled={scanLoading || tools.length === 0}>
            {scanLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 mr-1.5" />}
            {scanLoading ? "Scanning" : "Scan now"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Monitored tools</Label>
          <div className="flex gap-2">
            <Input placeholder="e.g. WordPress, AWS" value={newTool} onChange={(e) => { setNewTool(e.target.value); setToolError(null); }} onKeyDown={(e) => e.key === "Enter" && addTool()} className="text-sm" />
            <Button size="icon" variant="outline" onClick={addTool}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
          {toolError && <p className="text-xs text-destructive">{toolError}</p>}
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {tools.map((tool) => (
              <Badge key={tool} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
                {tool}
                <button onClick={() => setTools(tools.filter(t => t !== tool))} className="ml-0.5 hover:text-destructive transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">{tools.length}/{MAX_TOOLS}</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Scan frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="15min">Every 15 min</SelectItem>
              <SelectItem value="30min">Every 30 min</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="6hours">Every 6 hours</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={saveConfig} disabled={loading} size="sm" className="w-full">
          {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving</> : "Save configuration"}
        </Button>
      </CardContent>
    </Card>
  );
};
