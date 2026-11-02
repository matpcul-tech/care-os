# CareCircle: Family Care Coordination

A care coordination app for families. Shared medications, appointments, care tasks, a document vault, and an AI assistant. CareCircle is the family companion to CareIQ for community health centers.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Copy `.env.example` to `.env.local` and fill in the values. Providers for AI,
email, and SMS are swappable by env (`LLM_PROVIDER`, `EMAIL_PROVIDER`,
`SMS_PROVIDER`), including a self-hosted local model via `LLM_PROVIDER=openai`.

## Self-hosting the data layer

To run Supabase (Postgres / auth / storage) yourself instead of the managed
cloud, see [`self-host/`](./self-host/README.md), a Docker Compose stack that
serves the identical API surface so the app's migrations and RLS run
unchanged. Point `NEXT_PUBLIC_SUPABASE_URL` at your gateway.

The app also ships a `Dockerfile` (standalone Next.js output). Run it
alongside the self-hosted stack (one host, one network, one BAA) with the
app overlay:

```bash
cd self-host
docker compose -f docker-compose.yml -f docker-compose.app.yml up -d --build
```

## Deploy to Vercel

```bash
# Option 1: Vercel CLI
npm i -g vercel
vercel

# Option 2: GitHub → Vercel
# Push to GitHub, connect repo at vercel.com/new
```

## Project Structure

```
src/app/                  Next.js routes (landing, login, dashboard, API)
src/components/           Family monitor and dashboard screens
src/lib/                  Auth, audit, vault crypto, model provider
supabase/migrations/      Postgres schema and row level security
self-host/                Optional self-hosted Supabase stack
test/                     Node test suite
```

## Routes

| Path         | Description                                      |
|--------------|--------------------------------------------------|
| `/`          | Marketing page                                   |
| `/login`     | Family member sign in                            |
| `/app`       | Family page                                      |
| `/dashboard` | Family monitor (readings, tasks, chat, vault)   |

## Features in this repo

- Shared medications, with a taken log
- Shared appointments and care tasks
- Document vault encrypted at rest with AES-256-GCM (server key)
- Care circle invites. Only the patient or an admin can add members
- AI chat that redacts common identifiers and blocks Social Security numbers, dates of birth, and tribal IDs before a model call
- Optional SMS and email alerts when those providers are configured

Not in this repo: on-device encryption, community-held keys, an electronic health record connection, remote patient monitoring time tracking, billing, or browser push notifications.

## Tech Stack

- Next.js 14 and React 18
- Supabase (auth, Postgres, storage)
- Lucide React icons
- Model calls through `src/lib/providers/llm.ts` (Anthropic by default, or an OpenAI-compatible endpoint)
- Deployed via Vercel

## Pricing

The marketing page says CareCircle is free for families. There is no billing code in this repo. Paid tiers are not implemented.

## License

MIT
