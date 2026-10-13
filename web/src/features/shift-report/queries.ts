import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/features/auth/queries';
import { parsePaymentMode, parsePaymentStatus } from '@/features/pos/checkout';
import { manilaDayKey } from '@/features/reports/aggregate';
import {
  buildShiftReport,
  type QuotaSnapshot,
  type ShiftReport,
  type ShiftSale,
  type ShiftSaleItem,
} from './aggregate';

export interface ShiftReportInput {
  dateKey?: string;
  shiftId?: string;
  /** Admin only. Ignored for cashiers (self-scope is enforced). */
  cashierId?: string;
}

export interface ShiftOption {
  shift_id: string;
  user_id: string;
  cashier_name: string;
  business_date: string;
  started_at: string;
  ended_at: string | null;
  status: 'open' | 'closed';
}

export interface ShiftReportData {
  report: ShiftReport;
  rangeStart: string;
  rangeEnd: string;
  quotaDate: string;
  quotaAvailable: boolean;
  shifts: ShiftOption[];
  cashiers: { user_id: string; username: string }[];
  scope: { role: 'admin' | 'cashier'; cashierId: string | null };
  scopeLabel: string;
  shiftNote: string | null;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function resolveDateKey(input: string | undefined): string {
  return input && DATE_KEY.test(input)
    ? input
    : manilaDayKey(new Date().toISOString());
}

function shiftRangeEnd(shift: ShiftOption, now: Date): Date {
  return shift.ended_at ? new Date(shift.ended_at) : now;
}

function toShiftOption(
  row: Record<string, unknown>,
  fallbackCashier: string,
): ShiftOption | null {
  const userValue = row.user as
    | { username?: unknown }
    | { username?: unknown }[]
    | null;
  const user = Array.isArray(userValue) ? userValue[0] : userValue;
  if (
    typeof row.shift_id !== 'string' ||
    typeof row.user_id !== 'string' ||
    typeof row.business_date !== 'string' ||
    typeof row.started_at !== 'string'
  ) {
    return null;
  }
  return {
    shift_id: row.shift_id,
    user_id: row.user_id,
    cashier_name:
      typeof user?.username === 'string' ? user.username : fallbackCashier,
    business_date: row.business_date,
    started_at: row.started_at,
    ended_at: typeof row.ended_at === 'string' ? row.ended_at : null,
    status: row.status === 'open' ? 'open' : 'closed',
  };
}

/**
 * Role-scoped end-of-shift dataset. Admins see all staff (or one cashier
 * filter); cashiers are locked to their own rows server-side — a `cashierId`
 * from a cashier is ignored, and RLS (`transactions_read_own`,
 * `shift_own_read`) backstops every read. Read-only: no writes anywhere.
 */
export async function getShiftReportData(
  input: ShiftReportInput,
): Promise<ShiftReportData> {
  const profile = await requireStaff();
  const isAdmin = profile.role === 'admin';
  const requestedCashier =
    isAdmin && input.cashierId?.trim() ? input.cashierId.trim() : null;
  const effectiveCashier = isAdmin ? requestedCashier : profile.userId;
  const supabase = await createClient();
  const now = new Date();

  const [shiftsRes, cashiersRes] = await Promise.all([
    isAdmin
      ? supabase
          .from('cashier_shifts')
          .select(
            'shift_id, user_id, business_date, started_at, ended_at, status, user:user!cashier_shifts_user_id_fkey(username)',
          )
          .order('started_at', { ascending: false })
          .limit(100)
      : supabase
          .from('cashier_shifts')
          .select(
            'shift_id, user_id, business_date, started_at, ended_at, status',
          )
          .eq('user_id', profile.userId)
          .order('started_at', { ascending: false })
          .limit(100),
    isAdmin
      ? supabase.from('user').select('user_id, username').order('username')
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (shiftsRes.error) throw shiftsRes.error;
  if (cashiersRes.error) throw cashiersRes.error;
  const shifts = ((shiftsRes.data ?? []) as Record<string, unknown>[]).flatMap(
    (row) => {
      const option = toShiftOption(row, 'Cashier');
      return option ? [option] : [];
    },
  );
  const cashiers = (
    (cashiersRes.data ?? []) as { user_id: unknown; username: unknown }[]
  ).flatMap((row) =>
    typeof row.user_id === 'string' && typeof row.username === 'string'
      ? [{ user_id: row.user_id, username: row.username }]
      : [],
  );

  let from: Date;
  let to: Date;
  let quotaDate: string;
  let shiftNote: string | null = null;
  if (input.shiftId) {
    const shift = shifts.find((option) => option.shift_id === input.shiftId);
    if (!shift) {
      const dateKey = resolveDateKey(input.dateKey);
      from = new Date(`${dateKey}T00:00:00+08:00`);
      to = new Date(from.getTime() + 86_400_000);
      quotaDate = dateKey;
      shiftNote = 'The selected shift is not available in your scope.';
    } else {
      from = new Date(shift.started_at);
      to = shiftRangeEnd(shift, now);
      quotaDate = shift.business_date;
      const notes: string[] = [];
      if (!shift.ended_at)
        notes.push('This shift is still open — the range ends now.');
      if (
        manilaDayKey(from.toISOString()) !==
        manilaDayKey(new Date(to.getTime() - 1).toISOString())
      ) {
        notes.push(
          `This shift crosses midnight (Manila); quota is shown for the shift business date ${shift.business_date}.`,
        );
      }
      shiftNote = notes.length > 0 ? notes.join(' ') : null;
    }
  } else {
    const dateKey = resolveDateKey(input.dateKey);
    from = new Date(`${dateKey}T00:00:00+08:00`);
    to = new Date(from.getTime() + 86_400_000);
    quotaDate = dateKey;
  }

  let txnQuery = supabase
    .from('transactions')
    .select(
      'id, date, total_amount, payment_mode, payment_status, status, user_id',
    )
    .gte('date', from.toISOString())
    .lt('date', to.toISOString())
    .order('date', { ascending: false });
  if (effectiveCashier) txnQuery = txnQuery.eq('user_id', effectiveCashier);
  const { data: txnsData, error: txnError } = await txnQuery;
  if (txnError) throw txnError;
  const txns = ((txnsData ?? []) as Record<string, unknown>[]).flatMap(
    (row) => {
      const mode = parsePaymentMode(row.payment_mode);
      const paymentStatus = parsePaymentStatus(row.payment_status);
      const total = Number(row.total_amount);
      if (
        typeof row.id !== 'string' ||
        typeof row.date !== 'string' ||
        !Number.isFinite(total) ||
        !mode ||
        !paymentStatus ||
        typeof row.status !== 'string' ||
        typeof row.user_id !== 'string'
      ) {
        return [];
      }
      return [
        {
          id: row.id,
          date: row.date,
          total_amount: total,
          payment_mode: mode,
          payment_status: paymentStatus,
          status: row.status,
          user_id: row.user_id,
        },
      ];
    },
  );
  const completedIds = txns
    .filter((row) => row.status === 'completed')
    .map((row) => row.id);

  const [itemsRes, productsRes, categoriesRes, quotasRes] = await Promise.all([
    completedIds.length > 0
      ? supabase
          .from('transaction_items')
          .select('transaction_id, product_id, quantity, subtotal')
          .in('transaction_id', completedIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('product').select('product_id, name, category_id'),
    supabase.from('category').select('category_id, name'),
    supabase
      .from('daily_product_quotas')
      .select('product_id, daily_quota_limit, initial_quota')
      .eq('business_date', quotaDate),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (productsRes.error) throw productsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (quotasRes.error) throw quotasRes.error;

  const categories = new Map<string, string>();
  for (const row of (categoriesRes.data ?? []) as {
    category_id: unknown;
    name: unknown;
  }[]) {
    if (typeof row.category_id === 'string' && typeof row.name === 'string') {
      categories.set(row.category_id, row.name);
    }
  }
  const productMeta = new Map<number, { name: string; category: string }>();
  for (const row of (productsRes.data ?? []) as {
    product_id: unknown;
    name: unknown;
    category_id: unknown;
  }[]) {
    if (typeof row.product_id !== 'number') continue;
    productMeta.set(row.product_id, {
      name:
        typeof row.name === 'string' ? row.name : `Product #${row.product_id}`,
      category:
        typeof row.category_id === 'string'
          ? (categories.get(row.category_id) ?? 'Unclassified')
          : 'Unclassified',
    });
  }
  const itemsByTxn = new Map<string, ShiftSaleItem[]>();
  for (const row of (itemsRes.data ?? []) as {
    transaction_id: unknown;
    product_id: unknown;
    quantity: unknown;
    subtotal: unknown;
  }[]) {
    if (
      typeof row.transaction_id !== 'string' ||
      typeof row.product_id !== 'number' ||
      !Number.isFinite(Number(row.quantity)) ||
      !Number.isFinite(Number(row.subtotal))
    ) {
      continue;
    }
    const meta = productMeta.get(row.product_id) ?? {
      name: `Product #${row.product_id}`,
      category: 'Unclassified',
    };
    const list = itemsByTxn.get(row.transaction_id) ?? [];
    list.push({
      product_id: row.product_id,
      quantity: Number(row.quantity),
      subtotal: Number(row.subtotal),
      product_name: meta.name,
      category_name: meta.category,
    });
    itemsByTxn.set(row.transaction_id, list);
  }
  const sales: ShiftSale[] = txns.map((row) => ({
    ...row,
    items: itemsByTxn.get(row.id) ?? [],
  }));
  const quotas: QuotaSnapshot[] = (
    (quotasRes.data ?? []) as {
      product_id: unknown;
      daily_quota_limit: unknown;
      initial_quota: unknown;
    }[]
  ).flatMap((row) =>
    typeof row.product_id === 'number'
      ? [
          {
            product_id: row.product_id,
            quota_limit:
              row.daily_quota_limit === null
                ? null
                : Number(row.daily_quota_limit),
            initial_quota:
              row.initial_quota === null ? null : Number(row.initial_quota),
          },
        ]
      : [],
  );

  const scopeLabel = isAdmin
    ? requestedCashier
      ? (cashiers.find((entry) => entry.user_id === requestedCashier)
          ?.username ?? 'Selected cashier')
      : 'All staff'
    : profile.email;
  return {
    report: buildShiftReport(sales, quotas),
    rangeStart: from.toISOString(),
    rangeEnd: to.toISOString(),
    quotaDate,
    quotaAvailable: quotas.length > 0,
    shifts,
    cashiers,
    scope: { role: profile.role, cashierId: effectiveCashier },
    scopeLabel,
    shiftNote,
  };
}
