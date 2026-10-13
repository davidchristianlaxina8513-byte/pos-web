# Progress

## System-wide back navigation (2026-10-13)

- Audited all 24 `web/src/app` routes: 4 are redirect-only; dashboards/lists rely on the StaffShell sidebar (per its documented design); receipt, product new/edit already had parent links. The only genuine gap was `/shift-report` (bottom “Back to POS” for both roles).
- Added shared `web/src/components/common/BackLink.tsx` (explicit href, never browser history; arrow icon; existing tokens/focus states) and converted the 3 existing back links to it with unchanged visuals. `/shift-report` now shows a top role-aware link (admin → Reports, cashier → Daily Sales) and the misleading bottom link was removed.
- Verified: typecheck, ESLint, Prettier, 63/63 unit, production build, new `web/e2e/back-nav.spec.ts` (BN-01…05: receipt→POS with no side effects, product forms→Menu, role parents, no dashboard redundancy, no cashier→admin hrefs) — all passing, plus pos-smoke and menu round-trip regressions and desktop/mobile screenshots.

## Payment review save failure (2026-10-13)

- Root cause: TXN-20261013-00006 is `voided` with `pending_verification` payment status. The receipt stack never read the sale `status`, so Verify/Reject rendered on a non-reviewable sale while `review_online_payment` correctly fail-closed (`Voided transactions cannot be reviewed`); the action then hid the reason behind a generic message. No RLS, auth, constraint, or trigger defect — verified by direct inspection.
- Fix: `getReceipt` now returns sale `status`/`void_reason`; review buttons render only for completed + pending sales; voided receipts show “This sale was voided (…) and can no longer be reviewed.” `reviewOnlinePayment` maps known RPC failures to user-safe messages and logs unexpected ones server-side (id + status + DB message, no PII).
- Verified: unit mapper tests, new `web/e2e/payment-review.spec.ts` (PR-01…04: voided-pending offers no review and stays unchanged, UI verify persists verified, UI reject persists rejected, unknown receipt 404s, repeat/nonexistent RPC errors) — all passing with DB-confirmed statuses; regressions online-payment.spec, AA-02, SR-E2E-02, 63/63 unit, production build.

## Actionable admin alerts (2026-10-13)

- Made the Admin Dashboard “Needs Attention” alerts full-card links: sold-out/almost-sold-out → `/today-products` (quota status and adjust controls); pending online payments → `/admin/reports?paymentStatus=pending_verification` (pre-filtered verification workflow); pending/discrepancy turnovers → `/admin/cashier-operations#turnover` (verify/flag workflow).
- Added `web/src/features/dashboard/alerts.ts` (pure alert→destination mapping, unit-tested) so future alerts follow the same pattern; alert counts and messages still come from the existing dashboard queries.
- Verified: typecheck, ESLint, Prettier, 62/62 unit tests, production build, and new `web/e2e/admin-attention.spec.ts` (AA-01…04: sold-out navigate/resolve/refresh, payment filter/verify/refresh with click-write check, turnover navigate/verify/refresh, keyboard Enter + 390px layout) — all passing, plus dashboard-hub and cashier-authorization regressions.

## End-of-shift report (2026-10-12)

- Added a shared read-only `/shift-report` route (`requireStaff()`): Manila business-date or shift filter, admin cashier filter, cashier self-only scope enforced server-side (manipulated params ignored) and backstopped by RLS.
- Completed sales include pending-verification online payments; `Online collected` counts verified GCash/Maya only; pending is separate; rejected is counted but excluded from collected; `completed = cash + collected + pending + rejected` is asserted in tests. Only cash/GCash/Maya exist — no QR Ph, card, Grab, or split payments invented.
- Products split into finished-drink cups, physical units, and unclassified via an explicit tested category map; sizes stay separate rows; quota limit/sold/remaining shown only where daily quota rows exist (`Not recorded` otherwise, never current numbers as history). No ingredient section; report performs zero writes.
- Evidence: `docs/shift-report-tests.md` (new `SR-U-…`/`SR-E2E-…` IDs; original evidence untouched). Verified: typecheck, ESLint, Prettier, unit tests, 24-route production build, and the full new Playwright spec (anonymous redirect, cash/void/quota, pending→verified, rejected, cashier isolation + manipulated filter, midnight boundary, repeat-read, not-recorded) — all passing. Existing reports/daily-sales pages gained only an entry link each.

## Signed-in landing restoration (2026-10-12)

