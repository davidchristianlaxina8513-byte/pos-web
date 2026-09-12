'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface IconTileProps {
  tone?: 'sage' | 'mint' | 'peri' | 'pine';
  className?: string;
  children: ReactNode;
}

const TONES = {
  sage: 'bg-sage-200 text-pine-deep',
  mint: 'bg-mint text-pine-deep',
  peri: 'bg-peri text-foreground',
  pine: 'bg-pine text-surface',
} as const;

/** Circular soft-color icon tile (v2 design language). */
export function IconTile({
  tone = 'sage',
  className,
  children,
}: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
