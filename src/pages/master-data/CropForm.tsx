import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import { createCrop, fetchCropById, fetchCropVarieties, updateCrop } from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

const categoryOptions = ['Food Grain', 'Cash Crop', 'Oilseed', 'Vegetable', 'Pulse', 'Fibre Crop'];
const seasonOptions = ['Kharif', 'Rabi', 'Summer', 'Year-round', 'Winter'];

export default function CropForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token } = useRealBackendSession();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(categoryOptions[0]);
  const [season, setSeason] = useState(seasonOptions[0]);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [hasApprovedVariety, setHasApprovedVariety] = useState<boolean | null>(null);

  const pageTitle = useMemo(() => (isEdit ? 'Edit Crop' : 'Create Crop'), [isEdit]);

  useEffect(() => {
    if (!isEdit || !token) return;

    const load = async () => {
      try {
        const data = await fetchCropById(token, id!);
        setName(data.name ?? '');
        setCategory(data.category ?? categoryOptions[0]);
        setSeason(data.season ?? seasonOptions[0]);
        setActive(data.active ?? true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load crop';
        setError(message);
      }
    };

    void load();
  }, [id, isEdit, token]);

  // "Crops must have approved variety" — checked here as an informational
  // warning, not a hard block: unlike a farmer's email or a lab's
  // certification (fields on the same record), a crop's first variety has
  // to go through its own draft -> reviewed -> approved workflow, which
  // can't happen before the crop itself exists. Blocking crop creation on
  // it would make it impossible to ever register a brand-new crop. The
  // Reconcile report (accessible from the Master Data nav) surfaces the
  // same check across every crop, for ongoing monitoring.
  useEffect(() => {
    if (!token || !name.trim()) {
      setHasApprovedVariety(null);
      return;
    }
    let cancelled = false;
    void fetchCropVarieties(token, { crop: name.trim(), status: 'approved' })
      .then((varieties) => {
        if (!cancelled) setHasApprovedVariety(varieties.length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasApprovedVariety(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, name]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setNameError('Crop name is required.');
      return;
    }
    setNameError(undefined);

    if (!token) {
      setError('Not connected to the backend yet — please wait a moment and try again.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        category,
        season,
        active,
      };

      if (isEdit) {
        await updateCrop(token, id!, payload);
        addToast('Crop updated successfully', 'success');
      } else {
        await createCrop(token, payload);
        addToast('Crop created successfully', 'success');
      }
      navigate('/crops');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save crop';
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
          <p className={styles.subtitle}>Capture crop master data for SeedSphere.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/crops')}>
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
              placeholder="e.g. Paddy"
              errorText={nameError}
            />
          </div>

          {hasApprovedVariety === false ? (
            <div
              className={styles.helperText}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b8860b' }}
            >
              <AlertTriangle size={14} /> No approved variety exists for "{name.trim()}" yet — you can still save, but
              consider registering and approving one from the Varieties page.
            </div>
          ) : null}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="category">Category</label>
            <select id="category" className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="season">Season</label>
            <select id="season" className={styles.select} value={season} onChange={(e) => setSeason(e.target.value)}>
              {seasonOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="active" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input id="active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active
            </label>
          </div>

          <div className={styles.actions}>
            <Button leftIcon={Save} isLoading={loading} type="submit">
              {isEdit ? 'Save changes' : 'Create crop'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate('/crops')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
