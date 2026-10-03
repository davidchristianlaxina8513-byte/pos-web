'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { voidTransaction } from '../actions';

export function VoidButton({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={busy}
        className="text-sm font-bold text-danger"
        onClick={() => {
          const reason = window.prompt(
            'Reason for voiding this completed sale:',
          );
          if (!reason) return;
          setBusy(true);
          setError(null);
          void voidTransaction(transactionId, reason).then((result) => {
            setBusy(false);
            if (!result.ok) setError(result.error);
            else router.refresh();
          });
        }}
      >
        {busy ? 'Voiding…' : 'Void'}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
