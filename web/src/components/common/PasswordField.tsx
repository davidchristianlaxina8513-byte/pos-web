'use client';

import { useState } from 'react';
import { Field, type FieldProps } from './Field';
import { EyeIcon, EyeOffIcon } from './icons';

export type PasswordFieldProps = Omit<FieldProps, 'type' | 'endSlot'> & {
  name: string;
};

/** Password input with a show/hide toggle in the trailing slot. */
export function PasswordField({
  name,
  autoComplete = 'current-password',
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      name={name}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      endSlot={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
      {...props}
    />
  );
}
