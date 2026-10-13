import { classifyCategory, type ProductKind } from './classify';

export type ShiftPaymentMode = 'cash' | 'gcash' | 'maya';
export type ShiftPaymentStatus =
  | 'paid'
  | 'pending_verification'
  | 'verified'
  | 'rejected';

export interface ShiftSaleItem {
  product_id: number;
  quantity: number;
  subtotal: number;
  product_name: string;
  category_name: string;
}

export interface ShiftSale {
  id: string;
  date: string;
  total_amount: number;
  payment_mode: ShiftPaymentMode;
  payment_status: ShiftPaymentStatus;
  status: string;
  user_id: string;
  items: ShiftSaleItem[];
}

export interface QuotaSnapshot {
  product_id: number;
  quota_limit: number | null;
  initial_quota: number | null;
}

export type QuotaValue = number | null | 'unrecorded';

export interface ProductReportRow {
  product_id: number;
  name: string;
  category: string;
  kind: ProductKind;
  quantity: number;
  amount: number;
  quotaLimit: QuotaValue;
  quotaSold: number;
  quotaRemaining: QuotaValue;
}

export interface ShiftReport {
  completedCount: number;
  completedTotal: number;
  voidedCount: number;
  voidedTotal: number;
  cashTotal: number;
  onlineCollected: number;
  onlinePending: number;
  rejectedCount: number;
  rejectedTotal: number;
  cupsTotal: number;
  physicalUnitsTotal: number;
  unclassifiedUnitsTotal: number;
  products: ProductReportRow[];
}

const MODES: ReadonlySet<string> = new Set(['cash', 'gcash', 'maya']);
const STATUSES: ReadonlySet<string> = new Set([
  'paid',
  'pending_verification',
  'verified',
  'rejected',
]);

function isSale(value: unknown): value is ShiftSale {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.date === 'string' &&
    Number.isFinite(Number(row.total_amount)) &&
    typeof row.payment_mode === 'string' &&
    MODES.has(row.payment_mode) &&
    typeof row.payment_status === 'string' &&
    STATUSES.has(row.payment_status) &&
    typeof row.status === 'string' &&
    typeof row.user_id === 'string' &&
    Array.isArray(row.items)
  );
}

interface ProductAccumulator {
  product_id: number;
  name: string;
  category: string;
  kind: ProductKind;
  quantity: number;
  amount: number;
}

/**
 * Builds the end-of-shift report from already-fetched rows.
 * Completed sales count toward every sales total regardless of payment
 * verification; verification only splits collected vs pending vs rejected.
 * Voided sales are reported separately and never feed products or quotas.
 * Pure function: repeated builds over the same input are identical and
 * the report never writes anything back.
 */
export function buildShiftReport(
  sales: unknown[],
  quotas: QuotaSnapshot[],
): ShiftReport {
  const report: ShiftReport = {
    completedCount: 0,
    completedTotal: 0,
    voidedCount: 0,
    voidedTotal: 0,
    cashTotal: 0,
    onlineCollected: 0,
    onlinePending: 0,
    rejectedCount: 0,
    rejectedTotal: 0,
    cupsTotal: 0,
    physicalUnitsTotal: 0,
    unclassifiedUnitsTotal: 0,
    products: [],
  };
  const products = new Map<number, ProductAccumulator>();
  for (const value of sales) {
    if (!isSale(value)) continue;
    if (value.status === 'voided') {
      report.voidedCount += 1;
      report.voidedTotal += value.total_amount;
      continue;
    }
    if (value.status !== 'completed') continue;
    report.completedCount += 1;
    report.completedTotal += value.total_amount;
    if (value.payment_status === 'rejected') {
      report.rejectedCount += 1;
      report.rejectedTotal += value.total_amount;
    } else if (value.payment_mode === 'cash') {
      report.cashTotal += value.total_amount;
    } else if (value.payment_status === 'verified') {
      report.onlineCollected += value.total_amount;
    } else {
      report.onlinePending += value.total_amount;
    }
    for (const item of value.items) {
      if (
        typeof item.product_id !== 'number' ||
        !Number.isFinite(Number(item.quantity)) ||
        !Number.isFinite(Number(item.subtotal))
      ) {
        continue;
      }
      const quantity = Number(item.quantity);
      const subtotal = Number(item.subtotal);
      const kind = classifyCategory(item.category_name);
      if (kind === 'drink') report.cupsTotal += quantity;
      else if (kind === 'physical') report.physicalUnitsTotal += quantity;
      else report.unclassifiedUnitsTotal += quantity;
      const existing = products.get(item.product_id);
      if (existing) {
        existing.quantity += quantity;
        existing.amount += subtotal;
      } else {
        products.set(item.product_id, {
          product_id: item.product_id,
          name:
            typeof item.product_name === 'string' && item.product_name
              ? item.product_name
              : `Product #${item.product_id}`,
          category:
            typeof item.category_name === 'string' && item.category_name
              ? item.category_name
              : 'Unclassified',
          kind,
          quantity,
          amount: subtotal,
        });
      }
    }
  }
  const quotaByProduct = new Map<number, QuotaSnapshot>();
  for (const quota of quotas) quotaByProduct.set(quota.product_id, quota);
  report.products = [...products.values()]
    .map((row): ProductReportRow => {
      const quota = quotaByProduct.get(row.product_id);
      if (!quota) {
        return {
          ...row,
          quotaLimit: 'unrecorded',
          quotaSold: row.quantity,
          quotaRemaining: 'unrecorded',
        };
      }
      if (quota.quota_limit === null) {
        return {
          ...row,
          quotaLimit: null,
          quotaSold: row.quantity,
          quotaRemaining: null,
        };
      }
      return {
        ...row,
        quotaLimit: quota.quota_limit,
        quotaSold: row.quantity,
        quotaRemaining: Math.max(0, quota.quota_limit - row.quantity),
      };
    })
    .sort((a, b) => b.amount - a.amount);
  return report;
}
