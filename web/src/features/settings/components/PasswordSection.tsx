'use client';

import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { PasswordField } from '@/components/common/PasswordField';
import { updatePassword } from '../actions';

/** Security section: new-password + confirm, backed by Supabase Auth. */
export function PasswordSection() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setNotice(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setIsSaving(true);
    const result = await updatePassword({ password });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPassword('');
    setConfirm('');
    setNotice('Password updated.');
  };

  return (
    <div className="flex max-w-md flex-col gap-3">
      <PasswordField
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        placeholder="At least 6 characters"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        inputClassName="h-[52px] rounded-2xl border-border bg-mist"
      />
      <PasswordField
        label="Confirm new password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Repeat the new password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        inputClassName="h-[52px] rounded-2xl border-border bg-mist"
      />
      {error ? (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-center text-sm font-semibold text-leaf">{notice}</p>
      ) : null}
      <Button
        onClick={handleSave}
        disabled={isSaving || password.length === 0}
        className="h-[52px] w-full rounded-full bg-pine text-base text-surface"
      >
        {isSaving ? 'Saving…' : 'Update password'}
      </Button>
    </div>
  );
}
