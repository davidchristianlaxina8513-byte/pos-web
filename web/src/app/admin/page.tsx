import { requireRole } from '@/features/auth/queries';
import { signOut } from '@/features/auth/actions';

/** Admin landing. Back office lands in Phase 3. */
export default async function AdminPage() {
  const profile = await requireRole('admin');
  return (
    <main className="bg-background text-foreground">
      <h1>Admin</h1>
      <p>
        Signed in as {profile.email} ({profile.role}). Back office lands in
        Phase 3.
      </p>
      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
