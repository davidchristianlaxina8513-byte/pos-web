import type { ReactNode } from 'react';
import { IconTile } from './IconTile';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  sub?: string;
  tone?: 'sage' | 'mint' | 'peri' | 'pine';
  className?: string;
}

/** Centered illustrated empty state: icon tile + bold title + muted hint. */
export function EmptyState({
  icon,
  title,
  sub,
  tone = 'sage',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-4 py-8 text-center',
        className,
      )}
    >
      <IconTile tone={tone} className="h-14 w-14 text-2xl">
        {icon}
      </IconTile>
      <p className="mt-3 text-[15px] font-extrabold tracking-tight text-foreground">
        {title}
      </p>
      {sub ? <p className="mt-1 text-sm text-muted">{sub}</p> : null}
    </div>
  );
}
