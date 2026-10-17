import crypto from 'node:crypto';
import type { PaymongoQRResponse } from './types';

// In-memory registry for pending demo / active QR Ph payments
interface PendingOrderRecord {
  paymentIntentId: string;
  total: number;
  lines: Array<{ product_id: number; quantity: number }>;
  paymentMode: 'gcash' | 'maya';
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  expiresAt: string;
  transactionId?: string;
  paymentReference?: string;
  createdAt: number;
}

// Global store to persist across Next.js dev server reloads
const globalForPaymongo = globalThis as unknown as {
  paymongoPendingOrders?: Map<string, PendingOrderRecord>;
};

export const pendingOrders =
  globalForPaymongo.paymongoPendingOrders ??
  (globalForPaymongo.paymongoPendingOrders = new Map<
    string,
    PendingOrderRecord
  >());

function getPaymongoAuthHeader(secretKey: string): string {
  return `Basic ${Buffer.from(secretKey.trim() + ':').toString('base64')}`;
}

export function isPaymongoConfigured(): boolean {
  const key = process.env.PAYMONGO_SECRET_KEY;
  return typeof key === 'string' && key.trim().startsWith('sk_');
}

/**
 * Creates a high-fidelity QR Ph SVG data URI for demo/sandbox environments.
 */
