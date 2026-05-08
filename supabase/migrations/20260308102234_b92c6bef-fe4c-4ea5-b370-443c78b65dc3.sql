
-- Audit log table for tracking admin actions
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit log"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin function to get system health stats
CREATE OR REPLACE FUNCTION public.admin_get_system_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_api_keys', (SELECT count(*) FROM public.api_keys),
    'active_api_keys', (SELECT count(*) FROM public.api_keys WHERE is_active = true),
    'total_webhooks', (SELECT count(*) FROM public.webhooks),
    'active_webhooks', (SELECT count(*) FROM public.webhooks WHERE is_active = true),
    'total_notification_channels', (SELECT count(*) FROM public.notification_channels),
    'active_notification_channels', (SELECT count(*) FROM public.notification_channels WHERE is_active = true),
    'total_monitoring_configs', (SELECT count(*) FROM public.monitoring_config),
    'active_monitoring_configs', (SELECT count(*) FROM public.monitoring_config WHERE is_active = true),
    'total_site_content', (SELECT count(*) FROM public.site_content),
    'total_roles', (SELECT count(*) FROM public.user_roles),
    'scans_last_24h', (SELECT count(*) FROM public.scan_history WHERE created_at > now() - interval '1 day'),
    'scans_running', (SELECT count(*) FROM public.scan_history WHERE status = 'running'),
    'scans_failed_24h', (SELECT count(*) FROM public.scan_history WHERE status = 'error' AND created_at > now() - interval '1 day'),
    'alerts_critical', (SELECT count(*) FROM public.alerts WHERE severity = 'critical'),
    'alerts_high', (SELECT count(*) FROM public.alerts WHERE severity = 'high'),
    'tickets_in_progress', (SELECT count(*) FROM public.support_tickets WHERE status = 'in_progress'),
    'avg_ticket_response_hours', (
      SELECT COALESCE(
        EXTRACT(EPOCH FROM AVG(responded_at - created_at)) / 3600,
        0
      )::numeric(10,1)
      FROM public.support_tickets WHERE responded_at IS NOT NULL
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Admin function to get signup analytics (last 30 days)
CREATE OR REPLACE FUNCTION public.admin_get_analytics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'signups_by_day', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at)::date as day, count(*) as count
        FROM auth.users
        WHERE created_at > now() - interval '30 days'
        GROUP BY day ORDER BY day
      ) t
    ),
    'alerts_by_day', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at)::date as day, count(*) as count
        FROM public.alerts
        WHERE created_at > now() - interval '30 days'
        GROUP BY day ORDER BY day
      ) t
    ),
    'alerts_by_severity', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT severity, count(*) as count
        FROM public.alerts
        GROUP BY severity ORDER BY count DESC
      ) t
    ),
    'scans_by_day', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at)::date as day, count(*) as count
        FROM public.scan_history
        WHERE created_at > now() - interval '30 days'
        GROUP BY day ORDER BY day
      ) t
    ),
    'tickets_by_status', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT status, count(*) as count
        FROM public.support_tickets
        GROUP BY status ORDER BY count DESC
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Allow admins to read all alerts for the admin dashboard
CREATE POLICY "Admins can view all alerts"
  ON public.alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all scan history
CREATE POLICY "Admins can view all scans"
  ON public.scan_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
