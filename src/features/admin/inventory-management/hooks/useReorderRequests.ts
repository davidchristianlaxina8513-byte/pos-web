import { useCallback, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import {
  getReorderRequests,
  ReorderPatch,
  ReorderRequestRow,
  resolveReorderRequest,
  updateReorderRequest,
} from '@/api/reorderApi';
import { useAuth } from '@/context/AuthContext';
import { toErrorMessage } from '@/services/errors';
import { generateRestockList, shareReceipt } from '@/services/receiptService';
import { groupRestockBySupplier } from './restockGrouping';

export interface UseReorderRequestsResult {
  requests: ReorderRequestRow[];
  groups: { supplier: string; rows: ReorderRequestRow[] }[];
  openCount: number;
  isLoading: boolean;
  error: string;
  loadRequests: () => Promise<void>;
  saveQuantity: (requestId: number, quantity: number) => Promise<void>;
  saveSupplier: (requestId: number, supplier: string | null) => Promise<void>;
  markOrdered: (requestId: number) => Promise<void>;
  resolveRequest: (
    requestId: number,
    status: 'received' | 'cancelled',
  ) => Promise<void>;
  shareList: () => Promise<void>;
}

/**
 * Admin restock list. Online-only by design: purchasing follow-up is never
 * counter-critical, so there is no SQLite mirror — offline shows an error.
 */
export function useReorderRequests(): UseReorderRequestsResult {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ReorderRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    try {
      const { isConnected } = await NetInfo.fetch();
      if (!isConnected) {
        throw new Error('Restock requests need an internet connection');
      }
      setRequests(await getReorderRequests());
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load restock requests'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setRequests(await getReorderRequests());
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to refresh restock requests'));
    }
  }, []);

  const saveQuantity = useCallback(
    async (requestId: number, quantity: number): Promise<void> => {
      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error('Quantity must be a whole number zero or above');
      }
      const patch: ReorderPatch = { suggested_quantity: quantity };
      await updateReorderRequest(requestId, patch);
      await refresh();
    },
    [refresh],
  );

  const saveSupplier = useCallback(
    async (requestId: number, supplier: string | null): Promise<void> => {
      const patch: ReorderPatch = { supplier };
      await updateReorderRequest(requestId, patch);
      await refresh();
    },
    [refresh],
  );

  const markOrdered = useCallback(
    async (requestId: number): Promise<void> => {
      const patch: ReorderPatch = { status: 'ordered' };
      await updateReorderRequest(requestId, patch);
      await refresh();
    },
    [refresh],
  );

  const resolveRequest = useCallback(
    async (
      requestId: number,
      status: 'received' | 'cancelled',
    ): Promise<void> => {
      if (!user) throw new Error('Sign in required');
      await resolveReorderRequest(requestId, status, user.user_id);
      await refresh();
    },
    [refresh, user],
  );

  const groups = useMemo(() => groupRestockBySupplier(requests), [requests]);

  const shareList = useCallback(async (): Promise<void> => {
    try {
      const uri = await generateRestockList(groups);
      await shareReceipt(uri);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to share restock list'));
    }
  }, [groups]);

  return {
    requests,
    groups,
    openCount: requests.length,
    isLoading,
    error,
    loadRequests,
    saveQuantity,
    saveSupplier,
    markOrdered,
    resolveRequest,
    shareList,
  };
}
