import { requireRole } from '@/features/auth/queries';
import { getCategories, getManagedMenu } from '@/features/menu/queries';
import { MenuManager } from '@/components/modules/menu/MenuManager';
import { StaffShell } from '@/components/layout/staff-shell';

/** Admin menu + category management. */
export default async function MenuPage() {
  const [profile, { items }, categories] = await Promise.all([
    requireRole('admin'),
    getManagedMenu(),
    getCategories(),
  ]);
  return (
    <StaffShell email={profile.email} role={profile.role} fullWidth={true}>
      <MenuManager categories={categories} items={items} />
    </StaffShell>
  );
}
