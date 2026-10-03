# Cafe Elvira POS: agent guide

This repository is a **web-only** POS and stock monitoring system. The application is Next.js 16, React 19, TypeScript, Tailwind CSS, and Supabase in `web/`. The root contains development database tooling and Supabase migrations. The former Expo application was removed on 2026-09-22 at the owner's request.

## Workflow

1. Read `CONTEXT.md`, the relevant implementation and tests, and the concern in `RULES.md`.
2. Keep application changes inside `web/`. Keep Supabase schema changes in `supabase/`.
3. Use the existing Tailwind tokens and components; build narrow screens first.
4. Run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, and `npm run build` from `web/` before completion. Root npm scripts proxy to these commands.
5. Record meaningful work and blockers in `PROGRESS.md`.

## Structure

- `web/src/app/`: Next.js routes and global styles.
- `web/src/features/`: POS, admin, auth, and settings features.
- `web/src/components/`: shared interface components.
- `web/src/lib/supabase/`: browser and server Supabase clients.
- `web/e2e/`: Playwright browser tests.
- `supabase/migrations/` and `supabase/functions/`: hosted database schema and edge functions.
- `scripts/seed.cjs`: DEV-only seed script. It requires root `.env.local` and must never target production.

## Commands

```bash
npm install                    # seed tooling at root
npm --prefix web install       # web dependencies
npm run dev                    # Next.js development server
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

The web app reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `web/.env.local`. Only public values belong in `NEXT_PUBLIC_*`. Root `.env.local` contains seed-only admin credentials and is never bundled.

## Boundaries

- Admin routes and mutations must enforce roles on the server. The browser UI alone is not an authorization boundary.
- Do not put secrets or personal information in logs.
- Do not deploy, publish, merge, push, send messages, or change production data unless explicitly requested.
- Do not delete user work or weaken tests or security controls to pass a check.
- Changes to provider, authentication model, data boundary, or production baseline require owner approval and a note in `CONTEXT.md`.
