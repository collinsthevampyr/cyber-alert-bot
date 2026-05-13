ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS raw_event jsonb,
  ADD COLUMN IF NOT EXISTS event_metadata jsonb;