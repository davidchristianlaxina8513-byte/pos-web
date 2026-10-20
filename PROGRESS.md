# Progress

## Current status

On 2026-10-03, the final quota-only feature completion and stabilization phase was completed against the verified `cafe-elvira-dev` Supabase project. Production was not contacted or modified.

The web application now uses daily product quotas as its only availability mechanism. Cash and online checkout, transaction receipts/search, Admin payment review, cashier shifts, cash turnover, daily dashboards, reports, voids, users, audit records, authentication, and role enforcement are active.

## Modern Dashboard and POS Redesign (2026-10-17)

- **Capstone Defense Accounting Alignment: Void to Customer Refund Transformation (2026-10-20)**:
  - Addressed panelist/accounting requirement regarding paid sales: replaced all casual "Void" terminology with formal "Cancel & Refund" / "Customer Refund & Reversal" across [`ActiveOrdersModal.tsx`](web/src/components/modules/pos/ActiveOrdersModal.tsx), [`ReceiptOrderActions.tsx`](web/src/components/modules/pos/ReceiptOrderActions.tsx), [`TransactionReviewTable.tsx`](web/src/components/modules/reports/TransactionReviewTable.tsx), and [`VoidButton.tsx`](web/src/components/modules/reports/VoidButton.tsx).
  - Updated Daily Sales ledger ([`daily-sales/page.tsx`](web/src/app/daily-sales/page.tsx)) and Reports KPIs ([`ReportsKPIs.tsx`](web/src/components/modules/reports/ReportsKPIs.tsx)) to enforce standard retail accounting: `Gross Sales - Customer Refunds = Net Sales`.
  - Reinforced internal controls: refunds strictly require Manager step-up authorization (`admin@elvira.cafe`), mandatory operational reason, immutable audit logging, and inventory quota restoration.
  - Verification: `typecheck`, `lint`, `format:check`, unit tests (52/52 passing), and Next.js production build (25/25 routes) passed with exit code 0.

- **Production Deployment to Vercel with Supabase Database (2026-10-20)**:
  - Linked project to team `ipss1` and configured production environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`).
  - Executed production build and deployment via Vercel CLI (`vercel deploy --prod`).
  - Disabled SSO deployment protection (`vercel project protection disable web --sso`) ensuring open public access to the live web application.
  - Successfully verified live deployment endpoint (`https://web-nine-kohl-89.vercel.app`) returning HTTP 200 on `/login` and role redirects on `/`.

