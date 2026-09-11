# CONTEXT.md

## Project

**Name:** IPSS — Integrated POS and Stock Monitoring System for Cafe Elvira
**Description:** Mobile-only Point-of-Sale + inventory app for a single cafe. Cashiers take orders and complete sales (cash, GCash, Maya); admins manage menu, stock, users, and reports — offline-first via a SQLite cache that syncs to Supabase.
**Stack:** Expo SDK 57 / React Native 0.86 / React 19 + TypeScript (strict) + Supabase
**Styling:** React Native StyleSheet + design tokens (no Tailwind)
**Compatibility profile:** 2026.09
**Year:** 2026
**Product status:** complete

## Product Goals

- Keep the counter selling with zero friction: menu → cart → pay → receipt in seconds.
- Never lose a sale to bad internet: offline-first reads and queued writes.
- Give the owner trustworthy numbers: server-computed totals, atomic stock deduction, daily/weekly/monthly reports.
- Protect staff accounts and sales data per RA 10173 (Philippine Data Privacy Act).

## Users

- **Cashier** (counter staff): take orders, process payments, issue receipts, view own sales history, view inventory (read-only).
- **Admin** (owner/manager): everything a cashier can, plus menu/category management, stock-in with supplier, user management, reports, dashboard, printer settings.
- Demo accounts (seeded): `admin@elvira.cafe` / `admin123`, `cashier@elvira.cafe` / `cashier123`.

## Core Workflows

- **Sale (POS):** Menu → add to cart → Checkout → Payment (cash with change calc / GCash / Maya) → transaction created, inventory deducted, cart cleared → Receipt (view / share PDF / thermal print).
- **Void:** Orders → transaction detail → Void with non-empty reason → marked `voided`, items returned to stock, `in` movement logged.
- **Stock-in:** Inventory Management → Stock In (quantity + optional supplier) → stock increases, movement logged; queues offline.
- **User management:** Settings → User Management → create staff accounts via `create-user` edge function; toggle active/inactive.
- **Receipt printing:** ESC/POS thermal via Bluetooth/WiFi (custom dev build / EAS APK only); fallback to system print dialog / share-as-PDF.

## Acceptance Criteria

- A cashier can complete a cash sale end-to-end (including change) and print/share a receipt.
- Sales and stock-ins made offline sync on reconnect without duplicates (UUID ids + remote existence check).
- Sale totals and stock math are recomputed server-side in atomic RPCs (`process_sale`, `adjust_stock`, `void_sale`).
- Cashiers cannot reach admin-only screens or tables (role-based navigation + RLS).
- `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build` all pass.

## Out of Scope

- Multi-branch / multi-store, loyalty, coupons, taxes/VAT.
- iOS release (Android only).
- Cash drawer / barcode scanner hardware (printer only).

## Generated Baseline

<!-- Selected during setup. Deviations require explicit approval. -->

- Architecture profile: 4-layer feature-based (Screen → Hook/Service → SQLite cache → `src/api/*` → Supabase). Screens never touch the DB.
- Production baseline: `main` stable / `dev` integration; releases via release-please from conventional commits.
- Authentication: Supabase Auth email + role from `user` table; offline session restore from local cache.
- Uploads: object-storage (product images via `storageApi`).
- Background jobs: none (sync on reconnect via `syncService`).
- Offline behavior: full offline-first (reads from SQLite, writes queue with `synced: false`).

## Product Decisions

- **Web migration (planned):** pos-app will gain a web build so the Next.js + Tailwind playbooks under `playbooks/` apply. Until migration lands, Expo React Native remains the baseline; `stack/nextjs`, `styling/tailwind`, `platform/web`, and `capabilities/supabase/nextjs` playbooks are marked web-track and are advisory only. (Approved by project owner, 2026-09-09.)
- **Web migration Phase 0 (complete 2026-09-09):** Next.js + Tailwind + Supabase scaffold lives in `web/` (landing page only, no product UI). Expo root untouched and still the baseline. `web/` has its own toolchain (`web/package.json`, strict `tsconfig`, `eslint-config-next`, Tailwind v4 tokens mapped 1:1 from `src/theme/colors.ts`); root ESLint ignores `web/**`; generated `web/next-env.d.ts` is committed, `web/.next/` is gitignored. CI runs a separate `web` job (Node 22, typecheck + lint + test + build with dummy `NEXT_PUBLIC_*` env).
- **Web migration Phase 1 (complete 2026-09-11):** cookie-session auth on web via `@supabase/ssr` (`web/src/lib/supabase/` browser/server/proxy clients + `web/src/proxy.ts` refresh). `/login` Server Action mirrors Expo `AuthContext.login` (email+password → `user`-table role → `/pos` cashier / `/admin` admin); unknown roles fail closed. Role gates (`requireRole`) enforce server-side; proxy refresh is not authorization. Web auth is online-only (no offline session cache).
- **Automatic restock tracking (complete 2026-09-11):** `inventory.par_level` (nullable = inactive) + `reorder_requests` table with a single `AFTER UPDATE OF quantity` trigger as the shared source of truth for Expo + web (covers sale, void, stock-in, offline replays). One open request per product (partial unique index); recovery refreshes snapshots without auto-closing; supplier pre-fills from the latest movement. Admin-only RLS. Admin UI on both apps (`/admin/restock` on web with browser-print; `Restock` screen on mobile with PDF share); `par_level` editable in the mobile product form (edit-mode) and inline on the web restock page.

## Approved Deviations

<!-- Record date, approver, rationale, affected files, and recovery path. -->

- (none)

## Notes

- Product spec and feature inventory live in `docs/` (`spec-overview.md`, `features.md`, `architecture.md`, `database.md`, `api.md`).
- Gaps and roadmap live in `docs/future-plans.md`; active tracking lives in `PROGRESS.md`.
- Agent operating contract: `AGENTS.md`. Task routing: `RULES.md` → `playbooks/`.

## Expected Concerns (advisory)

- validation
- query
- state
- env
- url-state
- safe-action
- dark-mode
