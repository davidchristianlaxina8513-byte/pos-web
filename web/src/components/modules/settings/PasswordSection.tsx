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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
    <form onSubmit={handleSave} className="flex max-w-lg flex-col gap-5">
      <PasswordField
        id="newPassword"
        name="newPassword"
        label="New Password"
        autoComplete="new-password"
        placeholder="At least 6 characters"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        labelClassName="text-sm font-semibold text-gray-900"
        inputClassName="block w-full h-11 rounded-md border-0 py-2.5 px-3 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-pine sm:text-sm sm:leading-6"
      />

      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm New Password"
        autoComplete="new-password"
        placeholder="Repeat the new password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        labelClassName="text-sm font-semibold text-gray-900"
        inputClassName="block w-full h-11 rounded-md border-0 py-2.5 px-3 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-pine sm:text-sm sm:leading-6"
      />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="rounded-lg border border-leaf/30 bg-leaf/10 p-3 text-xs font-semibold text-leaf"
        >
          {notice}
        </div>
      ) : null}

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSaving || password.length === 0}
          className="h-10 w-full sm:w-auto px-6 rounded-md bg-pine text-sm font-semibold text-white shadow-xs hover:bg-pine-deep cursor-pointer disabled:opacity-50"
        >
          {isSaving ? 'Updating password…' : 'Update password'}
        </Button>
      </div>
    </form>
  );
}
