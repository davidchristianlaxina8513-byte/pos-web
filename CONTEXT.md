# Product context

## Current product

**IPSS: Integrated POS and Sales Monitoring System for Cafe Elvira** is a responsive, web-only application. Cashiers use a dashboard, POS, view-only menu, daily product quotas, daily sales, shifts, and cash turnover. Admins manage the menu, default and daily product quotas, reports, users, turnover verification, and audit records.

The web app lives in `web/`. Supabase migrations, edge functions, and DEV-only seed tooling live at the repository root. The app uses online Supabase reads and writes, and browser printing for receipts. It has no offline sale queue or native thermal-printer integration.

## Product goals and boundaries

- Keep the counter sale flow fast: menu, cart, payment, receipt.
- Use daily product production quotas as the only product availability limit.
- Keep totals and quota enforcement atomic on the server.
- Enforce roles on server mutations and through Supabase row-level security.
- Support cash, GCash, and Maya.
- Protect staff and customer data under RA 10173.
- Keep production data changes and releases under explicit owner control.

## Current implementation

- Supabase Auth plus a `user` profile table provide Admin and Cashier roles.
- `/pos` serves both roles and calls the `process_sale` RPC. The RPC locks product quota rows in a stable order and prevents concurrent overselling.
- Each product has an Admin-managed nullable `daily_quota_limit`: `NULL` is unlimited, `0` is sold out, and a positive integer is the maximum units for a Manila business date.
- Daily quota rows snapshot the product default for each Manila date. Admin and Cashier can adjust today's quota without changing the default; only Admin can change the product default.
- Remaining quantity is derived from completed, nonvoided sales. Voiding a sale records the actor and reason and naturally restores availability.
- Cashiers can open one shift, submit counted cash, and see expected cash based on completed cash sales. Admins verify or flag turnovers.
- Admin reports distinguish gross sales, voided sales, and net sales.
- Playwright covers phone layouts, role navigation, authorization, quota concurrency, inventory, voids, shifts, and turnover.

## Approved baseline changes

- **2026-10-03, project owner:** Refine the current interface without changing business architecture. Make notification, language, and Light/Dark/System preferences functional; consolidate shift and turnover presentation into one Cashier Operations destination for each role; remove the duplicate Transactions destination and use Reports as the central sales and transaction review page. Keep quota-only availability, existing authorization/calculations, and the established visual style. Postpone the broader UI redesign until functional development is complete. No database migration or production change was required.
- **2026-10-02, project owner:** Complete and stabilize the quota-only web system before visual redesign. Add private online-payment evidence with Admin verification, database-generated searchable transaction numbers, richer operational dashboards and reports, and mandatory explanations for cash-turnover discrepancies. Preserve the quota-only architecture and all existing role, audit, shift, turnover, report, void, authentication, and security boundaries. Production must not be modified.
- **2026-10-02, project owner:** Replace the ingredient, recipe, stock-in, evidence, raw-material alert, and reorder architecture with nullable daily product production quotas as the sole availability mechanism. Export DEV ingredient data and evidence before dropping those structures. Retain Admin and Cashier changes to today's quota, while only Admin may change product defaults or master data. Preserve sales, shifts, cash turnover, reports, audit records, authentication, and role enforcement. Recovery path: use the ignored local DEV export plus migrations `0010`/`0011`; production was not modified.
- **2026-10-01, project owner:** Replace finished-product inventory and restock requests with ingredient inventory, recipes, and Manila-day product quotas. Add cashier dashboard and operational pages, proper void reversal, shifts, cash turnover, private stock-in evidence, audit records, and backend role enforcement. Legacy inventory and restock tables remain in migration history for old records but are no longer used by the application. Recovery path: restore application usage of the legacy schema from Git history; do not delete historical database rows.
- **2026-09-22, project owner:** Switch from the Expo plus web repository to web-only and delete the Expo application. The owner explicitly requested removal after confirming the repository contained separate web and mobile apps. The web app remains in `web/`; Supabase schema and DEV seed tooling remain. Recovery path: retrieve the removed Expo files from Git history if mobile support is needed again.

## Known web-only limits

- Transactions require a network connection.
- Receipts use browser print, with no Bluetooth or Wi-Fi ESC/POS integration.
- Daily quota reads and sales require the hosted database.

## Previous approved dependency deviation

- 2026-09-18: `react-aria-components ^1.x` was approved for shared web Modal and Select accessibility. Appearance stays in project tokens. Recovery: uninstall it and replace those components.
