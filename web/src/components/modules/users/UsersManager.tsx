'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/form/Button';
import { Field } from '@/components/form/Field';
import { Select } from '@/components/form/Select';
import { Modal } from '@/components/modal/Modal';
import {
  createStaff,
  setStaffActive,
  updateStaff,
} from '@/features/users/actions';
import type { StaffUser } from '@/features/users/queries';
import type { UserRole } from '@/features/auth/roles';
import { useAlert } from '@/components/toast';
import { cn } from '@/lib/cn';
import {
  UsersIcon,
  ShoppingBagIcon,
  ClipboardDocumentCheckIcon,
  NoSymbolIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from '@/components/common/hero-icons';

export interface UsersManagerProps {
  users: StaffUser[];
  currentUserId: string;
}

const ROLE_OPTIONS = [
  { id: 'cashier', label: 'Cashier' },
  { id: 'admin', label: 'Administrator' },
];

/** Staff list + create form + edit modal + enable/disable with confirm. */
export function UsersManager({ users, currentUserId }: UsersManagerProps) {
  const router = useRouter();
  const { successAlert, errorAlert } = useAlert();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<
    'all' | 'cashier' | 'admin' | 'active' | 'disabled'
  >('all');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('cashier');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const stats = useMemo(() => {
    return {
      total: users.length,
      cashiers: users.filter((u) => u.role === 'cashier').length,
      activeCashiers: users.filter(
        (u) => u.role === 'cashier' && u.is_active !== false,
      ).length,
      admins: users.filter((u) => u.role === 'admin').length,
      active: users.filter((u) => u.is_active !== false).length,
      disabled: users.filter((u) => u.is_active === false).length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (search) {
        const q = search.toLowerCase().trim();
        if (!u.username.toLowerCase().includes(q)) return false;
      }
      if (filter === 'admin' && u.role !== 'admin') return false;
      if (filter === 'cashier' && u.role !== 'cashier') return false;
      if (filter === 'active' && u.is_active === false) return false;
      if (filter === 'disabled' && u.is_active !== false) return false;
      return true;
    });
  }, [users, search, filter]);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await createStaff({ username, password, role });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      errorAlert('Create User Failed', result.error);
      return;
    }
    const createdUser = username;
    setUsername('');
    setPassword('');
    setNotice('Account created.');
    successAlert(
      'Account Created',
      `Staff account "${createdUser}" has been created.`,
    );
    router.refresh();
  };

  const handleToggle = async (user: StaffUser) => {
    if (confirmId !== user.user_id) {
      setConfirmId(user.user_id);
      return;
    }
    setBusy(true);
    setError(null);
    const willBeActive = user.is_active === false;
    const result = await setStaffActive(user.user_id, willBeActive);
    setBusy(false);
    setConfirmId(null);
    if (!result.ok) {
      setError(result.error);
      errorAlert('Status Update Failed', result.error);
      return;
    }
    successAlert(
      'Account Updated',
      `Account "${user.username}" was ${willBeActive ? 'activated' : 'deactivated'}.`,
    );
    router.refresh();
  };

  const openEditModal = (user: StaffUser) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditIsActive(user.is_active !== false);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setEditBusy(true);
    setEditError(null);
    const res = await updateStaff(editingUser.user_id, {
      isActive: editIsActive,
      role: editRole,
    });
    setEditBusy(false);
    if (!res.ok) {
      setEditError(res.error);
      errorAlert('Update Failed', res.error);
      return;
    }
    successAlert(
      'Staff Account Updated',
      `Changes to "${editingUser.username}" were saved successfully.`,
    );
    setEditingUser(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. KPI Overview Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">
              Total Staff
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine/10 text-pine">
              <UsersIcon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-foreground">
            {stats.total}
          </p>
          <p className="mt-0.5 text-xs text-muted">Registered accounts</p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">
              Active Cashiers
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine/10 text-pine">
              <ShoppingBagIcon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-foreground">
            {stats.activeCashiers}
          </p>
          <p className="mt-0.5 text-xs text-muted">Register operators</p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">
              Administrators
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine/10 text-pine">
              <ClipboardDocumentCheckIcon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-foreground">
            {stats.admins}
          </p>
          <p className="mt-0.5 text-xs text-muted">System managers</p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">
              Disabled Accounts
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-muted">
              <NoSymbolIcon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-foreground">
            {stats.disabled}
          </p>
          <p className="mt-0.5 text-xs text-muted">Access suspended</p>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Add Staff Member */}
        <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          <div className="border-b border-border/80 pb-3">
            <h2 className="text-base font-bold text-foreground">
              Add New Staff
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Create credentials and assign register permissions.
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            <Field
              label="Email"
              name="username"
              type="email"
              autoComplete="email"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. staff@elvira.cafe"
              inputClassName="h-10 rounded-md border-border bg-white text-sm focus:border-pine focus:outline-pine"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              inputClassName="h-10 rounded-md border-border bg-white text-sm focus:border-pine focus:outline-pine"
            />
            <Select
              label="Role"
              options={ROLE_OPTIONS}
              value={role}
              onChange={(next) => setRole(next as UserRole)}
            />

            {/* Role Capabilities Preview Card */}
            <div className="rounded-lg border border-border/80 bg-mist/40 p-3 text-xs space-y-1.5">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <CheckCircleIcon className="h-3.5 w-3.5 text-pine shrink-0" />
                {role === 'cashier'
                  ? 'Cashier Role Capabilities'
                  : 'Administrator Role Capabilities'}
              </span>
              <p className="text-muted leading-relaxed text-[11px]">
                {role === 'cashier'
                  ? 'Authorized for counter sales (Cash, QR Ph), starting/closing shifts, drawer reconciliation & turnovers, live kitchen order progression, daily sales inspection, and receipt printing.'
                  : 'Full system privileges including manager void authorization, cash turnover review & verification, menu and recipe pricing, daily quota allocations, staff account management, and financial audit logs.'}
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-surface p-3 text-xs font-semibold text-danger"
              >
                <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {notice ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{notice}</span>
              </div>
            ) : null}

            <Button
              onClick={handleCreate}
              disabled={busy}
              className="action-focus mt-1 inline-flex h-10 w-full items-center justify-center rounded-md bg-pine px-4 text-sm font-semibold text-surface shadow-xs transition-colors hover:bg-pine-deep disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Create account'}
            </Button>
          </div>
        </div>

        {/* Right: Staff Directory */}
        <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Staff Directory
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Active staff accounts and access privileges ({users.length}{' '}
                total).
              </p>
            </div>
          </div>

          {/* Search bar & quick filters */}
          <div className="flex flex-col gap-2.5">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff by email..."
                className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-9 text-sm font-medium text-foreground placeholder:text-muted focus:border-pine focus:outline-pine"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* Clean filter chips without excessive colors */}
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label="Filter staff accounts"
            >
              {(
                [
                  { key: 'all', label: 'All', count: stats.total },
                  { key: 'cashier', label: 'Cashiers', count: stats.cashiers },
                  { key: 'admin', label: 'Admins', count: stats.admins },
                  { key: 'active', label: 'Active', count: stats.active },
                  { key: 'disabled', label: 'Disabled', count: stats.disabled },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setFilter(chip.key)}
                  aria-pressed={filter === chip.key}
                  className={cn(
                    'action-focus inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                    filter === chip.key
                      ? 'border-pine bg-pine text-surface shadow-xs'
                      : 'border-border/80 bg-white text-foreground hover:bg-mist',
                  )}
                >
                  <span>{chip.label}</span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                      filter === chip.key
                        ? 'bg-white/20 text-surface'
                        : 'bg-mist text-muted',
                    )}
                  >
                    {chip.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* User List */}
          <ul className="flex flex-col gap-2.5">
            {filteredUsers.length === 0 ? (
              <li className="rounded-xl border border-dashed border-border/80 bg-surface p-8 text-center text-sm text-muted">
                No staff accounts match your search or filter.
              </li>
            ) : (
              filteredUsers.map((user) => (
                <li
                  key={user.user_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-surface p-3.5 shadow-2xs transition-colors hover:bg-slate-50/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine/10 font-bold text-pine text-xs">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-sm font-bold text-foreground">
                          {user.username}
                        </p>
                        {user.user_id === currentUserId && (
                          <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            You
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                            user.role === 'admin'
                              ? 'border-pine/30 bg-pine/10 text-pine'
                              : 'border-border bg-slate-100 text-slate-700',
                          )}
                        >
                          {user.role === 'admin' ? 'Administrator' : 'Cashier'}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                            user.is_active === false
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                          )}
                        >
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              user.is_active === false
                                ? 'bg-rose-500'
                                : 'bg-emerald-500',
                            )}
                          />
                          {user.is_active === false ? 'Disabled' : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {user.user_id === currentUserId ? (
                    <span className="text-xs font-semibold text-muted italic sm:pr-2">
                      Current Session
                    </span>
                  ) : confirmId === user.user_id ? (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        className="action-focus h-8 rounded-md bg-danger px-3 text-xs font-semibold text-surface shadow-xs hover:bg-danger/90"
                        disabled={busy}
                        onClick={() => handleToggle(user)}
                      >
                        Confirm
                      </Button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="action-focus h-8 rounded-md border border-border bg-white px-2.5 text-xs font-semibold text-muted hover:bg-mist"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="action-focus inline-flex h-8 items-center gap-1 rounded-md border border-border bg-white px-2.5 text-xs font-semibold text-foreground shadow-xs hover:bg-mist transition-colors"
                        aria-label={`Edit ${user.username}`}
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5 text-muted" />
                        <span>Edit</span>
                      </button>

                      <Button
                        variant="secondary"
                        size="sm"
                        className={cn(
                          'action-focus shrink-0 h-8 rounded-md border px-3 text-xs font-semibold shadow-xs',
                          user.is_active === false
                            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100'
                            : 'border-danger-border bg-danger-surface text-danger hover:bg-danger/10',
                        )}
                        disabled={busy}
                        onClick={() => handleToggle(user)}
                      >
                        {user.is_active === false ? 'Enable' : 'Disable'}
                      </Button>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* 3. Edit Staff Account Modal */}
      <Modal
        isOpen={editingUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
        title="Edit Staff Account"
      >
        {editingUser && (
          <div className="flex flex-col gap-4">
            {/* User Info Header */}
            <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-slate-50/60 p-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine/10 font-bold text-pine text-sm">
                {editingUser.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {editingUser.username}
                </p>
                <p className="text-xs text-muted">
                  Account ID:{' '}
                  <span className="font-mono">
                    {editingUser.user_id.slice(0, 8)}…
                  </span>
                </p>
              </div>
            </div>

            {/* Account Status Toggle */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Account Access Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditIsActive(true)}
                  className={cn(
                    'flex h-10 items-center justify-center gap-1.5 rounded-md border px-3 text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                    editIsActive
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                      : 'border-border bg-white text-muted hover:bg-mist hover:text-foreground',
                  )}
                >
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Active (Permitted)
                </button>
                <button
                  type="button"
                  onClick={() => setEditIsActive(false)}
                  className={cn(
                    'flex h-10 items-center justify-center gap-1.5 rounded-md border px-3 text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                    !editIsActive
                      ? 'border-danger bg-danger-surface text-danger ring-1 ring-danger'
                      : 'border-border bg-white text-muted hover:bg-mist hover:text-foreground',
                  )}
                >
                  <span className="size-2 rounded-full bg-danger" />
                  Disabled (Blocked)
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {editIsActive
                  ? 'Staff member is authorized to sign in and operate assigned modules.'
                  : 'Staff access is suspended; login attempts will be rejected.'}
              </p>
            </div>

            {/* Role Selection */}
            <div>
              <Select
                label="Assigned Role"
                options={ROLE_OPTIONS}
                value={editRole}
                onChange={(next) => setEditRole(next as UserRole)}
              />
              <p className="mt-1 text-[11px] text-muted">
                {editRole === 'admin'
                  ? 'Administrator has full permissions across all management modules and reports.'
                  : 'Cashier has access to register operations, orders, and daily shift management.'}
              </p>
            </div>

            {editError ? (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-surface p-3 text-xs font-semibold text-danger"
              >
                <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            ) : null}

            {/* Modal Action Buttons */}
            <div className="mt-2 flex items-center justify-end gap-2 border-t border-border/80 pt-3">
              <button
                type="button"
                disabled={editBusy}
                onClick={() => setEditingUser(null)}
                className="action-focus inline-flex h-10 items-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-mist disabled:opacity-50"
              >
                Cancel
              </button>
              <Button
                onClick={handleSaveEdit}
                disabled={editBusy}
                className="action-focus inline-flex h-10 items-center rounded-md bg-pine px-4 text-sm font-semibold text-surface shadow-xs hover:bg-pine-deep disabled:opacity-50"
              >
                {editBusy ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
