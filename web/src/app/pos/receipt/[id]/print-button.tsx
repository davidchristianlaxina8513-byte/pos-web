'use client';

import { Button } from '@/components/common/Button';
import { PrinterIcon } from '@/components/common/icons';

/** Browser-print action (online-only web: no thermal printer support). */
export function PrintButton() {
  return (
    <Button
      variant="secondary"
      onClick={() => window.print()}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-base"
    >
      <PrinterIcon className="h-5 w-5" /> Print
    </Button>
  );
}
