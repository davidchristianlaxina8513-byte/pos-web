import { describe, expect, it } from 'vitest';
import {
  buildShiftReport,
  type QuotaSnapshot,
  type ShiftSale,
} from './aggregate';

function sale(overrides: Partial<ShiftSale>): ShiftSale {
  return {
    id: 'txn',
    date: '2026-10-12T02:00:00.000Z',
    total_amount: 0,
    payment_mode: 'cash',
    payment_status: 'paid',
    status: 'completed',
    user_id: 'u1',
    items: [],
    ...overrides,
  } as ShiftSale;
}

const QUOTAS: QuotaSnapshot[] = [
  { product_id: 1, quota_limit: 30, initial_quota: 30 },
  { product_id: 2, quota_limit: null, initial_quota: null },
];

describe('buildShiftReport', () => {
  it('reconciles completed totals without dropping pending verification', () => {
    const report = buildShiftReport(
      [
        sale({ id: 'a', total_amount: 100, items: [] }),
        sale({
          id: 'b',
          total_amount: 200,
          payment_mode: 'gcash',
          payment_status: 'verified',
          items: [],
        }),
        sale({
          id: 'c',
          total_amount: 150,
          payment_mode: 'gcash',
          payment_status: 'pending_verification',
          items: [],
        }),
        sale({
          id: 'd',
          total_amount: 50,
          payment_mode: 'maya',
          payment_status: 'rejected',
          items: [],
        }),
        sale({ id: 'e', total_amount: 999, status: 'voided', items: [] }),
      ],
      [],
    );
    expect(report.completedCount).toBe(4);
    expect(report.completedTotal).toBe(500);
    expect(report.voidedCount).toBe(1);
    expect(report.voidedTotal).toBe(999);
    expect(report.cashTotal).toBe(100);
    expect(report.onlineCollected).toBe(200);
    expect(report.onlinePending).toBe(150);
    expect(report.rejectedCount).toBe(1);
    expect(report.rejectedTotal).toBe(50);
    expect(report.completedTotal).toBe(
      report.cashTotal +
        report.onlineCollected +
        report.onlinePending +
        report.rejectedTotal,
    );
  });

  it('groups product rows and splits cups, physical, and unclassified units', () => {
    const report = buildShiftReport(
      [
        sale({
          id: 'a',
          total_amount: 440,
          items: [
            {
              product_id: 1,
              quantity: 2,
              subtotal: 240,
              product_name: 'Latte',
              category_name: 'Ice Drinks',
            },
            {
              product_id: 3,
              quantity: 1,
              subtotal: 120,
              product_name: 'Sandwich',
              category_name: 'Sandwiches',
            },
            {
              product_id: 9,
              quantity: 1,
              subtotal: 80,
              product_name: 'Mystery',
              category_name: 'Desserts',
            },
          ],
        }),
        sale({
          id: 'b',
          total_amount: 120,
          items: [
            {
              product_id: 1,
              quantity: 1,
              subtotal: 120,
              product_name: 'Latte',
              category_name: 'Ice Drinks',
            },
          ],
        }),
      ],
      QUOTAS,
    );
    expect(report.cupsTotal).toBe(3);
    expect(report.physicalUnitsTotal).toBe(1);
    expect(report.unclassifiedUnitsTotal).toBe(1);
    const latte = report.products.find((row) => row.product_id === 1);
    expect(latte).toMatchObject({
      name: 'Latte',
      kind: 'drink',
      quantity: 3,
      amount: 360,
      quotaLimit: 30,
      quotaSold: 3,
      quotaRemaining: 27,
    });
    const mystery = report.products.find((row) => row.product_id === 9);
    expect(mystery).toMatchObject({
      kind: 'unclassified',
      quotaLimit: 'unrecorded',
      quotaSold: 1,
      quotaRemaining: 'unrecorded',
    });
  });

  it('marks unlimited quotas without inventing a remaining balance', () => {
    const report = buildShiftReport(
      [
        sale({
          id: 'a',
          total_amount: 55,
          items: [
            {
              product_id: 2,
              quantity: 1,
              subtotal: 55,
              product_name: 'Ombre Tea',
              category_name: 'Lemonade / Tea',
            },
          ],
        }),
      ],
      QUOTAS,
    );
    const tea = report.products.find((row) => row.product_id === 2);
    expect(tea).toMatchObject({
      quotaLimit: null,
      quotaSold: 1,
      quotaRemaining: null,
    });
  });

  it('ignores voided sales in products and quota sold', () => {
    const report = buildShiftReport(
      [
        sale({
          id: 'a',
          total_amount: 240,
          status: 'voided',
          items: [
            {
              product_id: 1,
              quantity: 2,
              subtotal: 240,
              product_name: 'Latte',
              category_name: 'Ice Drinks',
            },
          ],
        }),
      ],
      QUOTAS,
    );
    expect(report.products).toHaveLength(0);
    expect(report.cupsTotal).toBe(0);
    expect(report.completedTotal).toBe(0);
    expect(report.voidedTotal).toBe(240);
  });

  it('returns identical results on repeated builds (read-only proof)', () => {
    const sales = [
      sale({
        id: 'a',
        total_amount: 240,
        payment_mode: 'gcash',
        payment_status: 'verified',
        items: [
          {
            product_id: 1,
            quantity: 2,
            subtotal: 240,
            product_name: 'Latte',
            category_name: 'Ice Drinks',
          },
        ],
      }),
    ];
    expect(buildShiftReport(sales, QUOTAS)).toEqual(
      buildShiftReport(sales, QUOTAS),
    );
  });
});
