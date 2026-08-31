import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout/AuthLayout';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';
import { PROCUREMENT_ROLES, WAREHOUSE_ROLES, RD_ROLES, PROCESSING_ROLES, LAB_ROLES, ROLE_LABELS } from '@/types';
import styles from './Login.module.css';

const DEMO_CREDENTIALS: Record<UserRole, { email: string; password: string }> = {
  purchase_executive: { email: 'executive@seedsphere.com', password: 'password123' },
  purchase_manager: { email: 'manager@seedsphere.com', password: 'password123' },
  finance_manager: { email: 'finance@seedsphere.com', password: 'password123' },
  procurement_quality_field_inspector: { email: 'inspector@seedsphere.com', password: 'password123' },
  warehouse_supervisor: { email: 'supervisor@seedsphere.com', password: 'password123' },
  warehouse_manager: { email: 'whmanager@seedsphere.com', password: 'password123' },
  warehouse_quality_field_inspector: { email: 'whinspector@seedsphere.com', password: 'password123' },
  safety_officer: { email: 'safety@seedsphere.com', password: 'password123' },
  rd_executive: { email: 'rdexecutive@seedsphere.com', password: 'password123' },
  rd_manager: { email: 'rdmanager@seedsphere.com', password: 'password123' },
  rd_quality_field_inspector: { email: 'rdinspector@seedsphere.com', password: 'password123' },
  plant_supervisor: { email: 'plantsupervisor@seedsphere.com', password: 'password123' },
  plant_manager: { email: 'plantmanager@seedsphere.com', password: 'password123' },
  processing_quality_field_inspector: { email: 'procinspector@seedsphere.com', password: 'password123' },
  lab_manager: { email: 'labmanager@seedsphere.com', password: 'password123' },
  lab_technician: { email: 'labtechnician@seedsphere.com', password: 'password123' },
  lab_quality_analyst: { email: 'labanalyst@seedsphere.com', password: 'password123' },
};

function getPostLoginRoute(role: UserRole): string {
  if (PROCUREMENT_ROLES.includes(role)) return '/procurement/dashboard';
  if (WAREHOUSE_ROLES.includes(role)) return '/warehouse/dashboard';
  if (RD_ROLES.includes(role)) return '/rd/dashboard';
  if (PROCESSING_ROLES.includes(role)) return '/processing/dashboard';
  if (LAB_ROLES.includes(role)) return '/lab/dashboard';
  return '/modules';
}

interface DemoModule {
  key: string;
  label: string;
  roles: UserRole[];
}

/** Two-step demo picker: choose a module first, then a role scoped to it. */
const DEMO_MODULES: DemoModule[] = [
  { key: 'procurement', label: 'Procurement Module', roles: PROCUREMENT_ROLES },
  { key: 'warehouse', label: 'Warehouse Module', roles: WAREHOUSE_ROLES },
  { key: 'rd', label: 'R&D Module', roles: RD_ROLES },
  { key: 'processing', label: 'Processing Module', roles: PROCESSING_ROLES },
  { key: 'lab', label: 'Laboratory Module', roles: LAB_ROLES },
];

function moduleKeyForRole(role: UserRole): string {
  return DEMO_MODULES.find((m) => m.roles.includes(role))?.key ?? DEMO_MODULES[0].key;
}

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
  const [role, setRole] = useState<UserRole>('purchase_executive');
  const [moduleKey, setModuleKey] = useState<string>(() => moduleKeyForRole('purchase_executive'));
  const [email, setEmail] = useState(DEMO_CREDENTIALS.purchase_executive.email);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.purchase_executive.password);
  const [remember, setRemember] = useState(false);

  const activeModule = DEMO_MODULES.find((m) => m.key === moduleKey) ?? DEMO_MODULES[0];

  function handleRoleChange(selectedRole: UserRole) {
    setRole(selectedRole);
    setEmail(DEMO_CREDENTIALS[selectedRole].email);
    setPassword(DEMO_CREDENTIALS[selectedRole].password);
  }

  function handleModuleChange(selectedModuleKey: string) {
    setModuleKey(selectedModuleKey);
    const nextModule = DEMO_MODULES.find((m) => m.key === selectedModuleKey) ?? DEMO_MODULES[0];
    handleRoleChange(nextModule.roles[0]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login(email, password, role);
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
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
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
