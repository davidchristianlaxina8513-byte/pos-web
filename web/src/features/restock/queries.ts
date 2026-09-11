import { requireRole } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import {
  byUrgency,
  parseRestockStatus,
  statusesForFilter,
  type RestockFilter,
  type RestockRow,
} from './restock';

interface RestockDbRow {
  request_id: number;
  product_id: number;
  current_stock_snapshot: number;
  reorder_point_snapshot: number;
  par_level_snapshot: number;
  suggested_quantity: number;
  status: unknown;
  supplier: string | null;
  cancel_reason: unknown;
  created_at: string;
  resolved_at: unknown;
  product: { name: string } | { name: string }[] | null;
}

/**
 * Restock requests with the product name joined. Admin-only via
 * `requireRole` + RLS `reorder_admin_all`. Sorted most urgent/oldest first.
 */
export async function getRestockRequests(
  filter: RestockFilter = 'open',
): Promise<RestockRow[]> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reorder_requests')
    .select(
      'request_id, product_id, current_stock_snapshot, reorder_point_snapshot, par_level_snapshot, suggested_quantity, status, supplier, cancel_reason, created_at, resolved_at, product(name)',
    )
    .in('status', statusesForFilter(filter))
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as RestockDbRow[];
  return rows
    .flatMap((row) => {
      const status = parseRestockStatus(row.status);
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
          cancel_reason:
            typeof row.cancel_reason === 'string' ? row.cancel_reason : null,
          created_at: row.created_at,
          resolved_at:
            typeof row.resolved_at === 'string' ? row.resolved_at : null,
        },
      ];
    })
    .sort(byUrgency);
}

/** Open requests (pending + ordered), oldest first. */
export async function getOpenRequests(): Promise<RestockRow[]> {
  return getRestockRequests('open');
}

/** Count of actionable (pending + ordered) requests for nav badges. */
export async function getOpenRestockCount(): Promise<number> {
  await requireRole('admin');
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('reorder_requests')
    .select('request_id', { count: 'exact', head: true })
    .in('status', ['pending', 'ordered']);
  if (error) throw error;
  return count ?? 0;
}
