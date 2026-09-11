import { supabase } from '../services/supabase';
import { ReorderRequest, ReorderStatus } from '../types/entities';

export interface ReorderRequestRow extends ReorderRequest {
  product_name: string;
}

export interface ReorderPatch {
  suggested_quantity?: number;
  supplier?: string | null;
  status?: ReorderStatus;
}

export async function getReorderRequests(): Promise<ReorderRequestRow[]> {
  const { data, error } = await supabase
    .from('reorder_requests')
    .select('*, product(name)')
    .in('status', ['pending', 'ordered'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as (ReorderRequest & {
    product: { name: string } | { name: string }[] | null;
  })[];
  return rows.flatMap((row) => {
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    if (!product) return [];
    return [{ ...row, product_name: product.name }];
  });
}

export async function updateReorderRequest(
  requestId: number,
  patch: ReorderPatch,
): Promise<void> {
  const { error } = await supabase
    .from('reorder_requests')
    .update(patch)
    .eq('request_id', requestId);
  if (error) throw error;
}

export async function resolveReorderRequest(
  requestId: number,
  status: 'received' | 'cancelled',
  resolvedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('reorder_requests')
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
    })
    .eq('request_id', requestId);
  if (error) throw error;
}

export async function updateParLevelByProduct(
  productId: number,
  parLevel: number | null,
): Promise<void> {
  const { error } = await supabase
    .from('inventory')
    .update({ par_level: parLevel })
    .eq('product_id', productId);
  if (error) throw error;
}

export async function getInventoryByProduct(
  productId: number,
): Promise<{ stock_id: number; par_level: number | null } | null> {
  const { data, error } = await supabase
    .from('inventory')
    .select('stock_id, par_level')
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw error;
  return (
    (data as { stock_id: number; par_level: number | null } | null) ?? null
  );
}
