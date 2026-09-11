# PROGRESS.md

## Status

🟢 Active (product complete; feature work per `docs/future-plans.md` sequencing)

---

## Completed

- Core POS: menu → cart → checkout → payment (cash/GCash/Maya) → receipt (PDF share + thermal print)
- Offline-first: SQLite cache reads, queued writes, reconnect sync with dedup
- Inventory management: stock-in with supplier, reorder levels, stock badges
- Menu + category management (admin), product photos
- Transaction history (cashier: own; admin: all) + void with reason and stock restore
- Reports (daily/weekly/monthly) + dashboard (revenue, chart, low-stock, top products)
- User management via `create-user` edge function
- Agent system: `AGENTS.md` + `CONTEXT.md` + `RULES.md` + `playbooks/` (copied from pos-template, adapted)
- Web migration Phase 0: Next.js 16 + Tailwind v4 scaffold in `web/` (landing page only) + CI `web` job + `make web-dev` / `web-build` (2026-09-09)
- Web migration Phase 1: SSR Supabase clients + session proxy, `/login` with role routing (`/pos` cashier, `/admin` admin), server-side role gates; live-verified as both demo users (2026-09-11)
- Automatic restock tracking (2026-09-11): `0008_reorder_tracking.sql` (`par_level`, `reorder_requests`, low-stock trigger, admin-only RLS — 14/14 probes green); web `/admin/restock` + print; mobile `Restock` screen + PDF share; `par_level` editing (mobile product form, web inline); demo seed pars
- Web migration Phase 2: POS core on web (2026-09-11) — menu → session cart → `process_sale` checkout (cash/GCash/Maya) → receipt + browser print; `/pos` open to cashier+admin via `requireStaff`; Playwright smoke (cashier cash sale, stock deducts, receipt renders) green against dev Supabase; 30/30 vitest green
- Web migration Phase 3 (2026-09-11, on `feature/web-back-office` stacked on Phase 2 branch): 3a inventory list + `adjust_stock` stock-in; 3b menu/category CRUD + photo upload to `product-images` + auto inventory row on create (fixes Expo gap); 3c admin dashboard (SVG chart, low-stock, top-5) + filtered reports (Manila-day bucketing, voided excluded); 3d user list + `set_user_active` toggle + web enforces `is_active=false` at sign-in/session (Expo leaves it unenforced); 48/48 vitest green

## In Progress

- Agent-system rollout (this change): verify playbook links, confirm workflow on next feature branch
- **Web migration (approved 2026-09-09, phased rewrite):** Expo stays the live baseline until cutover. Phases 0–2 done; next is Phase 3 (Back office — detailed plan at execution time).
  - Completed Phase 0: scaffold alongside Expo; CI extended with `web` job
  - Completed Phase 1: auth + role routing + Supabase clients/proxy; RLS role reads verified live (`user_read_own`)
  - Completed Phase 2: POS core (menu/cart/checkout/receipt + Playwright smoke green)
  - Phase 3 in progress on `feature/web-back-office`: 3a inventory, 3b menu, 3c reports, 3d users done; admin e2e 5/6 green (staff-create blocked, see Blocked)
  - Remaining phases:
  1. **Phase 3 — Back office:** unblock staff-create e2e (deploy `create-user`), merge
  2. **Phase 4 — Cutover:** parity check vs Expo, flip baseline to web, archive Expo track
  - Web-track playbooks (`stack/nextjs`, `styling/tailwind`, `platform/web`, `capabilities/supabase/nextjs`) activate phase by phase; Expo stays untouched until Phase 4.

## Up Next

Per `docs/future-plans.md` sequencing:

1. **Phase 1 (P1):** Excel export → Personal Info editing (name/phone)
2. **Phase 2 (P2):** Forgot Password → Password change → Dark Mode
3. **Phase 3 (P3):** 2FA → Push notifications → Offline void
4. **Web migration:** Next.js + Tailwind web build (activates web-track playbooks; see `CONTEXT.md` → Product Decisions)

## Blocked

- `create-user` edge function not deployed on dev project `ccqoegnvzancptqhmyoc` (direct invoke returns 404 `NOT_FOUND`; mobile user creation is equally affected). Web 3d code is complete and surfaces the failure cleanly; e2e staff-create test stays red until deploy. Remediation: `supabase functions deploy create-user` (needs explicit approval + CLI auth), then re-run `test:e2e`.

## Decisions Made

- 2026-09-09: Adopt pos-template agent system (AGENTS/CONTEXT/RULES/playbooks), merged with existing pos-app AGENTS.md; skip `create-win-project.profile.json` (pos-app wasn't generator-created)
- 2026-09-09: Web migration planned — `stack/nextjs`, `styling/tailwind`, `platform/web`, `capabilities/supabase/nextjs` playbooks marked web-track/advisory until migration lands
- 2026-09-09: Web Phase 0 scaffold decisions — full 16-color token map (`textPrimary→foreground`, `textSecondary→muted`); `turbopack.root` set to silence dual-lockfile warning; `skipLibCheck` on + `jsx: react-jsx` (Next-mandated, matches pos-template); web `test` uses `--passWithNoTests`; root ESLint ignores `web/**`; generated `web/next-env.d.ts` committed (CI typechecks before build), `web/.next/` gitignored + prettier-ignored
- 2026-09-11: Web Phase 1 auth decisions — `NEXT_PUBLIC_SUPABASE_ANON_KEY` kept (plan/`.env.example` naming; template `PUBLISHABLE_KEY` is the same value); unknown roles fail closed (sign-out + error, no Expo-style cashier fallback); `web/vitest.config.ts` (node env, `@` alias) so web tests don't inherit root jsdom config; no new deps (`zod`, testing-library deferred); `web/.env.local` holds real values, gitignored, never staged
- 2026-09-11: Restock tracking decisions — trigger-on-`inventory` (not per-RPC hooks) covers all 5 write paths incl. offline replays; manual suggested-qty edits overwritten on next stock change (no override flag); recovery refreshes snapshots, never auto-closes; supplier pre-fills from latest movement; Expo list online-only (no SQLite mirror); web par editing inline on restock page (no web menu management until web Phase 3); seed upserts fire the trigger (2 legitimate demo requests for low-stock products 4 + 6); root `tsconfig.json` now excludes `web/` (separate toolchain, mirrors `eslint.config.js` `web/**` ignore)
- 2026-09-11: Web Phase 2 POS decisions — `requireStaff` admits cashier+admin to `/pos` (capability matrix: both sell); web menu disables zero-stock items via live `inventory` qty (approved deviation from Expo `is_available`-only); cart is `useReducer` session state (no persistence, online-only); `checkoutSale` Server Action validates + calls final `process_sale` RPC, returns id only so receipt re-reads server-computed total/order_number; transaction id via `crypto.randomUUID()` (no uuid dep); receipt is server route + `window.print()` (no thermal); Playwright `@playwright/test@1.62.1` dev-only, `E2E_PORT` override (default 3001) + `.env.local` fallback loader in config, `test-results/` gitignored+prettier-ignored; `/login` restyled onto shared `Button`/`Field`/`Card` (behavior unchanged)
