import { createClient } from '@/lib/supabase/server';
import { requireRole, requireStaff } from '@/features/auth/queries';
import { quotaStatus, type ProductQuotaStatus } from './status';

export interface ProductQuota {
  product_id: number;
  product_name: string;
  default_quota_limit: number | null;
  today_quota_limit: number | null;
  sold_quantity: number;
  remaining_quantity: number | null;
  status: ProductQuotaStatus;
}

export interface QuotaChange {
  quota_change_id: number;
  product_name: string;
  previous_quota: number | null;
  new_quota: number | null;
  changed_by_role: string;
  reason: string | null;
  changed_at: string;
}

export async function getTodayProductQuotas(): Promise<ProductQuota[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_today_product_quotas');
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const productId = Number(row.product_id);
    const defaultQuota = row.default_quota_limit;
    const todayQuota = row.today_quota_limit;
    const sold = Number(row.sold_quantity);
    const remaining = row.remaining_quantity;
    if (
      !Number.isInteger(productId) ||
      typeof row.product_name !== 'string' ||
      !Number.isFinite(sold) ||
      !isNullableQuota(defaultQuota) ||
      !isNullableQuota(todayQuota) ||
      !isNullableQuota(remaining)
    ) {
      return [];
    }
    return [
      {
        product_id: productId,
        product_name: row.product_name,
        default_quota_limit: defaultQuota,
        today_quota_limit: todayQuota,
        sold_quantity: sold,
        remaining_quantity: remaining,
        status: quotaStatus(todayQuota, remaining),
      },
    ];
  });
}

export async function getQuotaHistory(): Promise<QuotaChange[]> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('quota_changes')
    .select(
      'quota_change_id, previous_quota, new_quota, changed_by_role, reason, changed_at, product(name)',
    )
    .order('changed_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const product = row.product as { name?: unknown } | null;
    if (
      typeof row.quota_change_id !== 'number' ||
      typeof product?.name !== 'string' ||
      typeof row.changed_at !== 'string'
    ) {
      return [];
    }
    return [
      {
        quota_change_id: row.quota_change_id,
        product_name: product.name,
        previous_quota: isNullableQuota(row.previous_quota)
          ? row.previous_quota
          : null,
        new_quota: isNullableQuota(row.new_quota) ? row.new_quota : null,
        changed_by_role: String(row.changed_by_role),
        reason: typeof row.reason === 'string' ? row.reason : null,
        changed_at: row.changed_at,
      },
    ];
  });
}

function isNullableQuota(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 0)
  );
}
