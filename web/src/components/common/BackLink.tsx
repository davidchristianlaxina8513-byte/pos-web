import Link from 'next/link';
import { cn } from '@/lib/cn';
import { ArrowLeftIcon } from './icons';

export interface BackLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent in-app back navigation. Always points at an explicit parent
 * route (never browser history), so directly opened pages and refreshes
 * keep a working destination.
 */
export function BackLink({ href, children, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'action-focus inline-flex items-center gap-1.5 rounded text-sm font-semibold text-pine-deep',
        className,
      )}
    >
      <ArrowLeftIcon className="h-4 w-4 shrink-0" />
      {children}
    </Link>
  );
}
