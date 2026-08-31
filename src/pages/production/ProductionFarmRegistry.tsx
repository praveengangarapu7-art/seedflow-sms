import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  IRRIGATION_TYPES,
  SOIL_TYPES,
  createFarm,
  fetchFarmers,
  fetchFarms,
  login,
  type Farm,
  type FarmerRow,
  type IrrigationType,
  type SoilType,
} from '@/services/seedLotRealtimeClient';
import styles from './production.module.css';

// Roles allowed to register a farm, mirroring cropPlanning.routes.ts's
// `POST /farms` gate exactly (Admin/Producer/Warehouse Manager).
const CREATE_ROLES = new Set(['Admin', 'Producer', 'Warehouse Manager']);

function titleCase(value: string): string {
  return value.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

const emptyForm = {
  farmerId: '',
  name: '',
  soilType: SOIL_TYPES[0] as SoilType,
  areaAcres: '',
  irrigationType: '' as IrrigationType | '',
};

export default function ProductionFarmRegistry() {
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const [farmList, farmerList] = await Promise.all([fetchFarms(accessToken), fetchFarmers(accessToken)]);
      setFarms(farmList);
      setFarmers(farmerList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the farm registry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setRole(account.role);
        await loadAll(accessToken);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the farm registry service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const farmerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of farmers) map.set(f.id, f.name);
    return map;
  }, [farmers]);

  const canCreate = CREATE_ROLES.has(role);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError('Not connected to the farm registry service.');
      return;
    }
    if (!form.farmerId) {
      setFormError('Select a farmer.');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Farm name is required.');
      return;
    }
    const areaAcres = Number(form.areaAcres);
    if (!form.areaAcres || Number.isNaN(areaAcres) || areaAcres <= 0) {
      setFormError('Area (acres) must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      await createFarm(token, {
        farmerId: form.farmerId,
        name: form.name.trim(),
        soilType: form.soilType,
        areaAcres,
        irrigationType: form.irrigationType || undefined,
      });
      addToast('Farm registered.', 'success');
      setForm(emptyForm);
      await loadAll(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register this farm';
      setFormError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Farm Registry</h1>
          <p className={styles.subtitle}>
            The real farm records behind Crop Planning — soil type, area and irrigation, tied to a registered farmer.
          </p>
        </div>
        <div className={styles.controls}>
          <select
            className={styles.select}
            value={accountIndex}
            onChange={(e) => setAccountIndex(Number(e.target.value))}
          >
            {DEMO_ACCOUNTS.map((account, index) => (
              <option key={account.email} value={index}>
                Viewing as: {account.role}
              </option>
            ))}
          </select>
          <Button variant="secondary" leftIcon={RefreshCw} isLoading={loading} onClick={() => token && void loadAll(token)}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <div className={styles.card} style={{ marginBottom: '1rem' }}><span className={styles.errorText}>{error}</span></div> : null}

      <div className={styles.grid} style={{ gridTemplateColumns: '1.4fr 1fr', alignItems: 'start' }}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>Registered Farms ({farms.length})</h2>

          {farms.length === 0 && !loading ? (
            <div className={styles.emptyState}>
              No farms registered yet — use the form to add the first one.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Farm</th>
                  <th>Farmer</th>
                  <th>Soil Type</th>
                  <th>Area</th>
                  <th>Irrigation</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => (
                  <tr key={farm.id}>
                    <td>
                      <MapPin size={13} style={{ verticalAlign: '-2px', marginRight: '0.35rem', color: 'var(--color-text-muted)' }} />
                      {farm.name}
                    </td>
                    <td>{farmerNameById.get(farm.farmer_id) ?? farm.farmer_id}</td>
                    <td>{titleCase(farm.soil_type)}</td>
                    <td>{farm.area_acres.toLocaleString()} acres</td>
                    <td>{farm.irrigation_type ? titleCase(farm.irrigation_type) : '—'}</td>
                    <td>{new Date(farm.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>Register a Farm</h2>

          {!canCreate ? (
            <p className={styles.subtitle}>
              Registering a farm requires the Admin, Producer or Warehouse Manager role. Switch accounts above to try it.
            </p>
          ) : null}

          <form className={styles.form} onSubmit={handleSubmit}>
            {formError ? <span className={styles.errorText}>{formError}</span> : null}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="farmerId">Farmer</label>
              <select
                id="farmerId"
                className={styles.select}
                value={form.farmerId}
                disabled={!canCreate}
                onChange={(e) => setForm((f) => ({ ...f, farmerId: e.target.value }))}
              >
                <option value="">Select a farmer</option>
                {farmers.map((farmer) => (
                  <option key={farmer.id} value={farmer.id}>
                    {farmer.name} ({farmer.region})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">Farm Name</label>
              <Input
                id="name"
                value={form.name}
                disabled={!canCreate}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. North Field"
              />
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="soilType">Soil Type</label>
                <select
                  id="soilType"
                  className={styles.select}
                  value={form.soilType}
                  disabled={!canCreate}
                  onChange={(e) => setForm((f) => ({ ...f, soilType: e.target.value as SoilType }))}
                >
                  {SOIL_TYPES.map((soil) => (
                    <option key={soil} value={soil}>{titleCase(soil)}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="areaAcres">Area (acres)</label>
                <Input
                  id="areaAcres"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.areaAcres}
                  disabled={!canCreate}
                  onChange={(e) => setForm((f) => ({ ...f, areaAcres: e.target.value }))}
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="irrigationType">Irrigation (optional)</label>
              <select
                id="irrigationType"
                className={styles.select}
                value={form.irrigationType}
                disabled={!canCreate}
                onChange={(e) => setForm((f) => ({ ...f, irrigationType: e.target.value as IrrigationType | '' }))}
              >
                <option value="">Not specified</option>
                {IRRIGATION_TYPES.map((irrigation) => (
                  <option key={irrigation} value={irrigation}>{titleCase(irrigation)}</option>
                ))}
              </select>
            </div>

            <div className={styles.actions}>
              <Button type="submit" leftIcon={Plus} isLoading={submitting} disabled={!canCreate}>
                Register Farm
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
