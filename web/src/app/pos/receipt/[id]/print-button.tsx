'use client';

import { Button } from '@/components/form/Button';
import { PrinterIcon } from '@/components/common/icons';

/** Browser-print action (online-only web: no thermal printer support). */
export function PrintButton() {
  return (
    <Button
      variant="secondary"
      onClick={() => window.print()}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold"
    >
      <PrinterIcon className="h-4 w-4" /> Print
    </Button>
  );
}
