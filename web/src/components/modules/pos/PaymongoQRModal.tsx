'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/form/Button';
import type { CartLine } from '@/features/pos/types';

interface PaymongoQRModalProps {
  lines: CartLine[];
  paymentMode: 'gcash' | 'maya';
  onSuccess: (transactionId: string) => void;
  onCancel: () => void;
  onSwitchToManual: () => void;
}

export function PaymongoQRModal({
  lines,
  paymentMode,
  onSuccess,
  onCancel,
  onSwitchToManual,
}: PaymongoQRModalProps) {
  const [status, setStatus] = useState<
    'generating' | 'waiting' | 'paid' | 'expired' | 'failed'
  >('generating');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState<string | null>(null);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    fetch('/api/pos/paymongo/create-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: lines.map((l) => ({
          product_id: l.product_id,
          quantity: l.qty,
        })),
        paymentMode,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (!data.ok) {
          setError(data.error || 'Failed to generate QR Ph code');
          setStatus('failed');
          return;
        }
        setPaymentIntentId(data.paymentIntentId);
        setQrImageUrl(data.qrImageUrl);
        setTestUrl(data.testUrl ?? null);
        setServerTotal(data.total);
        setIsDemo(data.mode === 'demo' || data.mode === 'test');
        const expiryMs = new Date(data.expiresAt).getTime() - Date.now();
        setSecondsRemaining(Math.max(0, Math.floor(expiryMs / 1000)));
        setStatus('waiting');
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setError(
          err instanceof Error ? err.message : 'Could not generate QR code',
        );
        setStatus('failed');
      });

    return () => {
      ignore = true;
    };
  }, [lines, paymentMode, retryCount]);

  const handleRetry = () => {
    setStatus('generating');
    setError(null);
    setRetryCount((prev) => prev + 1);
  };

  // Expiry countdown timer
  useEffect(() => {
    if (status !== 'waiting') return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setStatus('expired');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Polling for payment status every 2.5 seconds
  useEffect(() => {
    if (status !== 'waiting' || !paymentIntentId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(
          `/api/pos/paymongo/status?payment_intent_id=${paymentIntentId}`,
        );
        const data = await res.json();

        if (data.ok && data.status === 'paid' && data.transactionId) {
          setStatus('paid');
          if (pollingRef.current) clearInterval(pollingRef.current);
          setTimeout(() => {
            onSuccess(data.transactionId);
          }, 1000);
        } else if (data.ok && data.status === 'expired') {
          setStatus('expired');
        } else if (data.ok && data.status === 'cancelled') {
          setStatus('failed');
        }
      } catch {
        // Continue polling on transient network error
      }
    };

    pollingRef.current = setInterval(pollStatus, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [status, paymentIntentId, onSuccess]);

  // Cancel payment intent
  const handleCancel = async () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (paymentIntentId) {
      await fetch('/api/pos/paymongo/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
      }).catch(() => null);
    }
    onCancel();
  };

  // Simulate payment for demo testing
  const handleSimulatePayment = async () => {
    if (!paymentIntentId) return;
    setIsSimulating(true);
    try {
      const res = await fetch('/api/pos/paymongo/simulate-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
      });
      const data = await res.json();
      if (data.ok) {
        const statusRes = await fetch(
          `/api/pos/paymongo/status?payment_intent_id=${paymentIntentId}`,
        );
        const statusData = await statusRes.json();
        if (
          statusData.ok &&
          statusData.status === 'paid' &&
          statusData.transactionId
        ) {
          setStatus('paid');
          if (pollingRef.current) clearInterval(pollingRef.current);
          setTimeout(() => {
            onSuccess(statusData.transactionId);
          }, 800);
        }
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center text-center p-2">
      {status === 'generating' && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-pine border-t-transparent" />
          <p className="text-sm font-semibold text-foreground">
            Connecting to PayMongo QR Ph…
          </p>
          <p className="text-xs text-muted">
            Generating interoperable QR Ph code
          </p>
        </div>
      )}

      {status === 'waiting' && qrImageUrl && (
        <div className="flex flex-col items-center w-full max-w-sm space-y-3">
          {/* QR Ph Header Tag */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Scan via GCash, Maya, MariBank, or any Bank App
          </div>

          {/* Amount Due Banner */}
          <div>
            <span className="text-xs text-muted uppercase tracking-wider font-semibold">
              Total Amount
            </span>
            <p className="text-3xl font-extrabold text-pine">
              ₱{(serverTotal ?? 0).toFixed(2)}
            </p>
          </div>

          {/* Dynamic QR Ph Image Frame */}
          <div className="relative rounded-2xl border-2 border-border bg-white p-3.5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="PayMongo QR Ph Code"
              className="h-56 w-56 object-contain rounded-lg"
            />
          </div>

          {/* Countdown & Status */}
          <div className="flex items-center justify-between w-full px-2 text-xs font-semibold text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              Waiting for customer payment…
            </span>
            <span className="font-mono bg-mist px-2 py-0.5 rounded text-foreground">
              ⏱ {timeDisplay}
            </span>
          </div>

          {/* Test / Sandbox Simulator Action */}
          {isDemo && (
            <div className="w-full rounded-xl border border-dashed border-pine/40 bg-pine/5 p-2.5 text-center mt-1 space-y-2">
              <p className="text-[11px] font-semibold text-pine">
                🧪 PayMongo Test Mode (No Real Money Needed)
              </p>
              {testUrl ? (
                <a
                  href={testUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-full items-center justify-center rounded-md text-xs font-bold bg-pine text-white hover:bg-pine-deep cursor-pointer"
                >
                  Authorize on PayMongo (Updates Dashboard) ↗
                </a>
              ) : null}
              <Button
                type="button"
                className="h-8 w-full text-xs font-bold bg-white border border-pine/30 text-pine hover:bg-pine/10"
                onClick={handleSimulatePayment}
                disabled={isSimulating}
              >
                {isSimulating
                  ? 'Simulating…'
                  : 'Simulate Customer Scan & Pay (Instant)'}
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2 w-full">
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-full text-sm font-semibold"
              onClick={handleCancel}
            >
              Cancel Payment
            </Button>
            <button
              type="button"
              onClick={onSwitchToManual}
              className="text-xs font-semibold text-muted hover:text-foreground cursor-pointer underline py-1"
            >
              Switch to Manual Reference (Manager Override)
            </button>
          </div>
        </div>
      )}

      {status === 'paid' && (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl font-extrabold animate-bounce">
            ✓
          </div>
          <p className="text-xl font-bold text-foreground">Payment Received!</p>
          <p className="text-sm text-muted">Generating transaction receipt…</p>
        </div>
      )}

      {status === 'expired' && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4 max-w-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-xl font-bold">
            ⌛
          </div>
          <div>
            <p className="text-base font-bold text-foreground">
              QR Code Expired
            </p>
            <p className="text-xs text-muted mt-1">
              The 15-minute payment window has expired. Generate a fresh QR code
              to proceed.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Button
              type="button"
              className="h-10 w-full bg-pine text-white text-sm font-semibold"
              onClick={handleRetry}
            >
              Generate New QR Code
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-full text-sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4 max-w-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-danger text-xl font-bold">
            ✕
          </div>
          <div>
            <p className="text-base font-bold text-foreground">
              Payment Cancelled or Failed
            </p>
            <p className="text-xs text-danger mt-1">
              {error || 'The payment could not be completed.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Button
              type="button"
              className="h-10 w-full bg-pine text-white text-sm font-semibold"
              onClick={handleRetry}
            >
              Try Again
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-full text-sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
