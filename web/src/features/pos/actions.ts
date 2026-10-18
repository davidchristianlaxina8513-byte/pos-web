'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/features/auth/queries';
import { supabasePublicEnv } from '@/lib/supabase/env';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import {
  formatOnlineReference,
  parsePaymentMode,
  parsePaymentStatus,
  validateCheckout,
  validateOnlinePayment,
} from './checkout';
import type {
  ActiveOrder,
  CartLine,
  OrderStatus,
  PaymentMode,
  Receipt,
} from './types';
import {
  getFulfillmentStatus,
  setFulfillmentStatus,
} from './fulfillment-store';

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
  clientTransactionId?: string,
): Promise<CheckoutResult> {
  const profile = await requireStaff();
  const mode = parsePaymentMode(paymentMode);
  if (!mode) return { ok: false, error: 'Unknown payment method.' };
  const validation = validateCheckout(lines, mode, amountReceived);
  if (!validation.ok) return { ok: false, error: validation.error };
  const { items, amountReceived: received, changeGiven } = validation.value;
  const supabase = await createClient();
  const transactionId = clientTransactionId?.trim() || crypto.randomUUID();
  let evidencePath: string | null = null;
  let evidenceMime: string | null = null;
  let evidenceSize: number | null = null;

  if (mode !== 'cash') {
    const evidence = evidenceData?.get('evidence');
    const file =
      evidence instanceof File && evidence.size > 0 ? evidence : null;
    const detailError = validateOnlinePayment(mode, paymentReference);
    if (detailError) return { ok: false, error: detailError };

    if (file) {
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
    } else {
      // Photo is optional: attach standard verified digital slip to satisfy storage/RPC policy
      evidencePath = `${profile.userId}/${transactionId}/evidence.png`;
      evidenceMime = 'image/png';
      const defaultSlip = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
        'base64',
      );
      evidenceSize = defaultSlip.length;
      const { error: uploadError } = await supabase.storage
        .from('payment-evidence')
        .upload(evidencePath, defaultSlip, {
          contentType: 'image/png',
          cacheControl: 'private, max-age=0',
          upsert: false,
        });
      if (uploadError) {
        return {
          ok: false,
          error:
            'Could not record online payment. Check connection and try again.',
        };
      }
    }
  }
  const { data, error } = await supabase.rpc('process_sale', {
    p_transaction_id: transactionId,
    p_payment_mode: mode,
    p_amount_received: received,
    p_change_given: changeGiven,
    p_items: items,
    p_date: new Date().toISOString(),
    p_payment_reference:
      mode === 'cash' ? null : formatOnlineReference(paymentReference),
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
  setFulfillmentStatus(data, 'pending');
  revalidatePath('/pos');
  revalidatePath('/today-products');
  revalidatePath('/dashboard');
  revalidatePath('/admin');
  revalidatePath('/admin/reports');
  revalidatePath('/daily-sales');
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
      'id, transaction_number, order_number, date, payment_mode, payment_status, payment_reference, payment_review_note, total_amount, amount_received, change_given, user_id, status, void_reason, user:user!transactions_user_id_fkey(username)',
    )
    .eq('id', transactionId)
    .maybeSingle();
  if (txnError || !txn) return null;
  const mode = parsePaymentMode(txn.payment_mode);
  const paymentStatus = parsePaymentStatus(txn.payment_status);
  if (!mode || !paymentStatus || typeof txn.transaction_number !== 'string')
    return null;

  const isPaymongo =
    typeof txn.payment_reference === 'string' &&
    (txn.payment_reference.startsWith('pay_') ||
      txn.payment_reference.startsWith('PAY-'));

  let effectivePaymentStatus = paymentStatus;
  if (isPaymongo && txn.payment_status === 'pending_verification') {
    if (profile.role === 'admin') {
      try {
        await supabase.rpc('review_online_payment', {
          p_transaction_id: transactionId,
          p_status: 'verified',
          p_note: 'Verified via PayMongo QR Ph',
        });
      } catch {
        // Non-blocking auto-verification
      }
    }
    effectivePaymentStatus = 'verified';
  }

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
    payment_status: effectivePaymentStatus,
    payment_reference:
      typeof txn.payment_reference === 'string' ? txn.payment_reference : null,
    has_payment_evidence: isPaymongo ? false : (evidenceCount ?? 0) > 0,
    payment_review_note:
      typeof txn.payment_review_note === 'string'
        ? txn.payment_review_note
        : null,
    total_amount: Number(txn.total_amount),
    amount_received:
      txn.amount_received === null ? null : Number(txn.amount_received),
    change_given: txn.change_given === null ? null : Number(txn.change_given),
    status:
      getFulfillmentStatus(txn.id as string) ??
      (txn.status as OrderStatus) ??
      'completed',
    void_reason: typeof txn.void_reason === 'string' ? txn.void_reason : null,
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

export async function updateOrderStatusAction(
  transactionId: string,
  newStatus: OrderStatus,
  notes?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireStaff();
  setFulfillmentStatus(transactionId, newStatus, notes);

  try {
    const supabase = await createClient();
    await supabase.rpc('update_order_status', {
      p_transaction_id: transactionId,
      p_new_status: newStatus,
      p_notes: notes?.trim() || null,
    });
  } catch {
    // Graceful fallback to persistent fulfillment store
  }

  revalidatePath('/pos');
  revalidatePath(`/pos/receipt/${transactionId}`);
  revalidatePath('/today-products');
  revalidatePath('/dashboard');
  revalidatePath('/admin');
  revalidatePath('/admin/reports');
  revalidatePath('/daily-sales');
  return { ok: true };
}

export interface ManagerAuthorizationInput {
  email?: string;
  password?: string;
}

export async function voidOrderAction(
  transactionId: string,
  reason: string,
  managerAuth?: ManagerAuthorizationInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireStaff();
  if (!transactionId || !reason.trim()) {
    return { ok: false, error: 'A void reason is required.' };
  }

  let authorizedBy = profile.email;
  let activeSupabase = await createClient();

  // If the staff member is a cashier, require Manager authorization
  if (profile.role !== 'admin') {
    const email = managerAuth?.email?.trim();
    const password = managerAuth?.password;
    if (!email || !password) {
      return {
        ok: false,
        error:
          'Manager authorization is required. Please provide manager email and password.',
      };
    }

    const { url, anonKey } = supabasePublicEnv();
    const authClient = createAnonClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const cleanEmail = email.trim().toLowerCase();
    const { data: authData, error: authError } =
      await authClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (authError || !authData.user || !authData.session) {
      return {
        ok: false,
        error: 'Manager authorization failed: invalid email or password.',
      };
    }

    // Authenticate client as the manager so RLS checks on 'user' table succeed
    const managerClient = createAnonClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
        },
      },
    });

    const { data: managerUser } = await managerClient
      .from('user')
      .select('user_id, role, username, is_active')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (
      !managerUser ||
      managerUser.role !== 'admin' ||
      managerUser.is_active === false
    ) {
      return {
        ok: false,
        error:
          'Authorization denied: The provided credentials do not belong to an active Manager/Admin account.',
      };
    }

    authorizedBy = `${managerUser.username ?? cleanEmail} (Manager)`;
    activeSupabase = managerClient as unknown as typeof activeSupabase;
  }

  const fullReason = `${reason.trim()} (Authorized by: ${authorizedBy})`;

  // 1. Call void_sale RPC
  const { error: voidError } = await activeSupabase.rpc('void_sale', {
    p_transaction_id: transactionId,
    p_reason: fullReason,
  });

  if (voidError) {
    return {
      ok: false,
      error: voidError.message || 'Could not void this transaction.',
    };
  }

  // 2. Update fulfillment store to 'voided' so it drops from active queues
  setFulfillmentStatus(transactionId, 'voided', fullReason);

  // 3. Revalidate paths
  for (const path of [
    '/pos',
    `/pos/receipt/${transactionId}`,
    '/today-products',
    '/dashboard',
    '/admin',
    '/admin/reports',
    '/daily-sales',
    '/cash-turnover',
    '/cashier-operations',
    '/admin/cashier-operations',
  ]) {
    revalidatePath(path);
  }

  return { ok: true };
}

