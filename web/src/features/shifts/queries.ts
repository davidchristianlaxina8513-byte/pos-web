import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';

export interface CashierShift {
  shift_id: string;
  business_date: string;
  started_at: string;
  ended_at: string | null;
  starting_cash: number;
  status: 'open' | 'closed';
  notes: string | null;
  cash_sales: number;
  expected_cash: number;
}

export interface CashTurnover {
  turnover_id: string;
  shift_id: string;
  submitted_at: string;
  cashier_name: string;
  starting_cash: number;
  cash_sales: number;
  expected_cash: number;
  counted_cash: number;
  variance: number;
  status: 'pending' | 'verified' | 'flagged';
  notes: string | null;
  verification_note: string | null;
}

export async function getCurrentShift(): Promise<CashierShift | null> {
  const profile = await requireRole('cashier');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cashier_shifts')
    .select(
      'shift_id, business_date, started_at, ended_at, starting_cash, status, notes',
    )
    .eq('user_id', profile.userId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  let cashSales = 0;
  if (data.status === 'open') {
    const { data: sales, error: salesError } = await supabase
      .from('transactions')
      .select('total_amount')
      .eq('user_id', profile.userId)
      .eq('payment_mode', 'cash')
      .eq('status', 'completed')
      .gte('date', data.started_at);
    if (salesError) throw salesError;
    cashSales = (sales ?? []).reduce(
      (sum, row) => sum + Number(row.total_amount),
      0,
    );
  }
  return {
    shift_id: data.shift_id,
    business_date: data.business_date,
    started_at: data.started_at,
    ended_at: data.ended_at,
    starting_cash: Number(data.starting_cash),
    status: data.status,
    notes: data.notes,
    cash_sales: cashSales,
    expected_cash: Number(data.starting_cash) + cashSales,
  };
}

function mapTurnover(
  row: Record<string, unknown>,
  fallbackCashier = 'Cashier',
): CashTurnover | null {
  if (
    typeof row.turnover_id !== 'string' ||
    typeof row.shift_id !== 'string' ||
    typeof row.submitted_at !== 'string'
  )
    return null;
  const user = row.user as { username?: unknown } | null;
  const status = row.status;
  if (status !== 'pending' && status !== 'verified' && status !== 'flagged')
    return null;
  return {
    turnover_id: row.turnover_id,
    shift_id: row.shift_id,
    submitted_at: row.submitted_at,
    cashier_name:
      typeof user?.username === 'string' ? user.username : fallbackCashier,
    starting_cash: Number(row.starting_cash),
    cash_sales: Number(row.cash_sales),
    expected_cash: Number(row.expected_cash),
    counted_cash: Number(row.counted_cash),
    variance: Number(row.variance),
    status,
    notes: typeof row.notes === 'string' ? row.notes : null,
    verification_note:
      typeof row.verification_note === 'string' ? row.verification_note : null,
  };
}

export async function getMyTurnovers(): Promise<CashTurnover[]> {
  const profile = await requireRole('cashier');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cash_turnovers')
    .select(
      'turnover_id, shift_id, submitted_at, starting_cash, cash_sales, expected_cash, counted_cash, variance, status, notes, verification_note',
    )
    .eq('submitted_by', profile.userId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const mapped = mapTurnover(row, profile.email);
    return mapped ? [mapped] : [];
  });
}

export async function getAllTurnovers(): Promise<CashTurnover[]> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cash_turnovers')
    .select(
      'turnover_id, shift_id, submitted_at, starting_cash, cash_sales, expected_cash, counted_cash, variance, status, notes, verification_note, user:user!cash_turnovers_submitted_by_fkey(username)',
    )
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const mapped = mapTurnover(row);
    return mapped ? [mapped] : [];
  });
}

export interface AdminShift
  extends Omit<CashierShift, 'cash_sales' | 'expected_cash'> {
  cashier_name: string;
}

function mapShift(
  row: Record<string, unknown>,
  fallbackCashier: string,
): AdminShift | null {
  const userValue = row.user as
    | { username?: unknown }
    | { username?: unknown }[]
    | null;
  const user = Array.isArray(userValue) ? userValue[0] : userValue;
  if (
    typeof row.shift_id !== 'string' ||
    typeof row.business_date !== 'string' ||
    typeof row.started_at !== 'string'
  )
    return null;
  return {
    shift_id: row.shift_id,
    business_date: row.business_date,
    started_at: row.started_at,
    ended_at: typeof row.ended_at === 'string' ? row.ended_at : null,
    starting_cash: Number(row.starting_cash),
    status: row.status === 'open' ? 'open' : 'closed',
    notes: typeof row.notes === 'string' ? row.notes : null,
    cashier_name:
      typeof user?.username === 'string' ? user.username : fallbackCashier,
  };
}

export async function getMyShifts(): Promise<AdminShift[]> {
  const profile = await requireRole('cashier');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cashier_shifts')
    .select(
      'shift_id, business_date, started_at, ended_at, starting_cash, status, notes',
    )
    .eq('user_id', profile.userId)
    .order('started_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const mapped = mapShift(row, profile.email);
    return mapped ? [mapped] : [];
  });
}

export async function getAllShifts(): Promise<AdminShift[]> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cashier_shifts')
    .select(
      'shift_id, business_date, started_at, ended_at, starting_cash, status, notes, user:user!cashier_shifts_user_id_fkey(username)',
    )
    .order('started_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const mapped = mapShift(row, 'Cashier');
    return mapped ? [mapped] : [];
  });
}
