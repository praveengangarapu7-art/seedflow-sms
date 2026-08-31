import { broadcast } from '../../ws/server';
import { getCriticalExpirations } from './storageAssignments.service';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * There's no job scheduler in this backend, so "auto-alert when lots
 * approach expiration" is implemented as a lightweight periodic scan
 * reusing the existing WebSocket broadcast infrastructure, rather than
 * standing up a separate queue/cron system for one recurring check.
 */
export function startExpirationWatcher(): void {
  const tick = async () => {
    try {
      const critical = await getCriticalExpirations();
      if (critical.length > 0) {
        broadcast('EXPIRATION_ALERT', { entries: critical, scannedAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error('[expirationWatcher] scan failed:', error);
    }
  };

  void tick();
  setInterval(tick, CHECK_INTERVAL_MS);
}
