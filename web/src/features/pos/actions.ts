'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/features/auth/queries';
import { parsePaymentMode, validateCheckout } from './checkout';
import type { CartLine, PaymentMode, Receipt } from './types';

export type CheckoutResult =
  | { ok: true; transactionId: string }
  | { ok: false; error: string };

function toFriendlyError(message: string): string {
  if (message.includes('Insufficient stock')) {
    return 'Not enough stock for one or more items. Stock may have changed — review the cart and try again.';
  }
  if (message.includes('not found')) {
    return 'An item is no longer on the menu. Refresh and try again.';
  }
  if (message.includes('Not authenticated')) {
    return 'Session expired. Sign in again.';
  }
  return 'Checkout failed. Try again.';
}

/**
 * Web checkout: validates, authorizes (cashier or admin), then calls the
 * same `process_sale` RPC as the mobile app. Totals and stock moves are
 * server-computed; client figures are never trusted.
 */
export async function checkoutSale(
  lines: CartLine[],
  paymentMode: PaymentMode,
  amountReceived: number | null,
): Promise<CheckoutResult> {
  await requireStaff();
  const mode = parsePaymentMode(paymentMode);
  if (!mode) return { ok: false, error: 'Unknown payment method.' };
  const validation = validateCheckout(lines, mode, amountReceived);
  if (!validation.ok) return { ok: false, error: validation.error };
  const { items, amountReceived: received, changeGiven } = validation.value;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('process_sale', {
    p_transaction_id: crypto.randomUUID(),
    p_payment_mode: mode,
    p_amount_received: received,
    p_change_given: changeGiven,
    p_items: items,
    p_date: new Date().toISOString(),
  });
  if (error) return { ok: false, error: toFriendlyError(error.message) };
  if (typeof data !== 'string' || data.length === 0) {
    return { ok: false, error: 'Checkout failed. Try again.' };
  }
  revalidatePath('/pos');
  return { ok: true, transactionId: data };
}

interface ReceiptItemDbRow {
  quantity: unknown;
  subtotal: unknown;
  product: { name: unknown } | unknown[] | null;
}

/**
 * Receipt read-back: the RPC returns only the id, so the server-computed
 * total, order number, and item names are re-read here for the receipt view.
 */
export async function getReceipt(
  transactionId: string,
): Promise<Receipt | null> {
  const profile = await requireStaff();
  const supabase = await createClient();
  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .select(
      'id, order_number, date, payment_mode, total_amount, amount_received, change_given, user_id',
    )
    .eq('id', transactionId)
    .maybeSingle();
  if (txnError || !txn) return null;
  const mode = parsePaymentMode(txn.payment_mode);
  if (!mode) return null;
  const { data: itemRows, error: itemsError } = await supabase
    .from('transaction_items')
    .select('quantity, subtotal, product(name)')
    .eq('transaction_id', transactionId);
  if (itemsError) return null;
  const items = ((itemRows ?? []) as ReceiptItemDbRow[]).flatMap((row) => {
    const qty = Number(row.quantity);
    const subtotal = Number(row.subtotal);
    const name =
      row.product && !Array.isArray(row.product) ? row.product.name : null;
    if (!Number.isFinite(qty) || !Number.isFinite(subtotal)) return [];
    return [
      {
        name: typeof name === 'string' ? name : 'Item',
        quantity: qty,
        subtotal,
      },
    ];
  });
  return {
    transaction_id: txn.id as string,
    order_number:
      typeof txn.order_number === 'number' ? txn.order_number : null,
    date: txn.date as string,
    cashier_name: txn.user_id === profile.userId ? profile.email : null,
    payment_mode: mode,
    total_amount: Number(txn.total_amount),
    amount_received:
      txn.amount_received === null ? null : Number(txn.amount_received),
    change_given: txn.change_given === null ? null : Number(txn.change_given),
    items,
  };
}
