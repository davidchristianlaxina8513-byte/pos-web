# Database reference

Supabase Postgres is the web application's data store. Authentication lives in `auth.users`; the public `user` table holds each active Admin or Cashier profile. Migrations under `supabase/migrations/` are authoritative.

## Active model

### Catalog and production quotas

| Table | Purpose |
| --- | --- |
| `category` | Product categories. |
| `product` | Sellable products, price, image, active state, and Admin-managed nullable `daily_quota_limit`. |
| `daily_product_quotas` | One snapshot per product and Manila business date, including the nullable limit and actors. |
| `quota_changes` | Today-quota history with nullable old/new values, actor role, reason, and time. |
| `order_number_counter` | Transaction-safe Manila-day order and `TXN-YYYYMMDD-#####` numbering. |

`NULL` means unlimited, `0` means sold out, and a positive limit is the maximum quantity that completed sales may contain for that Manila date. Remaining quantity is derived from the daily limit minus completed transaction items. Voided sales are excluded, so a void restores availability without a stored counter or reversal job.

### Sales, shifts, and turnover

| Table | Purpose |
| --- | --- |
| `transactions` | Sale header with unique transaction number, total, payment mode/status, online reference, cashier, and void/review details. |
| `transaction_items` | Product, quantity, and server-computed subtotal for each sale line. |
| `payment_evidence` | Private object metadata linked one-to-one with an online transaction, its reference, uploader, MIME type, size, and review status. |
| `cashier_shifts` | Cashier opening cash and open/closed state for a Manila business date. |
| `cash_turnovers` | Starting cash, completed cash sales, expected cash, count, variance, and Admin verification. |
| `audit_log` | Security and operational events with actor, entity, structured details, and timestamp. |

## Server RPCs

Write RPCs use `SECURITY DEFINER`, set their search path, validate the authenticated role, and are granted only to authenticated callers.

- `business_date()` converts a timestamp to an `Asia/Manila` date.
- `ensure_daily_product_quotas()` creates missing daily snapshots from product defaults.
- `get_today_product_quotas()` returns default, today, sold, and derived remaining values.
- `set_today_product_quota()` lets Admin or Cashier change today's nullable limit, rejects finite values below completed sales, and records history.
- `set_default_product_quota()` is Admin-only and changes the product default without changing an existing daily snapshot.
- `process_sale()` aggregates cart lines, locks product and daily quota rows in product-id order, rejects concurrent overselling, computes server prices, generates the transaction number, and requires a validated private evidence object for online sales.
- `review_online_payment()` is Admin-only and changes a pending online payment to Verified or Rejected while recording the review in the audit log.
- `void_sale()` lets an Admin or the owning Cashier void a completed sale with a reason. The status change restores derived quota availability.
- `open_cashier_shift()`, `submit_cash_turnover()`, and `verify_cash_turnover()` retain the shift and verification workflow. Submission derives cash sales from completed cash transactions and requires a reason for any variance.
- `set_user_active()` remains Admin-only.

## Authorization summary

| Resource | Admin | Cashier |
| --- | --- | --- |
| Products and categories | Read and manage | Read only |
| Today's quotas | Read and adjust | Read and adjust |
| Product default quotas | Manage | Mutation denied |
| Transactions | Read all; void completed sales | Read own; void own completed sales |
| Online evidence | Read all; verify or reject | Submit and read evidence for own transactions |
| Shifts and turnovers | Read all; verify or flag | Read and submit own records |
| Quota history and audit log | Read | No access |
| Users | Read and manage | Read own profile |

Direct writes to protected operational tables remain blocked. Product availability is determined only by the active product state and the daily production quota.

## Storage and removed structures

`product-images` remains the public menu-image bucket with authenticated owner/Admin mutation controls. `payment-evidence` is private, accepts only JPEG/PNG/WebP images up to 5 MB, and uses authenticated owner/Admin policies; the app issues short-lived signed URLs only after an authorized transaction lookup. The DEV `stock-in-evidence` bucket and all ingredient, recipe, stock-in, ingredient movement, reorder request, trigger, policy, and evidence audit structures were removed by migration `0012` after a guarded local export. The export is under the ignored `.dev-exports/` directory and contains no application secrets.

The original `inventory` and `stock_movements` tables remain only for migration-history compatibility. No current route, query, RPC, seed, or test uses them, and `adjust_stock()` was dropped. `inventory.par_level`, `reorder_requests`, and their triggers were dropped.

## Migration map

| Migration | Main change |
| --- | --- |
| `0001`–`0009` | Original catalog, sales, roles, receipt numbering, images, and retired stock/reorder history. |
| `0010_daily_quota_ingredient_inventory.sql` | Introduced quotas, shifts, turnover, audit records, and the later-retired ingredient model. |
| `0011_stock_evidence_audit.sql` | Introduced the later-retired private evidence audit trigger. |
| `0012_daily_production_quota_simplification.sql` | Export-guarded removal of restock and raw-ingredient structures; nullable production quotas; transactional quota-only sales and voids. |
| `0013_final_feature_completion.sql` | Unique transaction numbers, private online evidence, payment review, and turnover discrepancy enforcement. |
| `0014_fix_payment_evidence_path_validation.sql` | Corrected evidence object-key validation in the new sale RPC. |

Migrations are forward-only. Production reset is forbidden, and production migration requires explicit owner authorization.
