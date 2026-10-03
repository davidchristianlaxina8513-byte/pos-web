/**
 * POS feature types. Today's server-computed quota disables sold-out items.
 */

export type PaymentMode = 'cash' | 'gcash' | 'maya';
export type PaymentStatus =
  | 'paid'
  | 'pending_verification'
  | 'verified'
  | 'rejected';

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
  today_quota_limit: number | null;
  sold_quantity: number;
  remaining_quantity: number | null;
}

export interface Menu {
  categories: MenuCategory[];
  items: MenuItem[];
}

/** Sellable when the cafe offers it and today's quota remains. */
export function isSellable(item: MenuItem): boolean {
  return (
    item.is_available &&
    (item.remaining_quantity === null || item.remaining_quantity > 0)
  );
}

export interface CartLine {
  product_id: number;
  name: string;
  price: number;
  qty: number;
  /** Carried for thumbnails in checkout rows; never sent to the RPC. */
  image_url: string | null;
}

/** Running total of price times quantity. */
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
  transaction_number: string;
  order_number: number | null;
  date: string;
  cashier_name: string | null;
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  has_payment_evidence: boolean;
  payment_review_note: string | null;
  total_amount: number;
  amount_received: number | null;
  change_given: number | null;
  items: ReceiptLine[];
}
