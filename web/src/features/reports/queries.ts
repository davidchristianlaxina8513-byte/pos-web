import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';
import { parsePaymentMode, parsePaymentStatus } from '@/features/pos/checkout';
import {
  activeSales,
  aggregateTopProducts,
  buildDaySales,
  buildReceiptLedger,
  summarizeSales,
  type DaySales,
  type LedgerItem,
  type LedgerTransaction,
  type ReceiptLedger,
  type ReportRange,
  type SaleRow,
  type SalesSummary,
  type TopProduct,
} from './aggregate';

interface TxnDbRow {
  id: unknown;
  date: unknown;
  total_amount: unknown;
  payment_mode: unknown;
  status: unknown;
}

function toSaleRow(row: TxnDbRow): SaleRow | null {
  const mode = parsePaymentMode(row.payment_mode);
  const total = Number(row.total_amount);
  if (typeof row.date !== 'string' || !Number.isFinite(total) || !mode) {
    return null;
  }
  return {
    date: row.date,
    total_amount: total,
    payment_mode: mode,
    status: typeof row.status === 'string' ? row.status : null,
  };
}

async function fetchSales(): Promise<{ ids: string[]; rows: SaleRow[] }> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('id, date, total_amount, payment_mode, status')
    .order('date', { ascending: false });
  if (error) throw error;
  const ids: string[] = [];
  const rows: SaleRow[] = [];
  for (const row of (data ?? []) as TxnDbRow[]) {
    const sale = toSaleRow(row);
    if (!sale) continue;
    rows.push(sale);
    if (typeof row.id === 'string') ids.push(row.id);
  }
  return { ids, rows };
}

function inRange(rows: SaleRow[], range: ReportRange): SaleRow[] {
  if (!range.from && !range.to) return rows;
  return rows.filter((row) => {
    const time = new Date(row.date).getTime();
    if (range.from && time < range.from.getTime()) return false;
    if (range.to && time >= range.to.getTime()) return false;
    return true;
  });
}

export interface DashboardData {
  revenue: number;
  orders: number;
  weekly: DaySales[];
  topProducts: TopProduct[];
}

/** Dashboard metrics: all-time revenue/orders, 7-day chart, and top 5. */
export async function getDashboard(
  now: Date = new Date(),
): Promise<DashboardData> {
  await requireRole('admin');
  const supabase = await createClient();
  const [{ rows }, itemsRes, productsRes] = await Promise.all([
    fetchSales(),
    supabase.from('transaction_items').select('product_id, quantity, subtotal'),
    supabase.from('product').select('product_id, name'),
  ]);
  const active = activeSales(rows);
  const summary = summarizeSales(active);
  const { data: itemsData } = itemsRes;
  const { data: productsData } = productsRes;
  const names = new Map<number, string>();
  for (const row of (productsData ?? []) as {
    product_id: unknown;
    name: unknown;
  }[]) {
    if (typeof row.product_id === 'number' && typeof row.name === 'string') {
      names.set(row.product_id, row.name);
    }
  }
  const soldItems = (
    (itemsData ?? []) as {
      product_id: unknown;
      quantity: unknown;
      subtotal: unknown;
    }[]
  ).flatMap((row) =>
    typeof row.product_id === 'number' &&
    Number.isFinite(Number(row.quantity)) &&
    Number.isFinite(Number(row.subtotal))
      ? [
          {
            product_id: row.product_id,
            quantity: Number(row.quantity),
            subtotal: Number(row.subtotal),
          },
        ]
      : [],
  );
  return {
    revenue: summary.revenue,
    orders: summary.orders,
    weekly: buildDaySales(active, 7, now),
    topProducts: aggregateTopProducts(soldItems, names, 5),
  };
}

export interface SalesReport {
  summary: SalesSummary;
  grossRevenue: number;
  voidedRevenue: number;
  netRevenue: number;
  daily: DaySales[];
}

