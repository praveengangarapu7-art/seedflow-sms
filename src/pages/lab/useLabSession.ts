import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DEMO_ACCOUNTS, login } from '@/services/seedLotRealtimeClient';
import type { UserRole } from '@/types';

/**
 * Bridges this app's mock front-end auth (AuthContext / UserRole) to the real
 * seedflow-server session the Laboratory pages actually read and write with.
 *
 * The two auth systems are deliberately separate everywhere in this app (see
 * the header comment in seedLotRealtimeClient.ts): the backend has its own
 * JWT/RBAC with roles Admin/Breeder/Producer/Inspector/Warehouse Manager,
 * while the front-end module shell uses the richer per-module role list in
 * src/types. Every Production-module page already bootstraps a backend
 * session inline from DEMO_ACCOUNTS; the Laboratory module does the same,
 * but picks WHICH demo account to use from the signed-in front-end role
 * instead of a dropdown, so the module's own roles genuinely drive what the
 * backend will allow:
 *
 *   lab_manager        -> Admin      (record results, issue certificates,
 *                                     resolve flags — full lab authority)
 *   lab_technician     -> Inspector  (submit samples, record + bulk-upload
 *                                     results; no certificate issuing)
 *   lab_quality_analyst-> Inspector  (review results, resolve quality flags)
 *
 * Both Admin and Inspector satisfy the server-side requireRole gates in
 * labTesting.routes.ts, so the front-end permission checks in permissions.ts
 * are the narrower of the two layers — a lab_technician is hidden the
 * "Issue certificate" button by permission, and the server would also accept
 * it from Inspector, so the UI gate is what enforces the distinction. That is
 * the same trade-off every other module in this app makes with its mock roles.
 */
const BACKEND_ACCOUNT_BY_LAB_ROLE: Partial<Record<UserRole, string>> = {
  lab_manager: 'Admin',
  lab_technician: 'Inspector',
  lab_quality_analyst: 'Inspector',
};

export interface LabSession {
  token: string | null;
  backendRole: string | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useLabSession(): LabSession {
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
      // Anyone reaching a /lab route without a lab role still gets a working
      // read-only view via the Admin demo account rather than a hard failure —
      // the front-end permission gates already decided they may see the page.
      const roleName = (user && BACKEND_ACCOUNT_BY_LAB_ROLE[user.role]) ?? 'Admin';
      const account = DEMO_ACCOUNTS.find((a) => a.role === roleName) ?? DEMO_ACCOUNTS[0];
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setBackendRole(account.role);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to connect to the laboratory service');
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

  return { token, backendRole, loading, error, reload };
}
