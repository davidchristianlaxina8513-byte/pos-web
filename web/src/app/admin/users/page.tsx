import { requireRole } from '@/features/auth/queries';
import { getUsers } from '@/features/users/queries';
import { UsersManager } from '@/components/modules/users/UsersManager';
import { StaffShell } from '@/components/layout/staff-shell';

/** Admin staff accounts: create via edge function, enable/disable via RPC. */
export default async function UsersPage() {
  const [profile, users] = await Promise.all([
    requireRole('admin'),
    getUsers(),
  ]);
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="User Management"
      subtitle="Manage staff accounts, assign roles, and control register access permissions."
      breadcrumbs={[{ name: 'User Management', current: true }]}
      fullWidth={true}
    >
      <UsersManager users={users} currentUserId={profile.userId} />
    </StaffShell>
  );
}