function createDemoQrPhSvg(amount: number, ref: string): string {
  const shortRef = ref.slice(-6).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
    <rect width="320" height="320" fill="#ffffff" rx="16"/>
    <!-- QR Corner Locators -->
    <rect x="24" y="24" width="64" height="64" rx="8" fill="none" stroke="#0f172a" stroke-width="8"/>
    <rect x="40" y="40" width="32" height="32" rx="4" fill="#0f172a"/>
    <rect x="232" y="24" width="64" height="64" rx="8" fill="none" stroke="#0f172a" stroke-width="8"/>
    <rect x="248" y="40" width="32" height="32" rx="4" fill="#0f172a"/>
    <rect x="24" y="232" width="64" height="64" rx="8" fill="none" stroke="#0f172a" stroke-width="8"/>
    <rect x="40" y="248" width="32" height="32" rx="4" fill="#0f172a"/>
    <!-- QR Data Matrix Pattern -->
    <g fill="#1e293b">
      <rect x="112" y="32" width="16" height="16" rx="2"/>
      <rect x="144" y="32" width="16" height="16" rx="2"/>
      <rect x="176" y="32" width="16" height="16" rx="2"/>
      <rect x="112" y="64" width="32" height="16" rx="2"/>
      <rect x="160" y="64" width="16" height="32" rx="2"/>
      <rect x="128" y="96" width="32" height="16" rx="2"/>
      <rect x="32" y="112" width="16" height="32" rx="2"/>
      <rect x="64" y="128" width="32" height="16" rx="2"/>
      <rect x="224" y="112" width="16" height="32" rx="2"/>
      <rect x="256" y="128" width="32" height="16" rx="2"/>
      <rect x="112" y="224" width="16" height="32" rx="2"/>
      <rect x="144" y="240" width="32" height="16" rx="2"/>
      <rect x="176" y="224" width="16" height="32" rx="2"/>
      <rect x="224" y="224" width="32" height="16" rx="2"/>
      <rect x="256" y="256" width="32" height="32" rx="2"/>
    </g>
    <!-- QR Ph Brand Center Badge -->
    <rect x="120" y="120" width="80" height="80" rx="14" fill="#dc2626" stroke="#ffffff" stroke-width="4"/>
    <text x="160" y="152" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle">QR Ph</text>
    <text x="160" y="172" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#fef08a" text-anchor="middle">DEMO</text>
    <text x="160" y="188" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#ffffff" text-anchor="middle">#${shortRef}</text>
    <!-- Amount Banner -->
    <rect x="40" y="284" width="240" height="26" rx="6" fill="#f1f5f9"/>
    <text x="160" y="302" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#0f766e" text-anchor="middle">Total: ₱${amount.toFixed(2)}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Initiates a PayMongo QR Ph Payment. Uses the real PayMongo API if PAYMONGO_SECRET_KEY
 * is set; otherwise defaults to the high-fidelity demo simulator.
 */
export async function createPaymongoQRPh(params: {
  amountPesos: number;
  description: string;
  lines: Array<{ product_id: number; quantity: number }>;
  paymentMode: 'gcash' | 'maya';
}): Promise<PaymongoQRResponse> {
  const { amountPesos, description, lines, paymentMode } = params;
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

  // 1. Production / Live PayMongo API
  if (isPaymongoConfigured() && secretKey) {
    const amountInCentavos = Math.round(amountPesos * 100);

    // Create Payment Intent
    const intentRes = await fetch(
      'https://api.paymongo.com/v1/payment_intents',
      {
        method: 'POST',
        headers: {
          Authorization: getPaymongoAuthHeader(secretKey),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: amountInCentavos,
              payment_method_allowed: ['qrph'],
              currency: 'PHP',
              description,
            },
          },
        }),
      },
    );

    if (!intentRes.ok) {
      const err = await intentRes.json().catch(() => null);
      throw new Error(
        err?.errors?.[0]?.detail ??
          `Failed to create PayMongo Payment Intent (${intentRes.status})`,
      );
    }

    const intentData = await intentRes.json();
    const paymentIntentId = intentData.data.id as string;

    // Create Payment Method
    const methodRes = await fetch(
      'https://api.paymongo.com/v1/payment_methods',
      {
        method: 'POST',
        headers: {
          Authorization: getPaymongoAuthHeader(secretKey),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            attributes: {
              type: 'qrph',
            },
          },
        }),
      },
    );

    if (!methodRes.ok) {
      const err = await methodRes.json().catch(() => null);
      throw new Error(
        err?.errors?.[0]?.detail ?? 'Failed to create QR Ph Payment Method',
      );
    }

    const methodData = await methodRes.json();
    const paymentMethodId = methodData.data.id as string;

    // Attach Payment Method to Intent to generate QR Ph code
    const attachRes = await fetch(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`,
      {
        method: 'POST',
        headers: {
          Authorization: getPaymongoAuthHeader(secretKey),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            attributes: {
              payment_method: paymentMethodId,
              return_url: 'https://elvira.cafe/pos',
            },
          },
        }),
      },
    );

    if (!attachRes.ok) {
      const err = await attachRes.json().catch(() => null);
      throw new Error(
        err?.errors?.[0]?.detail ?? 'Failed to attach QR Ph to Payment Intent',
      );
    }

    const attachData = await attachRes.json();
    const nextAction = attachData.data.attributes.next_action;
    const qrImageUrl = nextAction?.code?.image_url;

    if (!qrImageUrl) {
      throw new Error('PayMongo did not return a valid QR Ph code image');
    }

    // Register pending order record
    pendingOrders.set(paymentIntentId, {
      paymentIntentId,
      total: amountPesos,
      lines,
      paymentMode,
      status: 'pending',
      expiresAt,
      createdAt: Date.now(),
    });

    const testUrl =
      (nextAction?.test_url as string | undefined) ??
      (nextAction?.code?.test_url as string | undefined) ??
      (nextAction?.url as string | undefined) ??
      null;

    const isTestKey = secretKey.trim().startsWith('sk_test_');

    return {
      ok: true,
      paymentIntentId,
      qrImageUrl,
      testUrl,
      expiresAt,
      total: amountPesos,
      mode: isTestKey ? 'test' : 'live',
    };
  }

  // 2. High-Fidelity Sandbox / Demo Simulator Mode
  const demoIntentId = `pi_demo_${crypto.randomUUID()}`;
  const qrImageUrl = createDemoQrPhSvg(amountPesos, demoIntentId);

  pendingOrders.set(demoIntentId, {
    paymentIntentId: demoIntentId,
    total: amountPesos,
    lines,
    paymentMode,
    status: 'pending',
    expiresAt,
    createdAt: Date.now(),
  });

  return {
    ok: true,
    paymentIntentId: demoIntentId,
    qrImageUrl,
    expiresAt,
    total: amountPesos,
    mode: 'demo',
  };
}

/**
 * Checks the status of a Payment Intent (real PayMongo or demo store).
 */
export async function getPaymongoPaymentStatus(
  paymentIntentId: string,
): Promise<{
  status: 'pending' | 'paid' | 'cancelled' | 'expired' | 'failed';
  paymentReference?: string;
  record?: PendingOrderRecord;
}> {
  const record = pendingOrders.get(paymentIntentId);

  // Check expiration
  if (record && new Date(record.expiresAt).getTime() < Date.now()) {
    if (record.status === 'pending') {
      record.status = 'expired';
    }
    return { status: 'expired', record };
  }

  // If already marked paid (via simulation or webhook), return paid immediately
  if (record && record.status === 'paid') {
    return {
      status: 'paid',
      paymentReference: record.paymentReference,
      record,
    };
  }

  // Check demo store first
  if (paymentIntentId.startsWith('pi_demo_') || !isPaymongoConfigured()) {
    if (!record) return { status: 'failed' };
    return {
      status: record.status,
      paymentReference: record.paymentReference,
      record,
    };
  }

  // Poll PayMongo API for live payment intent
  const secretKey = process.env.PAYMONGO_SECRET_KEY!;
  const res = await fetch(
    `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
    {
      headers: {
        Authorization: getPaymongoAuthHeader(secretKey),
      },
    },
  );

  if (!res.ok) {
    return { status: 'failed', record };
  }

  const data = await res.json();
  const paymongoStatus = data.data.attributes.status;

  if (paymongoStatus === 'succeeded') {
    const paymentId =
      data.data.attributes.payments?.[0]?.id ??
      `PAY-${paymentIntentId.slice(-8)}`;
    if (record) {
      record.status = 'paid';
      record.paymentReference = paymentId;
    }
    return { status: 'paid', paymentReference: paymentId, record };
  }

  if (paymongoStatus === 'cancelled') {
    if (record) record.status = 'cancelled';
    return { status: 'cancelled', record };
  }

  return { status: 'pending', record };
}

/**
 * Simulates a customer scanning and paying the QR Ph code (useful in demo/testing).
 */
export function simulateCustomerPayment(paymentIntentId: string): boolean {
  const record = pendingOrders.get(paymentIntentId);
  if (!record || record.status !== 'pending') return false;

  record.status = 'paid';
  record.paymentReference = `PAY-DEMO-${Math.floor(100000 + Math.random() * 900000)}`;
  return true;
}

/**
 * Cancels a pending PayMongo Payment Intent.
 */
export async function cancelPaymongoIntent(
  paymentIntentId: string,
): Promise<boolean> {
  const record = pendingOrders.get(paymentIntentId);
  if (record) {
    record.status = 'cancelled';
  }

  if (isPaymongoConfigured() && !paymentIntentId.startsWith('pi_demo_')) {
    const secretKey = process.env.PAYMONGO_SECRET_KEY!;
    await fetch(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: getPaymongoAuthHeader(secretKey),
        },
      },
    ).catch(() => null);
  }

  return true;
}
