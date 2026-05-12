import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Brain, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type ProviderId = "openai" | "deepseek" | "anthropic" | "google" | "groq" | "mistral" | "openrouter" | "custom";

const PROVIDERS: {
  id: ProviderId;
  label: string;
  keyHint: string;
  apiKeysUrl: string;
  models: { value: string; label: string }[];
  defaultModel: string;
  allowCustomModel?: boolean;
}[] = [
  {
    id: "openai", label: "OpenAI", keyHint: "sk-...",
    apiKeysUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-4o-mini",
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini (Recommended)" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Budget)" },
    ],
    allowCustomModel: true,
  },
  {
    id: "deepseek", label: "DeepSeek", keyHint: "sk-...",
    apiKeysUrl: "https://platform.deepseek.com/api_keys",
    defaultModel: "deepseek-chat",
    models: [
      { value: "deepseek-chat", label: "DeepSeek Chat (V3)" },
      { value: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)" },
    ],
    allowCustomModel: true,
  },
  {
    id: "anthropic", label: "Anthropic Claude", keyHint: "sk-ant-...",
    apiKeysUrl: "https://console.anthropic.com/settings/keys",
    defaultModel: "claude-3-5-sonnet-latest",
    models: [
      { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku (Faster)" },
      { value: "claude-3-opus-latest", label: "Claude 3 Opus" },
    ],
    allowCustomModel: true,
  },
  {
    id: "google", label: "Google Gemini", keyHint: "AIza...",
    apiKeysUrl: "https://aistudio.google.com/apikey",
    defaultModel: "gemini-2.0-flash",
    models: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
    allowCustomModel: true,
  },
  {
    id: "groq", label: "Groq (Fast inference)", keyHint: "gsk_...",
    apiKeysUrl: "https://console.groq.com/keys",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
      { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
      { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    ],
    allowCustomModel: true,
  },
  {
    id: "mistral", label: "Mistral", keyHint: "...",
    apiKeysUrl: "https://console.mistral.ai/api-keys/",
    defaultModel: "mistral-large-latest",
    models: [
      { value: "mistral-large-latest", label: "Mistral Large" },
      { value: "mistral-small-latest", label: "Mistral Small" },
    ],
    allowCustomModel: true,
  },
  {
    id: "openrouter", label: "OpenRouter (Any model)", keyHint: "sk-or-...",
    apiKeysUrl: "https://openrouter.ai/keys",
    defaultModel: "openai/gpt-4o-mini",
    models: [
      { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
      { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
      { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
      { value: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
    ],
    allowCustomModel: true,
  },
  {
    id: "custom", label: "Custom (OpenAI-compatible endpoint)", keyHint: "your api key",
    apiKeysUrl: "",
    defaultModel: "gpt-4o-mini",
    models: [],
    allowCustomModel: true,
  },
];

export const AIProviderConfig = () => {
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [customModel, setCustomModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const { toast } = useToast();

  const currentProvider = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0];

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
      const prov = (config.provider || "openai") as ProviderId;
      setProvider(prov);
      const provDef = PROVIDERS.find(p => p.id === prov) ?? PROVIDERS[0];
      const savedModel = config.model || provDef.defaultModel;
      const isPreset = provDef.models.some(m => m.value === savedModel);
      if (isPreset) {
        setModel(savedModel);
        setCustomModel("");
      } else {
        setModel("__custom__");
        setCustomModel(savedModel);
      }
      setBaseUrl(config.base_url || "");
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

    const resolvedModel = model === "__custom__" ? customModel.trim() : model;
    if (!resolvedModel) {
      toast({ title: "Model required", description: "Please enter or choose a model name.", variant: "destructive" });
      setLoading(false);
      return;
    }
    if (provider === "custom" && !baseUrl.trim()) {
      toast({ title: "Base URL required", description: "Enter the OpenAI-compatible chat completions URL.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const aiConfig: any = {
      enabled: true,
      provider,
      model: resolvedModel,
    };
    if (provider === "custom") aiConfig.base_url = baseUrl.trim();

    if (apiKey.trim()) {
      aiConfig.api_key = apiKey.trim();
    } else if (hasExistingKey) {
      aiConfig.keep_existing_key = true;
    } else {
      toast({ title: "API Key Required", description: `Please enter your ${currentProvider.label} API key to enable scanning and analysis.`, variant: "destructive" });
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
            Bring your own AI provider — OpenAI, DeepSeek, Anthropic, Gemini, Groq, Mistral, OpenRouter, or any OpenAI-compatible endpoint
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasExistingKey && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">
              No API key configured. Scanning and AI analysis will not work until you add an AI provider API key.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Provider</Label>
          <Select
            value={provider}
            onValueChange={(v) => {
              const p = v as ProviderId;
              setProvider(p);
              const def = PROVIDERS.find(x => x.id === p) ?? PROVIDERS[0];
              setModel(def.models[0]?.value ?? def.defaultModel);
              setCustomModel("");
            }}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {provider === "custom" && (
          <div className="space-y-2">
            <Label className="text-xs">Base URL (chat completions endpoint)</Label>
            <Input
              placeholder="https://your-host/v1/chat/completions"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Must be an OpenAI-compatible /chat/completions URL.</p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">{currentProvider.label} API Key</Label>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              placeholder={hasExistingKey ? "••••••••••••••••••••••••••(saved)" : currentProvider.keyHint}
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
          {currentProvider.apiKeysUrl && (
            <p className="text-[10px] text-muted-foreground">
              Get your key from{" "}
              <a
                href={currentProvider.apiKeysUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                {new URL(currentProvider.apiKeysUrl).hostname}
              </a>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Model</Label>
          {currentProvider.models.length > 0 ? (
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentProvider.models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
                {currentProvider.allowCustomModel && (
                  <SelectItem value="__custom__">Custom model name…</SelectItem>
                )}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="model name"
              value={customModel}
              onChange={(e) => { setCustomModel(e.target.value); setModel("__custom__"); }}
              className="text-sm"
            />
          )}
          {model === "__custom__" && currentProvider.models.length > 0 && (
            <Input
              placeholder="Enter exact model identifier"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              className="text-sm"
            />
          )}
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
