import { describe, expect, it } from 'vitest';
import { groupRestockBySupplier } from './restockGrouping';
import { ReorderRequestRow } from '@/api/reorderApi';

function row(requestId: number, supplier: string | null): ReorderRequestRow {
  return {
    request_id: requestId,
    product_id: requestId,
    current_stock_snapshot: 5,
    reorder_point_snapshot: 8,
    par_level_snapshot: 60,
    suggested_quantity: 55,
    status: 'pending',
    supplier,
    created_at: '2026-09-11T00:00:00Z',
    updated_at: '2026-09-11T00:00:00Z',
    resolved_at: null,
    resolved_by: null,
    product_name: `Product ${requestId}`,
  };
}

describe('groupRestockBySupplier', () => {
  it('groups by supplier and sends blanks to Unassigned', () => {
    const groups = groupRestockBySupplier([
      row(1, 'Fresh Provisions'),
      row(2, null),
      row(3, '  '),
      row(4, 'Fresh Provisions'),
    ]);
    expect(groups.map((group) => group.supplier)).toEqual([
      'Fresh Provisions',
      'Unassigned',
    ]);
    expect(groups[0]?.rows.map((item) => item.request_id)).toEqual([1, 4]);
  });

  it('returns an empty list when there are no requests', () => {
    expect(groupRestockBySupplier([])).toEqual([]);
  });
});
