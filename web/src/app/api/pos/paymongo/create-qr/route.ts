import { NextResponse } from 'next/server';
import { requireStaff } from '@/features/auth/queries';
import { createPaymongoQRPh } from '@/features/pos/paymongo/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    await requireStaff();
    const body = await request.json();
    const { lines, paymentMode } = body as {
      lines: Array<{ product_id: number; quantity: number }>;
      paymentMode?: 'gcash' | 'maya';
    };

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Cart is empty.' },
        { status: 400 },
      );
    }

    const mode = paymentMode === 'maya' ? 'maya' : 'gcash';

    // Look up prices directly from the database to securely compute total on the server
    const supabase = await createClient();
    const productIds = lines.map((l) => l.product_id);

    const { data: products, error } = await supabase
      .from('product')
      .select('product_id, price, name, is_available')
      .in('product_id', productIds);

    if (error || !products) {
      return NextResponse.json(
        { ok: false, error: 'Failed to retrieve menu prices.' },
        { status: 500 },
      );
    }

    const productMap = new Map(products.map((p) => [p.product_id, p]));
    let serverTotal = 0;

    for (const item of lines) {
      const prod = productMap.get(item.product_id);
      if (!prod || !prod.is_available) {
        return NextResponse.json(
          {
            ok: false,
            error: `Product #${item.product_id} is unavailable or was removed.`,
          },
          { status: 400 },
        );
      }
      if (item.quantity <= 0) {
        return NextResponse.json(
          { ok: false, error: 'Invalid quantity in cart.' },
          { status: 400 },
        );
      }
      serverTotal += Number(prod.price) * item.quantity;
    }

    // Round to 2 decimal places
    const finalAmount = Math.round(serverTotal * 100) / 100;

    const qrResult = await createPaymongoQRPh({
      amountPesos: finalAmount,
      description: `Cafe Elvira POS Order (${lines.length} items)`,
      lines,
      paymentMode: mode,
    });

    return NextResponse.json(qrResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
