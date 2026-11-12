import { useEffect, useState } from 'react';
import { DEMO_ACCOUNTS, login } from '@/services/seedLotRealtimeClient';

/**
 * A backend session for read-only surfaces (AI Center, home-page pulse).
 *
 * Same pattern every real-backend page in this app uses: the front-end login
 * is a separate, mocked system, so the page signs in to the API with the
 * Admin demo account. If the API is unreachable, login() resolves from the
 * demo dataset instead of failing, so callers always get a token.
 */
export function useBackendSession(): { token: string | null; error: string | null } {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[0];
    login(account.email, account.password)
      .then(({ accessToken }) => {
        if (!cancelled) setToken(accessToken);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not reach the SeedSphere server');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { token, error };
}
