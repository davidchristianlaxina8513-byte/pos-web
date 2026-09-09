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

## In Progress

- Agent-system rollout (this change): verify playbook links, confirm workflow on next feature branch
- **Web migration (approved 2026-09-09, phased rewrite):** Expo stays the live baseline until cutover. Phase 0 done; next is Phase 1 (auth + role routing + Supabase clients/proxy — detailed plan at execution time).
  - Completed Phase 0: scaffold alongside Expo; CI extended with `web` job
  - Remaining phases:
  1. **Phase 1 — Foundation:** auth + role routing, Supabase clients/proxy, design-token → Tailwind theme mapping
  2. **Phase 2 — POS core:** menu → cart → checkout → payment → receipt (web)
  3. **Phase 3 — Back office:** inventory, menu management, reports/dashboard, user management
  4. **Phase 4 — Cutover:** parity check vs Expo, flip baseline to web, archive Expo track
  - Web-track playbooks (`stack/nextjs`, `styling/tailwind`, `platform/web`, `capabilities/supabase/nextjs`) activate phase by phase; Expo stays untouched until Phase 4.

## Up Next

Per `docs/future-plans.md` sequencing:

1. **Phase 1 (P1):** Excel export → Personal Info editing (name/phone)
2. **Phase 2 (P2):** Forgot Password → Password change → Dark Mode
3. **Phase 3 (P3):** 2FA → Push notifications → Offline void
4. **Web migration:** Next.js + Tailwind web build (activates web-track playbooks; see `CONTEXT.md` → Product Decisions)

## Blocked

- (none)

## Decisions Made

- 2026-09-09: Adopt pos-template agent system (AGENTS/CONTEXT/RULES/playbooks), merged with existing pos-app AGENTS.md; skip `create-win-project.profile.json` (pos-app wasn't generator-created)
- 2026-09-09: Web migration planned — `stack/nextjs`, `styling/tailwind`, `platform/web`, `capabilities/supabase/nextjs` playbooks marked web-track/advisory until migration lands
- 2026-09-09: Web Phase 0 scaffold decisions — full 16-color token map (`textPrimary→foreground`, `textSecondary→muted`); `turbopack.root` set to silence dual-lockfile warning; `skipLibCheck` on + `jsx: react-jsx` (Next-mandated, matches pos-template); web `test` uses `--passWithNoTests`; root ESLint ignores `web/**`; generated `web/next-env.d.ts` committed (CI typechecks before build), `web/.next/` gitignored + prettier-ignored
