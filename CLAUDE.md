# robo-ref — context for Claude

**What:** Offline-first VEX referee app (open alternative to referee.fyi). Referees log
**incidents** (DQ / Violation / Note) against a team and optional match, cite OVERRIDE rules,
and collaborate live. Built on the VEX events API (https://events.vex.com/api/v2).

**Stack:** Next.js 16 (App Router) · React 19 · TS · Tailwind v4 (class dark mode) ·
TanStack Query · Supabase (Postgres / anon auth / Realtime) · Vercel.

**Incident model:** one `incidents` table; `type` ∈ {dq, violation, note}. dq/violation require
≥1 cited rule (`rules text[]`), notes don't (enforced by a check constraint). Every incident has a
`team` and an optional `match_name`/`match_id`. `author_name` is denormalized for attribution.
Rule catalog (OVERRIDE 2026-2027): `src/lib/vex/rules.ts` — SG1-12, GG1-18, G1-6, VUG1-7.

**Sessions / sharing:** a session is **local** (localStorage, `useLocalSession`) until "Go online"
calls `create_session` (6-digit code) and uploads local incidents, then routes to `/session/[id]`
which uses `useOnlineSession` (Supabase select + Realtime). Join via `join_session(code)` from `/join`.
`SessionScreen` is the shared UI for both modes (Matches / Teams / Log).

**Key paths:**
- `src/components/session-screen.tsx` — shared session UI; `rule-select.tsx` (multi-select),
  `portal.tsx` (overlays at <body> — fixes backdrop-filter clipping), `ui.tsx` (Sheet/Modal).
- `src/lib/{local-session,online-session,session-store,session-types}.ts`.
- `src/lib/vex/{client,types,rules}.ts`; proxy `src/app/api/vex/[...path]/route.ts` (`VEX_API_TOKEN`).
- `supabase/migrations/*` (0001 schema, 0002 hardening, 0003 incident types).

**Database:** Supabase project **robo-ref** (`lvcqgsbgyikhdqgtiboz`) in the **my-projects** org.
Anonymous auth enabled. RLS limits every table to session members. Server secrets never `NEXT_PUBLIC`.

**Pending:** profile upsert (authorship currently via `author_name`); PWA service worker + icons.

**Commands:** `npm install` · `npm run dev` · `npm run build` · `npm run lint`.
