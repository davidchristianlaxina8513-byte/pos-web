import { ReorderRequestRow } from '@/api/reorderApi';

export interface SupplierGroup {
  supplier: string;
  rows: ReorderRequestRow[];
}

/** Groups open requests by supplier for list + share output; null/blank → 'Unassigned'. */
export function groupRestockBySupplier(
  rows: ReorderRequestRow[],
): SupplierGroup[] {
  const groups = new Map<string, ReorderRequestRow[]>();
  for (const row of rows) {
    const key = row.supplier?.trim() ? row.supplier.trim() : 'Unassigned';
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()].map(([supplier, groupRows]) => ({
    supplier,
    rows: groupRows,
  }));
}