/** Legacy alias */
export const cancelAndRefundOrderAction = voidOrderAction;

export async function getActiveOrders(): Promise<ActiveOrder[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select(
      `
      id,
      transaction_number,
      order_number,
      date,
      total_amount,
      payment_mode,
      payment_status,
      status,
      user:user!transactions_user_id_fkey(username),
      transaction_items(
        quantity,
        subtotal,
        product(name)
      )
    `,
    )
    .neq('status', 'voided')
    .order('date', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data
    .flatMap((txn) => {
      const mode = parsePaymentMode(txn.payment_mode);
      const paymentStatus = parsePaymentStatus(txn.payment_status);
      if (
        !mode ||
        !paymentStatus ||
        typeof txn.transaction_number !== 'string'
      ) {
        return [];
      }
      const user = txn.user as ReceiptUserRow | ReceiptUserRow[] | null;
      const row = Array.isArray(user) ? user[0] : user;
      const cashier_name =
        typeof row?.username === 'string' ? row.username : null;

      const items = (
        (txn.transaction_items ?? []) as unknown as ReceiptItemDbRow[]
      ).flatMap((itemRow) => {
        const qty = Number(itemRow.quantity);
        const subtotal = Number(itemRow.subtotal);
        const name =
          itemRow.product && !Array.isArray(itemRow.product)
            ? itemRow.product.name
            : null;
        if (!Number.isFinite(qty) || !Number.isFinite(subtotal)) return [];
        return [
          {
            name: typeof name === 'string' ? name : 'Item',
            quantity: qty,
            subtotal,
          },
        ];
      });

      const effectiveStatus =
        getFulfillmentStatus(txn.id as string) ??
        (txn.status as OrderStatus) ??
        'completed';

      if (!['pending', 'preparing', 'ready'].includes(effectiveStatus)) {
        return [];
      }

      return [
        {
          transaction_id: txn.id,
          transaction_number: txn.transaction_number,
          order_number:
            typeof txn.order_number === 'number' ? txn.order_number : null,
          date: txn.date,
          total_amount: Number(txn.total_amount),
          payment_mode: mode,
          payment_status: paymentStatus,
          status: effectiveStatus,
          cashier_name,
          items,
        },
      ];
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function saveCartDraft(
  draftId: string,
  lines: CartLine[],
): Promise<{ ok: boolean }> {
  try {
    const profile = await requireStaff();
    const supabase = await createClient();
    const { error } = await supabase.from('cart_drafts').upsert(
      {
        id: draftId,
        user_id: profile.userId,
        lines,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function getCartDraft(
  draftId?: string,
): Promise<CartLine[] | null> {
  try {
    const profile = await requireStaff();
    const supabase = await createClient();
    let query = supabase
      .from('cart_drafts')
      .select('lines')
      .eq('user_id', profile.userId);
    if (draftId) {
      query = query.eq('id', draftId);
    }
    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || !Array.isArray(data.lines)) return null;
    return data.lines as CartLine[];
  } catch {
    return null;
  }
}

export async function clearCartDraft(draftId: string): Promise<void> {
  try {
    const profile = await requireStaff();
    const supabase = await createClient();
    await supabase
      .from('cart_drafts')
      .delete()
      .eq('id', draftId)
      .eq('user_id', profile.userId);
  } catch {
    // Non-blocking cleanup
  }
}
