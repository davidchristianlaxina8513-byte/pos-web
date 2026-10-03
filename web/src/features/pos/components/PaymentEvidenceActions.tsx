'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { getPaymentEvidenceUrl, reviewOnlinePayment } from '../actions';

interface PaymentEvidenceActionsProps {
  transactionId: string;
  canReview: boolean;
  pending: boolean;
  hasEvidence: boolean;
}

export function PaymentEvidenceActions({
  transactionId,
  canReview,
  pending,
  hasEvidence,
}: PaymentEvidenceActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewEvidence = async () => {
    setBusy(true);
    setError(null);
    const result = await getPaymentEvidenceUrl(transactionId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  const review = async (status: 'verified' | 'rejected') => {
    const note =
      status === 'rejected'
        ? window.prompt('Reason for rejecting this payment evidence:')
        : window.prompt('Optional verification note:');
    if (note === null) return;
    setBusy(true);
    setError(null);
    const result = await reviewOnlinePayment(transactionId, status, note);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="mt-3 print:hidden">
      <div className="flex flex-wrap gap-2">
        {hasEvidence ? (
          <Button variant="secondary" onClick={viewEvidence} disabled={busy}>
            View Payment Evidence
          </Button>
        ) : null}
        {canReview && pending ? (
          <>
            <Button onClick={() => review('verified')} disabled={busy}>
              Verify Payment
            </Button>
            <Button
              variant="danger"
              onClick={() => review('rejected')}
              disabled={busy}
            >
              Reject Payment
            </Button>
          </>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
