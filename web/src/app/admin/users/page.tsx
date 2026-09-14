import { requireRole } from '@/features/auth/queries';
import { getUsers } from '@/features/users/queries';
import { UsersManager } from '@/features/users/components/UsersManager';
import { StaffShell } from '@/components/layout/staff-shell';

/** Admin staff accounts: create via edge function, enable/disable via RPC. */
export default async function UsersPage() {
  const profile = await requireRole('admin');
  const users = await getUsers();
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="User management"
    >
      <UsersManager users={users} currentUserId={profile.userId} />
    </StaffShell>
  );
}
