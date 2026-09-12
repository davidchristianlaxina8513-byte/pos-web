import { requireStaff } from '@/features/auth/queries';
import { signOut } from '@/features/auth/actions';
import { getMenu } from '@/features/pos/queries';
import { PosScreen } from '@/features/pos/components/PosScreen';
import { Avatar } from '@/components/common/Avatar';
import { SignOutIcon } from '@/components/common/icons';

/** POS: menu → cart → checkout for cashiers and admins. */
export default async function PosPage() {
  const profile = await requireStaff();
  const menu = await getMenu();
  return (
    <main className="min-h-screen bg-surface text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <Avatar name={profile.email} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold">{profile.email}</p>
            <p className="text-xs text-muted capitalize">{profile.role}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="flex h-11 w-11 items-center justify-center rounded-full text-pine-deep"
            >
              <SignOutIcon />
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-8">
        <PosScreen menu={menu} />
      </div>
    </main>
  );
}
