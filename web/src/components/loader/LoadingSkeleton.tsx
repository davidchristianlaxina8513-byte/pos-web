import { cn } from '@/lib/cn';

/**
 * Shared loading skeletons aligned with the modern Cafe Elvira design system.
 * Each route's `loading.tsx` picks the variant matching its exact page shape
 * so navigation delivers seamless feedback with zero layout shift.
 */

/** Sidebar skeleton mirroring staff-shell fixed-width dashboard sidebar. */
export function SidebarSkeleton() {
  return (
    <aside
      aria-hidden="true"
      className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border/80 bg-surface h-screen sticky top-0"
    >
      {/* Brand Header Skeleton: Logo on top, title on bottom */}
      <div className="flex shrink-0 flex-col items-center border-b border-border/70 px-4 py-5 text-center">
        <div className="h-14 w-14 rounded-2xl bg-mist/90" />
        <div className="mt-3.5 flex w-full flex-col items-center space-y-1.5 px-2">
          <div className="h-4 w-44 rounded bg-mist/85" />
          <div className="h-3.5 w-32 rounded bg-mist/60" />
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 h-3 w-12 rounded bg-mist/50" />
        <div className="space-y-1">
          {[
            { w: 'w-24' },
            { w: 'w-28' },
            { w: 'w-36' },
            { w: 'w-32' },
            { w: 'w-20' },
            { w: 'w-36' },
            { w: 'w-20' },
            { w: 'w-24' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            >
              <div className="h-5 w-5 shrink-0 rounded-lg bg-mist/75" />
              <div className={`h-4 ${item.w} rounded bg-mist/65`} />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/** Full staff shell skeleton wrapping the sidebar skeleton + page content skeleton. */
export function StaffShellSkeleton({
  children,
  fullWidth = true,
  hasHeader = true,
  hasBreadcrumbs = true,
  hasHeaderActions = false,
  headerActionCount = 1,
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
  hasHeader?: boolean;
  hasBreadcrumbs?: boolean;
  hasHeaderActions?: boolean;
  headerActionCount?: number;
}) {
  return (
    <div className="min-h-screen bg-mist text-foreground lg:flex animate-pulse">
      {/* Desktop Sidebar Skeleton */}
      <SidebarSkeleton />

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Top Header Bar Skeleton */}
        <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-surface px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-mist/80" />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="h-9 w-9 rounded-full bg-mist/85" />
            <div className="hidden sm:block space-y-1">
              <div className="h-3.5 w-24 rounded bg-mist/70" />
              <div className="h-2.5 w-16 rounded bg-mist/50" />
            </div>
            <div className="h-4 w-4 rounded bg-mist/50 hidden sm:block" />
          </div>
        </div>

        <main
          className={cn(
            'w-full min-w-0 flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-10',
            fullWidth ? 'max-w-none' : 'mx-auto max-w-7xl',
          )}
        >
          {hasHeader && (
            <div className="mb-6">
              {hasBreadcrumbs && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-4 w-4 rounded bg-mist/60" />
                  <div className="h-3.5 w-12 rounded bg-mist/50" />
                  <div className="h-3 w-3 rounded bg-mist/40" />
                  <div className="h-3.5 w-24 rounded bg-mist/70" />
                </div>
              )}
              <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="h-8 w-56 rounded-lg bg-mist/80" />
                  <div className="mt-2 h-4 w-80 max-w-full rounded bg-mist/50" />
                </div>
                {hasHeaderActions && (
                  <div className="flex items-center gap-2.5">
                    {Array.from({ length: headerActionCount }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-10 w-32 rounded-md bg-mist/80"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

/** 1. Dashboard Skeleton: Welcome Card + 4 KPIs + 2 Panels (Sales Trend & Availability) */
export function DashboardSkeleton({
  withShell = true,
}: { withShell?: boolean } = {}) {
  const content = (
    <div aria-hidden="true" className="space-y-6">
      {/* Welcome Card Skeleton */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border/70 border-l-4 border-l-pine bg-surface p-5 sm:flex-row sm:items-center sm:p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="hidden sm:block h-12 w-12 rounded-2xl bg-mist/80" />
          <div className="space-y-2">
            <div className="h-4 w-36 rounded bg-mist/60" />
            <div className="h-7 w-56 rounded-lg bg-mist/80" />
            <div className="h-3.5 w-48 rounded bg-mist/40" />
          </div>
        </div>
        <div className="h-10 w-32 rounded-xl bg-mist/80" />
      </div>

      {/* 4 KPI Metric Tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div
            key={key}
            className="rounded-xl border border-border/70 bg-surface p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-mist/60" />
              <div className="h-7 w-7 rounded-lg bg-mist/60" />
            </div>
            <div className="mt-3 h-7 w-24 rounded bg-mist/80" />
            <div className="mt-2 h-3 w-28 rounded bg-mist/40" />
          </div>
        ))}
      </div>

      {/* 2 Content Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-72 rounded-xl border border-border/70 bg-surface p-6 shadow-xs lg:col-span-7" />
        <div className="h-72 rounded-xl border border-border/70 bg-surface p-6 shadow-xs lg:col-span-5" />
      </div>
    </div>
  );

  return withShell ? (
    <StaffShellSkeleton fullWidth={true} hasHeader={false}>
      {content}
    </StaffShellSkeleton>
  ) : (
    content
  );
}

/** 2. Today's Products / Stock Monitoring Skeleton */
export function TodayProductsSkeleton({
  withShell = true,
}: { withShell?: boolean } = {}) {
  const content = (
    <div aria-hidden="true" className="space-y-6">
      {/* 4 Stock KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-surface p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-mist/70" />
              <div className="h-8 w-8 rounded-lg bg-mist/60" />
            </div>
            <div className="mt-3 h-8 w-16 rounded bg-mist/85" />
            <div className="mt-2 h-3 w-28 rounded bg-mist/45" />
          </div>
        ))}
      </div>

      {/* Tabs Switcher Skeleton */}
      <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-mist/40 p-1">
        <div className="h-9 w-28 rounded-lg bg-surface shadow-xs" />
        <div className="h-9 w-36 rounded-lg bg-mist/50" />
        <div className="h-9 w-44 rounded-lg bg-mist/50" />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-full sm:w-72 rounded-md bg-mist/60" />
        <div className="flex gap-2">
          <div className="h-10 w-32 rounded-md bg-mist/60" />
          <div className="h-10 w-28 rounded-md bg-mist/60" />
        </div>
      </div>

      {/* Stock Table Skeleton */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        <div className="h-11 border-b border-border/70 bg-mist/50 px-4 flex items-center gap-4">
          <div className="h-4 w-40 rounded bg-mist/70" />
          <div className="h-4 w-28 rounded bg-mist/70 ml-auto" />
          <div className="h-4 w-28 rounded bg-mist/70" />
          <div className="h-4 w-20 rounded bg-mist/70" />
        </div>
        <div className="divide-y divide-border/60">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="flex items-center gap-4 px-4 py-3.5">
              <div className="h-4 w-44 rounded bg-mist/80" />
              <div className="h-3.5 w-20 rounded bg-mist/60" />
              <div className="h-4 w-32 rounded-full bg-mist/50 ml-auto" />
              <div className="h-7 w-24 rounded-md bg-mist/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return withShell ? (
    <StaffShellSkeleton fullWidth={true} hasHeader={true}>
      {content}
    </StaffShellSkeleton>
  ) : (
    content
  );
}

/** 3. System Audit Log Skeleton */
export function AuditLogSkeleton({
  withShell = true,
}: { withShell?: boolean } = {}) {
  const content = (
    <div aria-hidden="true" className="space-y-6">
      {/* 4 Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-surface p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-mist/70" />
              <div className="h-8 w-8 rounded-lg bg-mist/60" />
            </div>
            <div className="mt-3 h-8 w-16 rounded bg-mist/85" />
            <div className="mt-2 h-3 w-32 rounded bg-mist/45" />
          </div>
        ))}
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-border bg-surface shadow-xs">
        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 w-full sm:w-80 rounded-md bg-mist/60" />
          <div className="flex gap-2">
            <div className="h-10 w-36 rounded-md bg-mist/60" />
            <div className="h-10 w-32 rounded-md bg-mist/60" />
          </div>
        </div>

        {/* Audit Table Rows */}
        <div className="overflow-hidden">
          <div className="h-11 border-b border-border/80 bg-mist/50 px-4 flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-mist/70" />
            <div className="h-4 w-32 rounded bg-mist/70" />
            <div className="h-4 w-28 rounded bg-mist/70" />
            <div className="h-4 w-24 rounded bg-mist/70" />
            <div className="h-4 w-48 rounded bg-mist/70" />
          </div>
          <div className="divide-y divide-border/60">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 py-3.5"
              >
                <div className="space-y-1 w-24">
                  <div className="h-3.5 w-20 rounded bg-mist/80" />
                  <div className="h-3 w-14 rounded bg-mist/50" />
                </div>
                <div className="space-y-1 w-36">
                  <div className="h-3.5 w-32 rounded bg-mist/80" />
                  <div className="h-3 w-16 rounded bg-mist/50" />
                </div>
                <div className="h-4 w-28 rounded bg-mist/75" />
                <div className="h-4 w-20 rounded bg-mist/65" />
                <div className="h-3.5 w-60 rounded bg-mist/55" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return withShell ? (
    <StaffShellSkeleton fullWidth={true} hasHeader={true}>
      {content}
    </StaffShellSkeleton>
  ) : (
    content
  );
}

/** 4. Reports & Analytics Skeleton */
export function ReportsSkeleton({
  withShell = true,
}: { withShell?: boolean } = {}) {
  const content = (
    <div aria-hidden="true" className="space-y-6">
      {/* Date preset & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="h-9 w-20 rounded-md bg-mist/60" />
          ))}
        </div>
        <div className="h-9 w-28 rounded-md bg-mist/70" />
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-surface p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-mist/70" />
              <div className="h-8 w-8 rounded-lg bg-mist/60" />
            </div>
            <div className="mt-3 h-8 w-24 rounded bg-mist/85" />
            <div className="mt-2 h-3 w-32 rounded bg-mist/45" />
          </div>
        ))}
      </div>

      {/* Tab Switcher Skeleton */}
      <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-mist/40 p-1">
        <div className="h-9 w-28 rounded-lg bg-surface shadow-xs" />
        <div className="h-9 w-36 rounded-lg bg-mist/50" />
        <div className="h-9 w-36 rounded-lg bg-mist/50" />
        <div className="h-9 w-36 rounded-lg bg-mist/50" />
      </div>

      {/* Analytics Chart Block */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-80 rounded-xl border border-border bg-surface p-6 shadow-xs lg:col-span-8" />
        <div className="h-80 rounded-xl border border-border bg-surface p-6 shadow-xs lg:col-span-4" />
      </div>
    </div>
  );

  return withShell ? (
    <StaffShellSkeleton
      fullWidth={true}
      hasHeader={true}
      hasHeaderActions={true}
    >
      {content}
    </StaffShellSkeleton>
  ) : (
    content
  );
}

/** 5. Menu Catalog Skeleton */
export function MenuCatalogSkeleton({
  withShell = true,
}: { withShell?: boolean } = {}) {
  const content = (
    <div aria-hidden="true" className="space-y-6">
      {/* 4 Overview KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-surface p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-mist/70" />
              <div className="h-8 w-8 rounded-lg bg-mist/60" />
            </div>
            <div className="mt-3 h-8 w-16 rounded bg-mist/85" />
            <div className="mt-2 h-3 w-28 rounded bg-mist/45" />
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-full sm:w-72 rounded-md bg-mist/60" />
        <div className="flex gap-2">
          <div className="h-10 w-32 rounded-md bg-mist/60" />
          <div className="h-10 w-24 rounded-md bg-mist/60" />
        </div>
      </div>

      {/* Menu Table Skeleton */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        <div className="h-11 border-b border-border/70 bg-mist/50 px-4 flex items-center justify-between">
          <div className="h-4 w-36 rounded bg-mist/70" />
          <div className="h-4 w-24 rounded bg-mist/70" />
          <div className="h-4 w-20 rounded bg-mist/70" />
          <div className="h-4 w-24 rounded bg-mist/70" />
          <div className="h-4 w-24 rounded bg-mist/70" />
        </div>
        <div className="divide-y divide-border/60">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-mist/80" />
                <div className="space-y-1">
                  <div className="h-4 w-36 rounded bg-mist/80" />
                  <div className="h-3 w-20 rounded bg-mist/50" />
                </div>
              </div>
              <div className="h-6 w-20 rounded-full bg-mist/60" />
              <div className="h-4 w-16 rounded bg-mist/80" />
              <div className="h-6 w-20 rounded-full bg-mist/50" />
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded-md bg-mist/60" />
                <div className="h-8 w-8 rounded-md bg-mist/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return withShell ? (
    <StaffShellSkeleton
      fullWidth={true}
      hasHeader={true}
      hasHeaderActions={true}
    >
      {content}
    </StaffShellSkeleton>
  ) : (
    content
  );
}

/** 6. Users Management Skeleton */
export function UsersSkeleton({
  withShell = true,
}: { withShell?: boolean } = {}) {
  const content = (
    <div aria-hidden="true" className="space-y-6">
      {/* 4 Staff KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-surface p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-mist/70" />
              <div className="h-8 w-8 rounded-lg bg-mist/60" />
            </div>
            <div className="mt-3 h-8 w-16 rounded bg-mist/85" />
            <div className="mt-2 h-3 w-28 rounded bg-mist/45" />
          </div>
        ))}
      </div>

      {/* 2-Column Split: Add Staff Form on left, Staff Roster on right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs lg:col-span-4 h-96 space-y-4">
          <div className="h-5 w-36 rounded bg-mist/80" />
          <div className="space-y-3 pt-2">
            <div className="h-10 w-full rounded-md bg-mist/50" />
            <div className="h-10 w-full rounded-md bg-mist/50" />
            <div className="h-10 w-full rounded-md bg-mist/50" />
            <div className="h-10 w-full rounded-md bg-mist/80 pt-2" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface shadow-xs lg:col-span-8 overflow-hidden">
          <div className="h-14 border-b border-border/70 p-4 flex items-center justify-between">
            <div className="h-8 w-60 rounded bg-mist/60" />
            <div className="h-8 w-28 rounded bg-mist/60" />
          </div>
          <div className="divide-y divide-border/60">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-mist/80" />
                  <div className="space-y-1">
                    <div className="h-4 w-36 rounded bg-mist/80" />
                    <div className="h-3 w-20 rounded bg-mist/50" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 rounded-md bg-mist/60" />
                  <div className="h-8 w-16 rounded-md bg-mist/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return withShell ? (
    <StaffShellSkeleton fullWidth={true} hasHeader={true}>
      {content}
    </StaffShellSkeleton>
  ) : (
    content
  );
}

/** 7. Cashier Operations & Shifts Skeleton */
export function CashierOperationsSkeleton({
  withShell = true,
}: { withShell?: boolean } = {}) {
  const content = (
    <div aria-hidden="true" className="space-y-6">
      {/* 4 Operations KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm"
          >
            <div className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-mist/80" />
            <div className="h-3.5 w-24 rounded bg-mist/70" />
            <div className="mt-3 flex items-center gap-2">
              <div className="h-8 w-24 rounded bg-mist/85" />
              <div className="h-5 w-16 rounded-full bg-mist/50" />
            </div>
            <div className="mt-2 h-3 w-36 rounded bg-mist/45" />
          </div>
        ))}
      </div>

      {/* Main Operations Container */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-slate-50/70 p-1">
            <div className="h-8 w-36 rounded-lg bg-surface shadow-xs" />
            <div className="h-8 w-44 rounded-lg bg-mist/50" />
            <div className="h-8 w-32 rounded-lg bg-mist/50" />
            <div className="h-8 w-36 rounded-lg bg-mist/50" />
            <div className="h-8 w-44 rounded-lg bg-mist/50" />
          </div>
          <div className="h-4 w-44 rounded bg-mist/50" />
        </div>

        {/* Tab Body: Form Skeleton + History Table Skeleton */}
        <div className="p-5 sm:p-6 space-y-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-mist/80" />
              <div className="h-4 w-56 rounded bg-mist/50" />
            </div>
            <div className="rounded-xl border border-border bg-surface p-6 md:col-span-2 space-y-4 shadow-2xs">
              <div className="h-4 w-32 rounded bg-mist/70" />
              <div className="h-10 w-full rounded-md bg-mist/60" />
              <div className="h-20 w-full rounded-md bg-mist/40" />
              <div className="flex justify-end">
                <div className="h-10 w-36 rounded-md bg-mist/80" />
              </div>
            </div>
          </div>

          {/* History Table Container */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
            <div className="h-12 border-b border-border/70 bg-mist/50 px-4 flex items-center justify-between">
              <div className="h-4 w-32 rounded bg-mist/70" />
              <div className="h-8 w-44 rounded bg-mist/60" />
            </div>
            <div className="divide-y divide-border/60">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-3.5"
                >
                  <div className="space-y-1">
                    <div className="h-4 w-28 rounded bg-mist/80" />
                    <div className="h-3 w-16 rounded bg-mist/50" />
                  </div>
                  <div className="h-4 w-20 rounded bg-mist/70" />
                  <div className="h-4 w-16 rounded bg-mist/80" />
                  <div className="h-6 w-16 rounded-full bg-mist/60" />
                  <div className="h-7 w-20 rounded-md bg-mist/60" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return withShell ? (
    <StaffShellSkeleton
      fullWidth={true}
      hasHeader={true}
      hasHeaderActions={true}
      headerActionCount={1}
    >
      {content}
    </StaffShellSkeleton>
  ) : (
    content
  );
}

/** 8. Settings & Profile Skeleton */
export function SettingsSkeleton({
  withShell = true,
  hasHeaderActions = false,
}: { withShell?: boolean; hasHeaderActions?: boolean } = {}) {
  const content = (
    <div aria-hidden="true" className="divide-y divide-gray-900/10">
      {/* Section 1: Personal Information */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <div className="h-5 w-44 rounded bg-mist/80" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3.5 w-64 max-w-full rounded bg-mist/50" />
            <div className="h-3.5 w-52 max-w-full rounded bg-mist/50" />
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-mist/70" />
                <div className="h-11 w-full rounded-md border border-gray-300 bg-mist/30" />
                <div className="h-3 w-48 rounded bg-mist/40" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-mist/70" />
                <div className="h-11 w-48 rounded-full bg-mist/30" />
                <div className="h-3 w-56 rounded bg-mist/40" />
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="h-16 w-full rounded-xl border border-gray-200 bg-mist/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Security & Password */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <div className="h-5 w-44 rounded bg-mist/80" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3.5 w-64 max-w-full rounded bg-mist/50" />
            <div className="h-3.5 w-48 max-w-full rounded bg-mist/50" />
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8 space-y-4">
            <div className="h-12 w-full rounded-xl border border-gray-200 bg-mist/20 mb-6" />
            <div className="space-y-2 max-w-lg">
              <div className="h-4 w-28 rounded bg-mist/70" />
              <div className="h-11 w-full rounded-md border border-gray-300 bg-mist/30" />
            </div>
            <div className="space-y-2 max-w-lg">
              <div className="h-4 w-36 rounded bg-mist/70" />
              <div className="h-11 w-full rounded-md border border-gray-300 bg-mist/30" />
            </div>
            <div className="pt-2">
              <div className="h-10 w-36 rounded-md bg-pine/70" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Preferences */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <div className="h-5 w-32 rounded bg-mist/80" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3.5 w-64 max-w-full rounded bg-mist/50" />
            <div className="h-3.5 w-48 max-w-full rounded bg-mist/50" />
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8 space-y-6">
            <div className="space-y-2.5">
              <div className="h-14 w-full rounded-xl border border-gray-200 bg-mist/20" />
              <div className="h-14 w-full rounded-xl border border-gray-200 bg-mist/20" />
            </div>
            <div className="space-y-2 max-w-md pt-2 border-t border-gray-100">
              <div className="h-4 w-32 rounded bg-mist/70" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-11 rounded-md bg-mist/50" />
                <div className="h-11 rounded-md bg-mist/50" />
                <div className="h-11 rounded-md bg-mist/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return withShell ? (
    <StaffShellSkeleton
      fullWidth={true}
      hasHeader={true}
      hasBreadcrumbs={true}
      hasHeaderActions={hasHeaderActions}
      headerActionCount={1}
    >
      {content}
    </StaffShellSkeleton>
  ) : (
    content
  );
}

/** 9. POS loading skeleton */
export function PosSkeleton({
  withShell = true,
}: { withShell?: boolean } = {}) {
  const content = (
    <div
      aria-hidden="true"
      className="grid animate-pulse items-start gap-5 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px] 2xl:grid-cols-[1fr_400px]"
    >
      {/* Menu Column */}
      <div className="min-w-0 space-y-3.5">
        {/* Top search & view toggle */}
        <div className="flex items-center gap-2">
          <div className="h-11 flex-1 rounded-2xl border border-border/70 bg-surface shadow-xs" />
          <div className="h-11 w-20 rounded-2xl border border-border/70 bg-surface shadow-xs" />
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {[56, 120, 140, 130, 100, 90, 110].map((width, idx) => (
            <div
              key={idx}
              className="h-8 rounded-full bg-mist/80"
              style={{ width: `${width}px` }}
            />
          ))}
        </div>

        {/* Product cards grid */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-border/70 bg-surface p-3 shadow-xs"
            >
              <div className="h-28 w-full rounded-xl bg-mist/70" />
              <div className="mt-2.5 space-y-1.5">
                <div className="h-4 w-3/4 rounded bg-mist/80" />
                <div className="h-3 w-1/2 rounded bg-mist/50" />
                <div className="mt-2 h-5 w-16 rounded bg-mist/90" />
              </div>
              <div className="mt-3 h-9 w-full rounded-xl bg-mist/60" />
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary Sidebar */}
      <div className="space-y-3 lg:sticky lg:top-4">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="h-5 w-28 rounded bg-mist/80" />
            <div className="h-4 w-14 rounded-full bg-mist/60" />
          </div>
          <div className="my-5 space-y-2.5">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="h-14 rounded-xl bg-mist/40" />
            ))}
          </div>
          <div className="border-t border-border/60 pt-3">
            <div className="flex justify-between">
              <div className="h-4 w-20 rounded bg-mist/60" />
              <div className="h-4 w-16 rounded bg-mist/80" />
            </div>
          </div>
        </div>
        <div className="h-14 w-full rounded-2xl bg-mist/80 shadow-xs" />
      </div>
    </div>
  );

  return withShell ? (
    <StaffShellSkeleton fullWidth={true} hasHeader={false}>
      {content}
    </StaffShellSkeleton>
  ) : (
    content
  );
}

/** 10. Form skeleton: product create/edit matching DCASIS 4-section layout */
export function FormSkeleton({
  withShell = true,
}: { withShell?: boolean } = {}) {
  const content = (
    <div aria-hidden="true" className="divide-y divide-gray-900/10">
      {/* Section 1: General Information */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <div className="h-5 w-44 rounded bg-mist/80" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3.5 w-64 max-w-full rounded bg-mist/50" />
            <div className="h-3.5 w-52 max-w-full rounded bg-mist/50" />
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
              {/* Product Name (Full Width) */}
              <div className="sm:col-span-2 space-y-2">
                <div className="h-4 w-28 rounded bg-mist/70" />
                <div className="h-11 w-full rounded-md border border-gray-300 bg-mist/30" />
              </div>

              {/* Menu Category */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 rounded bg-mist/70" />
                  <div className="h-3.5 w-28 rounded bg-mist/50" />
                </div>
                <div className="h-11 w-full rounded-md border border-gray-300 bg-mist/30" />
                <div className="h-3 w-56 rounded bg-mist/40 mt-1" />
              </div>

              {/* Selling Price */}
              <div className="space-y-2">
                <div className="h-4 w-36 rounded bg-mist/70" />
                <div className="h-11 w-full rounded-md border border-gray-300 bg-mist/30" />
                <div className="h-3 w-52 rounded bg-mist/40 mt-1" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Product Photo */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <div className="h-5 w-36 rounded bg-mist/80" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3.5 w-64 max-w-full rounded bg-mist/50" />
            <div className="h-3.5 w-48 max-w-full rounded bg-mist/50" />
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-40 w-40 shrink-0 rounded-2xl border-2 border-dashed border-gray-300 bg-mist/40" />
              <div className="space-y-3 text-center sm:text-left">
                <div className="h-10 w-36 rounded-md bg-mist/70" />
                <div className="h-3 w-48 rounded bg-mist/40" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Register Availability */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <div className="h-5 w-44 rounded bg-mist/80" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3.5 w-64 max-w-full rounded bg-mist/50" />
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-16 rounded-xl border-2 border-gray-200 bg-mist/30" />
              <div className="h-16 rounded-xl border border-gray-200 bg-mist/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Daily Stock Quota */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <div className="h-5 w-40 rounded bg-mist/80" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3.5 w-64 max-w-full rounded bg-mist/50" />
            <div className="h-3.5 w-56 max-w-full rounded bg-mist/50" />
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="h-3 w-36 rounded bg-mist/60 uppercase tracking-wider" />
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 w-20 rounded-md bg-mist/50" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-48 rounded bg-mist/70" />
              <div className="h-11 w-full sm:w-64 rounded-md border border-gray-300 bg-mist/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="flex items-center justify-end gap-x-3 pt-8">
        <div className="h-10 w-24 rounded-md border border-gray-300 bg-white" />
        <div className="h-10 w-36 rounded-md bg-pine/70" />
      </div>
    </div>
  );

  return withShell ? (
    <StaffShellSkeleton
      fullWidth={true}
      hasHeader={true}
      hasBreadcrumbs={true}
      hasHeaderActions={true}
      headerActionCount={1}
    >
      {content}
    </StaffShellSkeleton>
  ) : (
    content
  );
}

/** 11. Receipt Skeleton */
export function ReceiptSkeleton({
  withShell = true,
}: { withShell?: boolean } = {}) {
  const content = (
    <div aria-hidden="true" className="mx-auto max-w-md space-y-4">
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-4">
        <div className="text-center space-y-2 pb-4 border-b border-dashed border-border">
          <div className="h-6 w-36 mx-auto rounded bg-mist/80" />
          <div className="h-3.5 w-24 mx-auto rounded bg-mist/50" />
        </div>
        <div className="space-y-2.5 py-2 border-b border-dashed border-border">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="flex justify-between">
              <div className="h-4 w-32 rounded bg-mist/70" />
              <div className="h-4 w-16 rounded bg-mist/70" />
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-2">
          <div className="h-5 w-20 rounded bg-mist/80" />
          <div className="h-5 w-24 rounded bg-mist/85" />
        </div>
        <div className="h-10 w-full rounded-md bg-mist/80 mt-4" />
      </div>
    </div>
  );

  return withShell ? (
    <StaffShellSkeleton fullWidth={false} hasHeader={true}>
      {content}
    </StaffShellSkeleton>
  ) : (
    content
  );
}

/** Backward compatibility aliases */
export const CardsSkeleton = DashboardSkeleton;
export const ListSkeleton = MenuCatalogSkeleton;
