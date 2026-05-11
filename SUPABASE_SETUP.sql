-- ─────────────────────────────────────────────────────────────────
-- Gardien — Supabase cron-job setup (run AFTER `supabase db push`
-- and AFTER deploying edge functions).
--
-- Replace placeholders:
--   <YOUR-PROJECT-REF>    e.g. abcd1234efgh
--   <YOUR-CRON-SECRET>    same value you set as the CRON_SECRET
--                         edge function secret in Supabase
-- ─────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Persist CRON_SECRET so cron jobs can authenticate to edge functions
alter database postgres set app.cron_secret = '<YOUR-CRON-SECRET>';

-- Remove old jobs (safe if they don't exist)
select cron.unschedule('cron-scan')          where exists (select 1 from cron.job where jobname='cron-scan');
select cron.unschedule('check-escalations')  where exists (select 1 from cron.job where jobname='check-escalations');

-- Threat scan every 5 minutes
select cron.schedule(
  'cron-scan',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<YOUR-PROJECT-REF>.functions.supabase.co/cron-scan',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Escalation checks every minute
select cron.schedule(
  'check-escalations',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<YOUR-PROJECT-REF>.functions.supabase.co/check-escalations',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ── Verification queries ────────────────────────────────────────
-- select jobid, jobname, schedule, active from cron.job;
-- select jobid, status, return_message, start_time
--   from cron.job_run_details order by start_time desc limit 10;
