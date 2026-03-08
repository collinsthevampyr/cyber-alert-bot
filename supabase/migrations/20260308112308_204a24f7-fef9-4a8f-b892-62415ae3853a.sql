
-- 1. Add status/triage fields to alerts
ALTER TABLE public.alerts 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_false_positive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS incident_id uuid;

-- 2. Incidents table
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own incidents" ON public.incidents FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own incidents" ON public.incidents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own incidents" ON public.incidents FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own incidents" ON public.incidents FOR DELETE USING (auth.uid() = user_id);

-- FK from alerts to incidents
ALTER TABLE public.alerts ADD CONSTRAINT alerts_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE SET NULL;

-- Allow alert updates now (status changes, assignment, etc.)
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- 3. Case notes
CREATE TABLE public.case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  note_type text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view related notes" ON public.case_notes FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert notes" ON public.case_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.case_notes FOR DELETE USING (auth.uid() = user_id);

-- 4. Playbooks
CREATE TABLE public.playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  trigger_conditions jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own playbooks" ON public.playbooks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.playbook_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid REFERENCES public.playbooks(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL,
  title text NOT NULL,
  description text,
  action_type text NOT NULL DEFAULT 'manual',
  action_config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.playbook_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage playbook steps" ON public.playbook_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM public.playbooks WHERE id = playbook_steps.playbook_id AND user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.playbooks WHERE id = playbook_steps.playbook_id AND user_id = auth.uid())
);

-- 5. IOCs
CREATE TABLE public.iocs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES public.alerts(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  ioc_type text NOT NULL,
  ioc_value text NOT NULL,
  enrichment_data jsonb DEFAULT '{}',
  enriched_at timestamptz,
  reputation text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.iocs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own IOCs" ON public.iocs FOR ALL USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id);

-- 6. Escalation rules
CREATE TABLE public.escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  severity_filter text[] NOT NULL DEFAULT '{Critical,High}',
  escalate_after_minutes integer NOT NULL DEFAULT 30,
  notify_channel_id uuid REFERENCES public.notification_channels(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own escalation rules" ON public.escalation_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Response actions
CREATE TABLE public.response_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES public.alerts(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  target text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result jsonb DEFAULT '{}',
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.response_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own response actions" ON public.response_actions FOR ALL USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id);

-- 8. SLA config
CREATE TABLE public.sla_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  critical_ack_minutes integer NOT NULL DEFAULT 15,
  critical_resolve_minutes integer NOT NULL DEFAULT 60,
  high_ack_minutes integer NOT NULL DEFAULT 30,
  high_resolve_minutes integer NOT NULL DEFAULT 240,
  medium_ack_minutes integer NOT NULL DEFAULT 60,
  medium_resolve_minutes integer NOT NULL DEFAULT 480,
  low_ack_minutes integer NOT NULL DEFAULT 120,
  low_resolve_minutes integer NOT NULL DEFAULT 1440,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sla_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own SLA config" ON public.sla_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. Suppression rules (false positive management)
CREATE TABLE public.suppression_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppression_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own suppression rules" ON public.suppression_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. SIEM integrations
CREATE TABLE public.siem_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  siem_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.siem_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own SIEM integrations" ON public.siem_integrations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Playbook execution log
CREATE TABLE public.playbook_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid REFERENCES public.playbooks(id) ON DELETE CASCADE NOT NULL,
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running',
  current_step integer NOT NULL DEFAULT 1,
  step_results jsonb NOT NULL DEFAULT '[]',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.playbook_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own executions" ON public.playbook_executions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
