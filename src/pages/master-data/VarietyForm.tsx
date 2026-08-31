import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import {
  createCropVariety,
  fetchCropVarietyById,
  fetchCrops,
  fetchOrganizations,
  updateCropVariety,
  type CropRow,
  type OrganizationRow,
} from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

export default function VarietyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token } = useRealBackendSession();

  const [crops, setCrops] = useState<CropRow[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [name, setName] = useState('');
  const [crop, setCrop] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [breederOrgId, setBreederOrgId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageTitle = useMemo(() => (isEdit ? 'Edit Variety' : 'Create Variety'), [isEdit]);
  const breederOrgs = useMemo(() => organizations.filter((o) => o.type === 'breeder'), [organizations]);

  useEffect(() => {
    if (!token) return;
    void fetchCrops(token).then(setCrops).catch(() => setCrops([]));
    void fetchOrganizations(token).then(setOrganizations).catch(() => setOrganizations([]));
  }, [token]);

  useEffect(() => {
    if (!isEdit || !token) return;

    const load = async () => {
      try {
        const data = await fetchCropVarietyById(token, id!);
        setName(data.name);
        setCrop(data.crop);
        setDescription(data.description ?? '');
        setCategory(data.category ?? '');
        setBreederOrgId(data.breeder_organization_id ?? '');
        setStatus(data.status);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load variety';
        setError(message);
      }
    };

    void load();
  }, [id, isEdit, token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('Not connected to the backend yet — please wait a moment and try again.');
      return;
    }
    if (!name.trim()) {
      setError('Variety name is required.');
      return;
    }
    if (!crop.trim()) {
      setError('Crop is required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        crop: crop.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        breederOrganizationId: breederOrgId || null,
      };

      if (isEdit) {
        await updateCropVariety(token, id!, payload);
        addToast('Variety updated successfully', 'success');
      } else {
        await createCropVariety(token, payload);
        addToast('Variety created successfully', 'success');
      }
      navigate('/varieties');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save variety';
      setError(message);
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
          <p className={styles.subtitle}>Capture the variety details for SeedSphere master data.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/varieties')}>
            Back to list
          </Button>
        </div>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error ? <div className={styles.errorText}>{error}</div> : null}
          {isEdit && status && status !== 'draft' ? (
            <div className={styles.helperText}>
              This variety is currently <strong>{status}</strong>. Editing it will not change its status.
            </div>
          ) : null}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">Name</label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Paddy-101"
              errorText={!name.trim() && error ? 'Required' : undefined}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="crop">Crop</label>
            <select id="crop" className={styles.select} value={crop} onChange={(e) => setCrop(e.target.value)}>
              <option value="">Select a crop</option>
              {crops.map((option) => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
              {crop && !crops.some((c) => c.name === crop) ? (
                <option value={crop}>{crop}</option>
              ) : null}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="category">Category</label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Hybrid, Open-pollinated"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="breederOrg">Breeder Organization</label>
            <select
              id="breederOrg"
              className={styles.select}
              value={breederOrgId}
              onChange={(e) => setBreederOrgId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {breederOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="description">Description</label>
            <textarea
              id="description"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add variety description, traits, or notes"
            />
          </div>

          <div className={styles.actions}>
            <Button leftIcon={Save} isLoading={loading} type="submit">
              {isEdit ? 'Save changes' : 'Create variety'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate('/varieties')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