- The signed-in root landing (`web/src/app/page.tsx`, `/`) was rendering the original scaffold stub: unstyled `IPSS Web` heading, plain session text, browser-default link/button. Git history shows it was never styled; `/login` itself was unaffected.
- Reconstructed the landing with the existing login conventions only: same `bg-login-background` shell, decorative circles, LeafMark brand block, white card (`border-sage-200`, `shadow-soft`), pine primary Continue action (now `next/link`), and the shared secondary `Button` for sign-out. No new design, no auth/routing changes.
- Preserved behavior: anonymous `/` still redirects to `/login`; the role landing (`/admin` or `/dashboard`) and sign-out form are unchanged.
- Verified: typecheck, ESLint, Prettier, 51/51 unit tests, 24-route production build, plus temporary Playwright checks (since removed) covering anonymous redirect, admin continue/sign-out/protection, and cashier 390px layout with screenshots inspected at desktop and mobile.

## Current status

On 2026-10-03, the final quota-only feature completion and stabilization phase was completed against the verified `cafe-elvira-dev` Supabase project. Production was not contacted or modified.

The web application now uses daily product quotas as its only availability mechanism. Cash and online checkout, transaction receipts/search, Admin payment review, cashier shifts, cash turnover, daily dashboards, reports, voids, users, audit records, authentication, and role enforcement are active.

## Preferences and workflow consolidation (2026-10-03)

- Replaced the disabled Preferences placeholders with account-scoped browser settings for order confirmations, low-quota emphasis, language choice, and Light/Dark/System appearance.
- Theme selection is applied across login, navigation, cards, forms, dialogs, POS, reports, and account pages using the existing design tokens. System appearance follows the browser preference.
- English remains the complete interface language. The saved locale and language option structure support adding translation catalogs later; Filipino currently records the locale while shared interface copy remains English.
- Order notifications control the existing POS add-to-cart confirmation. Quota alerts control the optional almost-sold-out wording and warning emphasis while required remaining and sold-out availability stays visible.
- Consolidated Cashier Shift and Cash Turnover presentation into `/cashier-operations` for Cashiers and `/admin/cashier-operations` for Admins. Existing shift, expected-cash, turnover, discrepancy, verification, and role rules are unchanged.
- Added cashier shift history to the combined page using the existing shift data and RLS. The turnover action now clearly states that submission ends the shift.
- Kept the former shift and turnover URLs as compatibility redirects so saved links do not break.
- Removed the duplicate Transactions dashboard tile. Reports is now the single Admin destination for sales summaries, transaction review, item details, top products, payment references/status, and evidence access.
- No migration was needed and production was not contacted or modified. Daily product quotas remain the sole availability architecture; ingredients and restocking remain removed.
- The wider visual redesign is intentionally postponed until functional development is complete.
- Refinement verification passed: TypeScript, ESLint, Prettier, 51/51 unit tests across 11 files, a 24-route production build, and 29/29 authenticated/responsive Playwright tests.

## Implemented

- Kept nullable product `daily_quota_limit`: `NULL` is unlimited, `0` is sold out, and a positive integer is the Manila-day maximum.
- Kept remaining availability derived from completed, nonvoided transaction items; no mutable remaining counter or midnight reset job exists.
- Kept stable row locking in `process_sale()` to prevent concurrent final-unit overselling.
- Renamed quota presentation to Good, Almost Sold Out, Sold Out, and Unlimited. Almost Sold Out is a positive remaining quantity at or below 25% of the daily quota; Sold Out is zero.
- POS search and category filters work together client-side. Every product card shows remaining, sold-out, unlimited, or unavailable state.
- Admin can manage products, availability, default quota, and today's quota. Cashier can read quotas and change today's quota only.
- Cashier dashboard shows today's sales, transactions, products sold, limited units remaining, almost-sold-out and sold-out counts, recent transactions, quota status, and shift totals.
- Admin dashboard shows today's sales, transactions, products sold, cash/online totals, top sellers, quota alerts, pending online payments, pending turnovers, and turnover discrepancies.
- Every new transaction receives a database-generated unique `TXN-YYYYMMDD-#####` number.
- Admin reports support date range, transaction-number search, cashier search, payment-method filter, payment-status filter, receipt details, voided transactions, product quantities, top products, and cash/online breakdown.

## Online payment

