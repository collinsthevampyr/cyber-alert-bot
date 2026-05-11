# Gardien — SOC Analyst Platform

React + Vite frontend, Supabase backend (Postgres, Auth, Storage, Edge Functions, pg_cron).
Designed to be hosted on **Vercel** (frontend) + **Supabase** (backend).

---

## 1. Local development

Requirements: Node 20+, npm, the [Supabase CLI](https://supabase.com/docs/guides/cli).

```sh
git clone <YOUR_REPO_URL>
cd <repo>
npm install
cp .env.example .env   # fill in values from your Supabase project (Settings → API)
npm run dev
```

The app runs on http://localhost:8080.

---

## 2. Environment variables

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → `anon` public key |
| `VITE_SUPABASE_PROJECT_ID` | The `xxxx` part of `xxxx.supabase.co` |

Set these locally in `.env` and in Vercel → Project Settings → Environment Variables (Production, Preview, Development).

---

## 3. Deploy frontend to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** → import the repo.
3. Framework preset: **Vite** (auto-detected). Build `npm run build`, output `dist`.
4. Add the 3 env vars above.
5. Deploy. SPA deep links work via `vercel.json`.

---

## 4. Deploy backend to Supabase

### 4a. Link the CLI

```sh
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>
```

### 4b. Apply database migrations

```sh
supabase db push
```

Creates all tables, RLS policies, functions, and triggers from `supabase/migrations/`.

### 4c. Set edge function secrets

| Secret | Purpose |
|---|---|
| `SUPABASE_URL` | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected |
| `CRON_SECRET` | Bearer token used by pg_cron jobs to call edge functions |
| `RESEND_API_KEY` | Required for email notifications (`send-notification`). Get one at https://resend.com |
| `RESEND_FROM_EMAIL` | Optional — default sender, e.g. `Gardien <alerts@yourdomain.com>`. Falls back to `Gardien <onboarding@resend.dev>` for testing. |

```sh
supabase secrets set CRON_SECRET="$(openssl rand -hex 32)"
supabase secrets set RESEND_API_KEY="re_xxx"
supabase secrets set RESEND_FROM_EMAIL="Gardien <alerts@yourdomain.com>"
```

### 4d. Deploy edge functions

```sh
supabase functions deploy scan-threats
supabase functions deploy cron-scan
supabase functions deploy check-escalations
supabase functions deploy send-notification
supabase functions deploy analyze-alert
supabase functions deploy enrich-ioc
supabase functions deploy siem-ingest
supabase functions deploy api
supabase functions deploy mcp-server
```

`verify_jwt` settings come from `supabase/config.toml`; auth is enforced inside each function (JWT, `x-api-key`, or `CRON_SECRET`).

### 4e. Schedule cron jobs

Cron jobs are **not** in the migrations because they hardcode your project ref and `CRON_SECRET`. After deploying the edge functions, open the Supabase SQL editor and run [`SUPABASE_SETUP.sql`](./SUPABASE_SETUP.sql) — replace `<YOUR-PROJECT-REF>` and `<YOUR-CRON-SECRET>` first.

Verify with:

```sql
select jobid, jobname, schedule, active from cron.job;
select jobid, status, return_message, start_time
  from cron.job_run_details order by start_time desc limit 10;
```

If a run returns 401, your `app.cron_secret` doesn't match the `CRON_SECRET` edge function secret.

### 4f. Storage

Create the private `evidence` bucket in Supabase → Storage. RLS policies are included in the migrations.

---

## 5. Auth configuration

In Supabase → Authentication → URL Configuration:

- **Site URL** → your Vercel production URL
- **Redirect URLs** → production URL + Vercel preview pattern + `http://localhost:8080`

Enable Email/Password and Google providers as needed.

---

## 6. Per-user secrets

The platform is **BYOK** — each user enters their own OpenAI API key in **Settings → AI Provider**. No global AI key on the server.

---

## Tech stack

- React 18, Vite 5, TypeScript, Tailwind, shadcn/ui, Recharts
- Supabase: Postgres + RLS, Auth, Storage, Edge Functions (Deno), pg_cron, pg_net
- Hono (inside `supabase/functions/api`) for the external API / n8n surface