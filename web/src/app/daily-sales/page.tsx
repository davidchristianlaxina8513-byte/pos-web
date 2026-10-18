import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getCashierTodaySales } from '@/features/dashboard/queries';
import { Card } from '@/components/common/Card';
import { StaffShell } from '@/components/layout/staff-shell';
import { cn } from '@/lib/cn';

export default async function DailySalesPage() {
  const [profile, sales] = await Promise.all([
    requireRole('cashier'),
    getCashierTodaySales(),
  ]);

  const activeSales = sales.filter(
    (sale) => sale.status !== 'voided' && sale.status !== 'cancelled',
  );
  const gross = activeSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const voided = sales
    .filter((sale) => sale.status === 'voided')
    .reduce((sum, sale) => sum + sale.total_amount, 0);
  const net = gross;

  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Daily Sales"
      subtitle="Your sales for the current Manila business day"
      fullWidth={true}
    >
      <div className="grid grid-cols-3 gap-3">
        <Card title="Gross Sales (Active)">
          <strong>₱{gross.toFixed(2)}</strong>
        </Card>
        <Card title="Voided Sales">
          <strong>₱{voided.toFixed(2)}</strong>
        </Card>
        <Card title="Net Sales">
          <strong>₱{net.toFixed(2)}</strong>
        </Card>
      </div>
      <Card
        title="Transactions Ledger"
        className="mt-4 rounded-card border-border shadow-soft"
      >
        {sales.length === 0 ? (
          <p className="text-sm text-muted">No sales today.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sales.map((sale) => {
              const isVoided = sale.status === 'voided';
              const isCancelled = sale.status === 'cancelled';
              return (
                <li
                  key={sale.id}
                  className={cn(
                    'flex items-center justify-between gap-3 py-3 text-sm',
                    (isVoided || isCancelled) && 'opacity-60 bg-gray-50/50',
                  )}
                >
                  <span className="min-w-0">
                    <Link
                      href={`/pos/receipt/${sale.id}`}
                      className="block truncate font-bold text-pine hover:underline"
                    >
                      {sale.transaction_number}
                    </Link>
                    <span className="block capitalize text-muted text-xs mt-0.5">
                      {sale.payment_mode} ·{' '}
                      {sale.payment_status.replaceAll('_', ' ')}
                    </span>
                  </span>
                  <div className="flex items-center gap-3 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
                        sale.status === 'completed' &&
                          'bg-emerald-50 text-emerald-700 border border-emerald-200',
                        sale.status === 'ready' &&
                          'bg-blue-50 text-blue-700 border border-blue-200',
                        sale.status === 'preparing' &&
                          'bg-amber-50 text-amber-700 border border-amber-200',
                        sale.status === 'pending' &&
                          'bg-yellow-50 text-yellow-800 border border-yellow-200',
                        isVoided &&
                          'bg-red-50 text-red-700 border border-red-200',
                        isCancelled &&
                          'bg-gray-100 text-gray-700 border border-gray-300',
                      )}
                    >
                      {sale.status}
                    </span>
                    <strong
                      className={cn(
                        'block text-sm min-w-[70px]',
                        isVoided && 'line-through text-muted',
                      )}
                    >
                      ₱{sale.total_amount.toFixed(2)}
                    </strong>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </StaffShell>
  );
}