- **Comprehensive Capstone Defense Script & System Documentation (2026-10-20)**:
  - Compiled complete presentation script into [`IPSS_Presentation_Script.docx`](file:///home/john/Projects/pos-web/IPSS_Presentation_Script.docx) based on the team's official documentation overview and WST 1 System Testing Approach.
  - Formatted across 6 structured sections: Project Overview (team, client background, problem, purpose, critical success factors), System Scope & CRUD Entities, 3-Tier Architecture & Tech Stack, Implementation Roadmap, WST 1 System Testing (18 modules across 4 testing dimensions), and Panelist Defense Q&A reference.


- **Root Landing Route (`/`) Role-Aware Automatic Redirect (2026-10-18)**:
  - Fixed `web/src/app/page.tsx` displaying the raw, unstyled scaffold text ("IPSS Web / Signed in as cashier@elvira.cafe / Continue to dashboard / Sign out") when navigating to `http://localhost:3000`.
  - Replaced the manual scaffold markup with an immediate automatic server redirect `redirect(landingForRole(profile.role))`:
    - Cashiers visiting `http://localhost:3000` are seamlessly redirected to `/dashboard`.
    - Administrators visiting `http://localhost:3000` are seamlessly redirected to `/admin`.
    - Unauthenticated visitors visiting `http://localhost:3000` are redirected to `/login`.

- **Cashier Modules End-to-End Audit & Verification (2026-10-18)**:
  - Validated all 7 cashier-facing modules against the live dev Supabase database with authenticated cashier session (`cashier@elvira.cafe`):
    1. **Dashboard (`/dashboard`)**: Welcome banner, active shift indicator, 4 summary KPI cards, sales trend, live portion quotas, and open register CTA. Upgraded gate to `requireStaff()` so administrators can also preview and test the cashier dashboard without forced redirects.
    2. **Point of Sale (`/pos`)**: Menu grid with category filtering, real-time quota deduction, dual-layer resilient cart autosave, Cash & QR Ph (GCash/Maya) checkout, and Active Orders kitchen progression modal (`pending` → `preparing` → `ready` → `completed`).
    3. **Menu Catalog (`/menu`)**: View-only catalog mirroring admin design with Table/Card view switcher, search, category pills, and product detail inspection modal.
    4. **Today's Products (`/today-products`)**: Real-time portion quota monitoring, stock adjustments, and quota audit history table.
    5. **Daily Sales (`/daily-sales`)**: Read-only Manila business day sales ledger, gross/voided/net calculation cards, receipt links, and order lifecycle badges.
    6. **Cashier Operations (`/cashier-operations`)**: Shift start/drawer float declaration, drawer cash reconciliation & turnover submission, shift history ledger with details modal, and turnover review ledger.
    7. **Profile & Settings (`/profile`)**: Authentic 3-column DCASIS settings layout with cashier credentials, password update, role capabilities matrix, sound/theme preferences, and session sign out.
  - Verified `typecheck`, `format:check`, `lint`, and unit test suite (52/52 tests passing). Next.js production build succeeded with exit code 0.

- **Cashier Profile & Settings Redesign (`/profile`) - Admin Parity (2026-10-18)**:
  - **Authentic DCASIS 3-Column Architecture**: Redesigned `http://localhost:3000/profile` to match the exact DCASIS form structure (`1/3 instructions` + `2/3 form card`) used in `/admin/settings` ([`web/src/app/admin/settings/page.tsx`](web/src/app/admin/settings/page.tsx)).
  - **Section 1: Personal Information**:
    - Cashier avatar & identity header with email, active role badge (`Cashier (Counter Operator)`), and pulsing live status pill.
    - Disabled email input with authentication credential context.
    - Quick navigation tiles: direct links to `/cashier-operations` (Cashier Shift & Drawer Operations) and `/pos` (Point of Sale Register) with `ChevronRightIcon`.
  - **Section 2: Security & Password**:
    - Embedded `<PasswordSection />` allowing cashiers to safely update their own account password (minimum 6 characters) with immediate session persistence.
    - Security callout banner explaining session protection.
  - **Section 3: Role Scope & Operational Capabilities**:
    - 2-column capability matrix summarizing "What Cashiers Can Do" vs "Manager Protected Boundaries" under Cafe Elvira RBAC, plus quick link to `/cashier-operations` for operating rules.
  - **Section 4: Preferences & Interface Theme**:
    - Embedded `<PreferencesPanel />` providing sound effect toggles, low stock audio alerts, and light/dark theme controls.
  - **Section 5: Session Management & Sign Out**:
    - Active session details (Manila timezone, email) with clean, styled `signOut` action button.
  - **Universal Staff Access & Header Actions**:
    - Uses `requireStaff()` to allow seamless previewing by both cashiers and managers without unauthorized redirects; includes "Admin Settings →" shortcut for admins and "Open Register" CTA.
  - **Skeleton Loading Parity**:
    - Updated `SettingsSkeleton` in [`LoadingSkeleton.tsx`](web/src/components/loader/LoadingSkeleton.tsx) and [`loading.tsx`](web/src/app/profile/loading.tsx) with `hasHeaderActions={true}` to eliminate layout shift during page load.

- **Transaction-Level Void, Order Fulfillment Lifecycle, Cart Autosave & Shift Recovery (2026-10-18)**:
  - **1. Void at Transaction Level (Read-Only Daily Sales)**:
    - Shifted void operations strictly to individual transactions (accessible from Receipt/Transaction view) rather than the Daily Sales summary.
    - Made Daily Sales view strictly read-only by removing the void button and rendering clean status badges; updated gross and net calculations to exclude voided and cancelled orders.
    - Updated `void_sale` RPC to restrict voiding exclusively to manager/admin roles, require an audit reason, record `voided_by`, `voided_at`, and log `product_sale_voided` event to `audit_log`.
    - Added [`ReceiptOrderActions`](web/src/components/modules/pos/ReceiptOrderActions.tsx) with a manager-authorized Void confirmation modal on the receipt view.
  - **2. Order Fulfillment Status (Pending Until Fulfilled)**:
    - Updated transactions status check constraint to support fulfillment stages: `'pending'`, `'preparing'`, `'ready'`, `'completed'`, `'cancelled'`, and `'voided'`.
    - Newly placed orders enter as `pending` upon checkout completion.
    - Built [`update_order_status`](supabase/migrations/0015_order_fulfillment_and_cart_autosave.sql) RPC enforcing transition rules and recording status updates in `audit_log`.
    - Created [`ActiveOrdersModal`](web/src/components/modules/pos/ActiveOrdersModal.tsx) displaying live orders (`pending`, `preparing`, `ready`) with item breakdown, elapsed time, and one-click quick progression buttons (`Start Preparing`, `Mark Ready`, `Mark Served / Fulfilled`).
    - Configured daily sales aggregation to treat all non-voided, non-cancelled orders (`pending`, `preparing`, `ready`, `completed`) as active revenue since payment is collected at checkout.
  - **3. Cart Autosave & Idempotency**:
    - Created `cart_drafts` table with RLS for cashier and admin workstations.
    - Added resilient dual-layer persistence in [`PosScreen.tsx`](web/src/components/modules/pos/PosScreen.tsx): instant local fallback in `localStorage` coupled with debounced database synchronization (`saveCartDraft`).
    - Added real-time visual save status indicator in [`CartPanel.tsx`](web/src/components/modules/pos/CartPanel.tsx) (`Saving...`, `Saved`, `Saved locally`).
    - Enforced checkout idempotency using client-generated transaction IDs (`clientTxnIdRef = useRef(crypto.randomUUID())`) in [`CheckoutDialog.tsx`](web/src/components/modules/pos/CheckoutDialog.tsx) and `process_sale` RPC to eliminate duplicate transactions on retries.
  - **4. Shift Recovery & Persistence**:
    - Updated [`getCurrentShift()`](web/src/features/shifts/queries.ts) to prioritize recovering existing `status = 'open'` shifts on page load, reload, or crash.
    - Added database partial unique index `cashier_one_open_shift` preventing multiple open shifts per cashier.
    - Displayed active shift recovery banner in POS with start time, opening cash, and quick link to cashier operations.
    - Updated `submit_cash_turnover` RPC and shift cash calculations to account for all active non-voided/non-cancelled cash transactions.
  - **5. Component Standardization & Box Sizing Alignment**:
    - Standardized `ActiveOrdersModal.tsx` sizing from an oversized `4xl` dialog down to `size="2xl"`, eliminating the horizontally stretched empty box.
    - Replaced ad-hoc filter pills with the authentic DCASIS filter chips pattern (`action-focus inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold`) matching `UsersManager.tsx` and `ProductQuotaList.tsx`.
    - Swapped raw HTML buttons and link buttons across `ActiveOrdersModal.tsx`, `PosScreen.tsx`, and `ReceiptOrderActions.tsx` to the standard [`Button`](web/src/components/form/Button.tsx) component (`variant="primary" | "secondary" | "danger" | "ghost"`).
    - Standardized order and status containers to use the shared [`Card`](web/src/components/common/Card.tsx) component.
  - **7. Standard Secure Void Modal Refinement**:
    - Reverted bloated modal structure and removed `SecureVoidModal.tsx`, adhering strictly to the repository's existing compact modal design.
    - Preserved high security: Cashiers are required to provide Manager Email and Password to authorize any void; Managers/Admins can authorize directly with their active session.
    - Provided 4 quick standard reason presets (`Customer changed mind`, `Ordered by mistake`, `Kitchen delay / out of stock`, `Customer left counter`) alongside custom reason notes.
    - Verified all typecheck, lint, prettier format, vitest unit tests, and Next.js production build pass cleanly.
    - Gated active fulfillment progression cards strictly to pending/active orders (`!isTerminal`).
    - Positioned primary POS navigation (`+ New Transaction`, `Print`) directly beneath the receipt card with a discreet, clean manager action link (`Void Transaction (Manager Authorization)`) for admins.
  - **8. Voided Receipt UI Polish & Color Harmonization**:
    - Replaced the mismatched "Payment Successful" heading and green checkmark on voided receipts with a neutral `NoSymbolIcon` badge, "Transaction Voided" title, and explanatory subtitle.
    - Neutralized the bright pink/red `Void Reason` banner into a clean, text-based container (`border-border bg-mist/50 text-foreground`) without harsh red backgrounds.
    - Updated `Total` on voided receipts to muted line-through (`text-muted line-through`), set `Payment status` to neutral `Voided` (removing the green "Paid" label), and converted the `Order status` badge to neutral `border-neutral-300 bg-neutral-100 text-neutral-700`.
    - Suppressed the green "Verified via PayMongo QR Ph" tag on voided receipts to keep the state unambiguous.
    - Updated print template to clearly show `*** VOIDED RECEIPT ***`.
  - **7. Admin Operations & Flow Streamlining**:
    - **Reports Ledger True Order Status**: Updated [`TransactionReviewTable.tsx`](web/src/components/modules/reports/TransactionReviewTable.tsx) to display real fulfillment lifecycle statuses (`Pending`, `Preparing`, `Ready`, `Completed`, `Voided`, `Cancelled`) with color-coded badges and icons instead of binary status.
    - **Catalog vs Daily Quota Cross-Linking**: Added reciprocal guidance banners and buttons between [`MenuManager.tsx`](web/src/components/modules/menu/MenuManager.tsx) (`/admin/menu`) and [`today-products/page.tsx`](web/src/app/today-products/page.tsx) (`/today-products`) clarifying master catalog pricing/recipes vs daily live portion availability.
    - **Live Register Operations Widget & Operations Pulse**: Added a dedicated "Live Register Operations" card to [`admin/page.tsx`](web/src/app/admin/page.tsx) tracking cashiers currently on duty, opening drawer cash, and start times. Upgraded needs-attention alerts into discrete, 1-click action chips for sold out products, low stock, pending turnovers, cash discrepancies, and pending payments.
    - **Interactive Cashier Operations & Discrepancies Filter**: Updated [`AdminCashierOperationsManager.tsx`](web/src/components/modules/shifts/AdminCashierOperationsManager.tsx) with a `Discrepancies ({count})` filter tab and converted summary KPI metric cards into 1-click quick-filter triggers.
    - **Modal & Receipt Void Reason Text Contrast & Tailwind v4 Dark Variant**: Fixed illegible light text inside warning and void reason banners by defining `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` in `globals.css` (preventing OS dark mode media queries from leaking into light theme mode) and upgrading banner body text to high-contrast `text-foreground` across [`pos/receipt/[id]/page.tsx`](web/src/app/pos/receipt/[id]/page.tsx), [`TransactionReviewTable.tsx`](web/src/components/modules/reports/TransactionReviewTable.tsx), [`AdminCashierOperationsManager.tsx`](web/src/components/modules/shifts/AdminCashierOperationsManager.tsx), and [`TurnoverList.tsx`](web/src/components/modules/shifts/TurnoverList.tsx).
  - **8. Cashier-Side Flow & Usability Improvements**:
    - **Cashier Dashboard Active Sales & Order Fulfillment Sync**: Updated `web/src/app/dashboard/page.tsx` so Today's Sales and Orders KPI metrics track all active sales (`pending`, `preparing`, `ready`, and `completed`) rather than only `completed`, accurately counting prepaid orders right after checkout.
    - **Kitchen Active Orders Pulse Alert**: Added real-time kitchen status banner on the Cashier Dashboard notifying staff of pending/preparing/ready orders awaiting fulfillment, with 1-click shortcut to POS/Kitchen active orders dialog.
    - **Recent Orders Fulfillment Status Badges**: Added color-coded live fulfillment status badges (`Pending`, `Preparing`, `Ready`, `Completed`, `Voided`, `Cancelled`) directly in the Recent Orders table on the Cashier Dashboard.
    - **View-Only Menu Catalog Redesign (`/menu`) - Admin Mirroring**:
      - Completely redesigned `http://localhost:3000/menu` to mirror the authentic DCASIS design and layout of the Admin Menu (`/admin/menu` / [`MenuManager.tsx`](web/src/components/modules/menu/MenuManager.tsx)).
      - Matching header banner with catalog count pill and counter action shortcuts (`Go to POS`, `Today's Stock Quotas →`, and `Master Menu Catalog →` for admins).
      - Authentic 4 KPI metric cards: Total Catalog, Active on POS, Hidden Products, and Categories with identical iconography, layout, and styling.
      - Standard toolbar with search input, availability filter (`All`, `Available`, `Hidden`), view switcher (`Table` vs `Grid`), and category filter pills.
      - Full-featured Table View with sortable columns (Name, Category, Price, Status, Today's Quota) and Grid Card View with photo preview, availability tags, and quick-action buttons (`View Details`, `Order in POS`).
      - Product preview details modal showing large image preview, status badge, category, price, and live quota breakdown.
    - **Cashier Void Manager Auth RLS Fix & Neutral Void Receipt**:
      - Fixed cashier voiding authorization failure where valid manager credentials (`admin@elvira.cafe` / `admin123`) were rejected due to Supabase RLS preventing cashiers from reading other users' rows in the `user` table. Resolved by verifying manager auth token first and reading role with manager client before calling `void_sale`.
      - Neutralized voided receipt styling in [`pos/receipt/[id]/page.tsx`](web/src/app/pos/receipt/[id]/page.tsx): replaced bright red banners and green checkmarks with neutral `NoSymbolIcon`, "Transaction Voided" title, strikethrough total, and clean neutral status pills.
    - **High-Contrast Low Stock Warnings**: Upgraded low quota badges on the dashboard to high-contrast `text-amber-800 dark:text-amber-300 font-bold`.
    - **Cashier Operations Redesign & Skeleton Loading Alignment (`/cashier-operations`)**:
      - Redesigned `http://localhost:3000/cashier-operations` to match the authentic DCASIS design of the admin side ([`AdminCashierOperationsManager.tsx`](web/src/components/modules/shifts/AdminCashierOperationsManager.tsx)).
      - **Header & Shell Parity**: Migrated breadcrumbs, page title, subtitle, and action buttons (`Open Register`, plus `Admin Operations` link for admins) up to [`StaffShell`](web/src/components/layout/staff-shell.tsx) in [`cashier-operations/page.tsx`](web/src/app/cashier-operations/page.tsx), removing duplicate internal headers and eliminating layout jumps.
      - **4 Interactive Summary KPI Cards**: Shift Status (Active with live pulsing green badge or Closed), Starting Cash Float, Cash Sales Collected, and Expected in Drawer with direct click-to-switch tab interactions.
      - **4 Tabbed Workspaces with DCASIS Data Tables**:
        1. **Cashier Shift**: Full DCASIS form for starting shift or viewing active drawer session + quick navigation to shift history.
        2. **Cash Turnover & Drawer Count**: Drawer reconciliation form with live variance calculation, discrepancy explanation, and quick navigation to turnover history.
        3. **Shift History Ledger**: Full sortable data table with search, status filters (`All`, `Open`, `Closed`), duration, starting cash, notes, and a dedicated **Shift Details Modal**.
        4. **Turnover History Ledger**: Full sortable data table with search, review status filters (`All`, `Pending`, `Verified`, `Flagged`, `Discrepancies`), variance badge (`Balanced`, `Short`, `Over`), counted cash, and a dedicated **Turnover Details Modal** displaying full reconciliation and manager audit notes.
      - **Skeleton Loading Fix**: Overhauled [`CashierOperationsSkeleton`](web/src/components/loader/LoadingSkeleton.tsx) to match the exact shell header (`hasHeaderActions={true}` with action button placeholder), 4 KPI cards grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), tab bar, and form/table layout, ensuring a 1:1 smooth loading transition without visual flickers or jumping elements.
      - **Staff Access Gate**: Updated [`page.tsx`](web/src/app/cashier-operations/page.tsx) and query helpers [`getMyShifts`](web/src/features/shifts/queries.ts) and [`getMyTurnovers`](web/src/features/shifts/queries.ts) to use `requireStaff()`, allowing admins and cashiers to seamlessly review register operations without unauthorized redirects.
      - **Role-Based Capability Matrix ("What Cashiers Can Do")**:
        - Integrated a dedicated workspace tab (`Role Scope & Permissions`) and top-right indicator pill with quick-inspection modal button into [`CashierOperationsManager.tsx`](web/src/components/modules/shifts/CashierOperationsManager.tsx).
        - Clearly defines **Authorized Counter Capabilities** (Shift Drawer Opening/Closing with presets, POS Checkout & QR Ph/Cash payments, Order Fulfillment Queue Progression, Daily Sales & Receipts, Drawer Reconciliation & Turnover, and Quota/Menu checking) alongside **Protected Manager Boundaries** (Manager Void Authorization with step-up password, Cash Turnover Auditing & Variance Approval, Catalog Price/Recipe Adjustments, Daily Stock Quota allocations, User Account Management, and System Audit Logs).
        - Added live role capability preview cards to the staff creation form in [`UsersManager.tsx`](web/src/components/modules/users/UsersManager.tsx) ensuring managers see exact permission scopes when onboarding cashiers vs administrators.
    - **Authentic DCASIS Form Architecture for Cashier Shifts & Drawer Turnover**: Overhauled [`ShiftPanel.tsx`](web/src/components/modules/shifts/ShiftPanel.tsx) to follow the authentic 3-column DCASIS form structure (`1/3 instructions` + `2/3 form card`):
      - **Start Shift Form**: Register Session identity block (authenticated cashier email and Manila date/time) + Opening Cash Float section with quick preset denomination chips (`₱500`, `₱1,000`, `₱1,500`, `₱2,000`, `₱3,000`, `₱5,000`), starting float input with `₱` prefix, optional notes, cash drawer accounting rule callout, and "Start Shift & Open Drawer" button.
      - **Active Shift Summary**: 3-column session overview (cashier, started timestamp, live pulsing status badge) + real-time drawer breakdown cards (Starting Float, Cash Sales Collected, Expected in Drawer) with direct CTA to switch to cash turnover.
      - **Cash Turnover & Drawer Count Form**: Shift Closing Summary 3-column breakdown + Drawer Cash Count reconciliation block with 1-tap "Match Expected Total" chip, counted cash input with `₱` prefix, live variance calculation banner (Balanced / Shortage / Overage), mandatory discrepancy explanation field when variance is non-zero, turnover policy warning, and "Submit Cash Turnover & Close Shift" button.
    - **Shift Variance & Discrepancy Guidance**: Upgraded drawer difference calculation with high-contrast emerald (balanced), red/rose (shortage), and amber (overage) indicators, plus explicit guidance for cashier discrepancy notes.
    - **Kitchen Order Fulfillment Simulation & Real-Time Queue Store**: Added persistent order fulfillment store ([`fulfillment-store.ts`](web/src/features/pos/fulfillment-store.ts)) ensuring new POS checkouts enter as pending and can be progressed through the kitchen lifecycle (`Pending` → `Preparing` → `Ready for Pickup` → `Completed`) via [`ActiveOrdersModal`](web/src/components/modules/pos/ActiveOrdersModal.tsx) and [`ReceiptOrderActions`](web/src/components/modules/pos/ReceiptOrderActions.tsx), fully supporting professor requirements and live demo simulations.
    - **Daily Sales Ledger Instant Cache Invalidation & Staff Access**:
      - Fixed stale cached transactions on `/daily-sales` after completing POS checkouts by adding `export const dynamic = 'force-dynamic'` to [`daily-sales/page.tsx`](web/src/app/daily-sales/page.tsx).
      - Added `revalidatePath('/daily-sales')` to `checkoutSale`, `updateOrderStatusAction`, `cancelAndRefundOrderAction` in [`actions.ts`](web/src/features/pos/actions.ts), and [`paymongo/status/route.ts`](web/src/app/api/pos/paymongo/status/route.ts).
      - Broadened role access from strict `cashier` to `requireStaff()` on [`daily-sales/page.tsx`](web/src/app/daily-sales/page.tsx) and [`getCashierTodaySales()`](web/src/features/dashboard/queries.ts), allowing both Cashiers and Admins/Managers to view live daily sales without permission rejection.
      - Integrated `getFulfillmentStatus(row.id)` into `getCashierTodaySales()` so order lifecycle status badges accurately reflect live kitchen progression states.
    - **High-Density Order Ledger Table & Multi-Order Queue Redesign**: Redesigned [`ActiveOrdersModal.tsx`](web/src/components/modules/pos/ActiveOrdersModal.tsx) to `size="6xl"` featuring a high-density, sticky-header Order Ledger Table view as default to display dozens of active tickets simultaneously without wasted space. Added real-time order search, responsive Table vs Cards view switcher, item breakdown pills (`1× Bacon with Egg`, etc.), payment and elapsed time indicators, and 1-tap quick action buttons (`Start Preparing`, `Mark Ready`, `Mark Served / Fulfilled`) for rapid kitchen queue management.
    - **GCash & Maya QR Ph Active Queue Sync**: Resolved issue where online payments (GCash / Maya QR Ph) bypassed the Active Orders queue. Integrated `setFulfillmentStatus(effectiveTxId, 'pending')` and path revalidations directly inside [`/api/pos/paymongo/status/route.ts`](web/src/app/api/pos/paymongo/status/route.ts) upon successful payment confirmation. Added color-coded payment mode badges (`Cash`, `GCash`, `Maya`) to both Table and Cards view in `ActiveOrdersModal.tsx`.
    - **Unified Secure Voiding Architecture (Consolidated Void-Only with Step-Up Security)**:
      - Replaced all split "Cancel & Refund" mechanisms with a single, unified, high-security **Void Transaction** workflow across POS Active Orders ([`ActiveOrdersModal.tsx`](web/src/components/modules/pos/ActiveOrdersModal.tsx)), Receipt view ([`ReceiptOrderActions.tsx`](web/src/components/modules/pos/ReceiptOrderActions.tsx)), and Admin Reports ([`TransactionReviewTable.tsx`](web/src/components/modules/reports/TransactionReviewTable.tsx)).
      - Created dedicated reusable [`SecureVoidModal.tsx`](web/src/components/modules/pos/SecureVoidModal.tsx) enforcing 5 distinct security controls:
        1. **Manager Step-Up Authentication**: Server-side verification of Manager/Admin email and password via Supabase Auth (`signInWithPassword`) and role check (`role === 'admin'`).
        2. **Standardized Reason Classification**: Mandatory category selection (`Cashier Entry Error`, `Customer Change of Mind`, `Kitchen Shortage / Quality Issue`, `Duplicate Transaction`, `System Testing / Float Adjustment`, `Other`).
        3. **Minimum Explanation Length**: Requires at least 8 characters explaining the specific operational cause.
        4. **Physical Drawer & Digital Reversal Guidance**: Explicit warning detailing exact cash drawer deduction or digital payment reversal obligations.
        5. **Audited Financial Reversal Acknowledgment**: Mandatory checkbox confirming permanent reversal, stock quota restoration, and immutable audit logging.
      - Implemented [`voidOrderAction`](web/src/features/pos/actions.ts) executing `void_sale` RPC with elevated manager credentials, updating persistent fulfillment state to `'voided'`, and invalidating all relevant application paths.


- **Simplified Dashboard with Styled Welcome Card**:
  - Streamlined both Admin and Cashier Dashboards to eliminate information overload while delivering a clean, elevated layout.
  - Upgraded the welcome section from bare text into a styled surface card with rounded corners (`rounded-2xl`), subtle borders, a `border-l-4 border-l-pine` accent bar, soft shadow, icon badge, live role/session indicator, and direct "Open Register" CTA.
  - Focused the dashboard on 4 essential KPI cards (Today's Sales, Completed Orders, Products Sold, Low/Sold Out stock count) and 2 clean panels (7-Day Sales Trend and Product Availability).
  - Restructured the sidebar brand header to stack vertically with the enlarged logo badge on top (`h-14 w-14`) and the system name ("Integrated POS and stock monitoring system") on the bottom, removing the redundant brand label and role badge from the header for a clean, focused look.
  - Added `SidebarSkeleton` and `StaffShellSkeleton` mirroring the desktop `w-64` dashboard sidebar and mobile header bar, wrapping all route loading skeletons (`CardsSkeleton`, `PosSkeleton`, `ListSkeleton`, `FormSkeleton`) for 100% layout alignment with zero jump/shift on navigation.
  - Aligned typography with the sports system by integrating Google Font **Montserrat** (weights 100..900) across Tailwind tokens (`--font-sans`) and the base `body` element.
  - Replaced subtle close cross icons in POS cart lines with clear `TrashIcon` delete buttons, added a delete icon to the cart "Clear" action, and dynamically rendered `TrashIcon` on steppers when reducing 1-item quantities.
  - Redesigned **Today's Products & Stock Monitoring** (`/today-products`) with full-width container (`fullWidth={true}`), DCAPC-style header banner with pine accent border (`border-l-4 border-l-pine`), 4 real-time KPI stock cards, responsive search and status filter chips, visual progress bars, interactive modal dialog replacing ugly browser `prompt()`s, and direct quick-step adjustment buttons.
  - Added a dedicated, easy-to-read **Stock Management Table** (with View Switcher: Table View & Card View) and completely redesigned the **Recent Quota Adjustments History** table with clear columns (Product, Previous Limit, New Limit, Net Adjustment badge, Reason, Changed By, and Manila timestamps).
  - Added **DCASIS Tabbed Navigation** on `/today-products`:
    - Integrated tab switcher directly below the 4 Summary Stock KPI cards:
      - **View All** (`Squares2X2Icon`): Displays both Today's Products stock monitoring and Recent Quota Adjustments History stacked (default view).
      - **Today's Products** (`TableCellsIcon` with count badge): Displays only the stock monitoring table/grid view with search and filters.
      - **Recent Quota Adjustments History** (`ClockIcon` with count badge): Displays only the recent quota changes history table with real-time text filter.
    - Componentized [`QuotaHistoryTable`](web/src/components/modules/quotas/QuotaHistoryTable.tsx) with real-time adjustment filtering (by product name, reason, or cashier).
- **Audit Log Clarification & Actor Email Resolution (`/admin/audit`)**:
  - Clarified the "System" option in the actor dropdown by explicitly labeling it `System (Automated)`, helping administrators understand it filters for background/database-triggered events where no staff member was logged in.
  - Fixed duplicate "Email / Actor" values where the column previously printed identical labels (`admin` / `Admin`) instead of actual email credentials.
  - Enhanced [`getAuditLog`](web/src/features/audit/queries.ts) to resolve full staff email addresses (`admin@elvira.cafe`, `cashier@elvira.cafe`, or custom staff accounts) by cross-referencing audit payloads, `user` table records, and auth roles.
  - Updated [`AuditLogManager.tsx`](web/src/components/modules/audit/AuditLogManager.tsx) to render distinct, non-redundant rows: displaying the full email (e.g. `admin@elvira.cafe`) on line 1, and a clean human-readable role badge (`Administrator`, `Cashier`, or `Automated Task`) on line 2, as well as updating the event inspection modal.
  - Removed the redundant "Actions" column and per-row "View" buttons in the System Audit Log table per user request to simplify the view matching DCASIS; made rows directly clickable to inspect details.
  - Replaced the intimidating raw JSON dark code block in the audit event inspection modal with a clean, user-friendly key-value table matching DCASIS styling with friendly labels, dates, and currency formatting.
  - Standardized typography and spacing across the audit log table and inspection modal to standard `text-sm` base sizes and consistent padding, eliminating tiny, cramped fonts and mismatched colons.
- **Pixel-Accurate Loading Skeletons Per Module**:
  - Overhauled [`LoadingSkeleton.tsx`](web/src/components/loader/LoadingSkeleton.tsx) with custom, tailored loading skeletons matching the exact geometry of each module to eliminate layout shift:
    - **`StaffShellSkeleton`**: Added placeholder for breadcrumbs and DCASIS page title banner so page content does not jump vertically on load.
    - **`DashboardSkeleton`**: Styled welcome card with pine accent border + 4 metric tiles + sales trend & availability panels (`/admin`, `/dashboard`).
    - **`TodayProductsSkeleton`**: 4 stock cards + tab switcher bar + search/filter chips + stock monitoring table rows (`/today-products`).
    - **`AuditLogSkeleton`**: 4 overview cards + search and actor select bar + 5-column audit ledger table (`/admin/audit`).
    - **`ReportsSkeleton`**: Date presets & filter toolbar + 4 financial cards + tab bar + chart blocks (`/admin/reports`, `/daily-sales`).
    - **`MenuCatalogSkeleton`**: 4 catalog cards + search & availability filter bar + product table with thumbnails (`/admin/menu`).
    - **`UsersSkeleton`**: 4 staff KPI cards + 2-column split (Add Staff form card on left, Staff Roster table on right) (`/admin/users`).
    - **`CashierOperationsSkeleton`**: 4 operations KPI cards + tab bar + shifts and turnover ledger (`/admin/cashier-operations`, `/cashier-operations`, `/my-shift`, `/admin/shifts`, `/admin/cash-turnovers`, `/cash-turnover`).
    - **`FormSkeleton`**: Overhauled to match the authentic full-width 4-section DCASIS form architecture (General Information 1/3 instruction + 2/3 card, Product Photo upload box, Register Availability radio cards, Daily Stock Quota preset pills & input, and Cancel/Save buttons) (`/admin/menu/product/new`, `/admin/menu/product/[id]`).
    - **`SettingsSkeleton`**: Account profile info card + password card + display preferences card (`/admin/settings`, `/profile`).
    - **`ReceiptSkeleton`**: Centered thermal receipt card with header, dashed lines, and print button (`/pos/receipt/[id]`).
  - Standardized `StaffShellSkeleton` to support dynamic `headerActionCount` (defaulting to 1), perfectly matching routes with single header CTA buttons (`Back to Menu`, `+ Add Product`, `Print Report`).
  - Wired direct `DashboardSkeleton` imports in `web/src/app/admin/loading.tsx` and `web/src/app/dashboard/loading.tsx`.
- **POS Checkout Modal Streamlining & Expansion (`/pos`)**:
  - Upgraded shared [`Modal.tsx`](web/src/components/modal/Modal.tsx) with a responsive `size` variant prop (`'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'`, defaulting to `'md'` = `sm:max-w-md`), ensuring 100% backward compatibility with all dialogs across the system while allowing wide modals when required.
  - Expanded the checkout dialog ([`CheckoutDialog.tsx`](web/src/components/modules/pos/CheckoutDialog.tsx)) to `size="4xl"` (`sm:max-w-4xl`), resolving the cramped layout when processing orders with many items.
  - Implemented a clean, responsive 2-column layout on `md:` screens:
    - **Left Column** (`md:col-span-7`): Spacious, scrollable Order Items ledger (`max-h-[300px] md:max-h-[480px] overflow-y-auto pr-1.5`) with total item and unique line counters, product photo thumbnail, item title, unit price (`₱X.XX each`), line subtotal (`₱X.XX`), and interactive quantity stepper.
    - **Right Column** (`md:col-span-5`): Visual separator (`md:border-l md:border-border/70 md:pl-6`), payment breakdown card (Subtotal, Total Due), streamlined 3-column payment method selector (`Cash`, `GCash`, `Maya`), 1-tap quick cash denomination chips (`Exact`, `₱500`, `₱1,000`, etc.), change calculation, and checkout confirmation buttons.
  - **PayMongo QR Ph Online Payment Integration (`/pos`)**:
    - Implemented authentic **PayMongo QR Ph dynamic payment flow** in [`PaymongoQRModal.tsx`](web/src/components/modules/pos/PaymongoQRModal.tsx) and [`CheckoutDialog.tsx`](web/src/components/modules/pos/CheckoutDialog.tsx), enabling customer self-scanning via GCash, Maya, or any Philippine banking app without requiring manual reference entry.
    - Added dedicated Route Handlers:
      - `POST /api/pos/paymongo/create-qr`: Recomputes cart total on the server from database menu prices, creates PayMongo Payment Intent (`qrph`), attaches payment method, and returns dynamic QR Ph image URL.
      - `GET /api/pos/paymongo/status`: Polled every 2.5s by the frontend. When paid, atomically invokes `process_sale` RPC to record the sale, update stock quotas, and return transaction receipt ID idempotently.
      - `POST /api/pos/paymongo/cancel`: Cancels pending payment intent and unlocks the register.
      - `POST /api/pos/paymongo/simulate-pay`: Sandbox testing endpoint to simulate instant customer payment.
      - `POST /api/webhooks/paymongo`: Secure webhook endpoint with `paymongo-signature` HMAC verification, handling `payment.paid`, `qrph.expired`, and `payment.failed`.
    - Integrated **High-Fidelity Sandbox Simulator**: When `PAYMONGO_SECRET_KEY` is not yet configured, the system automatically runs in demo mode with a crisp QR Ph badge, live 15-minute countdown timer (`⏱ MM:SS`), and a 1-click "Simulate Customer Scan & Pay (Test)" button for immediate POS testing.
    - Provided **Manager Manual Override**: Cashiers can click "Switch to Manual Reference (Manager Override)" anytime if a customer prefers manual GCash/Maya transfer.
    - **Automated PayMongo Receipt & Status Polish (`/pos/receipt/[id]`)**:
      - Automatically sets PayMongo QR Ph transactions to `verified` and `Paid` upon order completion (via server-side verification and `getReceipt` auto-reconciliation).
      - Replaced misleading "Payment Evidence Submitted" header and "Pending Verification" status with "Payment Successful" and "Paid".
      - Replaced photo evidence prompts and review actions ("View Payment Evidence", "Verify Payment", "Reject Payment") with a clean "✓ Verified via PayMongo QR Ph" badge and monospace PayMongo reference (`pay_...`).
      - Preserved the manual manager verification workflow strictly for manual override transactions.
      - **POS Thermal Receipt Print Optimization**:
        - Formatted receipt printing specifically for POS thermal rolls (80mm/58mm) and standard slip printers with `.pos-receipt-print`.
        - Removed full-screen grey background, oversized margins, navigation links, and screen buttons during printing.
        - Injected print-only store header ("CAFE ELVIRA · Official Sales Receipt") and footer ("Thank you for your visit! · Please come again").
        - Forced monochrome black text and dashed dividers for sharp, legible thermal printing.
    - **Authentic DCASIS Athlete Form Architecture (`/admin/menu/product/new` & `/admin/menu/product/[id]`)**:
      - Rebuilt [`ProductForm.tsx`](web/src/components/modules/menu/ProductForm.tsx) to exactly mirror the user's authentic DCASIS athlete form architecture (`4QDH.vue` / Tailwind UI stacked form):
        - Full-width container (`fullWidth={true}` on `StaffShell` in `/admin/menu/product/new` and `/admin/menu/product/[id]`) expanding across the screen without artificial `max-w-7xl` or `max-w-md` constraints.
        - Horizontal divider lines (`divide-y divide-gray-900/10`) applied directly to the `<form>` element separating every major section.
        - Stripped rogue `dark:` utility classes (`dark:bg-[#1c251e]`, `dark:text-gray-100`, etc.) that were triggered by system-level dark mode preferences, ensuring cards render clean white with high-contrast text matching the DCASIS template.
        - Each section formatted in a 3-column responsive grid (`grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3`):
          - **Left Column (1/3 width, `px-4 sm:px-0`)**: Section title (`text-base font-semibold leading-7 text-gray-900`) and detailed instructions / description (`text-sm leading-6 text-gray-600`).
          - **Right Column (2/3 width, `bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2 px-4 py-6 sm:p-8`)**: Elevated white card container holding the interactive form fields in a 2-column subgrid.
        - **Section 1: General Information**: Product name (`sm:col-span-2`), menu category dropdown with right-aligned "Add new category" trigger link and creation modal directly modeled after the authentic DCASIS athlete modal flow (`C3A1.vue`), dynamic instant selection without page reload, and selling price with `₱` input adornment.
        - **Section 2: Product Photo**: Square preview container, "Select photo" / "Change photo" file trigger, "Remove" button, upload progress overlay, and format guidelines.
        - **Section 3: Register Availability**: DCASIS segmented toggle buttons (`Active on POS` with emerald ring/dot vs `Hidden from POS` with slate dot) and explanation.
        - **Section 4: Daily Production Quota**: Quick-preset quota pills (`Unlimited`, `10`, `25`, `50`, `100 units`), custom daily quota numeric input, and POS inventory decrementation rule callout.
        - **Footer Actions**: Right-aligned Cancel and Submit (`Submit` / `Save Changes`) buttons, with left-aligned `Delete Product` confirmation dialog when editing.
- **Unified DCASIS Header & Breadcrumb Banner (System-Wide)**:
  - Replaced the boxed card banners across `/admin/menu`, `/today-products`, and module views with the authentic DCASIS page header design directly modeled after `sports-client`.
  - Built a shared `Breadcrumbs` component (`web/src/components/common/Breadcrumbs.tsx`) matching `sports-client/components/breadcrumbs/index.vue` with `HomeIcon` (`/dashboard` or `/admin`), `ChevronRightIcon`, and bold current route state.
  - Upgraded `StaffShell` (`web/src/components/layout/staff-shell.tsx`) to natively render the DCASIS header banner (breadcrumbs, `text-3xl font-bold text-pine` page title, optional subtitle, and right-aligned action buttons), automatically standardizing headers across all POS modules (`/admin/menu`, `/today-products`, `/pos`, `/daily-sales`, `/admin/reports`, `/cashier-operations`, `/admin/cashier-operations`, `/admin/users`, `/admin/audit`, `/admin/settings`, `/profile`, `/admin/menu/product/new`, and `/admin/menu/product/[id]`).
  - Removed duplicate page headings between `StaffShell` and feature components for a clean, non-AI layout.
- **Top-Right User Profile & DCASIS Dropdown Menu**:
  - Moved the user account block from the bottom of the sidebar to the top-right header bar across all desktop and mobile views in [`staff-shell.tsx`](web/src/components/layout/staff-shell.tsx).
  - Redesigned the account control to match the DCASIS sports client (`sports-client/layouts/main.vue`): the top-right header displays an interactive user pill with avatar initials, email, role badge, and `ChevronDownIcon`.
  - Replaced the standalone sign-out button with an animated profile dropdown menu containing **Settings** (`Cog6ToothIcon`) linking to `/profile` and **Sign out** (`ArrowRightOnRectangleIcon`) with click-outside and Escape key dismissal.
  - Removed the redundant "Dashboard" button from the top right of the Point of Sale screen ([`pos/page.tsx`](web/src/app/pos/page.tsx)), keeping navigation unified via the primary sidebar.
  - Updated [`SidebarSkeleton`](web/src/components/loader/LoadingSkeleton.tsx) and [`StaffShellSkeleton`](web/src/components/loader/LoadingSkeleton.tsx) to align with the top-right user profile header layout for seamless loading feedback.
- **Menu & Catalog Management Redesign (`/admin/menu`)**:
  - Expanded layout to full width (`fullWidth={true}` in `StaffShell`) to eliminate the narrow mobile column on desktop and provide a unified dashboard feel.
  - Implemented authentic DCASIS breadcrumbs and header banner with quick action button ("+ Add Product"). Category management was streamlined and moved directly inside the product form's category creator modal.
  - Added 4 real-time KPI overview cards: Total Catalog count, Active on POS, Hidden Products, and Category groupings.
  - Built an interactive search and filter bar with real-time text query, category pills with count badges, availability filter chips (All / Available / Hidden), and a View Switcher (Table View vs Card Grid View).
  - Designed an intuitive, clean **Table View** showing actual product image thumbnails, category tags, price tags, POS availability status badges, daily quota limits, and a full action trio: **View** (`EyeIcon`), **Edit** (`PencilSquareIcon`), and **Delete** (`TrashIcon`).
  - Added **Interactive Column Sorting** to the table header (`Product`, `Category`, `Price`, `Status`, `Today's Quota`) with directional chevrons (`ChevronUpIcon`, `ChevronDownIcon`, `ChevronUpDownIcon`), allowing one-click ascending and descending sort toggles across all fields.
  - Added an alternative **Card Grid View** with matching quick actions: View details, Edit product, and Delete.
  - Implemented a dedicated **View Product Details Modal** displaying full-resolution photo preview, pricing, category tag, POS availability status, and inventory metrics (Today's quota, units sold today, and units remaining).
  - Implemented a safe **Delete Product Confirmation Modal** verifying product removal, warning about sales record preservation, and dispatching DCASIS toast alerts on success/failure.
  - Replaced murky green backdrop overlay (`bg-pine-deep/50`) across modals and drawers with a clean, neutral frosted blur (`bg-black/40 backdrop-blur-sm`).
- **Authentic DCASIS Settings Architecture (`/admin/settings`)**:
  - Restructured `/admin/settings` to mirror the authentic full-width DCASIS form architecture:
    - Enabled `fullWidth={true}` and standard DCASIS breadcrumbs (`Home` > `Settings`) on `StaffShell`.
    - Implemented horizontal divider lines (`divide-y divide-gray-900/10`) separating every configuration domain.
    - Standardized 3-column responsive layout (`grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3`):
      - **Left Column (1/3 width, `px-4 sm:px-0`)**: Category title (`text-base font-semibold leading-7 text-gray-900`) and instructional description (`text-sm leading-6 text-gray-600`).
      - **Right Column (2/3 width, `bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2 px-4 py-6 sm:p-8`)**: Elevated white card container.
    - **Section 1: Personal Information**: Displays signed-in administrative email with helper explanation, full-access Administrator role indicator with green status dot, and a dedicated staff directory shortcut card navigating to `/admin/users`.
    - **Section 2: Security & Password**: Standardized `PasswordSection` with `h-11 py-2.5 px-3` inputs, required labels, pine focus rings, client-side mismatch validation, and instant feedback alerts.
    - **Section 3: Preferences & Interface Theme**: Standardized `PreferencesPanel` with sleek DCASIS switch toggles for POS alerts (order notifications and low-stock quota alerts) and pine appearance radio tiles (`light`, `dark`, `system`). Cleaned up placeholder language dropdown.
  - Updated `SettingsSkeleton` to accurately mirror the 3-section layout geometry with `fullWidth={true}`.
- **Rendering & Click Performance Optimizations (System-Wide)**:
  - **Eliminated Sequential Query Waterfalls**: Replaced sequential `await requireRole()` / `await requireStaff()` blocking calls with concurrent `Promise.all()` data fetching across all server-rendered routes:
    - Admin Dashboard (`/admin`), Menu Management (`/admin/menu`), Reports (`/admin/reports`), User Management (`/admin/users`), System Audit Log (`/admin/audit`), Cashier Operations (`/admin/cashier-operations`), Today's Products (`/today-products`), POS (`/pos`), Cashier Dashboard (`/dashboard`), Daily Sales (`/daily-sales`), Edit Product (`/admin/menu/product/[id]`), and Add Product (`/admin/menu/product/new`).
    - Eliminates extra sequential network round trips to the remote Supabase cloud, cutting initial server response latency in half.
  - **Reactive Active Tab & Route Hierarchy Matching**:
    - Built [`isRouteActive`](web/src/components/layout/staff-shell.tsx) to resolve active navigation states across root routes, nested sub-routes, and related sections:
      - Sub-routes (e.g. `/admin/menu/product/new`, `/admin/menu/product/[id]`) correctly preserve active highlight on **Menu Management**.
      - POS receipt pages (`/pos/receipt/[id]`) preserve active highlight on **Point of Sale**.
      - Shift and turnover pages (`/admin/shifts`, `/admin/cash-turnovers`, `/my-shift`, `/cash-turnover`) preserve active highlight on **Cashier Operations**.
    - Implemented optimistic, zero-latency reactive active tab switching (`currentPath = navigatingHref ?? pathname`): the active green tab pill (`bg-pine text-surface shadow-xs`) instantly switches to the clicked item on click with zero delay, accompanied by an animated loading dot and the top progress bar.
    - Added `prefetch={true}` on all sidebar navigation links.
    - Implemented render-time state adjustment on pathname change in [`staff-shell.tsx`](web/src/components/layout/staff-shell.tsx) following React 19 standards.
- **Reports & Sales Analytics Redesign (`/admin/reports`)**:
  - Expanded layout to full width (`fullWidth={true}` in `StaffShell`) with DCASIS breadcrumbs (`Home` > `Reports & Analytics`) and header title banner.
  - Added a dedicated "Print Summary" header action with `PrinterIcon` triggering the browser print engine for clean sales reporting.
  - Built an intuitive date preset selector (Today, Last 7 Days, Last 30 Days, All Time) and collapsible advanced filter toolbar (From Date, To Date, Search Transaction/Ref, Cashier, Payment Method, Payment Status) with one-click reset and apply buttons.
  - Upgraded KPI summary cards into 4 distinct, modern metric tiles: **Net Sales Revenue** (with highlighted pine accent), **Gross Sales** (with Cash and Online revenue breakdown), **Completed Orders** (with average order value), and **Voided Transactions** (with alert indicator).
  - Modernized the analytics section:
    - Built an interactive **Daily Sales Trend** bar chart with hover tooltips displaying revenue and order count for each day, high/low limits, and Manila date labels.
    - Added a **Payment Methods Distribution** card displaying Cash, GCash, and Maya channels with visual percentage progress bars, order counts, and total revenue.
    - Designed a ranked **Top Selling Products Leaderboard** showing top items (#1, #2, #3 badges), quantities sold with proportional progress bars, and total revenue.
  - Completely overhauled the transaction review table into a feature-rich **TransactionReviewTable**:
    - Dual View Switcher: **Receipts Ledger** (transaction records) vs **Items Sold** (individual line items).
    - Real-time client-side search query across transaction numbers, cashier names, references, and item descriptions.
    - Active status filter chips (All / Active / Voided).
    - Interactive column sorting on Transaction #, Date & Time, Cashier, and Total Amount with directional chevron indicators (`ChevronUpIcon`, `ChevronDownIcon`, `ChevronUpDownIcon`).
    - Clear table columns with Manila timestamps, cashier avatar initials, item summaries, payment mode and status badges, formatted amounts, and completion status.
    - Replaced ugly browser `window.prompt()` for voiding sales with a modern, high-quality **Void Confirmation Modal** (`Modal` with frosted blur `backdrop-blur-sm bg-black/40`, irreversible action warning, transaction summary, required reason input, and DCASIS toast alerts `warningAlert`/`errorAlert`).
  - Added **Tabbed Reports Navigation (`ReportsViewManager`)**:
    - Created a clean DCASIS-styled navigation tab bar below the overview KPI metrics for effortless switching between sections:
      - **Daily Sales Trend** (`ChartBarSquareIcon`): Renders the interactive daily sales bar chart and payment channel distribution side-by-side.
      - **Top Selling Products** (`ShoppingBagIcon` with ranked items count badge): Renders the ranked leaderboard of top-selling items full-width.
      - **Receipts Ledger** (`DocumentTextIcon` with transaction count badge): Renders the transaction review table and sold items breakdown.
      - **View All** (`Squares2X2Icon`): Allows viewing all sections stacked in one view when needed.
    - Added smart default tab selection: automatically activates **Receipts Ledger** if transaction search or filter parameters (`search`, `cashier`, `paymentMode`, `paymentStatus`) are in the URL; defaults to **Daily Sales Trend** otherwise.
    - Refactored `ReportsCharts.tsx` with a flexible `view` prop (`'all' | 'trends' | 'top_products'`) for dedicated single-section display and seamless responsive layouts.
- **Cashier Operations Redesign (`/admin/cashier-operations`)**:
  - Expanded layout to full width (`fullWidth={true}` in `StaffShell`) with DCASIS breadcrumbs (`Home` > `Cashier Operations`) and header title banner.
  - Added 4 real-time KPI overview cards: **Active Registers** (with live active pulse), **Pending Turnovers** (with amber attention pill for required manager action), **Turnover Cash Handed** (total physical cash submitted), and **Discrepant Turnovers** (count of short/over cash differences).
  - Built a unified **AdminCashierOperationsManager** component featuring a seamless Dual Tab Switcher:
    - **Cash Turnover Review**: Dedicated verification view with status filters (All / Pending / Verified / Flagged), search query input, and interactive sorting on Cashier, Submitted Time, Counted Cash, Variance, and Status.
    - **Cashier Shifts History**: Register shift records with status filters (All / Active Shifts / Closed), search query input, and interactive sorting on Cashier, Duration, Starting Cash, and Status.
  - Enhanced Variance calculation with intuitive visual indicators: "Balanced" (emerald badge), "-₱XX.XX Short" (red badge), and "+₱XX.XX Over" (amber badge).
  - Completely removed ugly browser `window.prompt()` for flagging turnovers across `AdminCashierOperationsManager` and `TurnoverList`. Replaced with a modern, high-quality **Flag Turnover Discrepancy Modal** (`Modal` with frosted blur `backdrop-blur-sm bg-black/40`, audit alert banner, cashier & variance breakdown, required note input, and DCASIS toast alerts `warningAlert`/`errorAlert`).
- **Global Toast Alert System (Aligned with Sports System)**:
  - Designed and created a reactive, global toast notification system in `web/src/components/toast/` (`ToastContainer.tsx`, `ToastContext.tsx`, and `index.ts`).
  - Implemented the `useAlert()` hook matching the reference sport client interface (`successAlert(title, message)`, `errorAlert(title, message)`, `warningAlert(title, message)`, and `infoAlert(title, message)`).
  - Copied the exact DCASIS toast design from `sports-client` (`@kyvg/vue3-notification`): solid color background (`#68cd86` success, `#e54d42` error, `#ffb648` warn, `#44a4fc` info), solid 5px darker left border stripe, white typography, compact 10px padding, no artificial AI card styles/icons, and tap/click-to-dismiss.
  - Mounted `<ToastProvider>` in root layout (`web/src/app/layout.tsx`) with auto-dismiss timers (default 3.5s) and max-queue handling.
  - Integrated alerts across all major application processes:
    - **Stock Quotas (`/today-products`)**: Toast alerts for modal quota updates (Today's quota / Default quota) and quick stepper adjustments (`±1`, `+5`).
    - **POS Register (`/pos`)**: Toast alerts on cart clear and transaction completion.
    - **Checkout Modal**: Toast alerts on transaction submission failure.
    - **Product Catalog (`/admin/menu/product/*`)**: Toast alerts on product creation, updates, deletions, and photo upload.
    - **Category Management (`/admin/menu`)**: Toast alerts on category addition and removal.
    - **Cashier Shifts & Turnovers (`/cashier-operations`, `/admin/cashier-operations`)**: Toast alerts on shift opening, turnover submissions, and admin verification/flagging.
    - **Security & Profile (`/admin/settings`, `/profile`)**: Toast alerts on password change, validation mismatch, and updates.
    - **Staff Management (`/admin/users`)**: Toast alerts on staff user creation and status toggling (activate/deactivate).
- **DCASIS Component Sizing & Box Alignment (System-Wide)**:
  - Completely aligned all containers, cards, boxes, input fields, selects, buttons, and page paddings with the reference DCASIS application (`sports-client`).
  - Standardized all form inputs and textareas to `h-10 rounded-md border border-border bg-white px-3 py-2 text-sm` with crisp pine focus outline and `text-xs font-semibold text-foreground mb-1` labels, completely eliminating oversized legacy "v2 mobile pill" inputs (`h-[52px] rounded-2xl bg-mist`).
  - Standardized standard action buttons to `rounded-md font-semibold text-sm` (`h-8` sm, `h-10` md, `h-11` lg), eliminating bubbly `rounded-full` form action buttons.
  - Standardized Select triggers to `h-10 rounded-md border border-border bg-white px-3 text-sm focus:border-pine focus:outline-pine` with `rounded-md border border-border bg-surface p-1 shadow-md` popover menus.
  - Aligned Menu Category select in `ProductForm.tsx` to match the DCASIS system input/select padding (`py-2.5 pl-3 pr-10`) and height (`h-[44px]`) with `appearance-none`, pine focus ring, and clean SVG `ChevronDownIcon` replacing squished Linux browser GTK controls.
  - Standardized cards and content boxes to `rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm` across all modules.
  - Standardized primary shell page padding in `StaffShell` (`web/src/components/layout/staff-shell.tsx`) and `StaffShellSkeleton` (`web/src/components/loader/LoadingSkeleton.tsx`) to `py-8 sm:py-10 px-4 sm:px-6 lg:px-8` matching DCASIS `layouts/main.vue`.
  - Updated all feature forms, dialogs, and controls across the application:
    - **Menu Management**: `ProductForm.tsx` (name, category, price, quota, image upload inputs and buttons).
    - **Account & Security**: `PasswordSection.tsx`, `PreferencesPanel.tsx`, `ProfilePage` (`/profile`), and `AdminSettingsPage` (`/admin/settings`).
    - **Staff & User Management (`/admin/users`)**:
      - Upgraded `StaffShell` with `fullWidth={true}`, DCASIS breadcrumbs (`Home` > `User Management`), title banner, and subtitle.
      - Added 4 real-time KPI overview cards: Total Staff, Active Cashiers, Administrators, and Disabled Accounts (`rounded-xl border border-border bg-surface p-5 shadow-sm`).
      - Restructured into a clean 2-column DCASIS layout: Left column contains the "Add New Staff" form card (`rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm`) with standardized `h-10 rounded-md` inputs, select, and submit button; Right column contains the "Staff Directory" (`rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm`) with real-time email search input (`h-10 rounded-md`), clean filter chips (`All`, `Cashiers`, `Admins`, `Active`, `Disabled`), user avatar initials, role and status badges, standardized `h-8 rounded-md` action buttons, and an interactive **Edit Staff Account Modal** (`Modal`) with status and role management.
    - **POS Checkout & Receipts**: `CheckoutDialog.tsx` (cash received input, discard and submit buttons), `ReceiptPage` & `PrintButton` (`/pos/receipt/[id]`).
    - **Authentication**: `LoginPage` (`/login`) (email, password inputs, submit button).
    - **Cashier Operations**: `AdminCashierOperationsManager.tsx` (KPI metric cards, container, search inputs, status filters, and flag discrepancy modal), `ShiftPanel.tsx`, and `TurnoverList.tsx`.
    - **Reports & Analytics**: `PrintReportButton.tsx` (standardized to `h-10 rounded-md border border-border bg-surface px-3.5 text-sm font-semibold`), `ReportsFilterBar.tsx` (Date presets pills standardized to `rounded-md p-1` container with `rounded px-3 py-1.5 text-sm font-semibold` items, More Filters button standardized to `h-10 rounded-md px-3.5 text-sm font-semibold`), advanced filter inputs, selects, and `TransactionReviewTable.tsx` (search inputs, status filters, void confirmation modal).
    - **Menu Management**: `MenuManager.tsx` (Add Product action button standardized to `h-10 rounded-md font-semibold text-sm`; removed redundant Manage Categories button and modal as category creation is handled directly inside the Add Product page, category filter pills standardized to `rounded-md px-3.5 py-2 text-sm font-semibold`, card/table view action buttons standardized to `h-8 rounded-md font-semibold text-xs`).
    - **Header Actions Across Pages**: `today-products/page.tsx`, `admin/menu/product/new/page.tsx`, `admin/menu/product/[id]/page.tsx`, `admin/page.tsx`, and `dashboard/page.tsx` (Open Register, Menu Items, Back to Menu buttons standardized to `h-10 rounded-md font-semibold text-sm`).
    - **Stock Quotas & Quick Filters (`/today-products`)**:
      - Streamlined quick filter chips (`All Products`, `In Stock`, `Low Stock`, `Sold Out`, `Unlimited`) to clean neutral and brand-aligned styling without excessive colors or dots:
        `action-focus inline-flex items-center gap-2 rounded-md border px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer`
        with standard active state (`border-pine bg-pine text-surface shadow-xs`) and neutral inactive state (`border-border/80 bg-white text-foreground hover:bg-mist`).
      - Standardized table quick-step adjustment buttons (`-1`, `+1`, `+5`) and "Set Quota" buttons to `h-8 rounded-md font-semibold text-xs`.
      - Standardized card view steppers and custom quota buttons to `h-8 rounded-md`.
    - **POS Grid & Cart**: `MenuGrid.tsx` (search bar, view toggle, reset filter, category buttons standardized to `h-10 rounded-md`), `CartPanel.tsx` (Charge Order CTA button standardized to `rounded-xl shadow-sm`).
- **System Audit Log Redesign (`/admin/audit`)**:
  - Expanded layout to full width (`fullWidth={true}` in `StaffShell`) with DCASIS breadcrumbs (`Home` > `Audit Log`), title banner, and subtitle.
  - Added dedicated route loading skeleton (`web/src/app/admin/audit/loading.tsx`).
  - Added 4 real-time KPI overview cards: **Total Events**, **Stock Adjustments**, **Cashier Operations**, and **Sales & Voids** (`rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm`).
  - Updated [`getAuditLog()`](web/src/features/audit/queries.ts) to resolve `actor_id` directly against the `user` table to surface actor emails (`actor_email`).
  - Built simplified, clean DCASIS **AuditLogManager** (`web/src/components/modules/audit/AuditLogManager.tsx`):
    - Removed excessive colorful rainbow badges, dots, and busy multi-tier buttons in favor of clean neutral DCASIS styling.
    - Added dedicated **Email / Actor** column displaying the email of the person who executed the action (`admin@elvira.cafe`, `cashier@elvira.cafe`, or `System`) alongside their role.
    - Simple and clean filter bar with search input (searching email, event, entity, or details) and category/actor select dropdowns.
    - Clean table with sortable columns (`Date & Time`, `Email / Actor`, `Event`, `Target`), concise details preview, and standardized "View" action button (`h-8 rounded-md`).
    - Pagination controls with customizable page slices.
    - Interactive **Audit Event Details Modal** (`Modal`) displaying metadata and payload JSON inspector.
- **Verification**:
  - `npm run typecheck`: Passed with 0 errors.
  - `npm run lint`: Passed with 0 warnings and 0 errors.
  - `npm run format:check`: Passed cleanly with Prettier code style.
  - `npm test`: 51/51 tests passing across 11 test suites.
  - `npm run build`: Production build succeeded across all 24 Next.js routes.

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

## Setup and structural alignment with `sports-client` (2026-10-17)

- Installed root and web dependencies (`npm install` and `npm --prefix web install`).
- Set up local environment config (`web/.env.local`).
- Aligned shared UI component directory structure with `sports-client` conventions:
  - Created dedicated category modules under `web/src/components/`:
    - `components/form/`: `Button`, `Field`, `PasswordField`, `QtyStepper`, `Select`
    - `components/modal/`: `Modal`
    - `components/loader/`: `LoadingSkeleton` (CardsSkeleton, ListSkeleton, FormSkeleton)
    - `components/error/`: `EmptyState`
    - `components/layout/`: `staff-shell`
    - `components/common/`: `Avatar`, `Card`, `IconTile`, `SectionLabel`, `icons`
  - Created barrel index exports (`components/index.ts`, `components/form/index.ts`, `components/modal/index.ts`, etc.).
  - Preserved backward-compatible forwarder re-exports at original paths (`components/common/`, `components/ui/select/`, `components/layout/modal/`).
  - Updated all internal import paths across `web/src/` to categorized component locations.
- Code cleanup & verification:
  - Ensured zero unused locals and parameters.
  - Prettier formatted all changed files; `npm run format:check` clean.
  - `npm run typecheck` passed without errors.
  - `npm run lint` passed with zero warnings or errors.
  - `npm test` 51/51 unit tests passed across 11 test suites.
  - `npm run build` completed successfully across all 24 Next.js routes.

## Component consolidation to `components/modules/` and cleanup of unused markdown/folders (2026-10-17)

- Removed unused markdown documentation and configuration:
  - Removed `playbooks/` (35 generic playbook files) and `RULES.md`.
  - Removed `docs/` (`docs/README.md`, `docs/database.md`).
  - Removed legacy `.claude/` folder and `CLAUDE.md` / `web/CLAUDE.md`.
  - Removed deprecated `web/src/components/ui` and `web/src/components/layout/modal`.
- Consolidated all feature components into `web/src/components/modules/` matching `sports-client` pattern:
  - `components/modules/auth/` (`LoginHero`)
  - `components/modules/menu/` (`MenuManager`, `ProductForm`)
  - `components/modules/pos/` (`CartPanel`, `CartToast`, `CheckoutDialog`, `MenuGrid`, `PaymentEvidenceActions`, `PaymentEvidenceCapture`, `PosScreen`)
  - `components/modules/quotas/` (`ProductQuotaList`)
  - `components/modules/reports/` (`SalesChart`, `VoidButton`)
  - `components/modules/settings/` (`PasswordSection`, `PreferencesPanel`, `PreferencesProvider`)
  - `components/modules/shifts/` (`ShiftHistoryList`, `ShiftPanel`, `TurnoverList`)
  - `components/modules/users/` (`UsersManager`)
  - Added module index barrel exports and updated `components/index.ts`.
- Removed old `features/*/components/` directories.
- Updated all import paths across `web/src/app` and components to `@/components/modules/*`.
- Full quality verification passed:
  - `npm run typecheck`: passed.
  - `npm run lint`: passed (0 warnings, 0 errors).
  - `npm run format:check`: passed (all files match Prettier style).
  - `npm test`: 51/51 tests passed.
  - `npm run build`: passed (24 routes).

## Modern Tailwind CSS Redesign for POS (2026-10-17)

- Redesigned POS MenuGrid ([`MenuGrid.tsx`](file:///home/john/Projects/pos-web/web/src/components/modules/pos/MenuGrid.tsx)):
  - Converted stretched single-column list to a modern, responsive, touch-friendly product card grid (`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4`).
  - Added an instant Grid vs List view toggle with icons in [`icons.tsx`](file:///home/john/Projects/pos-web/web/src/components/common/icons.tsx).
  - Added category item count pills (`All (14)`, `Category (X)`) and eliminated ugly browser scrollbars with clean horizontal pill scrolling.
  - Redesigned menu cards with elevated visual headers, hover lift (`group-hover:scale-105`), floating stock badges (`Sold out`, `Only X left`, `X remaining`), active in-cart quantity badges (`✓ X`), bold price typography, and an interactive stepper/add button.
  - Refined the search bar with inline clear action and reset filters badge.
- Redesigned POS Order Sidebar ([`CartPanel.tsx`](file:///home/john/Projects/pos-web/web/src/components/modules/pos/CartPanel.tsx)):
  - Structured as a dedicated, sticky POS checkout sidebar (`lg:sticky lg:top-4`).
  - Added order header with total item count badge and a quick "Clear" order action.
  - Added scrollable order item list with item calculations, compact stepper controls, and clean remove action.
  - Added order summary breakdown (Subtotal, Total).
  - Replaced bulky bottom pill with a high-contrast, tactile "Charge Order" CTA button with clear total amount.
- Layout & Appearance Updates:
  - Enabled full-width mode for POS screens by adding `fullWidth` prop to `StaffShell` and expanding grid columns up to `2xl:grid-cols-5`.
  - Replaced category scroll clipping with responsive `flex-wrap` layout beneath the search bar.
  - Changed default appearance preference from `'system'` to `'light'` (white theme) across [`preferences.ts`](file:///home/john/Projects/pos-web/web/src/features/settings/preferences.ts) and [`layout.tsx`](file:///home/john/Projects/pos-web/web/src/app/layout.tsx).
  - Modernized skeleton loading across the app ([`LoadingSkeleton.tsx`](file:///home/john/Projects/pos-web/web/src/components/loader/LoadingSkeleton.tsx)):
    - Added dedicated `PosSkeleton` mirroring 1:1 the POS layout (search bar, wrapped category pills, responsive product card grid, and sticky order summary).
    - Updated `CardsSkeleton`, `ListSkeleton`, and `FormSkeleton` to use modern `rounded-2xl`, subtle `bg-mist`, and clean card borders with zero layout shift.
    - Updated `pos/loading.tsx` and `admin/loading.tsx` to use the unified modern skeletons.
  - Redesigned staff navigation as a modern Tailwind CSS Dashboard Sidebar ([`staff-shell.tsx`](file:///home/john/Projects/pos-web/web/src/components/layout/staff-shell.tsx)):
    - Created pure SVG Heroicons v2 outline suite in [`hero-icons.tsx`](file:///home/john/Projects/pos-web/web/src/components/common/hero-icons.tsx) (`Squares2X2Icon`, `ShoppingCartIcon`, `BookOpenIcon`, `CalendarDaysIcon`, `ChartBarSquareIcon`, `BanknotesIcon`, `UsersIcon`, `ClipboardDocumentCheckIcon`, `Cog6ToothIcon`, `ArrowRightOnRectangleIcon`, `Bars3Icon`, `XMarkIcon`).
    - Fixed sidebar width to `w-64` with clean brand header, role badges, section titles, rounded-xl active/hover states, user account card, and tactile sign-out action.
  - Standardized typography across the entire codebase:
    - Replaced all non-standard arbitrary font sizes (`text-[15px]`, `text-[11px]`, `text-[10px]`, `text-[30px]`, `text-[27px]`) with standard Tailwind utilities (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`).
    - Aligned font weights with standard semantic tokens (`font-medium`, `font-semibold`, `font-bold`, `font-extrabold`).
- Verification passed:
  - `npm run typecheck`: passed (0 errors).
  - `npm run lint`: passed (0 warnings, 0 errors).
  - `npm run format:check`: passed (clean).
  - `npm test`: passed (51/51 tests).
  - `npm run build`: passed (24/24 routes).

## Prior milestones

- 2026-09-22: Converted the repository to web-only and removed Expo at the owner's request.
- 2026-09-30: Resumed the DEV Supabase project and restored the documented Admin and Cashier accounts.
- 2026-10-01: Added shifts, cash turnover, audit records, and the first daily-quota implementation.
- 2026-10-02: Replaced the temporary ingredient architecture with the approved production-quota-only design.
