import Link from 'next/link';
import { requireStaff } from '@/features/auth/queries';
import {
  getQuotaHistory,
  getTodayProductQuotas,
} from '@/features/quotas/queries';
import { ProductQuotaList } from '@/components/modules/quotas/ProductQuotaList';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { StaffShell } from '@/components/layout/staff-shell';
import {
  ArrowRightIcon,
  BookOpenIcon,
  ShoppingCartIcon,
} from '@/components/common/hero-icons';

export default async function TodayProductsPage() {
  const profile = await requireStaff();
  const [products, history] = await Promise.all([
    getTodayProductQuotas(),
    profile.role === 'admin' ? getQuotaHistory() : Promise.resolve([]),
  ]);

  return (
    <StaffShell email={profile.email} role={profile.role} fullWidth={true}>
      <div className="space-y-6">
        {/* DCASIS Page Header Banner */}
        <div>
          <Breadcrumbs
            pages={[
              {
                name: "Today's Products",
                href: '/today-products',
                current: true,
              },
            ]}
            homeHref={profile.role === 'admin' ? '/admin' : '/dashboard'}
          />
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-pine">
                Today&apos;s Products &amp; Stock Monitoring
              </h1>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                Track units served, adjust daily limits, and manage real-time
                item availability.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {profile.role === 'admin' && (
                <Link
                  href="/admin/menu"
                  className="action-focus inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3.5 text-sm font-semibold text-foreground shadow-xs transition hover:bg-mist"
                >
                  <BookOpenIcon className="h-4 w-4 text-pine" />
                  <span>Menu Items</span>
                </Link>
              )}
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
        </div>

        {/* Product Quota List & Recent Quota Adjustments History with Tabs */}
        <ProductQuotaList
          products={products}
          role={profile.role}
          history={history}
        />
      </div>
    </StaffShell>
  );
}
