/**
 * Pure restock shapes + helpers (no server imports — safe for client
 * components and unit tests). Database reads live in `./queries`.
 */

export type RestockStatus = 'pending' | 'ordered' | 'received' | 'cancelled';

/** List filter: one status, the actionable open set, or everything. */
export type RestockFilter = RestockStatus | 'open' | 'all';

export const RESTOCK_STATUSES: RestockStatus[] = [
  'pending',
  'ordered',
  'received',
  'cancelled',
];

export const OPEN_STATUSES: RestockStatus[] = ['pending', 'ordered'];

export interface RestockRow {
  request_id: number;
  product_id: number;
  product_name: string;
  current_stock_snapshot: number;
  reorder_point_snapshot: number;
  par_level_snapshot: number;
  suggested_quantity: number;
  status: RestockStatus;
  supplier: string | null;
  cancel_reason: string | null;
  created_at: string;
  resolved_at: string | null;
}

export function parseRestockStatus(value: unknown): RestockStatus | null {
  return value === 'pending' ||
    value === 'ordered' ||
    value === 'received' ||
    value === 'cancelled'
    ? value
    : null;
}

export function parseRestockFilter(value: unknown): RestockFilter | null {
  if (value === 'open' || value === 'all') return value;
  return parseRestockStatus(value);
}

export function statusesForFilter(filter: RestockFilter): RestockStatus[] {
  if (filter === 'open') return OPEN_STATUSES;
  if (filter === 'all') return RESTOCK_STATUSES;
  return [filter];
}

/** Most urgent first: pending before ordered, then oldest request first. */
export function byUrgency(a: RestockRow, b: RestockRow): number {
  if (a.status !== b.status) {
    return a.status === 'pending' ? -1 : 1;
  }
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/** Groups rows by supplier for the printable list; null/blank → 'Unassigned'. */
export function groupBySupplier(
  rows: RestockRow[],
): { supplier: string; rows: RestockRow[] }[] {
  const groups = new Map<string, RestockRow[]>();
  for (const row of rows) {
    const key = row.supplier?.trim() ? row.supplier.trim() : 'Unassigned';
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()].map(([supplier, groupRows]) => ({
    supplier,
    rows: groupRows,
  }));
}

/**
 * Whether an admin may move a request from `from` to `to`.
 * Terminal states (received/cancelled) never reopen; receiving happens
 * only from ordered so every stock bump passes through `adjust_stock` once.
 */
export function canTransitionRestock(
  from: RestockStatus,
  to: RestockStatus,
): boolean {
  if (from === 'pending' && to === 'ordered') return true;
  if (from === 'ordered' && to === 'received') return true;
  if ((from === 'pending' || from === 'ordered') && to === 'cancelled') {
    return true;
  }
  return false;
}
