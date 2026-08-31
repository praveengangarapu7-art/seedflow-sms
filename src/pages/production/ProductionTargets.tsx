import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Target } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import {
  CROP_PLAN_STATUSES,
  DEMO_ACCOUNTS,
  fetchCropPlans,
  fetchFarmers,
  login,
  type CropPlanStatus,
  type CropPlanWithContext,
  type FarmerRow,
} from '@/services/seedLotRealtimeClient';
import styles from './production.module.css';

function statusBadgeClass(status: CropPlanStatus): string {
  const key = `status${status.charAt(0).toUpperCase()}${status.slice(1)}` as keyof typeof styles;
  return (styles as Record<string, string>)[key] ?? styles.statusPending;
}

export default function ProductionTargets() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);

  const [plans, setPlans] = useState<CropPlanWithContext[]>([]);
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [farmerFilter, setFarmerFilter] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async (accessToken: string, status: string, farmerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCropPlans(accessToken, {
        status: status || undefined,
        farmerId: farmerId || undefined,
      });
      setPlans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load crop plans');
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
        const farmerList = await fetchFarmers(accessToken);
        if (cancelled) return;
        setFarmers(farmerList);
        await loadPlans(accessToken, statusFilter, farmerFilter);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the crop planning service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  useEffect(() => {
    if (token) void loadPlans(token, statusFilter, farmerFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, farmerFilter]);

  const totalTargetArea = useMemo(
    () => plans.reduce((sum, plan) => sum + Number(plan.target_area_acres || 0), 0),
    [plans],
  );
  const totalSeedQuantity = useMemo(
    () => plans.reduce((sum, plan) => sum + Number(plan.calculated_seed_quantity || 0), 0),
    [plans],
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Production Targets</h1>
          <p className={styles.subtitle}>
            A read-only view of real crop plans — target area, calculated seed requirement and the live reservation
            status backed by inventory allocation.
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
          <Button variant="secondary" leftIcon={RefreshCw} isLoading={loading} onClick={() => token && void loadPlans(token, statusFilter, farmerFilter)}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <div className={styles.card} style={{ marginBottom: '1rem' }}><span className={styles.errorText}>{error}</span></div> : null}

      <div className={styles.card}>
        <div className={styles.filterRow}>
          <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {CROP_PLAN_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select className={styles.select} value={farmerFilter} onChange={(e) => setFarmerFilter(e.target.value)}>
            <option value="">All farmers</option>
            {farmers.map((farmer) => (
              <option key={farmer.id} value={farmer.id}>{farmer.name}</option>
            ))}
          </select>
          <span className={styles.subtitle} style={{ marginLeft: 'auto' }}>
            <Target size={14} style={{ verticalAlign: '-2px', marginRight: '0.3rem' }} />
            {plans.length} plan{plans.length === 1 ? '' : 's'} · {totalTargetArea.toLocaleString()} acres targeted ·{' '}
            {totalSeedQuantity.toLocaleString()} kg seed required
          </span>
        </div>

        {plans.length === 0 && !loading ? (
          <div className={styles.emptyState}>
            No crop plans recorded yet. Crop plans are created from the Crop Planning wizard once a farm reserves seed
            against real inventory — this view will populate as those bookings are made.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Farmer</th>
                <th>Farm</th>
                <th>Crop / Variety</th>
                <th>Target Area</th>
                <th>Seed Required</th>
                <th>Sowing Date</th>
                <th>Seed Lot</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.farmer_name}</td>
                  <td>{plan.farm_name}</td>
                  <td>{plan.crop} — {plan.variety_name}</td>
                  <td>{Number(plan.target_area_acres).toLocaleString()} acres</td>
                  <td>{Number(plan.calculated_seed_quantity ?? 0).toLocaleString()} {plan.seed_unit}</td>
                  <td>{plan.sowing_date ? new Date(plan.sowing_date).toLocaleDateString() : '—'}</td>
                  <td>{plan.lot_code ?? '—'}</td>
                  <td><span className={`${styles.statusBadge} ${statusBadgeClass(plan.status)}`}>{plan.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
