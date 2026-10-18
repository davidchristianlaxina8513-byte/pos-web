import { requireStaff } from '@/features/auth/queries';
import { getMenu } from '@/features/pos/queries';
import { ViewMenuCatalog } from '@/components/modules/menu';
import { StaffShell } from '@/components/layout/staff-shell';

export default async function ViewMenuPage() {
  const [profile, menu] = await Promise.all([requireStaff(), getMenu()]);

  return (
    <StaffShell email={profile.email} role={profile.role} fullWidth={true}>
      <ViewMenuCatalog
        categories={menu.categories}
        items={menu.items}
        userRole={profile.role}
      />
    </StaffShell>
  );
}
