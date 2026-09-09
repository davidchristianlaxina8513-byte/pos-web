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

## In Progress

- Agent-system rollout (this change): verify playbook links, confirm workflow on next feature branch
- **Web migration (approved 2026-09-09, phased rewrite — plan first):** rebuild pos-app as Next.js + Tailwind + Supabase web app while the Expo app stays the live baseline until cutover. Draft phases:
  1. **Phase 0 — Plan + scaffold:** phased migration plan approved; Next.js + Tailwind + Supabase scaffold alongside Expo; CI extended for the web build
  2. **Phase 1 — Foundation:** auth + role routing, Supabase clients/proxy, design-token → Tailwind theme mapping
  3. **Phase 2 — POS core:** menu → cart → checkout → payment → receipt (web)
  4. **Phase 3 — Back office:** inventory, menu management, reports/dashboard, user management
  5. **Phase 4 — Cutover:** parity check vs Expo, flip baseline to web, archive Expo track
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
