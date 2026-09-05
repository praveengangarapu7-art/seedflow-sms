import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DEMO_ACCOUNTS, login } from '@/services/seedLotRealtimeClient';
import type { UserRole } from '@/types';

/**
 * Bridges this app's mock front-end auth (AuthContext / UserRole) to the real
 * seedflow-server session the Administration pages read and write with — the
 * same bridge the Laboratory module introduced in useLabSession.ts, mapped
 * onto the admin roles.
 *
 *   super_admin        -> Admin      (every admin endpoint: users, orgs,
 *                                     privacy, governance, monitoring)
 *   system_admin       -> Admin      (same backend account; the narrower
 *                                     front-end permission set is what
 *                                     withholds the privacy actions)
 *   compliance_auditor -> Inspector  (audit logs and governance are
 *                                     Admin-OR-Inspector on the server, so
 *                                     this genuinely cannot reach /users,
 *                                     /privacy or /monitoring — the UI gate
 *                                     and the server gate agree)
 *
 * That last row matters: Compliance Auditor is not merely hidden the write
 * buttons, its backend session is actually refused those endpoints. Pages
 * that call an Admin-only endpoint therefore surface a permission error for
 * an auditor rather than silently showing nothing, which is why every admin
 * page checks `canAdminister` before firing those requests.
 */
const BACKEND_ACCOUNT_BY_ADMIN_ROLE: Partial<Record<UserRole, string>> = {
  super_admin: 'Admin',
  system_admin: 'Admin',
  compliance_auditor: 'Inspector',
};

export interface AdminSession {
  token: string | null;
  backendRole: string | null;
  /** True when the backend session can reach Admin-only endpoints. */
  canAdminister: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAdminSession(): AdminSession {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [backendRole, setBackendRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      const roleName = (user && BACKEND_ACCOUNT_BY_ADMIN_ROLE[user.role]) ?? 'Admin';
      const account = DEMO_ACCOUNTS.find((a) => a.role === roleName) ?? DEMO_ACCOUNTS[0];
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setBackendRole(account.role);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to connect to the administration service');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [user, nonce]);

  return {
    token,
    backendRole,
    canAdminister: backendRole === 'Admin',
    loading,
    error,
    reload,
  };
}
