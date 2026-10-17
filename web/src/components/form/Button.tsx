'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-pine text-surface shadow-xs hover:bg-pine-deep focus-visible:outline-pine',
  secondary:
    'bg-white text-foreground border border-border shadow-2xs hover:bg-slate-50 focus-visible:outline-slate-400',
  danger:
    'bg-danger text-surface shadow-xs hover:bg-danger/90 focus-visible:outline-danger',
  ghost: 'bg-transparent text-foreground hover:bg-mist',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-3.5 py-2 text-sm',
  lg: 'h-11 px-4 py-2.5 text-base',
};

/** Domain-free button matching DCASIS FormButton size and padding. */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
