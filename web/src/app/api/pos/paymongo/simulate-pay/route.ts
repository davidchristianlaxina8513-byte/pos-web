import { NextResponse } from 'next/server';
import { requireStaff } from '@/features/auth/queries';
import { simulateCustomerPayment } from '@/features/pos/paymongo/service';

export async function POST(request: Request) {
  try {
    await requireStaff();
    const body = await request.json();
    const { paymentIntentId } = body as { paymentIntentId?: string };

    if (!paymentIntentId) {
      return NextResponse.json(
        { ok: false, error: 'Missing paymentIntentId' },
        { status: 400 },
      );
    }

    const success = simulateCustomerPayment(paymentIntentId);
    return NextResponse.json({ ok: success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
