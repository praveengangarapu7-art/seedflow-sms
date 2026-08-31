import { useEffect, useState } from 'react';
import { DEMO_ACCOUNTS, login } from '@/services/seedLotRealtimeClient';

const STORAGE_KEY = 'seedflow_master_data_account_index';

function loadStoredAccountIndex(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isInteger(parsed) && parsed >= 0 && parsed < DEMO_ACCOUNTS.length ? parsed : 0;
  } catch {
    return 0;
  }
}

/**
 * The real backend (server/) has its own JWT/RBAC system, unrelated to this
 * app's client-side demo AuthContext — see seedLotRealtimeClient.ts's header
 * comment. Master Data's Variety screens need a real session (the approval
 * workflow is gated server-side by role), so this hook manages one directly
 * against one of the seeded DEMO_ACCOUNTS, the same pattern already proven
 * out by src/pages/production/SeedVarietyCatalog.tsx. Switching the account
 * lets a tester exercise the Admin-only approve/reject actions and see the
 * 403 a non-admin gets.
 */
export function useRealBackendSession() {
  const [accountIndex, setAccountIndexState] = useState(loadStoredAccountIndex);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[accountIndex].role);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setRole(account.role);
      } catch (err) {
        if (!cancelled) {
          setToken(null);
          setError(err instanceof Error ? err.message : 'Unable to connect to the backend service');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [accountIndex]);

  const setAccountIndex = (index: number) => {
    setAccountIndexState(index);
    try {
      localStorage.setItem(STORAGE_KEY, String(index));
    } catch {
      // best-effort persistence only
    }
  };

  return { accountIndex, setAccountIndex, token, role, loading, error, accounts: DEMO_ACCOUNTS };
}
