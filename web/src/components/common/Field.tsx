'use client';

import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: string | null;
}

/** Labeled input with error and hint slots. */
export function Field({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: FieldProps) {
  const inputId = id ?? props.name;
  return (
    <label className={cn('block', className)} htmlFor={inputId}>
      <span className="text-foreground">{label}</span>
      <input
        id={inputId}
        className={cn(
          'mt-1 block w-full rounded border bg-surface px-3 py-2 text-foreground',
          error ? 'border-danger' : 'border-border',
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? (
        <span role="alert" className="mt-1 block text-danger">
          {error}
        </span>
      ) : null}
      {!error && hint ? (
        <span className="mt-1 block text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
