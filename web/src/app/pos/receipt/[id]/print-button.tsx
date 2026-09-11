'use client';

import { Button } from '@/components/common/Button';

/** Browser-print action (online-only web: no thermal printer support). */
export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      Print
    </Button>
  );
}
