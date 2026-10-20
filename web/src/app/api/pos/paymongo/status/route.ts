import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/features/auth/queries';
import { getPaymongoPaymentStatus } from '@/features/pos/paymongo/service';
import { setFulfillmentStatus } from '@/features/pos/fulfillment-store';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const profile = await requireStaff();
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent_id');

    if (!paymentIntentId) {
      return NextResponse.json(
        { ok: false, error: 'Missing payment_intent_id' },
        { status: 400 },
      );
    }

    const result = await getPaymongoPaymentStatus(paymentIntentId);

    // If paid, atomically create transaction via process_sale RPC if not yet created
    if (result.status === 'paid' && result.record) {
      if (result.record.transactionId) {
        return NextResponse.json({
          ok: true,
          status: 'paid',
          transactionId: result.record.transactionId,
          paymentReference: result.record.paymentReference,
        });
      }

      const supabase = await createClient();
      const transactionId = crypto.randomUUID();
      const evidencePath = `${profile.userId}/${transactionId}/evidence.png`;
      const defaultSlip = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
        'base64',
      );

      // Upload electronic receipt voucher to payment-evidence bucket
      await supabase.storage
        .from('payment-evidence')
        .upload(evidencePath, defaultSlip, {
          contentType: 'image/png',
          cacheControl: 'private, max-age=0',
          upsert: true,
        })
        .catch(() => null);

      const paymentReference =
        result.paymentReference ??
        `PAY-${paymentIntentId.slice(-8).toUpperCase()}`;

      const { data, error } = await supabase.rpc('process_sale', {
        p_transaction_id: transactionId,
        p_payment_mode: result.record.paymentMode,
        p_amount_received: result.record.total,
        p_change_given: null,
        p_items: result.record.lines,
        p_date: new Date().toISOString(),
        p_payment_reference: paymentReference,
        p_evidence_path: evidencePath,
        p_evidence_mime: 'image/png',
        p_evidence_size: defaultSlip.length,
      });

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            status: 'failed',
            error: error.message,
          },
          { status: 500 },
        );
      }

      const effectiveTxId =
        typeof data === 'string' && data ? data : transactionId;
      result.record.transactionId = effectiveTxId;
      result.record.paymentReference = paymentReference;

      // Register newly paid online order as 'preparing' for kitchen fulfillment
      setFulfillmentStatus(effectiveTxId, 'preparing');
      try {
        await supabase.rpc('update_order_status', {
          p_transaction_id: effectiveTxId,
          p_new_status: 'preparing',
          p_notes: 'Auto-started upon online payment verification',
        });
      } catch {
        // Non-blocking fallback
      }

      revalidatePath('/pos');
      revalidatePath('/today-products');
      revalidatePath('/dashboard');
      revalidatePath('/admin');
      revalidatePath('/admin/reports');
      revalidatePath('/daily-sales');

      if (profile.role === 'admin') {
        try {
          await supabase.rpc('review_online_payment', {
            p_transaction_id: effectiveTxId,
            p_status: 'verified',
            p_note: 'Verified via PayMongo QR Ph',
          });
        } catch {
          // Non-blocking: payment already completed
        }
      }

      return NextResponse.json({
        ok: true,
        status: 'paid',
        transactionId: effectiveTxId,
        paymentReference,
      });
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
