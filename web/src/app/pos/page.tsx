import { requireStaff } from '@/features/auth/queries';
import { getMenu } from '@/features/pos/queries';
import { getCurrentShift } from '@/features/shifts/queries';
import { getActiveOrders } from '@/features/pos/actions';
import { PosScreen } from '@/components/modules/pos/PosScreen';
import { StaffShell } from '@/components/layout/staff-shell';

/** POS: menu → cart → checkout for cashiers and admins. */
export default async function PosPage() {
  const [profile, menu, shift, activeOrders] = await Promise.all([
    requireStaff(),
    getMenu(),
    getCurrentShift(),
    getActiveOrders(),
  ]);
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Point of sale"
      fullWidth
    >
      <PosScreen
        menu={menu}
        userRole={profile.role}
        openShift={shift}
        initialActiveCount={activeOrders.length}
      />
    </StaffShell>
  );
}
