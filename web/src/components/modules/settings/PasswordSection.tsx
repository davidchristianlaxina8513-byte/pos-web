'use client';

import { useState } from 'react';
import { Button } from '@/components/form/Button';
import { PasswordField } from '@/components/form/PasswordField';
import { updatePassword } from '@/features/settings/actions';
import { useAlert } from '@/components/toast';

/** Security section: new-password + confirm, backed by Supabase Auth. */
export function PasswordSection() {
  const { successAlert, errorAlert } = useAlert();
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
      errorAlert(
        'Password Mismatch',
        'The passwords you entered do not match.',
      );
      return;
    }
    setIsSaving(true);
    const result = await updatePassword({ password });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      errorAlert('Update Failed', result.error);
      return;
    }
    setPassword('');
    setConfirm('');
    setNotice('Password updated.');
    successAlert(
      'Password Updated',
      'Your password has been updated successfully.',
    );
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
        inputClassName="h-10 rounded-md border-border bg-white text-sm"
      />
      <PasswordField
        label="Confirm new password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Repeat the new password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        inputClassName="h-10 rounded-md border-border bg-white text-sm"
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
        className="h-10 w-full rounded-md bg-pine text-sm font-semibold text-surface shadow-xs hover:bg-pine-deep"
      >
        {isSaving ? 'Saving…' : 'Update password'}
      </Button>
    </div>
  );
}
