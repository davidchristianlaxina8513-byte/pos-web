-- 0009_reorder_cancel_reason.sql
-- Cancelling a reorder request now requires a reason, mirroring the
-- transactions.void_reason pattern (non-empty reason enforced for voids).
-- Web Phase B (`/admin/restock`) collects it; the mobile Restock screen is
-- a documented follow-up (see PROGRESS.md) and must send a reason too.

-- ---------------------------------------------------------------------------
-- 1) Nullable reason column. Only meaningful on cancelled rows.
-- ---------------------------------------------------------------------------
alter table reorder_requests
  add column if not exists cancel_reason text;

-- ---------------------------------------------------------------------------
-- 2) Backfill the one pre-existing cancelled row on dev (verified 2026-09-11:
--    2 requests total — 1 pending, 1 cancelled) so the check below holds.
-- ---------------------------------------------------------------------------
update reorder_requests
  set cancel_reason = 'Migrated without a recorded reason.'
  where status = 'cancelled' and cancel_reason is null;

-- ---------------------------------------------------------------------------
-- 3) Cancelled rows must carry a non-blank reason. Pending/ordered/received
--    rows are unaffected (cancel_reason stays null there).
-- ---------------------------------------------------------------------------
alter table reorder_requests
  drop constraint if exists chk_reorder_cancel_reason;

alter table reorder_requests
  add constraint chk_reorder_cancel_reason
  check (
    status <> 'cancelled'
    or (cancel_reason is not null and length(btrim(cancel_reason)) > 0)
  );
