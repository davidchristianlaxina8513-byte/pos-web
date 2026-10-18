'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/form/Button';
import { verifyTurnover } from '@/features/shifts/actions';
import type { CashTurnover } from '@/features/shifts/queries';
import { useAlert } from '@/components/toast';
import { Modal } from '@/components/modal/Modal';
import { ExclamationTriangleIcon } from '@/components/common/hero-icons';
import { cn } from '@/lib/cn';

export function TurnoverList({
  turnovers,
  admin = false,
}: {
  turnovers: CashTurnover[];
  admin?: boolean;
}) {
  const router = useRouter();
  const { successAlert, errorAlert, warningAlert } = useAlert();
  const [error, setError] = useState<string | null>(null);

  // Modal state for admin flagging
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [targetTurnover, setTargetTurnover] = useState<CashTurnover | null>(
    null,
  );
  const [flagNote, setFlagNote] = useState('');
  const [flagSubmitting, setFlagSubmitting] = useState(false);

  const openFlagModal = (item: CashTurnover) => {
    setTargetTurnover(item);
    setFlagNote('');
    setFlagModalOpen(true);
  };

  const handleConfirmFlag = async () => {
    if (!targetTurnover) return;
    if (!flagNote.trim()) {
      errorAlert('Reason Required', 'Please provide a reason for flagging.');
      return;
    }
    setFlagSubmitting(true);
    const result = await verifyTurnover(
      targetTurnover.turnover_id,
      'flagged',
      flagNote,
    );
    setFlagSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      errorAlert('Flagging Failed', result.error);
    } else {
      setFlagModalOpen(false);
      warningAlert(
        'Turnover Flagged',
        `Turnover for ${targetTurnover.cashier_name} was marked as flagged.`,
      );
      router.refresh();
    }
  };

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
            className="rounded-2xl border border-border bg-surface p-4 shadow-soft"
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
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-bold uppercase',
                  item.status === 'pending' &&
                    'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                  item.status === 'verified' &&
                    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                  item.status === 'flagged' && 'bg-danger/10 text-danger',
                )}
              >
                {item.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <p>
                <span className="text-xs text-muted">Starting cash</span>
                <br />
                <strong>₱{item.starting_cash.toFixed(2)}</strong>
              </p>
              <p>
                <span className="text-xs text-muted">Cash sales</span>
                <br />
                <strong>₱{item.cash_sales.toFixed(2)}</strong>
              </p>
              <p>
                <span className="text-xs text-muted">Expected</span>
                <br />
                <strong>₱{item.expected_cash.toFixed(2)}</strong>
              </p>
              <p>
                <span className="text-xs text-muted">Counted</span>
                <br />
                <strong>₱{item.counted_cash.toFixed(2)}</strong>
              </p>
              <p>
                <span className="text-xs text-muted">Difference</span>
                <br />
                <strong
                  className={cn(
                    item.variance === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : item.variance < 0
                        ? 'text-danger'
                        : 'text-amber-600 dark:text-amber-400',
                  )}
                >
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
                        if (!r.ok) {
                          setError(r.error);
                          errorAlert('Verification Failed', r.error);
                        } else {
                          successAlert(
                            'Turnover Verified',
                            `Turnover for ${item.cashier_name} was verified.`,
                          );
                          router.refresh();
                        }
                      },
                    )
                  }
                >
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openFlagModal(item)}
                >
                  Flag
                </Button>
              </div>
            ) : null}
          </article>
        ))
      )}

      {/* Flag Turnover Modal for TurnoverList */}
      {targetTurnover && (
        <Modal
          isOpen={flagModalOpen}
          onOpenChange={(open) => !flagSubmitting && setFlagModalOpen(open)}
          isDismissDisabled={flagSubmitting}
          title="Flag Turnover Discrepancy"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-xs leading-relaxed text-foreground">
                <span className="font-bold text-amber-800 dark:text-amber-300">
                  Audit Alert:
                </span>{' '}
                Flagging this turnover marks it for audit review and notifies
                management of the cash variance.
              </div>
            </div>

            <div>
              <label
                htmlFor="flag-turnover-note"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Reason for flagging <span className="text-danger">*</span>
              </label>
              <textarea
                id="flag-turnover-note"
                rows={3}
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="Reason for flagging..."
                className="w-full rounded-md border border-border bg-white p-3 text-sm text-foreground placeholder:text-muted/60 focus:border-danger focus:outline-2 focus:outline-danger"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                disabled={flagSubmitting}
                onClick={() => setFlagModalOpen(false)}
                className="h-10 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-mist disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={flagSubmitting || !flagNote.trim()}
                onClick={handleConfirmFlag}
                className="action-focus inline-flex h-10 items-center rounded-md bg-danger px-4 text-sm font-semibold text-surface shadow-xs hover:bg-danger/90 disabled:opacity-50"
              >
                {flagSubmitting ? 'Flagging...' : 'Confirm Flag'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
