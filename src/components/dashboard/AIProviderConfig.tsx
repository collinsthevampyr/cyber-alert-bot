import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Brain, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (Recommended)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Faster/Cheaper)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Budget)" },
];

export const AIProviderConfig = () => {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("monitoring_config")
      .select("custom_ai_config")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.custom_ai_config) {
      const config = data.custom_ai_config as any;
      setModel(config.model || "gpt-4o");
      if (config.api_key) {
        setHasExistingKey(true);
        setApiKey("");
      }
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const aiConfig: any = {
      enabled: true,
      model,
      provider: "openai",
    };

    if (apiKey.trim()) {
      aiConfig.api_key = apiKey.trim();
    } else if (hasExistingKey) {
      aiConfig.keep_existing_key = true;
    } else {
      toast({ title: "API Key Required", description: "Please enter your OpenAI API key to enable scanning and analysis.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("monitoring_config")
      .select("id, custom_ai_config")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let finalConfig = aiConfig;
    if (existing?.custom_ai_config && !apiKey.trim() && hasExistingKey) {
      const prev = existing.custom_ai_config as any;
      finalConfig = { ...aiConfig, api_key: prev.api_key };
      delete finalConfig.keep_existing_key;
    }

    if (existing?.id) {
      const { error } = await supabase
        .from("monitoring_config")
        .update({ custom_ai_config: finalConfig })
        .eq("id", existing.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        if (apiKey.trim()) setHasExistingKey(true);
        setApiKey("");
        toast({ title: "Saved", description: "AI provider settings updated." });
      }
    } else {
      const { error } = await supabase
        .from("monitoring_config")
        .insert({ user_id: user.id, custom_ai_config: finalConfig });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        if (apiKey.trim()) setHasExistingKey(true);
        setApiKey("");
        toast({ title: "Saved", description: "AI provider settings saved." });
      }
    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-muted-foreground" /> AI Provider (Required)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Your OpenAI API key powers all threat scanning, analysis, and IOC enrichment
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasExistingKey && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">
              No API key configured. Scanning and AI analysis will not work until you add your OpenAI API key.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">OpenAI API Key</Label>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              placeholder={hasExistingKey ? "••••••••••••••••••••••••••(saved)" : "sk-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {hasExistingKey && !apiKey && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> API key configured
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Get your key from{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              platform.openai.com
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPENAI_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={saveConfig} disabled={loading} size="sm" className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving
            </>
          ) : (
            "Save AI settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
