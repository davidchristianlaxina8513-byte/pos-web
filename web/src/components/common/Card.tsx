'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps {
  title?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Surface card with optional title row. */
export function Card({ title, actions, className, children }: CardProps) {
  return (
    <section
      className={cn('rounded border border-border bg-surface', className)}
    >
      {title || actions ? (
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          {title ? <h2 className="text-foreground">{title}</h2> : <span />}
          {actions}
        </header>
      ) : null}
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
