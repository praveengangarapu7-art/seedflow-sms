import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DEMO_ACCOUNTS, login } from '@/services/seedLotRealtimeClient';
import type { UserRole } from '@/types';

/**
 * Bridges the front-end module role to a real seedflow-server session, the
 * same way useLabSession does (see the long comment there for why the two auth
 * systems are separate). The mapping is chosen so the server's own gates line
 * up with the front-end permission split in permissions.ts:
 *
 *   quality_manager            -> Admin      approve SOPs, close NCRs/complaints,
 *                                            verify CAPAs, release holds
 *   super_admin, system_admin  -> Admin      same authority, platform-wide
 *   quality_officer            -> Inspector  author, investigate, own CAPAs,
 *                                            place holds
 *   compliance_auditor         -> Inspector  read-only in the UI by permission
 *   everyone else              -> Producer   read, raise NCRs, log complaints,
 *                                            acknowledge SOPs — nothing more
 *
 * Because officer and manager are different backend identities, the server's
 * four-eyes rules (author != approver, owner != verifier) hold in the demo
 * exactly as they would with real accounts.
 */
const BACKEND_ACCOUNT_BY_ROLE: Partial<Record<UserRole, string>> = {
  quality_manager: 'Admin',
  super_admin: 'Admin',
  system_admin: 'Admin',
  quality_officer: 'Inspector',
  compliance_auditor: 'Inspector',
};

export interface QualitySession {
  token: string | null;
  backendEmail: string | null;
  backendRole: string | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useQualitySession(): QualitySession {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [backendEmail, setBackendEmail] = useState<string | null>(null);
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
      const roleName = (user && BACKEND_ACCOUNT_BY_ROLE[user.role]) ?? 'Producer';
      const account = DEMO_ACCOUNTS.find((a) => a.role === roleName) ?? DEMO_ACCOUNTS[0];
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setBackendEmail(account.email);
        setBackendRole(account.role);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the quality service');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [user, nonce]);

  return { token, backendEmail, backendRole, loading, error, reload };
}
