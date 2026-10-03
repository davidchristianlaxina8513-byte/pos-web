'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: string | null;
  /** Extra classes merged onto the <input> (e.g. rounded-2xl for hero forms). */
  inputClassName?: string;
  /** Extra classes merged onto the label text (e.g. muted micro labels). */
  labelClassName?: string;
  /** Glyph rendered inside the input's leading edge. */
  startIcon?: ReactNode;
  /** Trailing control rendered inside the input (e.g. password toggle). */
  endSlot?: ReactNode;
}

/** Labeled input with error and hint slots. */
export function Field({
  label,
  error,
  hint,
  className,
  inputClassName,
  labelClassName,
  startIcon,
  endSlot,
  id,
  ...props
}: FieldProps) {
  const inputId = id ?? props.name;
  // NOTE: the input wrapper (icons, toggle) lives OUTSIDE the <label> so
  // assistive tech and getByLabel resolve the input only — a toggle button
  // nested in the label would also match and break strict-mode locators.
  return (
    <div className={cn('block', className)}>
      <label htmlFor={inputId}>
        <span className={cn('text-foreground', labelClassName)}>{label}</span>
      </label>
      <span className="relative mt-1 block">
        {startIcon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
          >
            {startIcon}
          </span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            'block w-full rounded border bg-surface px-3 py-2 text-foreground',
            error ? 'border-danger' : 'border-border',
            startIcon ? 'pl-10' : null,
            endSlot ? 'pr-11' : null,
            inputClassName,
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {endSlot ? (
          <span className="absolute top-1/2 right-2 -translate-y-1/2">
            {endSlot}
          </span>
        ) : null}
      </span>
      {error ? (
        <span role="alert" className="mt-1 block text-danger">
          {error}
        </span>
      ) : null}
      {!error && hint ? (
        <span className="mt-1 block text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
