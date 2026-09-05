import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as apiLogin, type AuthUser } from '../api/client';
import { clearSession, loadSession, saveSession } from '../db/offlineStore';
import { setupPushNotifications } from '../services/notifications';

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSession<AuthUser>()
      .then((session) => {
        if (cancelled || !session) return;
        setToken(session.token);
        setUser(session.user);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { accessToken, user: loggedInUser } = await apiLogin(email, password);
      await saveSession(accessToken, loggedInUser);
      setToken(accessToken);
      setUser(loggedInUser);
      void setupPushNotifications(accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ token, user, loading, error, signIn, signOut }), [token, user, loading, error, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
