# Deploying SeedSphere: Supabase + Vercel

SeedSphere deploys as **one Vercel project** (the React app and the Express API together) with **Supabase** as the PostgreSQL database. The frontend calls the API on the same domain (`/api/v1`), so there is no CORS setup and no second server to host.

```
Browser ──► Vercel ─┬─ /            React app (static files)
                    └─ /api/v1/*    Express API (one Node serverless function)
                                         │
                                         ▼
                                Supabase PostgreSQL
                                         │
                       AI provider (Claude / OpenAI / Gemini), optional
```

Budget about 30 minutes for the first deployment.

## 1. Create the Supabase database

1. Create a project at [supabase.com](https://supabase.com). Pick the Mumbai (ap-south-1) region for Indian users and save the database password.
2. Open **Project Settings → Database → Connection string** and copy two URLs:
   - **Session pooler / direct connection** (port **5432**). Use this for migrations and seeding from your computer.
   - **Transaction pooler** (port **6543**). Use this on Vercel, because serverless functions open many short connections.

Replace `[YOUR-PASSWORD]` in both. If the password has special characters (`@ # / ?`), URL-encode them.

## 2. Create the schema and demo data (from your computer)

From the project folder, in PowerShell:

```powershell
cd server
npm install
$env:DATABASE_URL = "postgresql://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
npm run migrate      # applies all migrations in server/migrations (001-056)
npm run seed:all     # demo users, lots, lab data, quality spine, AI Center dataset
```

`seed:all` is idempotent, so running it twice changes nothing. For a client's production database, run only `npm run migrate` and `npm run seed:auth` (the user accounts), then create real records through the app.

The connection uses TLS automatically when the URL points at Supabase (see `server/src/db/pool.ts`).

## 3. Configure the Vercel project

In the Vercel project (Settings → **Environment Variables**, Production and Preview):

| Variable | Value | Required |
| --- | --- | --- |
| `DATABASE_URL` | Supabase **transaction pooler** URL (port 6543) | Yes |
| `JWT_ACCESS_SECRET` | A long random string, for example from `openssl rand -hex 32` | Yes. The API refuses to start in production without it |
| `AI_PROVIDER` | `anthropic` (or `openai` / `gemini`) | For AI |
| `AI_API_KEY` | Your provider API key | For AI narratives and photo analysis |
| `AI_MODEL` | Optional model override, for example a current Claude Sonnet model id | No |
| `FRONTEND_ORIGIN` | `https://your-domain.vercel.app` | Only if another domain calls the API |
| `DB_POOL_MAX` | `3` (default on Vercel) | No |

Do **not** set `VITE_API_BASE_URL` on Vercel. The build defaults it to `/api/v1` (same origin).

`vercel.json` already sets the install and build commands:

- install: `npm ci && npm ci --prefix server`
- build: `npm run build:vercel` (runs `scripts/build-vercel.mjs`)

The build script uses Vercel's Build Output API to produce the static site and the `api` function in `.vercel/output`. Vercel deploys that folder as is.

## 4. Deploy

Push to the GitHub branch connected to Vercel, or run `npx vercel --prod` locally. Then check:

1. `https://<your-domain>/api/v1/health` returns `{"success":true,"data":{"status":"ok"}}`.
2. Sign in, open **AI Center**. The header should say **AI model connected** when `AI_API_KEY` is set, or **Rules engine active** when it isn't.
3. The **Demo data** badge (bottom left) must **not** appear. If it does, the browser could not reach the API: check the function logs in Vercel.

## 5. Run everything locally

```powershell
# terminal 1: database (Docker) + API
cd server
docker compose up -d
npm run migrate; npm run seed:all
npm run dev                  # http://localhost:5000

# terminal 2: frontend
npm run dev                  # http://localhost:5173 (VITE_API_BASE_URL in .env.local)
```

Or point `server/.env` `DATABASE_URL` at Supabase and skip Docker.

## What runs where

| Feature | Where | Needs an AI key? |
| --- | --- | --- |
| All module screens and workflows | Express API on Vercel + Supabase | No |
| AI Center: lab quality-risk scores, 90-day germination forecast | `GET /api/v1/ai/lab-risk` | No (computed from data) |
| AI Center: stock cover and label-expiry forecasts | `GET /api/v1/ai/forecasts` | No |
| AI Center: written briefings over those numbers | same endpoints | Yes (falls back to rule-based text) |
| AI Center: field crop / seed sample photo analysis | `POST /api/v1/ai/photo-analysis` | Yes (vision model) |
| Ask SeedSphere assistant | `POST /api/v1/assistant/ask` | No (richer answers with a key) |

## Known limits on Vercel

- The live inventory WebSocket (`/ws`) does not run on serverless functions. Pages fall back to refresh/polling. If live push is required, run `server/` as a long-lived Node service (Render, Railway or a VM) and set `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` to it.
- The storage expiration watcher (a timer in `server.ts`) doesn't run on Vercel. Expiry is still computed on every request. A Vercel Cron can call an endpoint later if notifications are needed.
- A photo upload must stay under 4.5 MB. The AI Center resizes photos in the browser to about 0.3–1 MB before upload.
