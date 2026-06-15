# roboRef

A mobile-first, offline-friendly web app for VEX head referees. Log rule violations,
disqualifications, and notes against teams and matches, cite rules from the official game
manuals, and collaborate live with other referees at an event. Built directly on the VEX
events API.

## Features

- **Event sessions** — search events by name, city, SKU, or date range and open a session
  for any event. Matches are pulled live, with the next-up match surfaced above completed ones.
- **Fast logging** — open a match and record DQs, violations, and notes for one to four teams
  in a single pass, with red/blue accents per alliance and a review step before saving.
- **Rule-aware** — the rule picker is program-aware (V5RC, VEX U, and VEX IQ) with full rule
  descriptions from the manuals. Rules a team has prior violations for are pre-highlighted, a
  violation can be cited multiple times in one match, and long-press shows a rule's text.
- **Team history** — every team has a running log of its DQs, violations, and notes; tap an
  entry to jump to the match it happened in.
- **Offline-first** — a session works entirely on-device with no connection. Going online
  publishes it and syncs in real time.
- **Live collaboration** — share a 6-character code; referees request to join with a name and
  the host approves them. Entries sync instantly and every entry shows who logged it.
- **Settings** — light/dark theme, display name, in-app bug reporting, and a cache reset.
- **Admin console** at `/admin` — manage admins, review and delete sessions, and edit the rule
  catalog (titles and descriptions) for each program.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query ·
Supabase (Postgres, anonymous + email auth, Realtime) · deployed on Vercel.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

Scripts: `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`.

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon / publishable key |
| `VEX_API_TOKEN` | server only | Bearer token for the VEX events API |
| `GITHUB_TOKEN` | server only | Fine-grained PAT (Issues: read/write) for in-app bug reports |
| `GITHUB_ISSUES_REPO` | server only | Repo that bug reports open issues in, as `owner/name` |

Server-only values must **not** be prefixed `NEXT_PUBLIC`. The VEX token is never exposed to
the browser — all VEX traffic is proxied through `/api/vex/*`.

## VEX events API token

Request an API token for the VEX events API at <https://events.vex.com/api/v2> and set it as
`VEX_API_TOKEN`.

## Database (Supabase)

1. In your Supabase project, enable **Anonymous sign-ins** (Authentication → Providers).
2. Apply the migrations in [`supabase/migrations/`](supabase/migrations) — via the SQL editor,
   the Supabase CLI (`supabase db push`), or the dashboard. `0007_seed_rules.sql` optionally
   seeds the editable rule catalog (you can also publish it from **/admin → Rules**).
3. Copy the Project URL and anon key into `NEXT_PUBLIC_SUPABASE_*`.

Row Level Security restricts every table to approved session members; admins are gated by an
`admins` table and email/password auth. To make someone an admin, add their email in
**/admin → Admins** (or insert into `public.admins`); they then sign up at `/admin` with that
email.

## In-app bug reports

Settings → **Report an issue** opens a GitHub issue in `GITHUB_ISSUES_REPO`. To enable it,
create a fine-grained personal access token with **Issues: Read and write** on that repository
and set `GITHUB_TOKEN` + `GITHUB_ISSUES_REPO`. Without them the button reports that issue
reporting isn't configured.

## Deploy (Vercel)

Import the repository into Vercel (Next.js is auto-detected), add the environment variables for
Production and Preview, set the Production branch to `main`, and deploy. Preview deployments are
created automatically for the `dev` branch and every pull request.

## Project structure

```
src/
  app/
    page.tsx                 Home (search / join / recent sessions)
    settings/                Theme, name, bug report, clear cache
    join/                    Join a session by code
    events/                  Event search
    events/[sku]/            Offline session
    session/[id]/            Live (shared) session
    admin/                   Admin console
    api/vex/[...path]/       VEX events API proxy
    api/issue/               Bug report -> GitHub issue
  components/                session screen, rule picker, providers, UI, overlays
  lib/
    vex/                     VEX client, types, rules catalog
    supabase/                browser + server clients
    {local,online}-session   offline + realtime stores
    recents, session-types, session-store
supabase/migrations/         Postgres schema, RLS, RPCs, realtime, rules seed
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch flow (`dev` → `main`), CI, and
conventions. In short: branch off `dev`, open a PR, and make sure lint, typecheck, and build
pass.
