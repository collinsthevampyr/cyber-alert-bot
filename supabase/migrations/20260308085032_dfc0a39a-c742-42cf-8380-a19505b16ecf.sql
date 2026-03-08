ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS analysis text;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS remediation text;