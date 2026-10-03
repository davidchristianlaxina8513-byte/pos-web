export type ProductQuotaStatus =
  | 'unlimited'
  | 'good'
  | 'almost_sold_out'
  | 'sold_out';

export function quotaStatus(
  quotaLimit: number | null,
  remaining: number | null,
): ProductQuotaStatus {
  if (quotaLimit === null || remaining === null) return 'unlimited';
  if (remaining === 0 || quotaLimit === 0) return 'sold_out';
  const remainingRatio = remaining / quotaLimit;
  if (remainingRatio <= 0.25) return 'almost_sold_out';
  return 'good';
}

export const QUOTA_STATUS_LABEL: Record<ProductQuotaStatus, string> = {
  unlimited: 'Unlimited',
  good: 'Good',
  almost_sold_out: 'Almost Sold Out',
  sold_out: 'Sold Out',
};
