-- Create monitoring_config table to store user's monitored tools and settings
CREATE TABLE public.monitoring_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tools_list TEXT[] NOT NULL DEFAULT '{}',
  slack_webhook_url TEXT,
  scan_frequency TEXT NOT NULL DEFAULT 'hourly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scan_history table to track scan runs
CREATE TABLE public.scan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scan_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scan_completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running',
  alerts_found INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alerts table to store detected threats
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scan_id UUID REFERENCES public.scan_history(id),
  tool_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_url TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_to_slack BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.monitoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for monitoring_config
CREATE POLICY "Users can view their own config"
  ON public.monitoring_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own config"
  ON public.monitoring_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own config"
  ON public.monitoring_config FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own config"
  ON public.monitoring_config FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for scan_history
CREATE POLICY "Users can view their own scan history"
  ON public.scan_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan history"
  ON public.scan_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for alerts
CREATE POLICY "Users can view their own alerts"
  ON public.alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on monitoring_config
CREATE TRIGGER update_monitoring_config_updated_at
  BEFORE UPDATE ON public.monitoring_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_monitoring_config_user_id ON public.monitoring_config(user_id);
CREATE INDEX idx_scan_history_user_id ON public.scan_history(user_id);
CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_scan_id ON public.alerts(scan_id);