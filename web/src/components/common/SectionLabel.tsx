'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SectionLabelProps {
  as?: 'p' | 'legend';
  className?: string;
  children: ReactNode;
}

/** Uppercase micro section header (v2 design language). */
export function SectionLabel({
  as = 'p',
  className,
  children,
}: SectionLabelProps) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        'text-xs font-semibold tracking-wider text-muted uppercase',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
