import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string, role: UserRole) => void;
  signup: (formData: Record<string, string>) => void;
  logout: () => void;
  /** Persists a partial edit (name, email, organizationName, avatarUrl) onto the signed-in user. */
  updateUser: (patch: Partial<Pick<User, 'name' | 'email' | 'organizationName' | 'avatarUrl'>>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'seedflow_auth';

function loadUserFromStorage(): User | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as User;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadUserFromStorage());
  const isAuthenticated = user !== null;

  // Keep useEffect for cross-tab logout sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setUser(e.newValue ? (JSON.parse(e.newValue) as User) : null);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function login(email: string, _password: string, role: UserRole) {
    const newUser: User = {
      name: 'Demo User',
      email,
      role,
    };
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  }

  function signup(formData: Record<string, string>) {
    const role = (formData['role'] as UserRole) ?? 'purchase_executive';
    const newUser: User = {
      name: formData['fullName'] ?? 'Demo User',
      email: formData['email'] ?? 'demo@seedsphere.com',
      role,
    };
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  function updateUser(patch: Partial<Pick<User, 'name' | 'email' | 'organizationName' | 'avatarUrl'>>) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