/** Filtered sales summary + daily buckets (capped at 31 days of buckets). */
export async function getSalesReport(range: ReportRange): Promise<SalesReport> {
  const { rows } = await fetchSales();
  const ranged = inRange(rows, range);
  const active = activeSales(ranged);
  const grossRevenue = ranged.reduce((sum, row) => sum + row.total_amount, 0);
  const voidedRevenue = ranged
    .filter((row) => row.status === 'voided')
    .reduce((sum, row) => sum + row.total_amount, 0);
  const spanDays =
    range.from && range.to
      ? Math.max(
          1,
          Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000),
        )
      : 31;
  const end = range.to ?? new Date();
  return {
    summary: summarizeSales(active),
    grossRevenue,
    voidedRevenue,
    netRevenue: grossRevenue - voidedRevenue,
    daily: buildDaySales(active, Math.min(spanDays, 31), end),
  };
}

/** Top products in range (unbounded when range is open). */
export async function getTopProducts(
  range: ReportRange,
  limit?: number,
): Promise<TopProduct[]> {
  await requireRole('admin');
  const supabase = await createClient();
  let query = supabase.from('transactions').select('id, date, status');
  if (range.from) query = query.gte('date', range.from.toISOString());
  if (range.to) query = query.lt('date', range.to.toISOString());
  // The product-name map doesn't depend on the txn ids, so both fire
  // together; only the items read waits on the active ids.
  const [txnRes, productsRes] = await Promise.all([
    query,
    supabase.from('product').select('product_id, name'),
  ]);
  const { data: txns, error: txnError } = txnRes;
  if (txnError) throw txnError;
  const activeIds = ((txns ?? []) as { id: unknown; status: unknown }[])
    .filter((row) => row.status !== 'voided' && typeof row.id === 'string')
    .map((row) => row.id as string);
  if (activeIds.length === 0) return [];
  const { data: itemsData, error: itemsError } = await supabase
    .from('transaction_items')
    .select('product_id, quantity, subtotal')
    .in('transaction_id', activeIds);
  if (itemsError) throw itemsError;
  const { data: productsData, error: productsError } = productsRes;
  if (productsError) throw productsError;
  const names = new Map<number, string>();
  for (const row of (productsData ?? []) as {
    product_id: unknown;
    name: unknown;
  }[]) {
    if (typeof row.product_id === 'number' && typeof row.name === 'string') {
      names.set(row.product_id, row.name);
    }
  }
  const soldItems = (
    (itemsData ?? []) as {
      product_id: unknown;
      quantity: unknown;
      subtotal: unknown;
    }[]
  ).flatMap((row) =>
    typeof row.product_id === 'number' &&
    Number.isFinite(Number(row.quantity)) &&
    Number.isFinite(Number(row.subtotal))
      ? [
          {
            product_id: row.product_id,
            quantity: Number(row.quantity),
            subtotal: Number(row.subtotal),
          },
        ]
      : [],
  );
  return aggregateTopProducts(soldItems, names, limit);
}

