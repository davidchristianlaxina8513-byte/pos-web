'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Field } from '@/components/common/Field';
import { createStaff, setStaffActive } from '../actions';
import type { StaffUser } from '../queries';
import type { UserRole } from '@/features/auth/roles';

export interface UsersManagerProps {
  users: StaffUser[];
  currentUserId: string;
}

/** Staff list + create form + enable/disable with confirm. */
export function UsersManager({ users, currentUserId }: UsersManagerProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await createStaff({ username, password, role });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUsername('');
    setPassword('');
    setNotice('Account created.');
    router.refresh();
  };

  const handleToggle = async (user: StaffUser) => {
    if (confirmId !== user.user_id) {
      setConfirmId(user.user_id);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await setStaffActive(user.user_id, user.is_active === false);
    setBusy(false);
    setConfirmId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="grid gap-4">
      <Card title="Add staff">
        <div className="flex max-w-md flex-col gap-3">
          <Field
            label="Email"
            name="username"
            type="email"
            autoComplete="email"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <label className="block">
            <span className="text-foreground">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-foreground"
            >
              <option value="cashier">Cashier</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          {error ? (
            <p role="alert" className="text-danger">
              {error}
            </p>
          ) : null}
          {notice ? <p className="text-success">{notice}</p> : null}
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? 'Saving…' : 'Create account'}
          </Button>
        </div>
      </Card>
      <Card title={`Staff (${users.length})`}>
        <ul className="flex flex-col gap-2">
          {users.map((user) => (
            <li
              key={user.user_id}
              className="flex items-center justify-between gap-2"
            >
              <div>
                <p className="text-foreground">{user.username}</p>
                <p className="text-muted">
                  {user.role === 'admin' ? 'Administrator' : 'Cashier'} ·{' '}
                  {user.is_active === false ? 'Disabled' : 'Active'}
                  {user.user_id === currentUserId ? ' · You' : null}
                </p>
              </div>
              {user.user_id === currentUserId ? null : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleToggle(user)}
                >
                  {confirmId === user.user_id
                    ? 'Confirm'
                    : user.is_active === false
                      ? 'Enable'
                      : 'Disable'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
