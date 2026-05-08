## Migration prep: code changes for Vercel + Supabase

This plan covers only the **codebase changes** needed to make the app deployable on Vercel against your own Supabase project. Account creation, DB dump/restore, DNS, and Vercel project setup are manual steps you do outside Lovable (covered in the previous migration guide).

### Changes I will make

1. **Remove Lovable-specific build tooling**
   - `package.json`: remove `lovable-tagger` from devDependencies.
   - `vite.config.ts`: drop the `componentTagger()` plugin and its import.

2. **Add Vercel SPA config**
   - New `vercel.json` with a rewrite so React Router deep links (`/dashboard`, `/soc`, etc.) fall back to `index.html`.

3. **Environment variables**
   - Keep `src/integrations/supabase/client.ts` as-is (already reads `import.meta.env.VITE_SUPABASE_*`).
   - Add `.env.example` documenting the three required vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) so you know what to paste into Vercel → Project Settings → Environment Variables.
   - Leave the current `.env` untouched (Lovable manages it); Vercel will use its own env vars.

4. **Edge function compatibility**
   - All edge functions already use standard Deno + `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `CRON_SECRET` env vars — they will deploy unchanged to your own Supabase via `supabase functions deploy`.
   - No code changes needed; `supabase/config.toml` already declares each function with `verify_jwt = false` where required.

5. **README rewrite**
   - Replace the Lovable-centric README with instructions for: local dev (`npm i && npm run dev`), env vars, deploying frontend to Vercel, deploying edge functions with the Supabase CLI, and setting `CRON_SECRET` + pg_cron jobs.

### Changes I will NOT make (out of scope / manual)

- Creating the new Supabase project, dumping/restoring the database, copying storage buckets, or re-creating pg_cron jobs — these are dashboard/CLI operations.
- Creating the GitHub repo or Vercel project.
- Rotating the anon key baked into `.env` (your new Supabase project will have its own).

### Files touched

- edit `package.json`
- edit `vite.config.ts`
- add `vercel.json`
- add `.env.example`
- rewrite `README.md`

### After I apply these changes

You'll be able to:
1. Push the repo to GitHub.
2. Import it in Vercel, paste the 3 env vars from your new Supabase project, deploy.
3. Run `supabase link` + `supabase functions deploy` + `supabase db push` against the new project.

Confirm and I'll implement.
