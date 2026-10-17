import { redirect } from 'next/navigation';
import { requireStaff } from '@/features/auth/queries';
import { signOut } from '@/features/auth/actions';
import { Avatar } from '@/components/common/Avatar';
import { Card } from '@/components/common/Card';
import { Field } from '@/components/form/Field';
import { StaffShell } from '@/components/layout/staff-shell';
import { SignOutIcon } from '@/components/common/icons';
import { PreferencesPanel } from '@/components/modules/settings/PreferencesPanel';

/**
 * Lightweight staff profile (cashier-facing). Admins own the full
 * `/admin/settings` page and are redirected there — this view carries no
 * admin sections by design.
 */
export default async function ProfilePage() {
  const profile = await requireStaff();
  if (profile.role === 'admin') redirect('/admin/settings');
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Profile"
      subtitle={`Signed in as ${profile.email}`}
    >
      <div className="grid gap-3">
        <Card className="rounded-card border-border shadow-soft">
          <div className="flex items-center gap-3">
            <Avatar name={profile.email} />
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold tracking-tight">
                {profile.email}
              </p>
              <p className="text-sm text-muted capitalize">{profile.role}</p>
            </div>
          </div>
        </Card>

        <Card
          title="Personal information"
          className="rounded-card border-border shadow-soft"
        >
          <div className="flex max-w-md flex-col gap-3">
            <Field
              label="Email"
              name="email"
              value={profile.email}
              disabled
              inputClassName="h-10 rounded-md border-border bg-white text-sm"
              hint="Login email — managed by your administrator record."
            />
            <Field
              label="Role"
              name="role"
              value="Cashier"
              disabled
              inputClassName="h-10 rounded-md border-border bg-white text-sm"
            />
          </div>
        </Card>

        <Card
          title="Preferences"
          className="rounded-card border-border shadow-soft"
        >
          <PreferencesPanel />
        </Card>

        <form action={signOut}>
          <button
            type="submit"
            className="action-focus flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface text-sm font-semibold shadow-xs hover:bg-mist"
          >
            <SignOutIcon className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </StaffShell>
  );
}
