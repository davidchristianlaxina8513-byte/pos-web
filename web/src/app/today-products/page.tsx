import { requireStaff } from '@/features/auth/queries';
import {
  getQuotaHistory,
  getTodayProductQuotas,
} from '@/features/quotas/queries';
import { ProductQuotaList } from '@/features/quotas/components/ProductQuotaList';
import { Card } from '@/components/common/Card';
import { StaffShell } from '@/components/layout/staff-shell';

export default async function TodayProductsPage() {
  const profile = await requireStaff();
  const [products, history] = await Promise.all([
    getTodayProductQuotas(),
    profile.role === 'admin' ? getQuotaHistory() : Promise.resolve([]),
  ]);
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Today's Products"
      subtitle="Today starts from the product default; blank quotas are unlimited"
    >
      <ProductQuotaList products={products} role={profile.role} />
      {profile.role === 'admin' ? (
        <Card
          title="Recent quota changes"
          className="mt-4 rounded-card border-border shadow-soft"
        >
          {history.length === 0 ? (
            <p className="text-sm text-muted">No quota changes recorded.</p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((entry) => (
                <li key={entry.quota_change_id} className="py-3 text-sm">
                  <span className="font-bold">{entry.product_name}</span>{' '}
                  {entry.previous_quota ?? 'Unlimited'} →{' '}
                  {entry.new_quota ?? 'Unlimited'}{' '}
                  <span className="capitalize text-muted">
                    by {entry.changed_by_role}
                  </span>
                  {entry.reason ? (
                    <span className="block text-muted">
                      Reason: {entry.reason}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </StaffShell>
  );
}
