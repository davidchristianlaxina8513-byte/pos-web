import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getInventoryItems } from '@/features/inventory/queries';
import { getOpenRestockCount } from '@/features/restock/queries';
import { InventoryList } from '@/features/inventory/components/InventoryList';
import { Card } from '@/components/common/Card';
import { StaffShell } from '@/components/layout/staff-shell';

/** v2 admin inventory: header, restock shortcut, carded stock list. */
export default async function InventoryPage() {
  const profile = await requireRole('admin');
  const [items, openRestockCount] = await Promise.all([
    getInventoryItems(),
    getOpenRestockCount(),
  ]);
  const lowCount = items.filter((item) => item.status === 'low').length;
  const criticalCount = items.filter(
    (item) => item.status === 'critical',
  ).length;
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Inventory"
      subtitle={`${items.length} items · ${lowCount} low · ${criticalCount} critical`}
      actions={
        <Link
          href="/admin/restock"
          className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-surface shadow-soft"
        >
          Restock requests
          {openRestockCount > 0 ? ` (${openRestockCount} open)` : null}
        </Link>
      }
    >
      <Card
        title="Stock levels"
        className="rounded-card border-border shadow-soft"
      >
        <InventoryList items={items} />
      </Card>
    </StaffShell>
  );
}
