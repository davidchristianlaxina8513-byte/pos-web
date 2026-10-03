'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { cn } from '@/lib/cn';
import type { UserRole } from '@/features/auth/roles';
import { changeDefaultQuota, changeTodayQuota } from '../actions';
import { QUOTA_STATUS_LABEL } from '../status';
import type { ProductQuota } from '../queries';

const STATUS_STYLE = {
  unlimited: 'bg-mist text-muted',
  good: 'bg-success/15 text-success',
  almost_sold_out: 'bg-warning/15 text-warning',
  sold_out: 'bg-danger/15 text-danger',
};

function quotaLabel(value: number | null): string {
  return value === null ? 'Unlimited' : String(value);
}

function promptQuota(
  label: string,
  current: number | null,
): number | null | undefined {
  const value = window.prompt(
    `${label} (leave blank for unlimited):`,
    current === null ? '' : String(current),
  );
  if (value === null) return undefined;
  if (value.trim() === '') return null;
  return Number(value);
}

export function ProductQuotaList({
  products,
  role,
}: {
  products: ProductQuota[];
  role: UserRole;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = async (
    item: ProductQuota,
    value: number | null,
    kind: 'today' | 'default',
  ) => {
    const reason = window.prompt('Reason for this change (optional):') ?? '';
    setBusyId(item.product_id);
    setError(null);
    const result =
      kind === 'today'
        ? await changeTodayQuota(item.product_id, value, reason)
        : await changeDefaultQuota(item.product_id, value, reason);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div>
      {error ? (
        <p
          role="alert"
          className="mb-3 rounded-2xl bg-danger/10 p-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((item) => (
          <li
            key={item.product_id}
            className="rounded-card border border-border bg-surface p-4 shadow-soft"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-extrabold">{item.product_name}</h2>
                <p className="text-sm text-muted">
                  {item.sold_quantity} served · Today:{' '}
                  {quotaLabel(item.today_quota_limit)}
                </p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-1 text-xs font-bold uppercase',
                  STATUS_STYLE[item.status],
                )}
              >
                {QUOTA_STATUS_LABEL[item.status]}
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-pine-deep">
              {item.remaining_quantity === null
                ? 'Unlimited'
                : item.remaining_quantity}
              <span className="ml-1 text-sm font-medium text-muted">
                remaining
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={
                  busyId === item.product_id ||
                  item.today_quota_limit === null ||
                  item.today_quota_limit <= item.sold_quantity
                }
                onClick={() =>
                  void update(
                    item,
                    (item.today_quota_limit as number) - 1,
                    'today',
                  )
                }
              >
                −1 today
              </Button>
              <Button
                size="sm"
                disabled={
                  busyId === item.product_id || item.today_quota_limit === null
                }
                onClick={() =>
                  void update(
                    item,
                    (item.today_quota_limit as number) + 1,
                    'today',
                  )
                }
              >
                +1 today
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyId === item.product_id}
                onClick={() => {
                  const value = promptQuota(
                    "Set today's quota",
                    item.today_quota_limit,
                  );
                  if (value !== undefined) void update(item, value, 'today');
                }}
              >
                Set today
              </Button>
            </div>
            {role === 'admin' ? (
              <div className="mt-3 border-t border-border pt-3 text-sm">
                <span className="text-muted">
                  Default quota: {quotaLabel(item.default_quota_limit)}
                </span>{' '}
                <button
                  type="button"
                  disabled={busyId === item.product_id}
                  className="font-bold text-pine underline-offset-2 hover:underline"
                  onClick={() => {
                    const value = promptQuota(
                      'Set default daily quota',
                      item.default_quota_limit,
                    );
                    if (value !== undefined)
                      void update(item, value, 'default');
                  }}
                >
                  Change default
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
