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

```sh
supabase secrets set CRON_SECRET="$(openssl rand -hex 32)"
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

In the Supabase SQL editor:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

alter database postgres
  set app.cron_secret = '<same value you set with supabase secrets set>';

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
```

Repeat for `check-escalations` and any other scheduled functions.

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