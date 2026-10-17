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
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold text-foreground mb-1"
      >
        <span className={cn('text-foreground', labelClassName)}>{label}</span>
      </label>
      <span className="relative block">
        {startIcon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          >
            {startIcon}
          </span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            'block h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-pine focus:outline-2 focus:-outline-offset-2 focus:outline-pine sm:text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
            error ? 'border-danger' : 'border-border',
            startIcon ? 'pl-9' : null,
            endSlot ? 'pr-10' : null,
            inputClassName,
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {endSlot ? (
          <span className="absolute top-1/2 right-2.5 -translate-y-1/2">
            {endSlot}
          </span>
        ) : null}
      </span>
      {error ? (
        <span
          role="alert"
          className="mt-1 block text-xs font-medium text-danger"
        >
          {error}
        </span>
      ) : null}
      {!error && hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
