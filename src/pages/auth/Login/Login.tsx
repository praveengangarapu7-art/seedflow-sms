import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout/AuthLayout';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';
import { ROLE_LABELS } from '@/types';
import {
  DEMO_ACCOUNTS_BY_ROLE,
  DEMO_MODULES,
  DEMO_PASSWORD,
  getPostLoginRoute,
  moduleKeyForRole,
} from '@/data/demoAccounts';
import styles from './Login.module.css';


/**
 * Only same-origin app paths are accepted as a redirect target, so a crafted
 * `?redirect=` can never bounce someone off to another site after login.
 */
function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (raw.startsWith('/login') || raw.startsWith('/signup')) return null;
  return raw;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));

  // The Access denied screen links here with the module and role it suggested,
  // so the form opens on that login already filled in rather than making the
  // person find it again in the two dropdowns.
  const suggestedRole = (() => {
    const raw = searchParams.get('role') as UserRole | null;
    return raw && DEMO_ACCOUNTS_BY_ROLE[raw] ? raw : null;
  })();
  const suggestedModule = searchParams.get('module');
  const initialRole: UserRole =
    suggestedRole ??
    (suggestedModule ? DEMO_MODULES.find((m) => m.key === suggestedModule)?.roles[0] : undefined) ??
    'purchase_executive';

  const [role, setRole] = useState<UserRole>(initialRole);
  const [moduleKey, setModuleKey] = useState<string>(() => moduleKeyForRole(initialRole));
  const [accountIndex, setAccountIndex] = useState(0);
  const [email, setEmail] = useState(DEMO_ACCOUNTS_BY_ROLE[initialRole][0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS_BY_ROLE[initialRole][0].password ?? DEMO_PASSWORD);
  const [remember, setRemember] = useState(false);
  const [showDemoList, setShowDemoList] = useState(Boolean(suggestedRole || suggestedModule));

  const activeModule = DEMO_MODULES.find((m) => m.key === moduleKey) ?? DEMO_MODULES[0];
  /** Only the employees holding the currently picked role. */
  const roleAccounts = DEMO_ACCOUNTS_BY_ROLE[role];

  /** Fills the form from one demo employee and reveals that role's staff list. */
  function applyAccount(nextRole: UserRole, index: number) {
    const accounts = DEMO_ACCOUNTS_BY_ROLE[nextRole];
    const account = accounts[index] ?? accounts[0];
    setRole(nextRole);
    setModuleKey(moduleKeyForRole(nextRole));
    setAccountIndex(accounts.indexOf(account));
    setEmail(account.email);
    setPassword(account.password ?? DEMO_PASSWORD);
    setShowDemoList(true);
  }

  function handleModuleChange(selectedModuleKey: string) {
    const nextModule = DEMO_MODULES.find((m) => m.key === selectedModuleKey) ?? DEMO_MODULES[0];
    applyAccount(nextModule.roles[0], 0);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Sign in under the demo employee's own name when the email still matches
    // one of them; a hand-typed email just falls back to the generic demo user.
    const signedInAs = roleAccounts.find((a) => a.email === email);
    login(email, password, role, signedInAs?.name);
    navigate(redirectTo ?? getPostLoginRoute(role), { replace: true });
  }

  return (
    <AuthLayout>
      <h1 className={styles.heading}>Welcome back</h1>
      <p className={styles.subheading}>
        {redirectTo
          ? 'Sign in and we’ll take you straight to the page you searched for.'
          : 'Log in to access your seed management dashboard'}
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.demoRoleSelector}>
          <label className={styles.demoLabel}>Demo: Log in as</label>
          <div className={styles.demoStepRow}>
            <div className={styles.demoStep}>
              <span className={styles.demoStepNumber}>1</span>
              <select
                value={moduleKey}
                onChange={(e) => handleModuleChange(e.target.value)}
                className={styles.demoSelect}
                aria-label="Choose a module"
              >
                {DEMO_MODULES.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.demoStep}>
              <span className={styles.demoStepNumber}>2</span>
              <select
                value={role}
                onChange={(e) => applyAccount(e.target.value as UserRole, 0)}
                className={styles.demoSelect}
                aria-label="Choose a role"
              >
                {activeModule.roles.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
          <p className={styles.demoHint}>First pick a module, then a role, to preview that role's interface.</p>

          {showDemoList && (
            <div className={styles.demoCredentialsPanel}>
              <div className={styles.demoCredentialsPanelHeader}>
                <span className={styles.demoCredentialsPanelTitle}>{ROLE_LABELS[role]} — demo logins</span>
                <button
                  type="button"
                  className={styles.demoCredentialsHideBtn}
                  onClick={() => setShowDemoList(false)}
                >
                  Hide
                </button>
              </div>

              <div className={styles.demoCredentialsList}>
                {roleAccounts.map((account, index) => {
                  const isActive = index === accountIndex;
                  return (
                    <button
                      type="button"
                      key={account.email}
                      className={isActive ? `${styles.demoCredentialRow} ${styles.demoCredentialRowActive}` : styles.demoCredentialRow}
                      onClick={() => applyAccount(role, index)}
                    >
                      <span className={styles.demoCredentialNameRow}>
                        <span className={styles.demoCredentialName}>{account.name}</span>
                        <span className={styles.demoCredentialRole}>{ROLE_LABELS[role]}</span>
                      </span>
                      <span className={styles.demoCredentialMeta}>
                        <span className={styles.demoCredentialEmail}>{account.email}</span>
                        <span className={styles.demoCredentialPassword}>{account.password ?? DEMO_PASSWORD}</span>
                      </span>
                      <span className={styles.demoCredentialDetail}>
                        {account.empId} · {account.location}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className={styles.demoCredentialsFooter}>
                {roleAccounts.length} demo {roleAccounts.length === 1 ? 'employee' : 'employees'} hold this role — pick one, then press Log in below.
              </p>
            </div>
          )}
        </div>

        <Input
          label="Work email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className={styles.rememberRow}>
          <div className={styles.rememberLeft}>
            <input
              id="remember"
              className={styles.checkbox}
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember" className={styles.rememberLabel}>Keep me signed in</label>
          </div>
          <a
            href="#"
            className={styles.forgotLink}
            onClick={(e) => e.preventDefault()}
          >
            Forgot password?
          </a>
        </div>

        <Button type="submit" variant="primary" fullWidth size="lg">
          Log in
        </Button>

        <p className={styles.footer}>
          Don't have an account?{' '}
          <Link to={redirectTo ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : '/signup'}>
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
