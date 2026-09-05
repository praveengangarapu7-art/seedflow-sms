import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout/AuthLayout';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';
import { PROCUREMENT_ROLES, WAREHOUSE_ROLES, RD_ROLES, PROCESSING_ROLES, LAB_ROLES, ADMIN_ROLES, ROLE_LABELS } from '@/types';
import styles from './Login.module.css';

/** The password every demo account shares. */
const DEMO_PASSWORD = 'password123';

/** One demo employee. Several employees share a role, so picking a role shows
 *  that role's short staff list rather than the whole company. */
interface DemoAccount {
  name: string;
  empId: string;
  location: string;
  email: string;
  /** Only set when an account deliberately differs from DEMO_PASSWORD. */
  password?: string;
}

/**
 * Demo staff directory keyed by role. The first employee of a role is the one
 * pre-filled when that role is picked; the rest are alternates the demo user
 * can switch to without leaving the role.
 */
const DEMO_ACCOUNTS_BY_ROLE: Record<UserRole, DemoAccount[]> = {
  purchase_executive: [
    { name: 'Aarav Mehta', empId: 'EMP-PRC-101', location: 'Hyderabad', email: 'executive@seedsphere.com' },
    { name: 'Sneha Kulkarni', empId: 'EMP-PRC-102', location: 'Pune', email: 'executive2@seedsphere.com' },
    { name: 'Rahul Bansal', empId: 'EMP-PRC-103', location: 'Ludhiana', email: 'executive3@seedsphere.com' },
  ],
  purchase_manager: [
    { name: 'Priya Sharma', empId: 'EMP-PRC-201', location: 'Hyderabad', email: 'manager@seedsphere.com' },
    { name: 'Nikhil Ahuja', empId: 'EMP-PRC-202', location: 'Jaipur', email: 'manager2@seedsphere.com' },
    { name: 'Divya Menon', empId: 'EMP-PRC-203', location: 'Coimbatore', email: 'manager3@seedsphere.com' },
  ],
  finance_manager: [
    { name: 'Rohan Verma', empId: 'EMP-PRC-301', location: 'Hyderabad', email: 'finance@seedsphere.com' },
    { name: 'Lakshmi Narayan', empId: 'EMP-PRC-302', location: 'Bengaluru', email: 'finance2@seedsphere.com' },
    { name: 'Imran Qureshi', empId: 'EMP-PRC-303', location: 'Lucknow', email: 'finance3@seedsphere.com' },
  ],
  procurement_quality_field_inspector: [
    { name: 'Sanjay Iyer', empId: 'EMP-PRC-401', location: 'Guntur', email: 'inspector@seedsphere.com' },
    { name: 'Ritu Chandra', empId: 'EMP-PRC-402', location: 'Nashik', email: 'inspector2@seedsphere.com' },
    { name: 'Mahesh Yadav', empId: 'EMP-PRC-403', location: 'Indore', email: 'inspector3@seedsphere.com' },
  ],
  warehouse_supervisor: [
    { name: 'Vikram Nair', empId: 'EMP-WH-101', location: 'Hyderabad', email: 'supervisor@seedsphere.com' },
    { name: 'Farida Sheikh', empId: 'EMP-WH-102', location: 'Nagpur', email: 'supervisor2@seedsphere.com' },
    { name: 'Tarun Bose', empId: 'EMP-WH-103', location: 'Kolkata', email: 'supervisor3@seedsphere.com' },
  ],
  warehouse_manager: [
    { name: 'Anjali Rao', empId: 'EMP-WH-201', location: 'Bengaluru', email: 'whmanager@seedsphere.com' },
    { name: 'Suresh Babu', empId: 'EMP-WH-202', location: 'Vijayawada', email: 'whmanager2@seedsphere.com' },
    { name: 'Kavita Tandon', empId: 'EMP-WH-203', location: 'Bhopal', email: 'whmanager3@seedsphere.com' },
  ],
  warehouse_quality_field_inspector: [
    { name: 'Karthik Reddy', empId: 'EMP-WH-301', location: 'Guntur', email: 'whinspector@seedsphere.com' },
    { name: 'Nandini Ghosh', empId: 'EMP-WH-302', location: 'Kolkata', email: 'whinspector2@seedsphere.com' },
    { name: 'Ajay Solanki', empId: 'EMP-WH-303', location: 'Rajkot', email: 'whinspector3@seedsphere.com' },
  ],
  safety_officer: [
    { name: 'Neha Joshi', empId: 'EMP-WH-401', location: 'Pune', email: 'safety@seedsphere.com' },
    { name: 'Gopal Krishnan', empId: 'EMP-WH-402', location: 'Mysuru', email: 'safety2@seedsphere.com' },
    { name: 'Zoya Mirza', empId: 'EMP-WH-403', location: 'Lucknow', email: 'safety3@seedsphere.com' },
  ],
  rd_executive: [
    { name: 'Ishaan Gupta', empId: 'EMP-RND-101', location: 'Hyderabad', email: 'rdexecutive@seedsphere.com' },
    { name: 'Ananya Bose', empId: 'EMP-RND-102', location: 'Kolkata', email: 'rdexecutive2@seedsphere.com' },
    { name: 'Vivek Rathore', empId: 'EMP-RND-103', location: 'Indore', email: 'rdexecutive3@seedsphere.com' },
  ],
  rd_manager: [
    { name: 'Meera Pillai', empId: 'EMP-RND-201', location: 'Bengaluru', email: 'rdmanager@seedsphere.com' },
    { name: 'Dr. Samuel Thomas', empId: 'EMP-RND-202', location: 'Coimbatore', email: 'rdmanager2@seedsphere.com' },
    { name: 'Harshad Patel', empId: 'EMP-RND-203', location: 'Rajkot', email: 'rdmanager3@seedsphere.com' },
  ],
  rd_quality_field_inspector: [
    { name: 'Arjun Malhotra', empId: 'EMP-RND-301', location: 'Nashik', email: 'rdinspector@seedsphere.com' },
    { name: 'Swati Deshpande', empId: 'EMP-RND-302', location: 'Pune', email: 'rdinspector2@seedsphere.com' },
    { name: 'Rakesh Barman', empId: 'EMP-RND-303', location: 'Raipur', email: 'rdinspector3@seedsphere.com' },
  ],
  plant_supervisor: [
    { name: 'Deepak Chauhan', empId: 'EMP-PRO-101', location: 'Indore', email: 'plantsupervisor@seedsphere.com' },
    { name: 'Yasmin Ali', empId: 'EMP-PRO-102', location: 'Hyderabad', email: 'plantsupervisor2@seedsphere.com' },
    { name: 'Naveen Kamath', empId: 'EMP-PRO-103', location: 'Mysuru', email: 'plantsupervisor3@seedsphere.com' },
  ],
  plant_manager: [
    { name: 'Sunita Desai', empId: 'EMP-PRO-201', location: 'Nashik', email: 'plantmanager@seedsphere.com' },
    { name: 'Bhaskar Rout', empId: 'EMP-PRO-202', location: 'Raipur', email: 'plantmanager2@seedsphere.com' },
    { name: 'Alok Trivedi', empId: 'EMP-PRO-203', location: 'Bhopal', email: 'plantmanager3@seedsphere.com' },
  ],
  processing_quality_field_inspector: [
    { name: 'Kabir Sethi', empId: 'EMP-PRO-301', location: 'Ludhiana', email: 'procinspector@seedsphere.com' },
    { name: 'Preeti Saxena', empId: 'EMP-PRO-302', location: 'Lucknow', email: 'procinspector2@seedsphere.com' },
    { name: 'Manoj Dutta', empId: 'EMP-PRO-303', location: 'Kolkata', email: 'procinspector3@seedsphere.com' },
  ],
  lab_manager: [
    { name: 'Dr. Anita Krishnan', empId: 'EMP-LAB-101', location: 'Bengaluru', email: 'labmanager@seedsphere.com' },
    { name: 'Dr. Faisal Khan', empId: 'EMP-LAB-102', location: 'Hyderabad', email: 'labmanager2@seedsphere.com' },
    { name: 'Shalini Prabhu', empId: 'EMP-LAB-103', location: 'Pune', email: 'labmanager3@seedsphere.com' },
  ],
  lab_technician: [
    { name: 'Ravi Patil', empId: 'EMP-LAB-201', location: 'Bengaluru', email: 'labtechnician@seedsphere.com' },
    { name: 'Aisha Fernandes', empId: 'EMP-LAB-202', location: 'Coimbatore', email: 'labtechnician2@seedsphere.com' },
    { name: 'Gaurav Sinha', empId: 'EMP-LAB-203', location: 'Raipur', email: 'labtechnician3@seedsphere.com' },
  ],
  lab_quality_analyst: [
    { name: 'Pooja Bhatt', empId: 'EMP-LAB-301', location: 'Bengaluru', email: 'labanalyst@seedsphere.com' },
    { name: 'Sridhar Acharya', empId: 'EMP-LAB-302', location: 'Vijayawada', email: 'labanalyst2@seedsphere.com' },
    { name: 'Ruchi Kapoor', empId: 'EMP-LAB-303', location: 'Jaipur', email: 'labanalyst3@seedsphere.com' },
  ],
  super_admin: [
    { name: 'Vikram Rao', empId: 'EMP-ADM-101', location: 'Hyderabad', email: 'superadmin@seedsphere.com' },
    { name: 'Meera Iyer', empId: 'EMP-ADM-102', location: 'Bengaluru', email: 'superadmin2@seedsphere.com' },
  ],
  system_admin: [
    { name: 'Arjun Nair', empId: 'EMP-ADM-201', location: 'Hyderabad', email: 'sysadmin@seedsphere.com' },
    { name: 'Farah Qureshi', empId: 'EMP-ADM-202', location: 'Pune', email: 'sysadmin2@seedsphere.com' },
  ],
  compliance_auditor: [
    { name: 'Deepak Joshi', empId: 'EMP-ADM-301', location: 'Delhi', email: 'auditor@seedsphere.com' },
    { name: 'Lakshmi Rangan', empId: 'EMP-ADM-302', location: 'Chennai', email: 'auditor2@seedsphere.com' },
  ],
};

function getPostLoginRoute(role: UserRole): string {
  if (PROCUREMENT_ROLES.includes(role)) return '/procurement/dashboard';
  if (WAREHOUSE_ROLES.includes(role)) return '/warehouse/dashboard';
  if (RD_ROLES.includes(role)) return '/rd/dashboard';
  if (PROCESSING_ROLES.includes(role)) return '/processing/dashboard';
  if (LAB_ROLES.includes(role)) return '/lab/dashboard';
  if (ADMIN_ROLES.includes(role)) return '/admin/dashboard';
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
  { key: 'admin', label: 'Administration Module', roles: ADMIN_ROLES },
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
  const [accountIndex, setAccountIndex] = useState(0);
  const [email, setEmail] = useState(DEMO_ACCOUNTS_BY_ROLE.purchase_executive[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS_BY_ROLE.purchase_executive[0].password ?? DEMO_PASSWORD);
  const [remember, setRemember] = useState(false);
  const [showDemoList, setShowDemoList] = useState(false);

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
