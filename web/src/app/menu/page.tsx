import { requireStaff } from '@/features/auth/queries';
import { getMenu } from '@/features/pos/queries';
import { Card } from '@/components/common/Card';
import { StaffShell } from '@/components/layout/staff-shell';

export default async function ViewMenuPage() {
  const profile = await requireStaff();
  const menu = await getMenu();
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Menu"
      subtitle="View-only product catalog"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {menu.items.map((item) => (
          <Card
            key={item.product_id}
            title={item.name}
            className="rounded-card border-border shadow-soft"
          >
            <p className="font-bold text-leaf">₱{item.price.toFixed(2)}</p>
            <p className="text-sm text-muted">{item.category_name}</p>
            <p className="mt-2 text-sm">
              Today:{' '}
              {item.remaining_quantity === null
                ? 'Unlimited'
                : `${item.remaining_quantity} remaining`}
            </p>
          </Card>
        ))}
      </div>
    </StaffShell>
  );
}
