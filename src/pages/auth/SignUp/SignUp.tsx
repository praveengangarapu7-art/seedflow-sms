import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout/AuthLayout';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { useAuth } from '@/context/AuthContext';
import type { ProcurementRole } from '@/types';
import styles from './SignUp.module.css';

const COMPANY_TYPES = [
  'Seed Producer',
  'Seed Processor',
  'Seed Distributor',
  'Research Institution',
  'Cooperative',
];

/** Same-origin app paths only — see the matching guard in Login. */
function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (raw.startsWith('/login') || raw.startsWith('/signup')) return null;
  return raw;
}

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));

  const [form, setForm] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    role: 'purchase_executive' as ProcurementRole,
    companyType: '',
    password: '',
    confirmPassword: '',
    agreed: false,
  });

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const target = e.target;
    const value = target instanceof HTMLInputElement && target.type === 'checkbox'
      ? target.checked
      : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    signup({ 
      fullName: form.fullName, 
      email: form.email,
      role: form.role
    });
    navigate(redirectTo ?? '/modules', { replace: true });
  }

  return (
    <AuthLayout>
      <h1 className={styles.heading}>Create your account</h1>
      <p className={styles.subheading}>Get started with SeedFlow in under 2 minutes</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <Input
            label="Full name"
            name="fullName"
            type="text"
            placeholder="Ravi Kumar"
            value={form.fullName}
            onChange={handleChange}
            required
          />
          <Input
            label="Company name"
            name="companyName"
            type="text"
            placeholder="Agro Seeds Pvt. Ltd."
            value={form.companyName}
            onChange={handleChange}
            required
          />
        </div>

        <Input
          label="Work email"
          name="email"
          type="email"
          placeholder="ravi@agroseeds.in"
          value={form.email}
          onChange={handleChange}
          required
        />

        <div className={styles.phoneWrap}>
          <label className={styles.phoneLabel}>Phone number</label>
          <div className={styles.phoneInputRow}>
            <span className={styles.phonePrefix}>+91</span>
            <input
              className={styles.phoneInput}
              name="phone"
              type="tel"
              placeholder="98765 43210"
              value={form.phone}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.selectWrap}>
            <label className={styles.selectLabel}>I am a...</label>
            <select
              className={styles.select}
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="purchase_executive">Purchase Executive</option>
              <option value="purchase_manager">Purchase Manager</option>
              <option value="finance_manager">Finance Manager</option>
              <option value="quality_field_inspector">Quality Field Inspector</option>
            </select>
          </div>

          <div className={styles.selectWrap}>
            <label className={styles.selectLabel}>Company type</label>
            <select
              className={styles.select}
              name="companyType"
              value={form.companyType}
              onChange={handleChange}
            >
              <option value="">Select type</option>
              {COMPANY_TYPES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Create a password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />

        <div className={styles.checkboxRow}>
          <input
            className={styles.checkbox}
            id="agreed"
            name="agreed"
            type="checkbox"
            checked={form.agreed}
            onChange={handleChange}
            required
          />
          <label htmlFor="agreed" className={styles.checkboxLabel}>
            I agree to the{' '}
            <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            {' '}and{' '}
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
          </label>
        </div>

        <Button type="submit" variant="primary" fullWidth size="lg">
          Create account
        </Button>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}>
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
