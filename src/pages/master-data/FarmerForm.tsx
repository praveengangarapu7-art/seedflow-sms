import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import {
  createFarmer,
  fetchFarmerById,
  fetchOrganizations,
  updateFarmer,
  type OrganizationRow,
} from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  region?: string;
  email?: string;
}

export default function FarmerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token } = useRealBackendSession();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [location, setLocation] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const pageTitle = useMemo(() => (isEdit ? 'Edit Farmer' : 'Register Farmer'), [isEdit]);

  useEffect(() => {
    if (!token) return;
    void fetchOrganizations(token).then(setOrganizations).catch(() => setOrganizations([]));
  }, [token]);

  useEffect(() => {
    if (!isEdit || !token) return;

    const load = async () => {
      try {
        const data = await fetchFarmerById(token, id!);
        setName(data.name ?? '');
        setPhone(data.phone ?? '');
        setEmail(data.email ?? '');
        setRegion(data.region ?? '');
        setLocation(data.location ?? '');
        setOrganizationId(data.organization_id ?? '');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load farmer';
        setError(message);
      }
    };

    void load();
  }, [id, isEdit, token]);

  // Same rule the backend enforces (server/src/utils/validation.ts) —
  // checked client-side first so the user sees the error immediately,
  // without waiting on a round trip, and the server check remains the
  // real source of truth (e.g. for API/import callers).
  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Farmer name is required.';
    if (!region.trim()) errors.region = 'Region is required.';
    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    return errors;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please fix the highlighted fields.');
      return;
    }

    if (!token) {
      setError('Not connected to the backend yet — please wait a moment and try again.');
      return;
    }

    setLoading(true);

    try {
      const basePayload = {
        name: name.trim(),
        region: region.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
      };

      if (isEdit) {
        await updateFarmer(token, id!, { ...basePayload, organizationId: organizationId || null });
        addToast('Farmer updated successfully', 'success');
      } else {
        await createFarmer(token, { ...basePayload, ...(organizationId ? { organizationId } : {}) });
        addToast('Farmer registered successfully', 'success');
      }
      navigate('/farmers');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save farmer';
      setError(message);
      // A validation error from the server (e.g. an import path that
      // skipped the client-side check) still needs to land on the email
      // field specifically, not just the page-level banner.
      if (/email/i.test(message)) setFieldErrors((prev) => ({ ...prev, email: message }));
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{pageTitle}</h1>
          <p className={styles.subtitle}>Capture farmer master data for SeedSphere.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/farmers')}>
            Back to list
          </Button>
        </div>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error ? <div className={styles.errorText}>{error}</div> : null}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">Name</label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramulu Naidu"
              errorText={fieldErrors.name}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ramulu.naidu@example.com"
              errorText={fieldErrors.email}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone">Phone</label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876500001"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="region">Region</label>
            <Input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Guntur"
              errorText={fieldErrors.region}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="location">Location</label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Village Peda Avutapalli"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="organization">Organization</label>
            <select
              id="organization"
              className={styles.select}
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            >
              <option value="">— None —</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.actions}>
            <Button leftIcon={Save} isLoading={loading} type="submit">
              {isEdit ? 'Save changes' : 'Register farmer'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate('/farmers')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
