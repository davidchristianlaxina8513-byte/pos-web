import type { CartLine, MenuItem } from './types';

export type CartAction =
  | { type: 'add'; item: MenuItem }
  | { type: 'increment'; product_id: number }
  | { type: 'decrement'; product_id: number }
  | { type: 'remove'; product_id: number }
  | { type: 'clear' };

function toLine(item: MenuItem): CartLine {
  return {
    product_id: item.product_id,
    name: item.name,
    price: item.price,
    qty: 1,
  };
}

/**
 * Session-only cart state. Mirrors Expo `CartContext`: add bumps qty,
 * decrement drops zero-qty lines, totals derived via `cartTotal`.
 */
export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const existing = lines.find(
        (line) => line.product_id === action.item.product_id,
      );
      if (!existing) return [...lines, toLine(action.item)];
      return lines.map((line) =>
        line.product_id === action.item.product_id
          ? { ...line, qty: line.qty + 1 }
          : line,
      );
    }
    case 'increment':
      return lines.map((line) =>
        line.product_id === action.product_id
          ? { ...line, qty: line.qty + 1 }
          : line,
      );
    case 'decrement':
      return lines
        .map((line) =>
          line.product_id === action.product_id
            ? { ...line, qty: line.qty - 1 }
            : line,
        )
        .filter((line) => line.qty > 0);
    case 'remove':
      return lines.filter((line) => line.product_id !== action.product_id);
    case 'clear':
      return [];
  }
}
