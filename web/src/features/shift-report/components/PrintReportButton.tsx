'use client';

import { Button } from '@/components/common/Button';
import { PrinterIcon } from '@/components/common/icons';

/** Browser-print action for the end-of-shift report. */
export function PrintReportButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => window.print()}
      className="flex items-center gap-2"
    >
      <PrinterIcon className="h-5 w-5" /> Print report
    </Button>
  );
}
