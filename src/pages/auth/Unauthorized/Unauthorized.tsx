import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/types';
import type { UserRole } from '@/types';
import {
  DEMO_PASSWORD,
  getPostLoginRoute,
  moduleForPath,
  primaryAccountFor,
} from '@/data/demoAccounts';
import styles from './Unauthorized.module.css';

/**
 * Access denied — with the way in.
 *
 * Being told "your role doesn't have permission" is a dead end in a demo: the
 * person clicked Warehouse from the module grid and now has nothing to act on.
 * So this screen names the module they tried to open and lists the demo logins
 * that DO open it, each one a single click away from a pre-filled sign-in that
 * returns to the page they wanted.
 */
export default function Unauthorized() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const attempted = (location.state as { from?: string } | null)?.from ?? null;
  const blockedModule = moduleForPath(attempted);

  /** Send them to their own module's dashboard, not a hard-coded one. */
  const handleBackToDashboard = () => {
    navigate(user ? getPostLoginRoute(user.role) : '/modules');
  };

  const handleSwitchUser = () => {
    logout();
    navigate('/login');
  };

  /** Sign out and open the login form on this exact role, then come back here. */
  const handleUseLogin = (role: UserRole) => {
    const params = new URLSearchParams({ module: blockedModule?.key ?? '', role });
    if (attempted) params.set('redirect', attempted);
    logout();
    navigate(`/login?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconBox}>
          <ShieldAlert size={48} className={styles.icon} />
        </div>
        <h1 className={styles.title}>Access denied</h1>
        <p className={styles.description}>
          {blockedModule ? (
            <>
              You are signed in as <strong>{user ? ROLE_LABELS[user.role] : 'a role'}</strong>, which
              cannot open the <strong>{blockedModule.label}</strong>.
            </>
          ) : (
            <>Your role doesn't have permission to view this page.</>
          )}
        </p>

        {blockedModule && (
          <div className={styles.credentials}>
            <div className={styles.credentialsHead}>
              <KeyRound size={16} />
              <span>Demo logins that open {blockedModule.label}</span>
            </div>

            <ul className={styles.credentialsList}>
              {blockedModule.roles.map((role) => {
                const account = primaryAccountFor(role);
                return (
                  <li key={role} className={styles.credentialRow}>
                    <div className={styles.credentialText}>
                      <span className={styles.credentialRole}>{ROLE_LABELS[role]}</span>
                      <span className={styles.credentialMeta}>
                        {account.name} · {account.empId} · {account.location}
                      </span>
                      <span className={styles.credentialLogin}>
                        <code>{account.email}</code>
                        <code>{account.password ?? DEMO_PASSWORD}</code>
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.useBtn}
                      onClick={() => handleUseLogin(role)}
                    >
                      Use this login
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className={styles.credentialsFoot}>
              Signing in with one of these returns you to the page you were opening.
            </p>
          </div>
        )}

        <div className={styles.actions}>
          <button onClick={handleBackToDashboard} className={styles.primaryBtn}>
            Back to dashboard
          </button>
          <button onClick={handleSwitchUser} className={styles.secondaryBtn}>
            Sign in as different user
          </button>
        </div>
      </div>
    </div>
  );
}
