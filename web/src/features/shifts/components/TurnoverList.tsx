'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { verifyTurnover } from '../actions';
import type { CashTurnover } from '../queries';

export function TurnoverList({
  turnovers,
  admin = false,
}: {
  turnovers: CashTurnover[];
  admin?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {turnovers.length === 0 ? (
        <p className="text-sm text-muted">No cash turnovers yet.</p>
      ) : (
        turnovers.map((item) => (
          <article
            key={item.turnover_id}
            className="rounded-card border border-border bg-surface p-4 shadow-soft"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-bold capitalize">{item.cashier_name}</h2>
                <p className="text-xs text-muted">
                  {new Date(item.submitted_at).toLocaleString('en-PH', {
                    timeZone: 'Asia/Manila',
                  })}
                </p>
              </div>
              <span className="rounded-full bg-mist px-2 py-1 text-xs font-bold uppercase">
                {item.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <p>
                Starting cash
                <br />
                <strong>₱{item.starting_cash.toFixed(2)}</strong>
              </p>
              <p>
                Cash sales
                <br />
                <strong>₱{item.cash_sales.toFixed(2)}</strong>
              </p>
              <p>
                Expected
                <br />
                <strong>₱{item.expected_cash.toFixed(2)}</strong>
              </p>
              <p>
                Counted
                <br />
                <strong>₱{item.counted_cash.toFixed(2)}</strong>
              </p>
              <p>
                Difference
                <br />
                <strong>
                  {item.variance === 0
                    ? 'Cash Balanced'
                    : `${item.variance < 0 ? '-' : '+'}₱${Math.abs(item.variance).toFixed(2)}`}
                </strong>
              </p>
            </div>
            {item.notes ? (
              <p className="mt-3 text-sm">
                <strong>Discrepancy reason / notes:</strong> {item.notes}
              </p>
            ) : null}
            {item.verification_note ? (
              <p className="mt-1 text-sm">
                <strong>Admin note:</strong> {item.verification_note}
              </p>
            ) : null}
            {admin && item.status === 'pending' ? (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    void verifyTurnover(item.turnover_id, 'verified', '').then(
                      (r) => {
                        if (!r.ok) setError(r.error);
                        else router.refresh();
                      },
                    )
                  }
                >
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const note =
                      window.prompt('Why is this turnover flagged?') ?? '';
                    void verifyTurnover(item.turnover_id, 'flagged', note).then(
                      (r) => {
                        if (!r.ok) setError(r.error);
                        else router.refresh();
                      },
                    );
                  }}
                >
                  Flag
                </Button>
              </div>
            ) : null}
          </article>
        ))
      )}
    </div>
  );
}
