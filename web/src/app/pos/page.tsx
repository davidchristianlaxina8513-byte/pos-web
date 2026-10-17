import { requireStaff } from '@/features/auth/queries';
import { getMenu } from '@/features/pos/queries';
import { PosScreen } from '@/components/modules/pos/PosScreen';
import { StaffShell } from '@/components/layout/staff-shell';

/** POS: menu → cart → checkout for cashiers and admins. */
export default async function PosPage() {
  const profile = await requireStaff();
  const menu = await getMenu();
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Point of sale"
      fullWidth
    >
      <PosScreen menu={menu} />
    </StaffShell>
  );
}
