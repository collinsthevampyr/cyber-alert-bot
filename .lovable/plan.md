## Plan: Repair Vercel + Supabase migration breakage

### 1. Fix Slack notification testing
- Change the Notifications card so Slack/Discord tests no longer POST directly from the browser.
- Browser-to-Slack webhook calls often fail because of CORS, especially after moving to Vercel.
- Route test sends through the existing `send-notification` Supabase Edge Function instead.
- Add support in `send-notification` for testing a specific notification channel without requiring an alert.
- Return detailed delivery errors to the UI instead of only showing “Could not deliver test.”

### 2. Fix email notification testing and delivery
- Update the email test button so it actually sends an email through the backend instead of only showing a toast.
- Keep the current Resend-based email implementation, because project memory says email notifications require Resend.
- Add clear backend validation for:
  - missing `RESEND_API_KEY`
  - missing/invalid sender address
  - Resend API failure responses
- Add support for a configurable sender address, preferably via a Supabase Edge Function secret such as `RESEND_FROM_EMAIL`, falling back only if configured.
- Surface the exact safe error message in the app so you can see whether the problem is the API key, verified domain, or recipient.

### 3. Fix manual scan visibility and failure handling
- Improve `scan-threats` responses and frontend handling so manual scans show the real reason when no alerts are created:
  - OpenAI key missing from AI Provider settings
  - monitoring tools not configured
  - OpenAI request failed
  - AI returned no threats
  - database insert failed
- Add safe environment checks inside scan Edge Functions for required Supabase secrets so migration mistakes are obvious.
- Update the Scan button toast to show `alertsFound` and any diagnostic message instead of only “Scan started.”

### 4. Fix automatic scan setup documentation and verification
- Add a dedicated Supabase SQL setup file for external deployments, not a migration, with cron-job templates for:
  - `cron-scan`
  - `check-escalations`
- Use placeholders for the new Supabase project ref and `CRON_SECRET` so old Lovable URLs are not accidentally reused.
- Update the README migration section to explain that cron jobs are runtime/project-specific and must be created in the new Supabase SQL editor after functions and secrets are deployed.
- Include verification queries for `cron.job` and `cron.job_run_details`.

### 5. Fix Wazuh “untrusted SSL certificate” wording and behavior
- Replace remaining “Lovable Cloud” wording in SIEM TLS errors with neutral “Supabase Edge Runtime,” since the app is now hosted on Vercel/Supabase.
- Keep the security rule that self-signed Wazuh TLS requires either:
  - a pasted Wazuh root CA certificate PEM, or
  - a publicly trusted certificate / trusted reverse proxy
- Clarify in the UI that Vercel hosting does not change this, because SIEM fetching happens from Supabase Edge Functions, not from the Vercel frontend.

### 6. Deployment checklist after code changes
- Deploy Supabase Edge Functions again after the fixes:
  - `send-notification`
  - `scan-threats`
  - `cron-scan`
  - `siem-ingest`
  - `check-escalations`
- Confirm these Supabase secrets exist in the new project:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
- Confirm Vercel has the frontend env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`

## Expected outcome
- Slack test sends work from Vercel because they go through the backend.
- Email test sends real emails and reports useful Resend errors.
- Manual scans explain why they produced no results.
- Automatic scans can be recreated reliably in the external Supabase project.
- Wazuh TLS errors are accurate for the new Vercel/Supabase architecture.