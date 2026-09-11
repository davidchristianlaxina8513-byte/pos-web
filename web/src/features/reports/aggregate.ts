import type { PaymentMode } from '@/features/pos/types';

export interface SaleRow {
  date: string;
  total_amount: number;
  payment_mode: PaymentMode;
  status?: string | null;
}

export interface DaySales {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: number;
}

const MANILA = 'Asia/Manila';
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANILA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Manila calendar day (YYYY-MM-DD) for a timestamp. */
export function manilaDayKey(iso: string): string {
  return dayKeyFormat.format(new Date(iso));
}

export type ReportPreset = 'today' | '7d' | '30d' | 'all';

export interface ReportRange {
  preset: ReportPreset;
  from: Date | null;
  to: Date | null;
}

function manilaMidnight(date: Date): Date {
  return new Date(`${manilaDayKey(date.toISOString())}T00:00:00+08:00`);
}

/**
 * Resolves a preset (or custom from/to dates) to an inclusive UTC range.
 * Null range means unbounded ("all"). Days always align to Manila midnights.
 */
export function resolveRange(
  preset: ReportPreset,
  fromStr: string | null,
  toStr: string | null,
  now: Date = new Date(),
): ReportRange {
  if (preset === 'all' && !fromStr && !toStr) {
    return { preset, from: null, to: null };
  }
  if (fromStr || toStr) {
    const from = fromStr ? new Date(`${fromStr}T00:00:00+08:00`) : null;
    const to = toStr ? new Date(`${toStr}T00:00:00+08:00`) : null;
    if (to) to.setDate(to.getDate() + 1);
    return { preset, from, to };
  }
  const end = manilaMidnight(now);
  end.setDate(end.getDate() + 1);
  const start = new Date(end.getTime());
  start.setDate(
    start.getDate() - (preset === 'today' ? 1 : preset === '7d' ? 7 : 30),
  );
  return { preset, from: start, to: end };
}

/** Completed sales only — voided rows never count. */
export function activeSales(rows: SaleRow[]): SaleRow[] {
  return rows.filter((row) => row.status !== 'voided');
}

function dayLabel(key: string): string {
  const weekday = new Date(`${key}T12:00:00+08:00`).getDay();
  return DAY_LABELS[weekday] ?? key;
}

/**
 * Revenue/orders bucketed by Manila day for the last `dayCount` days
 * (ending today Manila time). Mirrors Expo `buildDaySales`.
 */
export function buildDaySales(
  rows: SaleRow[],
  dayCount: number,
  now: Date = new Date(),
): DaySales[] {
  const keys: string[] = [];
  const cursor = new Date(now.getTime());
  for (let i = 0; i < dayCount; i += 1) {
    keys.unshift(manilaDayKey(cursor.toISOString()));
    cursor.setDate(cursor.getDate() - 1);
  }
  const buckets = new Map(keys.map((key) => [key, { revenue: 0, orders: 0 }]));
  for (const row of rows) {
    const bucket = buckets.get(manilaDayKey(row.date));
    if (!bucket) continue;
    bucket.revenue += row.total_amount;
    bucket.orders += 1;
  }
  return keys.map((key) => {
    const bucket = buckets.get(key) as { revenue: number; orders: number };
    return { date: key, label: dayLabel(key), revenue: bucket.revenue, orders: bucket.orders };
  });
}

export interface SalesSummary {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  breakdown: { mode: PaymentMode; revenue: number; orders: number }[];
}

const MODES: PaymentMode[] = ['cash', 'gcash', 'maya'];

/** Totals + per-mode split for a set of completed sales. */
export function summarizeSales(rows: SaleRow[]): SalesSummary {
  const revenue = rows.reduce((sum, row) => sum + row.total_amount, 0);
  const orders = rows.length;
  return {
    revenue,
    orders,
    averageOrderValue: orders === 0 ? 0 : revenue / orders,
    breakdown: MODES.map((mode) => {
      const modeRows = rows.filter((row) => row.payment_mode === mode);
      return {
        mode,
        revenue: modeRows.reduce((sum, row) => sum + row.total_amount, 0),
        orders: modeRows.length,
      };
    }),
  };
}

export interface SoldItem {
  product_id: number;
  quantity: number;
  subtotal: number;
}

/** Top products by revenue, mirroring Expo `aggregateTopProducts`. */
export function aggregateTopProducts(
  items: SoldItem[],
  names: Map<number, string>,
  limit?: number,
): TopProduct[] {
  const grouped = new Map<number, { quantity: number; revenue: number }>();
  for (const item of items) {
    const entry = grouped.get(item.product_id) ?? { quantity: 0, revenue: 0 };
    entry.quantity += item.quantity;
    entry.revenue += item.subtotal;
    grouped.set(item.product_id, entry);
  }
  const ranked: TopProduct[] = [...grouped.entries()].map(
    ([product_id, entry]) => ({
      product_id,
      product_name: names.get(product_id) ?? `Product #${product_id}`,
      quantity_sold: entry.quantity,
      revenue: entry.revenue,
    }),
  );
  ranked.sort((a, b) => b.revenue - a.revenue);
  return limit === undefined ? ranked : ranked.slice(0, limit);
}
