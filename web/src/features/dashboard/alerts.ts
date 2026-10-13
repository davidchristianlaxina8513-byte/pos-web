export type AttentionKey =
  | 'sold_out'
  | 'almost_sold_out'
  | 'pending_payments'
  | 'pending_turnovers'
  | 'discrepancy_turnovers';

export interface AttentionAlert {
  key: AttentionKey;
  message: string;
  /** Existing resolution page. Future alerts add one entry here. */
  href: string;
}

export interface AttentionCounts {
  soldOut: number;
  almostSoldOut: number;
  pendingPayments: number;
  pendingTurnovers: number;
  discrepancyTurnovers: number;
}

function plural(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Needs-attention alerts with the page where each condition is resolved.
 * Pure mapping — counts still come from the existing dashboard queries.
 */
export function attentionAlerts(counts: AttentionCounts): AttentionAlert[] {
  const alerts: (AttentionAlert | null)[] = [
    counts.soldOut
      ? {
          key: 'sold_out',
          message: `${plural(counts.soldOut, 'product', 'products')} sold out today`,
          href: '/today-products',
        }
      : null,
    counts.almostSoldOut
      ? {
          key: 'almost_sold_out',
          message: `${plural(counts.almostSoldOut, 'product', 'products')} almost sold out`,
          href: '/today-products',
        }
      : null,
    counts.pendingPayments
      ? {
          key: 'pending_payments',
          message: `${plural(counts.pendingPayments, 'online payment', 'online payments')} pending verification`,
          href: '/admin/reports?paymentStatus=pending_verification',
        }
      : null,
    counts.pendingTurnovers
      ? {
          key: 'pending_turnovers',
          message: `${plural(counts.pendingTurnovers, 'cash turnover', 'cash turnovers')} pending verification`,
          href: '/admin/cashier-operations#turnover',
        }
      : null,
    counts.discrepancyTurnovers
      ? {
          key: 'discrepancy_turnovers',
          message: `${plural(counts.discrepancyTurnovers, 'cash turnover', 'cash turnovers')} with a discrepancy`,
          href: '/admin/cashier-operations#turnover',
        }
      : null,
  ];
  return alerts.filter((alert): alert is AttentionAlert => alert !== null);
}
