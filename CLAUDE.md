# robo-ref — context for Claude

**What:** Offline-first VEX referee app (open alternative to referee.fyi). Referees log rule
violations, mark DQs, keep shared match notes, and collaborate live. Built on the VEX /
VEX events API.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (class-based dark mode
via `.dark` + `@custom-variant dark` in `globals.css`) · TanStack Query · Supabase
(Postgres / anonymous auth / Realtime) · Vercel.

**Key paths:**
- `src/app/*` — pages: home, `settings`, `join`, `events` (search), `events/[sku]` (offline
  session, the main screen), `session/[id]` (online placeholder).
- `src/app/api/vex/[...path]/route.ts` — VEX events API proxy; injects `VEX_API_TOKEN`.
- `src/app/api/issue/route.ts` — GitHub issue creation (`GITHUB_TOKEN`, `GITHUB_ISSUES_REPO`).
- `src/lib/vex/*` — typed VEX client (`client.ts`) + API types (`types.ts`).
- `src/lib/local-session.ts` + `session-types.ts` — local-first incident/note store (localStorage).
- `src/components/*` — `providers`, `theme-provider`, `identity-provider`, `ui` primitives, `page-header`.
- `supabase/migrations/0001_init.sql` — schema, RLS, RPCs (`create_session`, `join_session`), realtime.

**Conventions:**
- Design tokens are CSS vars in `globals.css` mapped via `@theme inline` → utilities like
  `bg-surface`, `text-muted-foreground`, `border-border`, `bg-primary`.
- Server-only secrets are never `NEXT_PUBLIC`. All VEX traffic goes through `/api/vex`.
- Identity is anonymous (Supabase anon auth). Display name is local + mirrored to `profiles`.

**Database:** Supabase project **robo-ref** in the **my-projects** org (NOT "Digital Sports
Solutions"). Requires anonymous auth enabled + the migration applied. Sessions are shared via
6-digit codes; RLS limits every table to session members.

**Pending:** apply migration (needed: Supabase MCP re-auth to the my-projects org); wire
"Go online"/join/Realtime sync; profile upsert; PWA service worker + icons.

**Commands:** `npm install` · `npm run dev` · `npm run build` · `npm run typecheck`.
