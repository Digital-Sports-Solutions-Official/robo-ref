# robo-ref

Offline-first web app for VEX head referees: log rule violations, mark disqualifications,
keep shared match notes, and collaborate live with other referees. A self-hosted, open
alternative to **referee.fyi**, built directly on the VEX events API.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (class-based dark mode)
- **TanStack Query** for fetching & caching
- **Supabase** — Postgres, anonymous auth, and Realtime for live collaboration
- A **server-side proxy** (Next route handler) so the VEX events API token stays secret
- Hosted on **Vercel**

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

The app runs fully **offline/local** even before Supabase or the VEX token are configured —
you just won't get live event data or online sharing until they are.

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon / publishable key |
| `VEX_API_TOKEN` | **server only** | Bearer token for the VEX events API |
| `GITHUB_TOKEN` | **server only** | PAT with Issues read/write, for "Report Issue" |
| `GITHUB_ISSUES_REPO` | **server only** | Target repo as `owner/name` |

> Never prefix the server-only values with `NEXT_PUBLIC`. The browser never sees the VEX
> token — all VEX calls are proxied through `/api/vex/*`.

## VEX events API token

1. Go to <https://events.vex.com/> → **Login** → **VEX events API** → **Request Access**.
2. Put the issued token in `VEX_API_TOKEN`.

## Database setup (Supabase)

1. Select your Supabase project (the **robo-ref** project in your **my-projects** org).
2. **Enable anonymous sign-ins:** Authentication → Providers → Anonymous → enable.
3. Apply the migration in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) via
   the SQL Editor, the Supabase CLI (`supabase db push`), or the Supabase MCP `apply_migration` tool.
4. Copy the Project URL and anon key into `NEXT_PUBLIC_SUPABASE_*`.

## Deploy (Vercel)

Import the repo, add the same environment variables in **Project → Settings → Environment Variables**
(keep the server-only ones un-prefixed), and deploy.

## Project structure

```
src/
  app/
    page.tsx                 Home (Search / Join / Settings)
    settings/page.tsx        Theme, name, report issue, delete cache
    join/page.tsx            Join a group by 6-digit code
    events/page.tsx          Event search
    events/[sku]/page.tsx    Offline session: matches, teams, violations, notes
    session/[id]/page.tsx    Online (code-joined) session — placeholder
    api/vex/[...path]/       VEX events API proxy (injects VEX_API_TOKEN)
    api/issue/               Creates a GitHub issue
  components/                providers, theme, identity, ui primitives, header
  lib/
    vex/                     typed VEX client + types
    supabase/                browser + server clients
    local-session.ts         local-first incident/note store
    session-types.ts         shared types
supabase/migrations/         Postgres schema, RLS, RPCs, realtime
```

## Architecture notes

- **Local-first.** A session's violations and notes live in `localStorage`
  (`lib/local-session.ts`) so logging works with no connection. "Go online" publishes the
  session to Supabase and syncs via Realtime *(in progress)*.
- **Secret token, no CORS headaches.** All VEX requests route through the server proxy.
- **Anonymous identity.** Each device gets a Supabase anonymous user; the display name is
  stored locally and mirrored to `profiles` for attributing shared notes/violations.
- **Sharing codes.** `create_session()` and `join_session()` RPCs manage 6-digit codes and
  membership; Row Level Security restricts every table to session members.

## Status & roadmap

**Done:** scaffolding, light/dark theming, settings, event search, offline session
(matches / teams / violations / notes), VEX proxy, issue reporting, full DB schema.

**Next:** apply the migration; wire "Go online" (`create_session`), join, and Realtime sync of
incidents/notes; profile upsert; PWA service worker + icons; division rankings; elimination
auto-refresh polish.
