import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, X, Plus, PlayCircle, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SLACK_WEBHOOK_PATTERN = /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+$/;
const TOOL_NAME_PATTERN = /^[a-zA-Z0-9\s._\-/()]+$/;
const MAX_TOOL_NAME_LENGTH = 100;
const MAX_TOOLS = 50;

const validateToolName = (name: string): string | null => {
  if (!name.trim()) return "Tool name cannot be empty";
  if (name.trim().length > MAX_TOOL_NAME_LENGTH) return `Tool name must be under ${MAX_TOOL_NAME_LENGTH} characters`;
  if (!TOOL_NAME_PATTERN.test(name.trim())) return "Tool name can only contain letters, numbers, spaces, and . _ - / ( )";
  return null;
};

const validateSlackWebhook = (url: string): string | null => {
  if (!url) return null; // optional field
  if (!SLACK_WEBHOOK_PATTERN.test(url)) return "Must be a valid Slack webhook URL (https://hooks.slack.com/services/...)";
  return null;
};

export const MonitoringConfig = () => {
  const [tools, setTools] = useState<string[]>([]);
  const [newTool, setNewTool] = useState("");
  const [toolError, setToolError] = useState<string | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [frequency, setFrequency] = useState("hourly");
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("monitoring_config")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setTools(data.tools_list || []);
      setSlackWebhook(data.slack_webhook_url || "");
      setFrequency(data.scan_frequency);
    }
  };

  const addTool = () => {
    const trimmed = newTool.trim();
    const error = validateToolName(trimmed);
    if (error) {
      setToolError(error);
      return;
    }
    if (tools.includes(trimmed)) {
      setToolError("This tool is already added");
      return;
    }
    if (tools.length >= MAX_TOOLS) {
      setToolError(`Maximum ${MAX_TOOLS} tools allowed`);
      return;
    }
    setToolError(null);
    setTools([...tools, trimmed]);
    setNewTool("");
  };

  const removeTool = (tool: string) => {
    setTools(tools.filter(t => t !== tool));
  };

  const handleWebhookChange = (value: string) => {
    setSlackWebhook(value);
    if (value) {
      setWebhookError(validateSlackWebhook(value));
    } else {
      setWebhookError(null);
    }
  };

  const saveConfig = async () => {
    // Validate webhook before saving
    const whError = validateSlackWebhook(slackWebhook);
    if (whError) {
      setWebhookError(whError);
      toast({ title: "Validation Error", description: whError, variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("monitoring_config")
      .upsert({
        user_id: user.id,
        tools_list: tools,
        slack_webhook_url: slackWebhook || null,
        scan_frequency: frequency,
        is_active: true,
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Configuration saved successfully" });
    }

    setLoading(false);
  };

  const runManualScan = async () => {
    setScanLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke("scan-threats", {
        body: { manual: true },
      });

      if (error) throw error;

      toast({
        title: "Scan Started",
        description: data?.message || "Manual scan initiated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    setScanLoading(false);
  };

  const testSlackWebhook = async () => {
    if (!slackWebhook) {
      toast({
        title: "Error",
        description: "Please enter a Slack webhook URL first",
        variant: "destructive",
      });
      return;
    }

    setTestingWebhook(true);

    try {
      const testMessage = {
        text: "🎉 *Slack Integration Test*\n\nYour security monitoring system is successfully connected to Slack!\n\n*Time:* " + new Date().toISOString(),
      };

      const response = await fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testMessage),
      });

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Test message sent to Slack. Check your channel!",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send test message. Please check your webhook URL.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send test message",
        variant: "destructive",
      });
    }

    setTestingWebhook(false);
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              Monitoring Configuration
            </CardTitle>
            <CardDescription>Configure tools and notification settings</CardDescription>
          </div>
          <Button
            onClick={runManualScan}
            disabled={scanLoading || tools.length === 0}
            size="sm"
            className="gap-2 hover-scale bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
          >
            <PlayCircle className={`w-4 h-4 ${scanLoading ? 'animate-spin' : ''}`} />
            {scanLoading ? "Scanning..." : "Check Now"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Monitored Tools & Technologies</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., WordPress, AWS, Splunk"
              value={newTool}
              onChange={(e) => { setNewTool(e.target.value); setToolError(null); }}
              onKeyPress={(e) => e.key === "Enter" && addTool()}
              className={`transition-all focus:ring-2 focus:ring-primary/20 ${toolError ? 'border-destructive' : ''}`}
              maxLength={MAX_TOOL_NAME_LENGTH}
            />
            <Button 
              onClick={addTool} 
              size="icon"
              className="hover-scale bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {toolError && <p className="text-sm text-destructive">{toolError}</p>}
          <p className="text-xs text-muted-foreground">{tools.length}/{MAX_TOOLS} tools added</p>
          <div className="flex flex-wrap gap-2 mt-3 min-h-[40px]">
            {tools.map((tool, index) => (
              <Badge 
                key={tool} 
                variant="secondary" 
                className="gap-1 pr-1 hover-scale animate-fade-in bg-gradient-to-r from-secondary to-secondary/80 border border-primary/10"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {tool}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:text-destructive transition-colors"
                  onClick={() => removeTool(tool)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="webhook" className="text-base font-semibold">
              Slack Notifications
            </Label>
            <Alert className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 shadow-sm">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm space-y-2">
                <p className="font-medium">How to connect Slack in 3 easy steps:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Click the button below to create a new Slack webhook</li>
                  <li>Choose your Slack workspace and channel</li>
                  <li>Copy the webhook URL and paste it here</li>
                </ol>
              </AlertDescription>
            </Alert>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 hover-scale border-primary/20 hover:bg-primary/10 hover:text-primary transition-all"
            onClick={() => window.open("https://api.slack.com/messaging/webhooks", "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
            Create Slack Webhook
          </Button>

          <div className="space-y-2">
            <Label htmlFor="webhook">Webhook URL</Label>
            <Input
              id="webhook"
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              className="transition-all focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {slackWebhook && (
            <Button
              variant="secondary"
              className="w-full gap-2 hover-scale animate-fade-in bg-gradient-to-r from-secondary to-secondary/80"
              onClick={testSlackWebhook}
              disabled={testingWebhook}
            >
              <CheckCircle className={`w-4 h-4 ${testingWebhook ? 'animate-pulse' : ''}`} />
              {testingWebhook ? "Sending Test..." : "Send Test Message"}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="frequency" className="text-base font-semibold">Scan Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger id="frequency" className="transition-all focus:ring-2 focus:ring-primary/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15min">⚡ Every 15 minutes</SelectItem>
              <SelectItem value="hourly">🕐 Every hour</SelectItem>
              <SelectItem value="daily">📅 Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={saveConfig} 
          disabled={loading} 
          className="w-full hover-scale bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md text-base font-semibold py-6"
        >
          {loading ? "Saving..." : "Save Configuration"}
        </Button>
      </CardContent>
    </Card>
  );
};
