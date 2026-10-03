'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/features/auth/queries';
import {
  parsePaymentMode,
  parsePaymentStatus,
  validateCheckout,
  validateOnlinePayment,
} from './checkout';
import type { CartLine, PaymentMode, Receipt } from './types';

export type CheckoutResult =
  | { ok: true; transactionId: string }
  | { ok: false; error: string };

function toFriendlyError(message: string): string {
  if (message.includes('Daily quota reached')) {
    return 'One or more products are sold out for today. Review the cart and try again.';
  }
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
  paymentReference: string,
  evidenceData: FormData | null,
): Promise<CheckoutResult> {
  const profile = await requireStaff();
  const mode = parsePaymentMode(paymentMode);
  if (!mode) return { ok: false, error: 'Unknown payment method.' };
  const validation = validateCheckout(lines, mode, amountReceived);
  if (!validation.ok) return { ok: false, error: validation.error };
  const { items, amountReceived: received, changeGiven } = validation.value;
  const supabase = await createClient();
  const transactionId = crypto.randomUUID();
  let evidencePath: string | null = null;
  let evidenceMime: string | null = null;
  let evidenceSize: number | null = null;

  if (mode !== 'cash') {
    const evidence = evidenceData?.get('evidence');
    const file = evidence instanceof File ? evidence : null;
    const detailError = validateOnlinePayment(
      mode,
      paymentReference,
      Boolean(file && file.size > 0),
    );
    if (detailError) return { ok: false, error: detailError };
    if (!file) return { ok: false, error: 'Confirm a payment evidence photo.' };
    const extensionByMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const extension = extensionByMime[file.type];
    if (!extension) {
      return {
        ok: false,
        error: 'Evidence must be a JPEG, PNG, or WebP image.',
      };
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      return { ok: false, error: 'Evidence image must be 5 MB or smaller.' };
    }
    evidencePath = `${profile.userId}/${transactionId}/evidence.${extension}`;
    evidenceMime = file.type;
    evidenceSize = file.size;
    const { error: uploadError } = await supabase.storage
      .from('payment-evidence')
      .upload(evidencePath, file, {
        contentType: file.type,
        cacheControl: 'private, max-age=0',
        upsert: false,
      });
    if (uploadError) {
      return {
        ok: false,
        error:
          'Payment evidence could not be uploaded. Check the connection and try again.',
      };
    }
  }
  const { data, error } = await supabase.rpc('process_sale', {
    p_transaction_id: transactionId,
    p_payment_mode: mode,
    p_amount_received: received,
    p_change_given: changeGiven,
    p_items: items,
    p_date: new Date().toISOString(),
    p_payment_reference: mode === 'cash' ? null : paymentReference.trim(),
    p_evidence_path: evidencePath,
    p_evidence_mime: evidenceMime,
    p_evidence_size: evidenceSize,
  });
  if (error) {
    if (evidencePath) {
      await supabase.storage.from('payment-evidence').remove([evidencePath]);
    }
    return { ok: false, error: toFriendlyError(error.message) };
  }
  if (typeof data !== 'string' || data.length === 0) {
    return { ok: false, error: 'Checkout failed. Try again.' };
  }
  revalidatePath('/pos');
  revalidatePath('/today-products');
  revalidatePath('/dashboard');
  revalidatePath('/admin');
  revalidatePath('/admin/reports');
  return { ok: true, transactionId: data };
}

interface ReceiptItemDbRow {
  quantity: unknown;
  subtotal: unknown;
  product: { name: unknown } | unknown[] | null;
}

interface ReceiptUserRow {
  username: unknown;
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
      'id, transaction_number, order_number, date, payment_mode, payment_status, payment_reference, payment_review_note, total_amount, amount_received, change_given, user_id, user:user!transactions_user_id_fkey(username)',
    )
    .eq('id', transactionId)
    .maybeSingle();
  if (txnError || !txn) return null;
  const mode = parsePaymentMode(txn.payment_mode);
  const paymentStatus = parsePaymentStatus(txn.payment_status);
  if (!mode || !paymentStatus || typeof txn.transaction_number !== 'string')
    return null;
  const { data: itemRows, error: itemsError } = await supabase
    .from('transaction_items')
    .select('quantity, subtotal, product(name)')
    .eq('transaction_id', transactionId);
  if (itemsError) return null;
  const { count: evidenceCount } = await supabase
    .from('payment_evidence')
    .select('evidence_id', { count: 'exact', head: true })
    .eq('transaction_id', transactionId);
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
    transaction_number: txn.transaction_number,
    order_number:
      typeof txn.order_number === 'number' ? txn.order_number : null,
    date: txn.date as string,
    cashier_name: (() => {
      const user = txn.user as ReceiptUserRow | ReceiptUserRow[] | null;
      const row = Array.isArray(user) ? user[0] : user;
      return typeof row?.username === 'string'
        ? row.username
        : txn.user_id === profile.userId
          ? profile.email
          : null;
    })(),
    payment_mode: mode,
    payment_status: paymentStatus,
    payment_reference:
      typeof txn.payment_reference === 'string' ? txn.payment_reference : null,
    has_payment_evidence: (evidenceCount ?? 0) > 0,
    payment_review_note:
      typeof txn.payment_review_note === 'string'
        ? txn.payment_review_note
        : null,
    total_amount: Number(txn.total_amount),
    amount_received:
      txn.amount_received === null ? null : Number(txn.amount_received),
    change_given: txn.change_given === null ? null : Number(txn.change_given),
    items,
  };
}

export async function getPaymentEvidenceUrl(
  transactionId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payment_evidence')
    .select('object_path')
    .eq('transaction_id', transactionId)
    .maybeSingle();
  if (error || !data || typeof data.object_path !== 'string') {
    return { ok: false, error: 'Payment evidence is unavailable.' };
  }
  const { data: signed, error: signError } = await supabase.storage
    .from('payment-evidence')
    .createSignedUrl(data.object_path, 60);
  if (signError || !signed.signedUrl) {
    return { ok: false, error: 'Payment evidence could not be opened.' };
  }
  return { ok: true, url: signed.signedUrl };
}

export async function reviewOnlinePayment(
  transactionId: string,
  status: 'verified' | 'rejected',
  note: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireStaff();
  if (profile.role !== 'admin') return { ok: false, error: 'Admin only.' };
  if (status === 'rejected' && !note.trim()) {
    return { ok: false, error: 'Enter a rejection reason.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('review_online_payment', {
    p_transaction_id: transactionId,
    p_status: status,
    p_note: note.trim() || null,
  });
  if (error) return { ok: false, error: 'Payment review could not be saved.' };
  revalidatePath(`/pos/receipt/${transactionId}`);
  revalidatePath('/admin/reports');
  revalidatePath('/admin');
  return { ok: true };
}
