import fs from 'fs';
import path from 'path';
import type { OrderStatus } from './types';

interface OrderFulfillmentRecord {
  status: OrderStatus;
  updated_at: string;
  notes?: string;
}

const STORE_PATH = path.resolve(process.cwd(), '.order_fulfillment.json');

function readStore(): Record<string, OrderFulfillmentRecord> {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as Record<string, OrderFulfillmentRecord>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, OrderFulfillmentRecord>): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist order fulfillment state:', err);
  }
}

/** Get effective fulfillment status for a transaction. */
export function getFulfillmentStatus(
  transactionId: string,
): OrderStatus | null {
  const store = readStore();
  return store[transactionId]?.status ?? null;
}

/** Update fulfillment status for a transaction. */
export function setFulfillmentStatus(
  transactionId: string,
  status: OrderStatus,
  notes?: string,
): void {
  const store = readStore();
  store[transactionId] = {
    status,
    updated_at: new Date().toISOString(),
    ...(notes ? { notes } : {}),
  };
  writeStore(store);
}

/** Get all custom fulfillment overrides. */
export function getAllFulfillmentStatuses(): Record<
  string,
  OrderFulfillmentRecord
> {
  return readStore();
}
