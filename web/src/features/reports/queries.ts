import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';
import { parsePaymentMode } from '@/features/pos/checkout';
import {
  getInventoryItems,
  type InventoryItem,
} from '@/features/inventory/queries';
import { getStockStatus } from '@/features/inventory/status';
import {
  activeSales,
  aggregateTopProducts,
  buildDaySales,
  summarizeSales,
  type DaySales,
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
  lowStock: { product_name: string; quantity: number }[];
  topProducts: TopProduct[];
}

/** Dashboard metrics: all-time revenue/orders, 7-day chart, low stock, top 5. */
export async function getDashboard(
  now: Date = new Date(),
): Promise<DashboardData> {
  await requireRole('admin');
  const supabase = await createClient();
  const [{ rows }, inventoryItems] = await Promise.all([
    fetchSales(),
    getInventoryItems(),
  ]);
  const active = activeSales(rows);
  const summary = summarizeSales(active);
  const { data: itemsData } = await supabase
    .from('transaction_items')
    .select('product_id, quantity, subtotal');
  const { data: productsData } = await supabase
    .from('product')
    .select('product_id, name');
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
    lowStock: inventoryItems
      .filter(
        (item) => getStockStatus(item.quantity, item.reorder_level) !== 'ok',
      )
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5)
      .map((item) => ({
        product_name: item.product_name,
        quantity: item.quantity,
      })),
    topProducts: aggregateTopProducts(soldItems, names, 5),
  };
}

export interface SalesReport {
  summary: SalesSummary;
  daily: DaySales[];
}

/** Filtered sales summary + daily buckets (capped at 31 days of buckets). */
export async function getSalesReport(range: ReportRange): Promise<SalesReport> {
  const { rows } = await fetchSales();
  const active = activeSales(inRange(rows, range));
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
  const { data: txns, error: txnError } = await query;
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
  const { data: productsData, error: productsError } = await supabase
    .from('product')
    .select('product_id, name');
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

export interface InventoryReportRow {
  product_name: string;
  quantity: number;
  reorder_level: number;
  status: 'ok' | 'low' | 'critical';
}

export interface InventoryReport {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockValue: number;
  rows: InventoryReportRow[];
}

/** Stock valuation + status counters, mirroring Expo `getInventoryReport`. */
export async function getInventoryReport(): Promise<InventoryReport> {
  const items: InventoryItem[] = await getInventoryItems();
  let stockValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const rows = items.map((item) => {
    const status = getStockStatus(item.quantity, item.reorder_level);
    if (status === 'low') lowStockCount += 1;
    if (status === 'critical') outOfStockCount += 1;
    stockValue += item.price * item.quantity;
    return {
      product_name: item.product_name,
      quantity: item.quantity,
      reorder_level: item.reorder_level,
      status,
    };
  });
  return {
    totalItems: items.length,
    lowStockCount,
    outOfStockCount,
    stockValue,
    rows,
  };
}