- Cash remains immediately Paid.
- GCash and Maya require a 6–64 character reference and a confirmed evidence image before checkout.
- Camera capture requests browser permission, supports preview/retake/confirm, reports denied/unavailable capture, and provides an image-upload fallback.
- Server actions accept only JPEG, PNG, or WebP up to 5 MB, generate the object key, upload through the authenticated session, and remove the object if transaction creation fails.
- The private `payment-evidence` bucket has authenticated owner/Admin policies and no public URL.
- `payment_evidence` stores the transaction link, transaction number, reference, uploader, upload time, method, MIME type, size, and evidence status.
- Online sales enter Pending Verification. Admin can view evidence through a short-lived signed URL and mark it Verified or Rejected. Rejection requires a reason.
- Evidence submission and payment review are recorded in `audit_log`. The UI states that a photo is evidence submitted for review and does not automatically prove receipt of funds.

## Cash turnover

- Expected cash is derived as starting cash plus completed cash payments during the shift.
- Online and voided transactions are excluded.
- Counted cash immediately shows Cash Balanced or a signed cash difference.
- A discrepancy reason is required in both the UI and `submit_cash_turnover()`.
- Admin can inspect starting cash, cash sales, expected cash, counted cash, difference, reason, and review note, then verify or flag the turnover.

## Database changes

- `0012_daily_production_quota_simplification.sql` removed active ingredient, recipe, stock-in, evidence, reorder, par-level, and ingredient movement structures after the guarded DEV export.
- `0013_final_feature_completion.sql` added transaction numbers, payment/reference/review fields, private evidence metadata and storage policies, payment review RPC, evidence-required online checkout, and discrepancy enforcement.
- `0014_fix_payment_evidence_path_validation.sql` corrected the evidence object-key regex from `0013`; the first version expected a literal backslash and rejected valid uploaded paths.
- Both new migrations were dry-run and applied only to linked project ref `ccqoegnvzancptqhmyoc` (`cafe-elvira-dev`).
- Local and DEV migration history are aligned through `0014`.
- DEV schema lint reports no errors.

## DEV seed

- The guarded seed continues to refuse targets outside the DEV allowlist.
- Fixed Auth lookup pagination. The earlier seed read only the default first page, missed an existing documented account, and Supabase rejected the duplicate create attempt.
- The seed now completes successfully, restores/updates the documented Admin and Cashier accounts, creates categories/products/quotas/demo transactions, and includes an unlimited product default.
- Both documented accounts authenticated successfully throughout the final browser suite.

## Removed architecture audit

- No ingredient, recipe, stock-in, raw-material, stock-alert, restock, reorder, par-level, `inventory`, `stock_movements`, or `adjust_stock` reference remains in `web/src` or `scripts/seed.cjs`.
- The only removed-architecture names in active test files are deliberate backend assertions that the dropped tables cannot be queried.
- Old migration files retain historical definitions because migrations are forward-only. The current schema removes them through `0012`.
- The ignored `.dev-exports/` archive remains the recovery reference for data exported before the DEV drop.

## Verification

Completed on 2026-10-03:

- TypeScript: passed.
- ESLint: passed.
- Prettier format check: passed.
- Unit tests: 51/51 passed across 11 files.
- Production build: passed with 24 routes.
- Supabase DEV seed: passed.
- Supabase DEV schema lint: passed with no schema errors.
- Full authenticated and responsive Playwright suite: 29/29 passed.
- `git diff --check`: passed.

Browser coverage includes Admin/Cashier/invalid login behavior, protected routes, persisted preferences and dark appearance, product creation/edit/delete, availability, finite/zero/unlimited quotas, Admin/Cashier quota permissions, concurrent quota enforcement, void restoration, POS search/categories/cart/cash checkout, private online evidence, missing-evidence backend denial, camera-permission denial and upload fallback, retake/confirm, evidence linking, transaction search, Admin payment verification, receipts, dashboards, consolidated Cashier Operations, role navigation, shifts, cash discrepancy reasons, turnover verification, reports, audit-sensitive backend authorization, and phone layouts.

## Remaining limits

- Sales, quotas, evidence upload, and reports require network connectivity.
- Receipts use browser print; there is no native thermal-printer driver.
- Camera capture depends on browser/device support and HTTPS permission rules. Automated coverage verifies denial and upload fallback; capture with real phone camera hardware still needs device acceptance testing.
- A fresh local Supabase reset was not run because Docker Desktop is unavailable. The forward migrations were dry-run, applied, and linted on the verified DEV project.

## Prior milestones

- 2026-09-22: Converted the repository to web-only and removed Expo at the owner's request.
- 2026-09-30: Resumed the DEV Supabase project and restored the documented Admin and Cashier accounts.
- 2026-10-01: Added shifts, cash turnover, audit records, and the first daily-quota implementation.
- 2026-10-02: Replaced the temporary ingredient architecture with the approved production-quota-only design.
