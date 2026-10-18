import Link from 'next/link';
import { requireStaff } from '@/features/auth/queries';
import { getCashierTodaySales } from '@/features/dashboard/queries';
import { Card } from '@/components/common/Card';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  ArrowRightIcon,
  ShoppingCartIcon,
} from '@/components/common/hero-icons';
import { StaffShell } from '@/components/layout/staff-shell';
import { cn } from '@/lib/cn';

export const dynamic = 'force-dynamic';

export default async function DailySalesPage() {
  const [profile, sales] = await Promise.all([
    requireStaff(),
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
    <StaffShell email={profile.email} role={profile.role} fullWidth={true}>
      <div className="space-y-6">
        {/* DCASIS Page Header Banner */}
        <div>
          <Breadcrumbs
            pages={[
              {
                name: 'Daily Sales',
                href: '/daily-sales',
                current: true,
              },
            ]}
            homeHref={profile.role === 'admin' ? '/admin' : '/dashboard'}
          />
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-pine">
                Daily Sales & Transactions
              </h1>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                Read-only register ledger for the current Manila business day.
              </p>
            </div>
            <Link
              href="/pos"
              className="action-focus inline-flex h-10 items-center justify-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-surface shadow-xs transition hover:bg-pine-deep"
            >
              <ShoppingCartIcon className="h-4 w-4" />
              <span>Open Register</span>
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card title="Gross Sales (Active)">
            <strong className="text-2xl font-black text-foreground">
              ₱{gross.toFixed(2)}
            </strong>
            <p className="text-xs text-muted mt-1">
              {activeSales.length} active transactions
            </p>
          </Card>
          <Card title="Voided Sales">
            <strong className="text-2xl font-black text-danger">
              ₱{voided.toFixed(2)}
            </strong>
            <p className="text-xs text-muted mt-1">Excluded from revenue</p>
          </Card>
          <Card title="Net Sales">
            <strong className="text-2xl font-black text-pine">
              ₱{net.toFixed(2)}
            </strong>
            <p className="text-xs text-muted mt-1">
              Today&apos;s realized gross
            </p>
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
                      <Link
                        href={`/pos/receipt/${sale.id}`}
                        className="action-focus inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted hover:border-pine/40 hover:bg-pine/5 hover:text-pine transition"
                        title={`View receipt and void options for ${sale.transaction_number}`}
                      >
                        <span>Receipt</span>
                        <ArrowRightIcon className="h-3 w-3" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </StaffShell>
  );
}
