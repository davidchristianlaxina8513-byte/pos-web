'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Field } from '@/components/common/Field';
import { SearchIcon } from '@/components/common/icons';
import { cn } from '@/lib/cn';
import {
  markRestockCancelled,
  markRestockOrdered,
  markRestockReceived,
  updateParLevel,
  updateRestockRequest,
} from '../actions';
import {
  groupBySupplier,
  SEVERITY_LABELS,
  severityForRestock,
  type RestockRow,
  type RestockSeverity,
  type RestockStatus,
} from '../restock';

export interface RestockListProps {
  rows: RestockRow[];
}

const BADGE: Record<RestockStatus, string> = {
  pending: 'bg-warning text-surface',
  ordered: 'bg-pine text-surface',
  received: 'bg-success text-surface',
  cancelled: 'bg-disabled text-foreground',
};

/** Severity colors mirror the inventory list (critical → danger). */
const SEVERITY_BADGE: Record<RestockSeverity, string> = {
  critical: 'bg-danger text-surface',
  low: 'bg-warning text-surface',
};

function formatManila(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function RestockCard({ row }: { row: RestockRow }) {
  const router = useRouter();
  const severity = severityForRestock(row);
  const [quantityText, setQuantityText] = useState(
    String(row.suggested_quantity),
  );
  const [supplierText, setSupplierText] = useState(row.supplier ?? '');
  const [parText, setParText] = useState(
    row.par_level_snapshot === 0 ? '' : String(row.par_level_snapshot),
  );
  const [receivedText, setReceivedText] = useState(
    String(row.suggested_quantity),
  );
  const [cancelReason, setCancelReason] = useState('');
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (
    work: Promise<{ ok: true } | { ok: false; error: string }>,
  ) => {
    setBusy(true);
    setError(null);
    const result = await work;
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmingCancel(false);
    router.refresh();
  };

  const quantity = Number.parseInt(quantityText, 10);
  const quantityIsValid = Number.isInteger(quantity) && quantity >= 0;
  const received = Number.parseInt(receivedText, 10);
  const receivedIsValid = Number.isInteger(received) && received > 0;

  const handleParSave = () => {
    const raw = parText.trim();
    const par = raw === '' ? null : Number.parseInt(raw, 10);
    if (par !== null && (!Number.isInteger(par) || par < 0)) {
      setError('Par level must be a whole number or empty.');
      return;
    }
    void run(updateParLevel(row.product_id, par));
  };

  return (
    <Card
      title={row.product_name}
      className="rounded-card border-border shadow-soft"
      actions={
        <span className="flex gap-1">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-bold',
              SEVERITY_BADGE[severity],
            )}
          >
            {SEVERITY_LABELS[severity]}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-bold',
              BADGE[row.status],
            )}
          >
            {row.status}
          </span>
        </span>
      }
    >
      <p className="text-sm text-muted">
        On hand {row.current_stock_snapshot} · Reorder at{' '}
        {row.reorder_point_snapshot} · Par {row.par_level_snapshot} · Requested{' '}
        {formatManila(row.created_at)}
      </p>
      {row.status === 'received' ? (
        <p className="mt-1 text-sm text-muted">
          Received {formatManila(row.resolved_at)}
        </p>
      ) : null}
      {row.status === 'cancelled' ? (
        <p className="mt-1 text-sm text-muted">
          Cancelled {formatManila(row.resolved_at)}
          {row.cancel_reason ? ` — ${row.cancel_reason}` : null}
        </p>
      ) : null}

      {row.status === 'pending' || row.status === 'ordered' ? (
        <div className="mt-3 flex max-w-md flex-col gap-3">
          <div className="flex items-end gap-2">
            <Field
              label="Suggested quantity"
              name={`suggested-${row.request_id}`}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={quantityText}
              onChange={(event) => setQuantityText(event.target.value)}
              inputClassName="h-[52px] rounded-2xl border-border bg-mist"
              className="flex-1"
            />
            <Button
              variant="secondary"
              size="sm"
              className="h-11 shrink-0 rounded-full px-4"
              disabled={busy || !quantityIsValid}
              onClick={() =>
                void run(
                  updateRestockRequest(row.request_id, {
                    suggested_quantity: quantity,
                  }),
                )
              }
            >
              Save
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <Field
              label="Supplier"
              name={`supplier-${row.request_id}`}
              type="text"
              autoCapitalize="words"
              placeholder="Supplier name"
              value={supplierText}
              onChange={(event) => setSupplierText(event.target.value)}
              inputClassName="h-[52px] rounded-2xl border-border bg-mist"
              className="flex-1"
            />
            <Button
              variant="secondary"
              size="sm"
              className="h-11 shrink-0 rounded-full px-4"
              disabled={busy}
              onClick={() =>
                void run(
                  updateRestockRequest(row.request_id, {
                    supplier: supplierText || null,
                  }),
                )
              }
            >
              Save
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <Field
              label="Par level"
              name={`par-${row.request_id}`}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="Unset"
              value={parText}
              onChange={(event) => setParText(event.target.value)}
              inputClassName="h-[52px] rounded-2xl border-border bg-mist"
              className="flex-1"
            />
            <Button
              variant="secondary"
              size="sm"
              className="h-11 shrink-0 rounded-full px-4"
              disabled={busy}
              onClick={handleParSave}
            >
              Save
            </Button>
          </div>

          {error ? (
            <p role="alert" className="text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {row.status === 'pending' ? (
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full"
                disabled={busy}
                onClick={() => void run(markRestockOrdered(row.request_id))}
              >
                Mark ordered
              </Button>
            ) : null}
            {row.status === 'ordered' ? (
              <>
                <Field
                  label="Received quantity"
                  name={`received-${row.request_id}`}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={receivedText}
                  onChange={(event) => setReceivedText(event.target.value)}
                  inputClassName="h-[52px] rounded-2xl border-border bg-mist"
                />
                <Button
                  size="sm"
                  className="rounded-full border-transparent bg-pine text-surface"
                  disabled={busy || !receivedIsValid}
                  onClick={() =>
                    void run(markRestockReceived(row.request_id, received))
                  }
                >
                  {busy ? 'Saving…' : 'Mark received'}
                </Button>
              </>
            ) : null}
            {!confirmingCancel ? (
              <Button
                variant="danger"
                size="sm"
                className="rounded-full"
                disabled={busy}
                onClick={() => setConfirmingCancel(true)}
              >
                Cancel
              </Button>
            ) : null}
          </div>

          {confirmingCancel ? (
            <div className="flex flex-col gap-2 rounded-card border border-border bg-mist p-3">
              <Field
                label="Cancel reason"
                name={`cancel-reason-${row.request_id}`}
                type="text"
                placeholder="Why is this request cancelled?"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                inputClassName="border-border bg-surface"
              />
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  className="rounded-full"
                  disabled={busy || cancelReason.trim().length === 0}
                  onClick={() =>
                    void run(markRestockCancelled(row.request_id, cancelReason))
                  }
                >
                  Confirm cancel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  disabled={busy}
                  onClick={() => setConfirmingCancel(false)}
                >
                  Keep
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

/** Searchable, supplier-grouped list of requests. */
export function RestockList({ rows }: RestockListProps) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const groups = useMemo(
    () =>
      groupBySupplier(
        rows.filter((row) => row.product_name.toLowerCase().includes(query)),
      ),
    [rows, query],
  );
  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search restock requests</span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
        >
          <SearchIcon />
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by product"
          className="block h-[52px] w-full rounded-full border border-border bg-surface pr-4 pl-11 text-foreground shadow-soft placeholder:text-muted"
        />
      </label>
      {groups.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">
          No requests in this view.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.supplier} className="mt-4">
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              {group.supplier}
            </h2>
            <div className="mt-2 flex flex-col gap-3">
              {group.rows.map((row) => (
                <article key={row.request_id}>
                  <RestockCard row={row} />
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
