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
      className={cn(
        'rounded-xl border border-border bg-surface shadow-sm',
        className,
      )}
    >
      {title || actions ? (
        <header className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
          {title ? (
            <h2 className="text-base font-bold text-foreground">{title}</h2>
          ) : (
            <span />
          )}
          {actions}
        </header>
      ) : null}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
