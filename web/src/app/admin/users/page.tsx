import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getUsers } from '@/features/users/queries';
import { UsersManager } from '@/features/users/components/UsersManager';

/** Admin staff accounts: create via edge function, enable/disable via RPC. */
export default async function UsersPage() {
  const profile = await requireRole('admin');
  const users = await getUsers();
  return (
    <main className="bg-background text-foreground">
      <h1>User management</h1>
      <p className="mt-1">
        <Link
          href="/admin"
          className="rounded border border-border bg-surface px-3 py-1 font-medium text-foreground"
        >
          Back to Admin
        </Link>
      </p>
      <div className="mt-4">
        <UsersManager users={users} currentUserId={profile.userId} />
      </div>
    </main>
  );
}
