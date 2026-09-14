import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { PasswordSection } from '@/features/settings/components/PasswordSection';
import { Card } from '@/components/common/Card';
import { Field } from '@/components/common/Field';
import { IconTile } from '@/components/common/IconTile';
import {
  ArrowRightIcon,
  LockIcon,
  PersonIcon,
} from '@/components/common/icons';
import { StaffShell } from '@/components/layout/staff-shell';

const UPCOMING = [
  {
    label: 'Notification preferences',
    sub: 'Order and stock alerts',
  },
  { label: 'Language', sub: 'Display language' },
  { label: 'Dark mode', sub: 'Appearance' },
];

/** v2 admin settings: profile, staff entry, password, upcoming prefs. */
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
          className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-soft"
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
          <ul className="flex flex-col gap-2">
            {UPCOMING.map((entry) => (
              <li
                key={entry.label}
                className="flex items-center gap-3 rounded-2xl bg-mist p-3 opacity-80"
              >
                <div className="flex-1">
                  <p className="text-sm font-bold">{entry.label}</p>
                  <p className="text-sm text-muted">{entry.sub}</p>
                </div>
                <span className="rounded-full bg-sage-200 px-2 py-0.5 text-xs font-bold text-pine-deep">
                  Soon
                </span>
                <button
                  type="button"
                  disabled
                  aria-label={`${entry.label} (coming soon)`}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted"
                >
                  <span
                    aria-hidden="true"
                    className="block h-5 w-9 rounded-full bg-border"
                  />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">
            These preferences have no backing feature yet and are intentionally
            disabled.
          </p>
        </Card>
      </div>
    </StaffShell>
  );
}
