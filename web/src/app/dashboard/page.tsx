import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getCashierTodaySales } from '@/features/dashboard/queries';
import { getTodayProductQuotas } from '@/features/quotas/queries';
import { QUOTA_STATUS_LABEL } from '@/features/quotas/status';
import { getCurrentShift } from '@/features/shifts/queries';
import { Card } from '@/components/common/Card';
import { StaffShell } from '@/components/layout/staff-shell';

export default async function CashierDashboardPage() {
  const profile = await requireRole('cashier');
  const [sales, products, shift] = await Promise.all([
    getCashierTodaySales(),
    getTodayProductQuotas(),
    getCurrentShift(),
  ]);
  const completed = sales.filter((sale) => sale.status === 'completed');
  const netSales = completed.reduce((sum, sale) => sum + sale.total_amount, 0);
  const limitedRemaining = products.reduce(
    (sum, product) => sum + (product.remaining_quantity ?? 0),
    0,
  );
  const productsSold = products.reduce(
    (sum, product) => sum + product.sold_quantity,
    0,
  );
  const almostSoldOut = products.filter(
    (product) => product.status === 'almost_sold_out',
  ).length;
  const soldOut = products.filter(
    (product) => product.status === 'sold_out',
  ).length;

  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Today's Overview"
      subtitle="Cashier dashboard"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card title="Today's Sales">
          <p className="text-xl font-extrabold">₱{netSales.toFixed(2)}</p>
        </Card>
        <Card title="Orders">
          <p className="text-xl font-extrabold">{completed.length}</p>
        </Card>
        <Card title="Products Sold">
          <p className="text-xl font-extrabold">{productsSold}</p>
        </Card>
        <Card title="Products Remaining">
          <p className="text-xl font-extrabold">{limitedRemaining}</p>
        </Card>
        <Card title="Almost Sold Out">
          <p className="text-xl font-extrabold">{almostSoldOut}</p>
        </Card>
        <Card title="Sold Out">
          <p className="text-xl font-extrabold">{soldOut}</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Recent Transactions"
          actions={
            <Link href="/daily-sales" className="text-sm font-bold text-pine">
              View All Sales
            </Link>
          }
        >
          {sales.length === 0 ? (
            <p className="text-sm text-muted">No transactions yet today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sales.slice(0, 5).map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-center gap-3 py-3 text-sm"
                >
                  <time className="text-muted">
                    {new Date(sale.date).toLocaleTimeString('en-PH', {
                      timeZone: 'Asia/Manila',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </time>
                  <Link
                    href={`/pos/receipt/${sale.id}`}
                    className="min-w-0 flex-1 truncate font-bold text-pine"
                  >
                    {sale.transaction_number}
                  </Link>
                  <span className="font-bold">
                    ₱{sale.total_amount.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Today's Products"
          actions={
            <Link
              href="/today-products"
              className="text-sm font-bold text-pine"
            >
              View all
            </Link>
          }
        >
          <ul className="space-y-2">
            {products.slice(0, 8).map((item) => (
              <li
                key={item.product_id}
                className="rounded-2xl bg-mist p-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <strong>{item.product_name}</strong>
                  <span className="font-bold uppercase">
                    {QUOTA_STATUS_LABEL[item.status]}
                  </span>
                </div>
                <p className="text-muted">
                  {item.sold_quantity} served ·{' '}
                  {item.remaining_quantity === null
                    ? 'Unlimited today'
                    : `${item.remaining_quantity} remaining`}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Current Shift"
          actions={
            <Link
              href={
                shift?.status === 'open'
                  ? '/cashier-operations#turnover'
                  : '/cashier-operations#shift'
              }
              className="text-sm font-bold text-pine"
            >
              {shift?.status === 'open' ? 'End shift' : 'Open shift'}
            </Link>
          }
        >
          {shift?.status === 'open' ? (
            <div className="text-sm">
              <p>
                Started:{' '}
                {new Date(shift.started_at).toLocaleTimeString('en-PH', {
                  timeZone: 'Asia/Manila',
                })}
              </p>
              <p>Starting Cash: ₱{shift.starting_cash.toFixed(2)}</p>
              <p>Cash Sales: ₱{shift.cash_sales.toFixed(2)}</p>
              <p className="font-bold">
                Expected Cash: ₱{shift.expected_cash.toFixed(2)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">No open shift.</p>
          )}
        </Card>
      </div>
    </StaffShell>
  );
}
