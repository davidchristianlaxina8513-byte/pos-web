'use client';

import Link from 'next/link';
import { HomeIcon, ChevronRightIcon } from '@/components/common/hero-icons';
import { cn } from '@/lib/cn';

export interface BreadcrumbItem {
  name: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps {
  pages: BreadcrumbItem[];
  homeHref?: string;
  className?: string;
}

/**
 * Standard DCASIS Breadcrumb navigation bar.
 * Matches sports-client/components/breadcrumbs/index.vue.
 */
export function Breadcrumbs({
  pages,
  homeHref = '/dashboard',
  className,
}: BreadcrumbsProps) {
  return (
    <nav className={cn('flex', className)} aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-4">
        <li>
          <div>
            <Link
              href={homeHref}
              className="text-pine/70 hover:text-pine transition-colors"
            >
              <HomeIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </Link>
          </div>
        </li>
        {pages.map((page) => (
          <li key={page.name}>
            <div className="flex items-center">
              <ChevronRightIcon
                className="h-5 w-5 shrink-0 text-pine/40"
                aria-hidden="true"
              />
              {page.href && !page.current ? (
                <Link
                  href={page.href}
                  className="ml-4 text-base font-normal text-pine hover:text-pine-deep hover:underline transition-colors"
                >
                  {page.name}
                </Link>
              ) : (
                <span
                  className="ml-4 text-base font-bold text-pine"
                  aria-current={page.current ? 'page' : undefined}
                >
                  {page.name}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
