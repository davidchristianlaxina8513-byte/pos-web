/**
 * POS feature types. Mirrors the Expo app (`src/types/entities.ts` →
 * Product/Category, `src/types/context.ts` → CartItem/PaymentMode) with one
 * addition: live `stock_quantity` from `inventory`, used to disable
 * out-of-stock items (approved deviation from Expo, which checks only
 * `is_available`).
 */

export type PaymentMode = 'cash' | 'gcash' | 'maya';

export interface MenuCategory {
  category_id: string;
  name: string;
}

export interface MenuItem {
  product_id: number;
  name: string;
  price: number;
  is_available: boolean;
  image_url: string | null;
  category_id: string;
  category_name: string;
  /** Summed on-hand across inventory rows. Missing row counts as 0. */
  stock_quantity: number;
}

export interface Menu {
  categories: MenuCategory[];
  items: MenuItem[];
}

/** Sellable when the cafe offers it AND stock is on hand. */
export function isSellable(item: MenuItem): boolean {
  return item.is_available && item.stock_quantity > 0;
}

export interface CartLine {
  product_id: number;
  name: string;
  price: number;
  qty: number;
}

/** Running total, mirroring Expo `CartContext` (`price × qty` summed). */
export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.qty, 0);
}

export interface CheckoutItemInput {
  product_id: number;
  quantity: number;
}

export interface ReceiptLine {
  name: string;
  quantity: number;
  subtotal: number;
}

export interface Receipt {
  transaction_id: string;
  order_number: number | null;
  date: string;
  cashier_name: string | null;
  payment_mode: PaymentMode;
  total_amount: number;
  amount_received: number | null;
  change_given: number | null;
  items: ReceiptLine[];
}
