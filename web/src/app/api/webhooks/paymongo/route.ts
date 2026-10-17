import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { pendingOrders } from '@/features/pos/paymongo/service';

function verifyPaymongoSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
): boolean {
  if (!signatureHeader || !webhookSecret) return false;

  const parts = signatureHeader.split(',');
  let timestamp = '';
  let testSignature = '';
  let liveSignature = '';

  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k === 't' && v) timestamp = v;
    if (k === 'te' && v) testSignature = v;
    if (k === 'li' && v) liveSignature = v;
  }

  const signatureToMatch = liveSignature || testSignature;
  if (!timestamp || !signatureToMatch) return false;

  const payloadToSign = `${timestamp}.${rawBody}`;
  const computed = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadToSign)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signatureToMatch),
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('paymongo-signature');
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET_KEY;

    if (
      webhookSecret &&
      !verifyPaymongoSignature(rawBody, signature, webhookSecret)
    ) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 },
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = event.data?.attributes?.type;
    const paymentData = event.data?.attributes?.data;

    // Handle payment.paid event
    if (eventType === 'payment.paid') {
      const paymentIntentId =
        paymentData?.attributes?.payment_intent_id ?? paymentData?.id;

      if (paymentIntentId) {
        const record = pendingOrders.get(paymentIntentId);
        if (record && record.status === 'pending') {
          record.status = 'paid';
          record.paymentReference =
            paymentData?.id ?? `PAY-${paymentIntentId.slice(-8)}`;
        }
      }
    }

    // Handle expired or failed events
    if (eventType === 'qrph.expired') {
      const paymentIntentId =
        paymentData?.attributes?.payment_intent_id ?? paymentData?.id;
      if (paymentIntentId) {
        const record = pendingOrders.get(paymentIntentId);
        if (record && record.status === 'pending') {
          record.status = 'expired';
        }
      }
    }

    if (eventType === 'payment.failed') {
      const paymentIntentId =
        paymentData?.attributes?.payment_intent_id ?? paymentData?.id;
      if (paymentIntentId) {
        const record = pendingOrders.get(paymentIntentId);
        if (record && record.status === 'pending') {
          record.status = 'cancelled';
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
