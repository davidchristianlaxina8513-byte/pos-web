import { requireRole } from '@/features/auth/queries';
import { signOut } from '@/features/auth/actions';

/** Cashier landing. POS UI lands in Phase 2. */
export default async function PosPage() {
  const profile = await requireRole('cashier');
  return (
    <main className="bg-background text-foreground">
      <h1>POS</h1>
      <p>
        Signed in as {profile.email} ({profile.role}). POS UI lands in Phase 2.
      </p>
      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
