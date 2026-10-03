import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';

export interface TodaySale {
  id: string;
  transaction_number: string;
  order_number: number | null;
  date: string;
  total_amount: number;
  payment_mode: string;
  payment_status: string;
  status: string;
}

function manilaRange(now = new Date()): { from: string; to: string } {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const from = new Date(`${day}T00:00:00+08:00`);
  return {
    from: from.toISOString(),
    to: new Date(from.getTime() + 86_400_000).toISOString(),
  };
}

export async function getCashierTodaySales(): Promise<TodaySale[]> {
  await requireRole('cashier');
  const supabase = await createClient();
  const range = manilaRange();
  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id, transaction_number, order_number, date, total_amount, payment_mode, payment_status, status',
    )
    .gte('date', range.from)
    .lt('date', range.to)
    .order('date', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) =>
    typeof row.id === 'string' &&
    typeof row.transaction_number === 'string' &&
    typeof row.date === 'string'
      ? [
          {
            id: row.id,
            transaction_number: row.transaction_number,
            order_number:
              typeof row.order_number === 'number' ? row.order_number : null,
            date: row.date,
            total_amount: Number(row.total_amount),
            payment_mode: String(row.payment_mode),
            payment_status: String(row.payment_status),
            status: String(row.status),
          },
        ]
      : [],
  );
}

export interface AdminTodaySummary {
  totalSales: number;
  transactions: number;
  productsSold: number;
  cashSales: number;
  onlineSales: number;
  pendingPayments: number;
  pendingTurnovers: number;
  discrepancyTurnovers: number;
  topProducts: { product_id: number; name: string; quantity: number }[];
}

export async function getAdminTodaySummary(): Promise<AdminTodaySummary> {
  await requireRole('admin');
  const supabase = await createClient();
  const range = manilaRange();
  const [
    { data: transactions, error: txError },
    { data: turnovers, error: turnoverError },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, total_amount, payment_mode, payment_status, status')
      .gte('date', range.from)
      .lt('date', range.to),
    supabase
      .from('cash_turnovers')
      .select('status, variance')
      .gte('submitted_at', range.from)
      .lt('submitted_at', range.to),
  ]);
  if (txError) throw txError;
  if (turnoverError) throw turnoverError;
  const completed = (transactions ?? []).filter(
    (row) => row.status === 'completed',
  );
  const ids = completed.map((row) => row.id);
  const itemQuery = ids.length
    ? supabase
        .from('transaction_items')
        .select('product_id, quantity, product(name)')
        .in('transaction_id', ids)
    : Promise.resolve({ data: [], error: null });
  const { data: items, error: itemsError } = await itemQuery;
  if (itemsError) throw itemsError;
  const productTotals = new Map<number, { name: string; quantity: number }>();
  for (const row of (items ?? []) as Record<string, unknown>[]) {
    const productId = Number(row.product_id);
    const product = row.product as { name?: unknown } | null;
    const quantity = Number(row.quantity);
    if (!Number.isInteger(productId) || !Number.isFinite(quantity)) continue;
    const current = productTotals.get(productId);
    productTotals.set(productId, {
      name: typeof product?.name === 'string' ? product.name : 'Product',
      quantity: (current?.quantity ?? 0) + quantity,
    });
  }
  return {
    totalSales: completed.reduce(
      (sum, row) => sum + Number(row.total_amount),
      0,
    ),
    transactions: completed.length,
    productsSold: [...productTotals.values()].reduce(
      (sum, row) => sum + row.quantity,
      0,
    ),
    cashSales: completed
      .filter((row) => row.payment_mode === 'cash')
      .reduce((sum, row) => sum + Number(row.total_amount), 0),
    onlineSales: completed
      .filter((row) => row.payment_mode !== 'cash')
      .reduce((sum, row) => sum + Number(row.total_amount), 0),
    pendingPayments: completed.filter(
      (row) => row.payment_status === 'pending_verification',
    ).length,
    pendingTurnovers: (turnovers ?? []).filter(
      (row) => row.status === 'pending',
    ).length,
    discrepancyTurnovers: (turnovers ?? []).filter(
      (row) => Number(row.variance) !== 0 && row.status !== 'verified',
    ).length,
    topProducts: [...productTotals.entries()]
      .map(([product_id, value]) => ({ product_id, ...value }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
  };
}
