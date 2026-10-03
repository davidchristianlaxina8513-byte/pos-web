import { requireRole } from '@/features/auth/queries';
import { getCategories, getManagedMenu } from '@/features/menu/queries';
import { MenuManager } from '@/features/menu/components/MenuManager';
import { StaffShell } from '@/components/layout/staff-shell';

/** Admin menu + category management. */
export default async function MenuPage() {
  const profile = await requireRole('admin');
  const [{ items }, categories] = await Promise.all([
    getManagedMenu(),
    getCategories(),
  ]);
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Menu management"
    >
      <MenuManager categories={categories} items={items} />
    </StaffShell>
  );
}
