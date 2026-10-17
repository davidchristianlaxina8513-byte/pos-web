export interface PaymongoCreateQRRequest {
  lines: Array<{
    product_id: number;
    quantity: number;
  }>;
  paymentMode: 'gcash' | 'maya';
}

export interface PaymongoQRResponse {
  ok: true;
  paymentIntentId: string;
  qrImageUrl: string;
  testUrl?: string | null;
  expiresAt: string;
  total: number;
  mode: 'test' | 'live' | 'demo';
}

export type PaymongoPaymentStatus =
  | 'awaiting_payment_method'
  | 'awaiting_next_action'
  | 'processing'
  | 'succeeded'
  | 'cancelled'
  | 'expired';

export interface PaymongoStatusResponse {
  ok: boolean;
  status: 'pending' | 'paid' | 'cancelled' | 'expired' | 'failed';
  transactionId?: string;
  paymentReference?: string;
  isDemo?: boolean;
  error?: string;
}
