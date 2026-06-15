# Contributing to robo-ref

Thanks for helping out! robo-ref is a mobile-first, offline-friendly VEX referee app
(Next.js 16 + React 19 + Tailwind v4 + Supabase).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + VEX values (see README)
npm run dev
```

Useful scripts: `npm run lint` · `npm run typecheck` · `npm run build`.

## Branch & review flow

- `main` is the production branch (auto-deploys to Vercel production).
- `dev` is the integration branch (auto-deploys to a Vercel preview).
- Do work on a feature branch off `dev`: `git checkout dev && git checkout -b feat/my-thing`.
- Open a PR into `dev`. CI must pass and a maintainer must approve before merge.
- When `dev` is ready to ship, open a PR from `dev` into `main` and approve it.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, and build on every push/PR to
`main` and `dev`.

## Conventions

- **Mobile first.** Pages target a phone viewport (`max-w-md`); verify on a narrow screen.
- **Database changes** go in `supabase/migrations/` as a new numbered file. Keep RLS in mind —
  every table is restricted to session members (or admins).
- **Secrets** are never committed. Server-only env vars must not be prefixed `NEXT_PUBLIC`.
- Keep components in `src/components`, data/logic in `src/lib`.

## Project context

`CLAUDE.md` (untracked, local only) has a quick architecture map if you're using an AI
assistant. The README covers setup, env, and deploy.
