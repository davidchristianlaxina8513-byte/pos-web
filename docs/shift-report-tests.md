# End-of-Shift Report — Test Evidence (new IDs `SR-…`)

New feature tests for `/shift-report` (shared admin/cashier route). Original
test evidence is untouched; no Part 2 register existed in the repo, so these
IDs start a separate sequence.

Sequence per case: Original Result → Enhancement → Action → Retest → Evidence.

## Unit (Vitest, `web/src/features/shift-report/`)

| ID      | Case                                                                                                             | Result 2026-10-12  |
| ------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ |
| SR-U-01 | Beverage categories map to drink                                                                                 | PASS (3/3 in file) |
| SR-U-02 | Food categories map to physical                                                                                  | PASS               |
| SR-U-03 | Unknown/empty input is unclassified, never guessed                                                               | PASS               |
| SR-U-04 | Reconciliation: completed includes pending; `completed = cash + collected + pending + rejected`; voided separate | PASS (5/5 in file) |
| SR-U-05 | Product grouping, cups/physical/unclassified splits, quota remaining math, `unrecorded` without a quota row      | PASS               |
| SR-U-06 | NULL quota shows unlimited with sold quantity, no invented balance                                               | PASS               |
| SR-U-07 | Voided sales excluded from products, cups, completed, and quota sold                                             | PASS               |
| SR-U-08 | Repeated builds over the same input are identical (read-only)                                                    | PASS               |

Enhancement identified: none — new code, written test-first (failing run
observed before each implementation).

## End-to-end (Playwright, `web/e2e/shift-report.spec.ts`, live DEV)

Fixtures assert deltas and void every created sale. Original Result for each:
no `/shift-report` route existed.

| ID        | Case                                                                                                                          | Result 2026-10-12 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| SR-E2E-00 | Anonymous `/shift-report` redirects to `/login`                                                                               | PASS              |
| SR-E2E-01 | Cash sales feed products, cups, quota remaining; void moves the sale to voided totals and restores quota                      | PASS              |
| SR-E2E-02 | Online pending counts in completed but not collected; after admin verification it moves to collected with completed unchanged | PASS              |
| SR-E2E-03 | Rejected online payment leaves collected unchanged, drains pending, keeps completed unchanged, cleanup void succeeds          | PASS              |
| SR-E2E-04 | Cashier sees only self; an admin sale changes nothing; manipulated `?cashier=<other>` still shows self; 390px has no overflow | PASS              |
| SR-E2E-05 | Backdated sale lands in the prior Manila day, not today                                                                       | PASS              |
| SR-E2E-06 | Two consecutive reads return identical totals and quota remaining is unchanged                                                | PASS              |
| SR-E2E-07 | Date without quota rows shows `Not recorded`, never current numbers                                                           | PASS              |

Retest: full spec re-run after `npm run build` — all PASS (see PROGRESS entry).

## Manual verification procedure (DEV)

1. `npm --prefix web install`, then `npm run dev` in `web/` (uses `web/.env.local`).
2. As cashier, make a cash sale and a GCash sale with evidence in `/pos`.
3. Open `/shift-report`: completed includes both; pending shows the GCash amount; collected excludes it.
4. As admin, verify the payment in `/admin/reports`, reopen `/shift-report`: pending drains into collected, completed unchanged.
5. Pick a shift from the selector, including one crossing midnight: quota panel stays on the shift business date with an explanatory note.
6. Open `?date=2020-01-01`: quota columns show `Not recorded`.
7. Print preview: filters, nav, and buttons are hidden; cards and tables print.

## Known limitations

- Shift slicing is cashier + time-range inference (`transactions` has no
  `shift_id`); stated in the report UI.
- Remaining is daily-quota remaining, not a verified physical count.
- Drink/physical split is an explicit category map; new categories appear
  under Unclassified until mapped.
- Single payment mode per transaction; no discounts/tax/refunds in schema.
- Quota panel is single-Manila-day.
- e2e runs locally against seeded DEV only (no CI e2e job exists).
