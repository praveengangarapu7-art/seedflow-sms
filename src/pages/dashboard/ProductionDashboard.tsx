import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, Clock, Map, RefreshCw, Sprout, Target, Users, XCircle } from 'lucide-react';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { ModuleAiStrip } from '@/components/ai/ModuleAiStrip/ModuleAiStrip';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import { analyticsApi, type ProductionDashboardData } from '@/services/api';
import { CROP_COLORS, FALLBACK_CROP_COLOR, STATUS_META, fallbackProductionDashboard } from './productionDashboardData';
import styles from './ProductionDashboard.module.css';

const STATUS_ICONS = {
  clock: Clock,
  sprout: Sprout,
  check: CheckCircle2,
  x: XCircle,
} as const;

export default function ProductionDashboard() {
  const [data, setData] = useState<ProductionDashboardData>(fallbackProductionDashboard);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyticsApi.getProductionPlanningDashboard();
      setData(result ?? fallbackProductionDashboard);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load production dashboard';
      setError(message);
      setData(fallbackProductionDashboard);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const totalStatusCount = useMemo(
    () => data.statusBreakdown.reduce((sum, item) => sum + item.count, 0),
    [data.statusBreakdown],
  );

  const totalCropCount = useMemo(
    () => data.cropDistribution.reduce((sum, item) => sum + item.count, 0),
    [data.cropDistribution],
  );

  return (
    <div className={styles.page}>
      <ModuleAiStrip moduleKey="production" />
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Production Planning Dashboard</h1>
          <p className={styles.subtitle}>An executive view of farmer registrations, farm allocation, and crop plan progress.</p>
        </div>
        <Button variant="secondary" leftIcon={RefreshCw} isLoading={loading} onClick={() => void loadDashboard()}>
          Refresh
        </Button>
      </div>

      {error ? <div className={styles.errorText}>{error}</div> : null}

      <div className={styles.kpiGrid}>
        <KpiCard icon={Users} title="Total Farmers Registered" value={data.totalFarmers.toLocaleString()} />
        <KpiCard icon={Sprout} title="Active Farms" value={data.activeFarms.toLocaleString()} />
        <KpiCard icon={Map} title="Total Planned Area" value={`${data.totalPlannedArea.toLocaleString()} acres`} />
        <KpiCard icon={Target} title="Total Harvest Target" value={`${data.totalHarvestTarget.toLocaleString()} kg`} />
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Crop Plans by Status</h2>
        <p className={styles.sectionSubtitle}>{totalStatusCount} crop plan{totalStatusCount === 1 ? '' : 's'} tracked overall.</p>

        {data.statusBreakdown.length === 0 ? (
          <div className={styles.emptyState}>No crop plans recorded yet.</div>
        ) : (
          <>
            <div className={styles.statusRow}>
              {data.statusBreakdown.map((item) => (
                <div
                  key={item.status}
                  className={styles.statusSegment}
                  style={{
                    width: `${(item.count / totalStatusCount) * 100}%`,
                    background: STATUS_META[item.status]?.color ?? FALLBACK_CROP_COLOR,
                  }}
                  title={`${item.status}: ${item.count}`}
                />
              ))}
            </div>
            <div className={styles.statusLegend}>
              {data.statusBreakdown.map((item) => {
                const meta = STATUS_META[item.status];
                const Icon = STATUS_ICONS[meta?.icon ?? 'clock'];
                return (
                  <div key={item.status} className={styles.statusChip}>
                    <span className={styles.statusIconWrap} style={{ background: meta?.color ?? FALLBACK_CROP_COLOR }}>
                      <Icon size={15} />
                    </span>
                    <span className={styles.statusText}>
                      <span className={styles.statusLabel}>{item.status}</span>
                      <span className={styles.statusCount}>
                        {item.count} plan{item.count === 1 ? '' : 's'} · {Math.round((item.count / totalStatusCount) * 100)}%
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Monthly Production Timeline</h2>
          <p className={styles.chartSubtitle}>Target vs. actual harvested yield by month (kg).</p>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.monthlyProgress} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4ECEF" />
              <XAxis dataKey="month" stroke="#94A3AB" fontSize={12} />
              <YAxis stroke="#94A3AB" fontSize={12} tickFormatter={(value: number) => `${value / 1000}k`} />
              <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} kg`} />
              <Legend verticalAlign="top" height={32} />
              <Line
                type="monotone"
                dataKey="target"
                name="Target"
                stroke="#94A3AB"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#0E5467"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Crop Distribution</h2>
          <p className={styles.chartSubtitle}>Share of crop plans by crop type.</p>
          {data.cropDistribution.length === 0 ? (
            <div className={styles.emptyState}>No crop plans recorded yet.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.cropDistribution}
                    dataKey="count"
                    nameKey="crop"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {data.cropDistribution.map((entry) => (
                      <Cell key={entry.crop} fill={CROP_COLORS[entry.crop] ?? FALLBACK_CROP_COLOR} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value} of ${totalCropCount} plans`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.legendRow}>
                {data.cropDistribution.map((entry) => (
                  <span key={entry.crop} className={styles.legendItem}>
                    <span className={styles.legendSwatch} style={{ background: CROP_COLORS[entry.crop] ?? FALLBACK_CROP_COLOR }} />
                    {entry.crop} — {entry.count} ({Math.round((entry.count / totalCropCount) * 100)}%)
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
