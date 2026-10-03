'use client';

import { cn } from '@/lib/cn';

export interface AvatarProps {
  name: string;
  className?: string;
}

/** Initials avatar circle (v2 POS header). */
export function Avatar({ name, className }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage-200 text-base font-bold text-pine-deep',
        className,
      )}
    >
      {initial}
    </span>
  );
}
