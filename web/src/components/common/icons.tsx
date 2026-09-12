'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

function Base({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('h-5 w-5', className)}
    >
      {children}
    </svg>
  );
}

/** Shared stroke icons (v2 design language). One family, currentColor. */
export function PersonIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </Base>
  );
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Base>
  );
}

export function EyeIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  );
}

export function EyeOffIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 3.9M6.6 6.6C4 8.2 2 12 2 12s3.5 7 10 7c1.5 0 2.9-.3 4.1-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Base>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Base>
  );
}

export function SlidersIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M4 8h8M18 8h2M4 16h2M12 16h8" />
      <circle cx="15" cy="8" r="2.2" />
      <circle cx="9" cy="16" r="2.2" />
    </Base>
  );
}

export function CartIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M3 4h2l2.5 12h11L21 8H7" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </Base>
  );
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M4 12h15m-6-7 7 7-7 7" />
    </Base>
  );
}

export function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M20 12H5m6 7-7-7 7-7" />
    </Base>
  );
}

export function InfoIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 11.5V16" />
    </Base>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="m5 13 4 4L19 7" />
    </Base>
  );
}

export function PrinterIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M7 8V3h10v5" />
      <rect x="4" y="8" width="16" height="9" rx="2" />
      <path d="M7 14h10v7H7z" />
    </Base>
  );
}

export function SignOutIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </Base>
  );
}

export function LeafMark({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M5 19C5 9 13 4 20 4c0 8-5 15-15 15Z" />
      <path d="M5 19c3-5 7-9 11-11" />
    </Base>
  );
}
