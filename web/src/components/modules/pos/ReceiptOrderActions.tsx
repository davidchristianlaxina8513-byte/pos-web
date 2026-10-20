'use client';

import type { OrderStatus } from '@/features/pos/types';

interface ReceiptOrderActionsProps {
  transactionId?: string;
  status?: OrderStatus;
  voidReason?: string | null;
  isAdmin?: boolean;
  children?: React.ReactNode;
}

/**
 * Receipt action container.
 * Note: Order fulfillment actions (Start Preparing / Mark Ready / Mark Served)
 * are managed centrally via the Active / Pending Orders Queue modal in the POS.
 */
export function ReceiptOrderActions({ children }: ReceiptOrderActionsProps) {
  return (
    <div className="mt-4 flex flex-col gap-2 print:hidden">{children}</div>
  );
}
