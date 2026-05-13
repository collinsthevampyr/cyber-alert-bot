## Goals

Three issues to fix:

1. SIEM-ingested alerts are not auto-analyzed by AI (only manual "Analyze" works).
2. SIEM events only carry a short title — analysis lacks the raw context (rule, host, source IP, full log, etc.).
3. Dashboard shows a fixed 50 alerts with no pagination and no date filter.

---

## 1. Capture richer SIEM event context

**Database**

Add two nullable columns to `alerts` so SIEM data is preserved without losing existing rows:

- `raw_event jsonb` — full normalized event payload (rule id, level, host, agent, source IP, full_log, etc.)
- `event_metadata jsonb` — small key/value of indexed-friendly fields (host, rule_id, agent_name, src_ip)

**`supabase/functions/siem-ingest/index.ts`**

For each SIEM type (Wazuh indexer/manager, Splunk, Elastic, Sentinel, QRadar, Chronicle, custom), build a normalized object with:
- `summary` (rule description)
- `severity`
- `raw_event` — entire `_source` / row / hit
- `event_metadata` — extracted host, rule.id, rule.level, agent.name, data.srcip, decoder.name, etc.

Insert these into `alerts` alongside existing fields.

## 2. Auto-analyze SIEM alerts

**`supabase/functions/siem-ingest/index.ts`**

After successful insert into `alerts`, collect the new alert IDs per user. At the end of the run, for each user that has `custom_ai_config.api_key` configured:

- Load their AI config (reuse the multi-provider `getAIConfig` + `callAI` helpers — extract them from `scan-threats` into shared inline functions in this file).
- For each new alert, call the AI with a richer prompt that includes:
  - `tool_name`, `severity`, `summary`
  - `raw_event` (truncated to ~4 KB)
  - `event_metadata`
  - User's stack (`monitoring_config.tools_list`)
- Update the alert with `analysis` and `remediation`.
- Then trigger the existing notification fan-out (Slack/Discord/Email channels + legacy webhook + `webhooks` table) the same way `cron-scan` and `scan-threats` already do.

**`supabase/functions/cron-scan/index.ts`**

Replace the hard-coded OpenAI block with the same `getAIConfig` + `callAI` helpers so cron-driven scans honor the user's chosen provider (OpenAI / DeepSeek / Anthropic / Google / Groq / Mistral / OpenRouter / Custom). Today cron-scan only works for OpenAI keys, which is why "automatic" analysis silently does nothing for users on other providers.

**`supabase/functions/analyze-alert/index.ts`**

When analyzing, also include `raw_event` and `event_metadata` (if present) in the prompt so manual re-analysis benefits from the richer SIEM context too.

## 3. Dashboard alert pagination + date filter

**`src/components/dashboard/AlertHistory.tsx`**

- Replace the single `loadAlerts` (limit 50) with paginated fetch:
  - 50 per page using Supabase `.range(from, to)` and `{ count: "exact" }`.
  - Page state + total count.
  - Pagination controls (`Previous` / `Next` / page indicator) using existing `Pagination` UI primitives.
- Add date filter to the Filter bar:
  - From / To date pickers (shadcn `Calendar` in `Popover`, with `pointer-events-auto`).
  - "Last 24h / 7d / 30d / Custom / All" quick-select.
  - Date range applied as `.gte("detected_at", from)` and `.lte("detected_at", to)` server-side so pagination stays accurate.
- Search / severity / tool filters move to the server query as well so they paginate correctly.
- Realtime channel: on insert, refresh page 1 only (avoid disturbing user's current page).

---

## Technical notes

- Migration is additive (`ADD COLUMN ... jsonb NULL`) — no data loss, existing alerts get NULL for new fields.
- All edge function changes must keep the existing `verify_jwt` setup and CORS headers untouched.
- `raw_event` is truncated before sending to AI to stay under provider context limits; the full JSON stays in the DB.
- `notification_channels` email path stays as a no-op log unless Resend/SMTP is configured (out of scope here).
- Edge functions to redeploy after changes: `siem-ingest`, `cron-scan`, `analyze-alert`.
