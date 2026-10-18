import Link from 'next/link';
import { requireStaff } from '@/features/auth/queries';
import { signOut } from '@/features/auth/actions';
import { Avatar } from '@/components/common/Avatar';
import { PasswordSection } from '@/components/modules/settings/PasswordSection';
import { PreferencesPanel } from '@/components/modules/settings/PreferencesPanel';
import { StaffShell } from '@/components/layout/staff-shell';
import {
  ArrowRightIcon,
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  NoSymbolIcon,
  ShoppingCartIcon,
} from '@/components/common/hero-icons';
import { LockIcon } from '@/components/common/icons';

export const dynamic = 'force-dynamic';

/**
 * Cashier-facing user profile and settings.
 * Designed with 100% parity with the admin settings layout.
 */
export default async function ProfilePage() {
  const profile = await requireStaff();

  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Profile & Settings"
      subtitle={`Signed in as ${profile.email}`}
      breadcrumbs={[{ name: 'Profile', current: true }]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {profile.role === 'admin' && (
            <Link
              href="/admin/settings"
              className="action-focus inline-flex h-10 items-center justify-center gap-2 rounded-md border border-pine/30 bg-surface px-4 text-sm font-semibold text-pine shadow-xs transition hover:bg-pine/5"
            >
              <span>Admin Settings</span>
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          )}
          <Link
            href="/pos"
            className="action-focus inline-flex h-10 items-center justify-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-surface shadow-xs transition hover:bg-pine-deep"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            <span>Open Register</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      }
      fullWidth={true}
    >
      <div className="divide-y divide-gray-900/10 dark:divide-border/60">
        {/* Section 1: Personal Information */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-foreground">
              Personal Information
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-muted">
              Your cashier credentials and register operator identity.
            </p>
          </div>

          <div className="bg-white dark:bg-surface shadow-sm ring-1 ring-gray-900/5 dark:ring-border sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8 space-y-6">
              {/* Cashier Identity Banner */}
              <div className="flex items-center gap-4 rounded-xl border border-gray-100 dark:border-border/60 bg-gray-50/60 dark:bg-mist/30 p-4">
                <Avatar name={profile.email} className="h-12 w-12 text-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-bold text-gray-900 dark:text-foreground">
                      {profile.email}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Register Operator
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-muted mt-0.5 capitalize">
                    Role: {profile.role} · Cafe Elvira POS
                  </p>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-foreground">
                    Email Address
                  </label>
                  <div className="mt-2">
                    <input
                      type="email"
                      disabled
                      value={profile.email}
                      className="block w-full h-11 rounded-md border-0 py-2.5 px-3 bg-gray-50 dark:bg-mist/40 text-gray-700 dark:text-foreground shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-border sm:text-sm sm:leading-6 cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-muted">
                    Login email identity managed by system administrator.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-foreground">
                    Assigned Account Role
                  </label>
                  <div className="mt-2 flex items-center h-11">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pine/10 px-3.5 py-1 text-xs font-bold text-pine border border-pine/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-pine" />
                      {profile.role === 'admin'
                        ? 'Administrator (Full Access)'
                        : 'Cashier (Counter Operator)'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-muted">
                    Grants access to POS counter checkout, shift drawer, and
                    kitchen queue.
                  </p>
                </div>
              </div>

              {/* Quick Operational Navigation Tiles */}
              <div className="pt-2 border-t border-gray-100 dark:border-border/60 space-y-3">
                <Link
                  href="/cashier-operations"
                  className="group flex items-center justify-between rounded-xl border border-gray-200 dark:border-border bg-gray-50/60 dark:bg-mist/20 p-4 transition-all hover:bg-mist/60 hover:border-pine/30 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pine/10 text-pine">
                      <BanknotesIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-foreground group-hover:text-pine transition-colors">
                        Cashier Shift & Drawer Operations
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-muted mt-0.5">
                        Open shifts, declare starting float, count drawer cash,
                        and submit turnovers.
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-pine transition-colors" />
                </Link>

                <Link
                  href="/pos"
                  className="group flex items-center justify-between rounded-xl border border-gray-200 dark:border-border bg-gray-50/60 dark:bg-mist/20 p-4 transition-all hover:bg-mist/60 hover:border-pine/30 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pine/10 text-pine">
                      <ShoppingCartIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-foreground group-hover:text-pine transition-colors">
                        Point of Sale (POS) Register
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-muted mt-0.5">
                        Ring up counter orders, accept Cash or QR Ph payments,
                        and print receipts.
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-pine transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Security & Password */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-foreground">
              Security & Password
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-muted">
              Update your account password to protect your cashier credentials.
              Minimum 6 characters.
            </p>
          </div>

          <div className="bg-white dark:bg-surface shadow-sm ring-1 ring-gray-900/5 dark:ring-border sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-gray-200/80 dark:border-border/80 bg-gray-50/50 dark:bg-mist/30 p-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pine/10 text-pine">
                  <LockIcon className="h-4 w-4" />
                </div>
                <p className="text-xs text-gray-600 dark:text-muted leading-relaxed">
                  Password changes take effect immediately for this signed-in
                  account.
                </p>
              </div>
              <PasswordSection />
            </div>
          </div>
        </div>

        {/* Section 3: Role Scope & Operational Capabilities */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-foreground">
              Role Scope & Permissions
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-muted">
              Operational capabilities authorized for counter staff versus
              protected manager boundaries under Cafe Elvira RBAC.
            </p>
          </div>

          <div className="bg-white dark:bg-surface shadow-sm ring-1 ring-gray-900/5 dark:ring-border sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Authorized Capabilities */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      What Cashiers Can Do
                    </span>
                  </div>
                  <ul className="text-xs text-gray-600 dark:text-muted space-y-1.5 pl-6 list-disc">
                    <li>Open register shifts & set starting cash float</li>
                    <li>Ring up sales (Cash & QR Ph payments)</li>
                    <li>Progress live kitchen queue tickets</li>
                    <li>Reconcile drawer cash & submit turnovers</li>
                    <li>View daily sales ledger & reprint receipts</li>
                    <li>Check daily portion quotas & availability</li>
                  </ul>
                </div>

                {/* Protected Boundaries */}
                <div className="rounded-xl border border-gray-200 dark:border-border bg-gray-50/50 dark:bg-mist/30 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <NoSymbolIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-gray-900 dark:text-foreground">
                      Manager Protected
                    </span>
                  </div>
                  <ul className="text-xs text-gray-600 dark:text-muted space-y-1.5 pl-6 list-disc">
                    <li>Transaction voids (requires manager password)</li>
                    <li>Turnover verification & discrepancy approval</li>
                    <li>Menu catalog, prices & recipe adjustments</li>
                    <li>Daily production quota caps & resets</li>
                    <li>Staff user management & account controls</li>
                    <li>Multi-day financial reports & audit trails</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-border/60 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-muted">
                  Need a full breakdown of operating rules and policies?
                </span>
                <Link
                  href="/cashier-operations#role-permissions"
                  className="action-focus text-xs font-bold text-pine hover:underline inline-flex items-center gap-1"
                >
                  <span>Detailed Role Guide</span>
                  <ChevronRightIcon className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Preferences & Interface Theme */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-foreground">
              Preferences
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-muted">
              Configure real-time register notifications, inventory alerts, and
              interface theme mode.
            </p>
          </div>

          <div className="bg-white dark:bg-surface shadow-sm ring-1 ring-gray-900/5 dark:ring-border sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <PreferencesPanel />
            </div>
          </div>
        </div>

        {/* Section 5: Session Management & Sign Out */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-foreground">
              Session Management
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-muted">
              Terminate your active register session on this workstation.
            </p>
          </div>

          <div className="bg-white dark:bg-surface shadow-sm ring-1 ring-gray-900/5 dark:ring-border sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-foreground">
                  Signed In Session
                </p>
                <p className="text-xs text-gray-500 dark:text-muted mt-0.5">
                  Connected as{' '}
                  <strong className="text-gray-700 dark:text-foreground">
                    {profile.email}
                  </strong>{' '}
                  (Manila Timezone)
                </p>
              </div>

              <form action={signOut}>
                <button
                  type="submit"
                  className="action-focus inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-border bg-white dark:bg-surface px-5 text-sm font-semibold text-danger hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-300 transition-colors shadow-2xs cursor-pointer"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </StaffShell>
  );
}
