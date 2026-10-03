# Cafe Elvira POS

A responsive, web-only cafe POS with daily product production quotas, cashier shifts, cash turnover, and back-office reporting. It uses Next.js, TypeScript, Tailwind CSS, and Supabase. The application is in [`web/`](web/); Supabase migrations and DEV-only seed tooling are at the repository root.

## Run locally

Use Node.js 22 or newer. Copy `web/.env.example` to `web/.env.local` and provide the public URL and anon key for the DEV Supabase project.

```bash
npm --prefix web ci
npm run dev
```

Open <http://localhost:3000>. Root scripts forward to the web app. Install root dependencies only when using the guarded DEV seed tooling.

## Features

- Cash checkout plus GCash/Maya checkout with a required reference and private payment-evidence image. Online payments remain pending until an Admin verifies or rejects them.
- Nullable Manila-day production quotas with transactional sold-out enforcement: blank is unlimited, zero is sold out, and a positive integer is the daily limit.
- Admin-managed product defaults plus Admin/Cashier adjustments for today's quota.
- Derived availability from completed sales, with voided sales restoring availability naturally.
- Database-generated searchable transaction numbers on receipts and reports.
- Cashier daily summary, recent transactions, view-only menu, daily sales, and a single Cashier Operations page for shift and cash-turnover work.
- Admin daily summary, needs-attention list, and a single Cashier Operations page for shift history and turnover verification.
- Reports is the central Admin destination for sales summaries, transaction search, sold items, top products, payment references, and private evidence review.
- Account-scoped browser preferences for POS confirmations, quota-alert emphasis, saved language choice, and Light/Dark/System appearance.
- Server role checks, row-level security, and responsive phone and desktop layouts.
- Browser-printable receipts with payment state and authorized evidence access.

The current interface remains intentionally consistent with the established design. A broader visual redesign is postponed until functional development and verification are complete.

Sales require connectivity. The web app does not include offline sale storage or native thermal-printer support.

## DEV data

The documented Admin and Cashier accounts are managed by `scripts/seed.cjs`. It reads seed-only credentials from root environment files, verifies the target against the DEV project allowlist, and must never be pointed at production.

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run test:e2e
```

See [`AGENTS.md`](AGENTS.md) for development rules, [`CONTEXT.md`](CONTEXT.md) for product decisions, and [`docs/database.md`](docs/database.md) for the current data model.
