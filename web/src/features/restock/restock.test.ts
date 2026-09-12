import { expect, test } from 'vitest';
import {
  byUrgency,
  canTransitionRestock,
  groupBySupplier,
  groupPrintSections,
  parseRestockFilter,
  parseRestockStatus,
  severityForRestock,
  type RestockRow,
} from './restock';

function row(
  overrides: Partial<RestockRow> & { request_id: number },
): RestockRow {
  return {
    product_id: 1,
    product_name: 'Latte',
    current_stock_snapshot: 5,
    reorder_point_snapshot: 8,
    par_level_snapshot: 60,
    suggested_quantity: 55,
    status: 'pending',
    supplier: null,
    cancel_reason: null,
    created_at: '2026-09-11T00:00:00Z',
    resolved_at: null,
    ...overrides,
  };
}

test('groupBySupplier groups by supplier, blanks go to Unassigned', () => {
  const groups = groupBySupplier([
    row({ request_id: 1, supplier: 'Fresh Provisions' }),
    row({ request_id: 2, supplier: null }),
    row({ request_id: 3, supplier: '  ' }),
    row({ request_id: 4, supplier: 'Fresh Provisions' }),
  ]);
  expect(groups.map((g) => g.supplier)).toEqual([
    'Fresh Provisions',
    'Unassigned',
  ]);
  expect(groups[0]?.rows.map((r) => r.request_id)).toEqual([1, 4]);
  expect(groups[1]?.rows.map((r) => r.request_id)).toEqual([2, 3]);
});

test('groupBySupplier preserves first-seen supplier order', () => {
  const groups = groupBySupplier([
    row({ request_id: 1, supplier: 'Bravo' }),
    row({ request_id: 2, supplier: 'Alpha' }),
  ]);
  expect(groups.map((g) => g.supplier)).toEqual(['Bravo', 'Alpha']);
});

test('parseRestockStatus accepts the four statuses only', () => {
  expect(parseRestockStatus('pending')).toBe('pending');
  expect(parseRestockStatus('ordered')).toBe('ordered');
  expect(parseRestockStatus('received')).toBe('received');
  expect(parseRestockStatus('cancelled')).toBe('cancelled');
  expect(parseRestockStatus('shipped')).toBeNull();
  expect(parseRestockStatus('')).toBeNull();
  expect(parseRestockStatus(null)).toBeNull();
});

test('parseRestockFilter accepts open, all, and the four statuses', () => {
  expect(parseRestockFilter('open')).toBe('open');
  expect(parseRestockFilter('all')).toBe('all');
  expect(parseRestockFilter('pending')).toBe('pending');
  expect(parseRestockFilter('ordered')).toBe('ordered');
  expect(parseRestockFilter('received')).toBe('received');
  expect(parseRestockFilter('cancelled')).toBe('cancelled');
  expect(parseRestockFilter('shipped')).toBeNull();
  expect(parseRestockFilter('')).toBeNull();
  expect(parseRestockFilter(null)).toBeNull();
});

test('canTransitionRestock allow-lists pending->ordered, ordered->received, open->cancelled', () => {
  expect(canTransitionRestock('pending', 'ordered')).toBe(true);
  expect(canTransitionRestock('ordered', 'received')).toBe(true);
  expect(canTransitionRestock('pending', 'cancelled')).toBe(true);
  expect(canTransitionRestock('ordered', 'cancelled')).toBe(true);
  expect(canTransitionRestock('pending', 'received')).toBe(false);
  expect(canTransitionRestock('ordered', 'ordered')).toBe(false);
  expect(canTransitionRestock('received', 'cancelled')).toBe(false);
  expect(canTransitionRestock('cancelled', 'pending')).toBe(false);
  expect(canTransitionRestock('received', 'ordered')).toBe(false);
});

test('severityForRestock derives critical/low from snapshots', () => {
  expect(
    severityForRestock(
      row({
        request_id: 1,
        current_stock_snapshot: 0,
        reorder_point_snapshot: 8,
      }),
    ),
  ).toBe('critical');
  expect(
    severityForRestock(
      row({
        request_id: 2,
        current_stock_snapshot: -3,
        reorder_point_snapshot: 8,
      }),
    ),
  ).toBe('critical');
  expect(
    severityForRestock(
      row({
        request_id: 3,
        current_stock_snapshot: 5,
        reorder_point_snapshot: 8,
      }),
    ),
  ).toBe('low');
  // Recovered above the reorder point but still open: still needs an
  // admin to close it, so it displays as Low rather than vanishing.
  expect(
    severityForRestock(
      row({
        request_id: 4,
        current_stock_snapshot: 20,
        reorder_point_snapshot: 8,
      }),
    ),
  ).toBe('low');
});

test('byUrgency orders critical first, then status, then oldest', () => {
  const lowPendingOld = row({
    request_id: 1,
    current_stock_snapshot: 5,
    reorder_point_snapshot: 8,
    status: 'pending',
    created_at: '2026-09-10T00:00:00Z',
  });
  const criticalOrdered = row({
    request_id: 2,
    current_stock_snapshot: 0,
    reorder_point_snapshot: 8,
    status: 'ordered',
    created_at: '2026-09-12T00:00:00Z',
  });
  const criticalPendingNew = row({
    request_id: 3,
    current_stock_snapshot: 0,
    reorder_point_snapshot: 8,
    status: 'pending',
    created_at: '2026-09-12T00:00:00Z',
  });
  const criticalPendingOld = row({
    request_id: 4,
    current_stock_snapshot: 0,
    reorder_point_snapshot: 8,
    status: 'pending',
    created_at: '2026-09-09T00:00:00Z',
  });
  const shuffled = [
    lowPendingOld,
    criticalOrdered,
    criticalPendingNew,
    criticalPendingOld,
  ];
  expect(shuffled.sort(byUrgency).map((r) => r.request_id)).toEqual([
    4, 3, 2, 1,
  ]);
});

test('groupPrintSections splits urgent and low, grouped by supplier', () => {
  const sections = groupPrintSections([
    row({
      request_id: 1,
      current_stock_snapshot: 5,
      reorder_point_snapshot: 8,
      supplier: 'Fresh Provisions',
    }),
    row({
      request_id: 2,
      current_stock_snapshot: 0,
      reorder_point_snapshot: 8,
      supplier: null,
    }),
    row({
      request_id: 3,
      current_stock_snapshot: 0,
      reorder_point_snapshot: 8,
      supplier: 'Fresh Provisions',
    }),
  ]);
  expect(sections.map((s) => s.title)).toEqual([
    'Urgent — Out of Stock',
    'Low Stock',
  ]);
  expect(sections[0]?.groups.map((g) => g.supplier)).toEqual([
    'Unassigned',
    'Fresh Provisions',
  ]);
  expect(sections[0]?.groups[0]?.rows.map((r) => r.request_id)).toEqual([2]);
  expect(sections[1]?.groups.map((g) => g.supplier)).toEqual([
    'Fresh Provisions',
  ]);
});

test('groupPrintSections omits empty severities', () => {
  expect(
    groupPrintSections([
      row({
        request_id: 1,
        current_stock_snapshot: 5,
        reorder_point_snapshot: 8,
      }),
    ]).map((s) => s.title),
  ).toEqual(['Low Stock']);
  expect(groupPrintSections([])).toEqual([]);
});
