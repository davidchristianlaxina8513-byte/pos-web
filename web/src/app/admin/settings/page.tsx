import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { PasswordSection } from '@/features/settings/components/PasswordSection';
import { PreferencesPanel } from '@/features/settings/components/PreferencesPanel';
import { Card } from '@/components/common/Card';
import { Field } from '@/components/common/Field';
import { IconTile } from '@/components/common/IconTile';
import {
  ArrowRightIcon,
  LockIcon,
  PersonIcon,
} from '@/components/common/icons';
import { StaffShell } from '@/components/layout/staff-shell';

/** Admin account, security, and browser preferences. */
export default async function SettingsPage() {
  const profile = await requireRole('admin');
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Settings"
      subtitle={`Signed in as ${profile.email}`}
    >
      <div className="grid gap-3">
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
              inputClassName="h-[52px] rounded-2xl border-border bg-mist"
              hint="Login email — managed by your administrator record."
            />
            <Field
              label="Role"
              name="role"
              value={profile.role === 'admin' ? 'Administrator' : 'Cashier'}
              disabled
              inputClassName="h-[52px] rounded-2xl border-border bg-mist"
            />
          </div>
        </Card>

        <Link
          href="/admin/users"
          className="card-hover action-focus flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-soft"
        >
          <IconTile tone="peri">
            <PersonIcon />
          </IconTile>
          <span className="flex-1">
            <span className="block text-[15px] font-extrabold tracking-tight">
              User management
            </span>
            <span className="block text-sm text-muted">
              Staff accounts and access
            </span>
          </span>
          <ArrowRightIcon className="h-5 w-5 text-pine-deep" />
        </Link>

        <Card
          title="Security & password"
          className="rounded-card border-border shadow-soft"
        >
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-mist p-3">
            <IconTile tone="sage" className="h-9 w-9">
              <LockIcon className="h-5 w-5" />
            </IconTile>
            <p className="text-sm text-muted">
              Changes apply to this signed-in account immediately.
            </p>
          </div>
          <PasswordSection />
        </Card>

        <Card
          title="Preferences"
          className="rounded-card border-border shadow-soft"
        >
          <PreferencesPanel />
        </Card>
      </div>
    </StaffShell>
  );
}
