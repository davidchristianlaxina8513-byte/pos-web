import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getCashierTodaySales } from '@/features/dashboard/queries';
import { Card } from '@/components/common/Card';
import { StaffShell } from '@/components/layout/staff-shell';
import { VoidButton } from '@/features/reports/components/VoidButton';

export default async function DailySalesPage() {
  const profile = await requireRole('cashier');
  const sales = await getCashierTodaySales();
  const gross = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const voided = sales
    .filter((sale) => sale.status === 'voided')
    .reduce((sum, sale) => sum + sale.total_amount, 0);
  const net = gross - voided;
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Daily Sales"
      subtitle="Your sales for the current Manila business day"
    >
      <div className="grid grid-cols-3 gap-3">
        <Card title="Gross">
          <strong>₱{gross.toFixed(2)}</strong>
        </Card>
        <Card title="Voided">
          <strong>₱{voided.toFixed(2)}</strong>
        </Card>
        <Card title="Net">
          <strong>₱{net.toFixed(2)}</strong>
        </Card>
      </div>
      <Card
        title="Orders"
        className="mt-4 rounded-card border-border shadow-soft"
      >
        {sales.length === 0 ? (
          <p className="text-sm text-muted">No sales today.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sales.map((sale) => (
              <li
                key={sale.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <span className="min-w-0">
                  <Link
                    href={`/pos/receipt/${sale.id}`}
                    className="block truncate font-bold text-pine"
                  >
                    {sale.transaction_number}
                  </Link>
                  <span className="block capitalize text-muted">
                    {sale.payment_mode} ·{' '}
                    {sale.payment_status.replaceAll('_', ' ')} · {sale.status}
                  </span>
                </span>
                <span className="text-right">
                  <strong className="block">
                    ₱{sale.total_amount.toFixed(2)}
                  </strong>
                  {sale.status === 'completed' ? (
                    <VoidButton transactionId={sale.id} />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </StaffShell>
  );
}
