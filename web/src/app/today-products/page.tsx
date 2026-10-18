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
  const [profile, products] = await Promise.all([
    requireStaff(),
    getTodayProductQuotas(),
  ]);
  const history = profile.role === 'admin' ? await getQuotaHistory() : [];

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
                Today&apos;s Products & Stock Monitoring
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
                  <span>Master Menu Catalog →</span>
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

        {/* Contextual guidance banner for Admins */}
        {profile.role === 'admin' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pine/20 bg-pine/5 px-4 py-2.5 text-xs text-foreground">
            <div className="flex items-center gap-2">
              <span className="font-bold text-pine">
                Live Daily Stock Limits:
              </span>
              <span className="text-muted">
                Adjusting quantities here controls real-time availability for
                today&apos;s register. To edit permanent prices, recipes, or
                categories, use Menu Management.
              </span>
            </div>
            <Link
              href="/admin/menu"
              className="font-bold text-pine hover:underline whitespace-nowrap"
            >
              Master Menu Catalog →
            </Link>
          </div>
        )}

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
