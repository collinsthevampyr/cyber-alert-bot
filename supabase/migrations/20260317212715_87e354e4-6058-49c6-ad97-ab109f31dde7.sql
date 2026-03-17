
-- Fix RLS policies: change from public to authenticated role on sensitive tables

-- api_keys
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys" ON public.api_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own API keys" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own API keys" ON public.api_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own API keys" ON public.api_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- webhooks
DROP POLICY IF EXISTS "Users can view their own webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "Users can insert their own webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "Users can update their own webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "Users can delete their own webhooks" ON public.webhooks;
CREATE POLICY "Users can view their own webhooks" ON public.webhooks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own webhooks" ON public.webhooks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own webhooks" ON public.webhooks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own webhooks" ON public.webhooks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- monitoring_config
DROP POLICY IF EXISTS "Users can view their own config" ON public.monitoring_config;
DROP POLICY IF EXISTS "Users can insert their own config" ON public.monitoring_config;
DROP POLICY IF EXISTS "Users can update their own config" ON public.monitoring_config;
DROP POLICY IF EXISTS "Users can delete their own config" ON public.monitoring_config;
CREATE POLICY "Users can view their own config" ON public.monitoring_config FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own config" ON public.monitoring_config FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own config" ON public.monitoring_config FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own config" ON public.monitoring_config FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- siem_integrations
DROP POLICY IF EXISTS "Users can manage own SIEM integrations" ON public.siem_integrations;
CREATE POLICY "Users can manage own SIEM integrations" ON public.siem_integrations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- alerts
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can insert their own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Admins can view all alerts" ON public.alerts;
CREATE POLICY "Users can view their own alerts" ON public.alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all alerts" ON public.alerts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- incidents
DROP POLICY IF EXISTS "Users can view own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users can insert own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users can update own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users can delete own incidents" ON public.incidents;
CREATE POLICY "Users can view own incidents" ON public.incidents FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own incidents" ON public.incidents FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own incidents" ON public.incidents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- iocs
DROP POLICY IF EXISTS "Users can manage own IOCs" ON public.iocs;
CREATE POLICY "Users can manage own IOCs" ON public.iocs FOR ALL TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (auth.uid() = user_id);

-- scan_history
DROP POLICY IF EXISTS "Users can view their own scan history" ON public.scan_history;
DROP POLICY IF EXISTS "Users can insert their own scan history" ON public.scan_history;
DROP POLICY IF EXISTS "Admins can view all scans" ON public.scan_history;
CREATE POLICY "Users can view their own scan history" ON public.scan_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scan history" ON public.scan_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all scans" ON public.scan_history FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- playbooks
DROP POLICY IF EXISTS "Users can manage own playbooks" ON public.playbooks;
CREATE POLICY "Users can manage own playbooks" ON public.playbooks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- playbook_executions
DROP POLICY IF EXISTS "Users can manage own executions" ON public.playbook_executions;
CREATE POLICY "Users can manage own executions" ON public.playbook_executions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- response_actions
DROP POLICY IF EXISTS "Users can manage own response actions" ON public.response_actions;
CREATE POLICY "Users can manage own response actions" ON public.response_actions FOR ALL TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (auth.uid() = user_id);

-- suppression_rules
DROP POLICY IF EXISTS "Users can manage own suppression rules" ON public.suppression_rules;
CREATE POLICY "Users can manage own suppression rules" ON public.suppression_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- escalation_rules
DROP POLICY IF EXISTS "Users can manage own escalation rules" ON public.escalation_rules;
CREATE POLICY "Users can manage own escalation rules" ON public.escalation_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- sla_config
DROP POLICY IF EXISTS "Users can manage own SLA config" ON public.sla_config;
CREATE POLICY "Users can manage own SLA config" ON public.sla_config FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- case_notes
DROP POLICY IF EXISTS "Users can view related notes" ON public.case_notes;
DROP POLICY IF EXISTS "Users can insert notes" ON public.case_notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON public.case_notes;
CREATE POLICY "Users can view related notes" ON public.case_notes FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert notes" ON public.case_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.case_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- playbook_steps
DROP POLICY IF EXISTS "Users can manage playbook steps" ON public.playbook_steps;
CREATE POLICY "Users can manage playbook steps" ON public.playbook_steps FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM playbooks WHERE playbooks.id = playbook_steps.playbook_id AND playbooks.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM playbooks WHERE playbooks.id = playbook_steps.playbook_id AND playbooks.user_id = auth.uid()));

-- admin_audit_log
DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admins can insert audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert audit log" ON public.admin_audit_log FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
