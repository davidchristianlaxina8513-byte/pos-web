'use client';

import { Button } from '@/components/common/Button';

/** Browser-print handoff for the supplier list (same pattern as receipts). */
export function PrintButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      type="button"
      onClick={() => window.print()}
    >
      Print supplier list
    </Button>
  );
}
