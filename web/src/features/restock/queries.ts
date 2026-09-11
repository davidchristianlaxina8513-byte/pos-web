import { requireRole } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';

export type RestockStatus = 'pending' | 'ordered' | 'received' | 'cancelled';

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
  created_at: string;
}

interface RestockDbRow {
  request_id: number;
  product_id: number;
  current_stock_snapshot: number;
  reorder_point_snapshot: number;
  par_level_snapshot: number;
  suggested_quantity: number;
  status: unknown;
  supplier: string | null;
  created_at: string;
  product: { name: string } | { name: string }[] | null;
}

function parseStatus(value: unknown): RestockStatus | null {
  return value === 'pending' ||
    value === 'ordered' ||
    value === 'received' ||
    value === 'cancelled'
    ? value
    : null;
}

/** Open requests (pending + ordered), product name joined, oldest first. RLS `reorder_admin_all` enforces admin-only. */
export async function getOpenRequests(): Promise<RestockRow[]> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reorder_requests')
    .select(
      'request_id, product_id, current_stock_snapshot, reorder_point_snapshot, par_level_snapshot, suggested_quantity, status, supplier, created_at, product(name)',
    )
    .in('status', ['pending', 'ordered'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as RestockDbRow[];
  return rows.flatMap((row) => {
    const status = parseStatus(row.status);
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    if (!status || !product) return [];
    return [
      {
        request_id: row.request_id,
        product_id: row.product_id,
        product_name: product.name,
        current_stock_snapshot: row.current_stock_snapshot,
        reorder_point_snapshot: row.reorder_point_snapshot,
        par_level_snapshot: row.par_level_snapshot,
        suggested_quantity: row.suggested_quantity,
        status,
        supplier: row.supplier,
        created_at: row.created_at,
      },
    ];
  });
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

/** Allow-listed status transitions for the admin actions. */
export function parseRestockStatus(value: unknown): RestockStatus | null {
  return parseStatus(value);
}
