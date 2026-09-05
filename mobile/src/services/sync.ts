import NetInfo from '@react-native-community/netinfo';
import { submitFieldInspection } from '../api/client';
import { getInspectionQueue, removeQueuedInspection, updateQueuedInspection } from '../db/offlineStore';

export interface SyncResult {
  succeeded: number;
  failed: number;
}

/**
 * Pushes every pending queued inspection to the server, one at a time, so a
 * single bad row (e.g. a lot deleted since capture) doesn't block the rest
 * of the batch. Successes are removed from the queue; failures are marked
 * so the pending count and error stay visible until retried.
 */
export async function syncPendingInspections(token: string): Promise<SyncResult> {
  const queue = await getInspectionQueue();
  const pending = queue.filter((entry) => entry.status !== 'synced');

  let succeeded = 0;
  let failed = 0;

  for (const entry of pending) {
    try {
      await submitFieldInspection(token, entry.payload);
      await removeQueuedInspection(entry.localId);
      succeeded += 1;
    } catch (error) {
      await updateQueuedInspection(entry.localId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Sync failed',
      });
      failed += 1;
    }
  }

  return { succeeded, failed };
}

export function subscribeToConnectivity(onOnline: () => void): () => void {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      onOnline();
    }
  });
}
