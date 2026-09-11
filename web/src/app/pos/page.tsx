import { requireStaff } from '@/features/auth/queries';
import { signOut } from '@/features/auth/actions';
import { getMenu } from '@/features/pos/queries';
import { PosScreen } from '@/features/pos/components/PosScreen';
import { Button } from '@/components/common/Button';

/** POS: menu → cart → checkout for cashiers and admins. */
export default async function PosPage() {
  const profile = await requireStaff();
  const menu = await getMenu();
  return (
    <main className="bg-background text-foreground">
      <header className="flex items-center justify-between">
        <div>
          <h1>POS</h1>
          <p className="text-muted">
            Signed in as {profile.email} ({profile.role}).
          </p>
        </div>
        <form action={signOut}>
          <Button variant="secondary" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>
      <div className="mt-4">
        <PosScreen menu={menu} />
      </div>
    </main>
  );
}
