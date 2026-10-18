import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { PasswordSection } from '@/components/modules/settings/PasswordSection';
import { PreferencesPanel } from '@/components/modules/settings/PreferencesPanel';
import { StaffShell } from '@/components/layout/staff-shell';
import { ChevronRightIcon, UsersIcon } from '@/components/common/hero-icons';
import { LockIcon } from '@/components/common/icons';

/** Admin account, security, and browser preferences. */
export default async function SettingsPage() {
  const profile = await requireRole('admin');
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Settings"
      subtitle={`Signed in as ${profile.email}`}
      breadcrumbs={[{ name: 'Settings', current: true }]}
      fullWidth={true}
    >
      <div className="divide-y divide-gray-900/10">
        {/* Section 1: Personal Information */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Personal Information
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Your administrative credentials and staff directory management
              shortcut.
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-900">
                    Email Address
                  </label>
                  <div className="mt-2">
                    <input
                      type="email"
                      disabled
                      value={profile.email}
                      className="block w-full h-11 rounded-md border-0 py-2.5 px-3 bg-gray-50 text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6 cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Primary authentication identity for administrative sessions.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900">
                    Account Role
                  </label>
                  <div className="mt-2 flex items-center h-11">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pine/10 px-3.5 py-1 text-xs font-bold text-pine border border-pine/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-pine" />
                      Administrator (Full Access)
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Grants unrestricted access across POS register, catalog,
                    reports, and staff management.
                  </p>
                </div>
              </div>

              {/* Staff Management Navigation Tile */}
              <div className="pt-2 border-t border-gray-100">
                <Link
                  href="/admin/users"
                  className="group flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/60 p-4 transition-all hover:bg-mist/60 hover:border-pine/30 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pine/10 text-pine">
                      <UsersIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-pine transition-colors">
                        User &amp; Staff Management
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Manage cashier accounts, create new staff members, and
                        toggle account access.
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
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Security &amp; Password
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Update your account password to protect your administrative
              credentials. Minimum 6 characters.
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-gray-200/80 bg-gray-50/50 p-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pine/10 text-pine">
                  <LockIcon className="h-4 w-4" />
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Password changes take effect immediately for this signed-in
                  account.
                </p>
              </div>
              <PasswordSection />
            </div>
          </div>
        </div>

        {/* Section 3: Preferences & Interface Theme */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Preferences
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Configure real-time notifications, inventory alerts, and display
              theme.
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <PreferencesPanel />
            </div>
          </div>
        </div>
      </div>
    </StaffShell>
  );
}
