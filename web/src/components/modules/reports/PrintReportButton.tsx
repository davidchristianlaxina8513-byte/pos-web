'use client';

import { PrinterIcon } from '@/components/common/hero-icons';

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="action-focus inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-mist"
    >
      <PrinterIcon className="h-4 w-4 text-pine" />
      <span>Print Summary</span>
    </button>
  );
}