/** Record-level ledger for the Reports page: receipts + sold lines in range. */
export async function getReceiptRecords(
  range: ReportRange,
  filters: {
    search?: string;
    cashier?: string;
    paymentMode?: string;
    paymentStatus?: string;
  } = {},
): Promise<ReceiptLedger> {
  await requireRole('admin');
  const supabase = await createClient();
  let query = supabase
    .from('transactions')
    .select(
      'id, transaction_number, order_number, date, total_amount, payment_mode, payment_status, payment_reference, status, user:user!transactions_user_id_fkey(username), payment_evidence(evidence_id)',
    )
    .order('date', { ascending: false });
  if (range.from) query = query.gte('date', range.from.toISOString());
  if (range.to) query = query.lt('date', range.to.toISOString());
  // The product-name map doesn't depend on the txn ids, so both fire
  // together; only the items read waits on the active ids.
  const [txnRes, productsRes] = await Promise.all([
    query,
    supabase.from('product').select('product_id, name'),
  ]);
  const { data: txnsData, error: txnError } = txnRes;
  if (txnError) throw txnError;
  const txns: LedgerTransaction[] = (
    (txnsData ?? []) as {
      id: unknown;
      transaction_number: unknown;
      order_number: unknown;
      date: unknown;
      total_amount: unknown;
      payment_mode: unknown;
      status: unknown;
      payment_status: unknown;
      payment_reference: unknown;
      user: unknown;
      payment_evidence: unknown;
    }[]
  )
    .flatMap((row) => {
      const mode = parsePaymentMode(row.payment_mode);
      const paymentStatus = parsePaymentStatus(row.payment_status);
      const total = Number(row.total_amount);
      const userValue = row.user as
        | { username?: unknown }
        | { username?: unknown }[]
        | null;
      const user = Array.isArray(userValue) ? userValue[0] : userValue;
      if (
        typeof row.id !== 'string' ||
        typeof row.transaction_number !== 'string' ||
        typeof row.date !== 'string' ||
        !Number.isFinite(total) ||
        !mode ||
        !paymentStatus
      ) {
        return [];
      }
      return [
        {
          id: row.id,
          transaction_number: row.transaction_number,
          order_number:
            typeof row.order_number === 'number' ? row.order_number : null,
          date: row.date,
          total_amount: total,
          payment_mode: mode,
          status: typeof row.status === 'string' ? row.status : null,
          payment_status: paymentStatus,
          payment_reference:
            typeof row.payment_reference === 'string'
              ? row.payment_reference
              : null,
          cashier_name:
            typeof user?.username === 'string' ? user.username : 'Staff',
          has_payment_evidence:
            Array.isArray(row.payment_evidence) &&
            row.payment_evidence.length > 0,
        },
      ];
    })
    .filter((txn) => {
      const search = filters.search?.trim().toLowerCase();
      const cashier = filters.cashier?.trim().toLowerCase();
      if (search && !txn.transaction_number.toLowerCase().includes(search))
        return false;
      if (cashier && !txn.cashier_name.toLowerCase().includes(cashier))
        return false;
      if (filters.paymentMode && txn.payment_mode !== filters.paymentMode)
        return false;
      if (filters.paymentStatus && txn.payment_status !== filters.paymentStatus)
        return false;
      return true;
    });
  const activeIds = txns.map((txn) => txn.id);
  if (activeIds.length === 0) {
    return {
      receipts: [],
      lines: [],
      receiptsTruncated: false,
      linesTruncated: false,
    };
  }
  const { data: itemsData, error: itemsError } = await supabase
    .from('transaction_items')
    .select('transaction_id, product_id, quantity, subtotal')
    .in('transaction_id', activeIds);
  if (itemsError) throw itemsError;
  const items: LedgerItem[] = (
    (itemsData ?? []) as {
      transaction_id: unknown;
      product_id: unknown;
      quantity: unknown;
      subtotal: unknown;
    }[]
  ).flatMap((row) =>
    typeof row.transaction_id === 'string' &&
    typeof row.product_id === 'number' &&
    Number.isFinite(Number(row.quantity)) &&
    Number.isFinite(Number(row.subtotal))
      ? [
          {
            transaction_id: row.transaction_id,
            product_id: row.product_id,
            quantity: Number(row.quantity),
            subtotal: Number(row.subtotal),
          },
        ]
      : [],
  );
  const { data: productsData, error: productsError } = productsRes;
  if (productsError) throw productsError;
  const names = new Map<number, string>();
  for (const row of (productsData ?? []) as {
    product_id: unknown;
    name: unknown;
  }[]) {
    if (typeof row.product_id === 'number' && typeof row.name === 'string') {
      names.set(row.product_id, row.name);
    }
  }
  return buildReceiptLedger(txns, items, names);
}
