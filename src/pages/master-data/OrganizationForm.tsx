import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import { createOrganization, fetchOrganizationById, updateOrganization } from '@/services/seedLotRealtimeClient';
import { organizationTypeOptions } from './organizationTypes';
import styles from './master-data.module.css';

interface FieldErrors {
  name?: string;
  location?: string;
  contactPerson?: string;
  certificationType?: string;
}

export default function OrganizationForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token } = useRealBackendSession();

  const [name, setName] = useState('');
  const [type, setType] = useState<string>(organizationTypeOptions[0].value);
  const [location, setLocation] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [certificationType, setCertificationType] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const pageTitle = useMemo(() => (isEdit ? 'Edit Organization' : 'Create Organization'), [isEdit]);
  const isLab = type === 'laboratory';

  useEffect(() => {
    if (!isEdit || !token) return;

    const load = async () => {
      try {
        const data = await fetchOrganizationById(token, id!);
        setName(data.name ?? '');
        setType(data.type ?? organizationTypeOptions[0].value);
        setLocation(data.location ?? '');
        setContactPerson(data.contact_person ?? '');
        setCertificationType(data.certification_type ?? '');
        setActive(data.active ?? true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load organization';
        setError(message);
      }
    };

    void load();
  }, [id, isEdit, token]);

  // "Labs must have certification type" only applies when type === 'laboratory'
  // — every other organization type leaves it optional. Location and contact
  // person are required across all types (unchanged from before).
  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Organization name is required.';
    if (!location.trim()) errors.location = 'Location is required.';
    if (!contactPerson.trim()) errors.contactPerson = 'Contact person is required.';
    if (isLab && !certificationType.trim()) errors.certificationType = 'Certification type is required for a laboratory.';
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
      const payload = {
        name: name.trim(),
        type,
        location: location.trim(),
        contactPerson: contactPerson.trim(),
        certificationType: certificationType.trim() || undefined,
        active,
      };

      if (isEdit) {
        await updateOrganization(token, id!, payload);
        addToast('Organization updated successfully', 'success');
      } else {
        await createOrganization(token, payload);
        addToast('Organization created successfully', 'success');
      }
      navigate('/organizations');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save organization';
      setError(message);
      if (/certificationType/i.test(message)) setFieldErrors((prev) => ({ ...prev, certificationType: message }));
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
          <p className={styles.subtitle}>Capture organization master data for SeedSphere.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/organizations')}>
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
              placeholder="e.g. GreenFields Breeders"
              errorText={fieldErrors.name}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="type">Type</label>
            <select id="type" className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
              {organizationTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="location">Location</label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Hyderabad, Telangana"
              errorText={fieldErrors.location}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="contactPerson">Contact Person</label>
            <Input
              id="contactPerson"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              errorText={fieldErrors.contactPerson}
            />
          </div>

          {isLab ? (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="certificationType">Certification Type</label>
              <Input
                id="certificationType"
                value={certificationType}
                onChange={(e) => setCertificationType(e.target.value)}
                placeholder="e.g. NABL Accredited, ISTA Accredited"
                errorText={fieldErrors.certificationType}
              />
            </div>
          ) : null}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="active" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input id="active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active
            </label>
          </div>

          <div className={styles.actions}>
            <Button leftIcon={Save} isLoading={loading} type="submit">
              {isEdit ? 'Save changes' : 'Create organization'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate('/organizations')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
