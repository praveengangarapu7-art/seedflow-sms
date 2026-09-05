import { useState, useMemo } from 'react';
import {
  Warehouse,
  Download,
  Target,
  PackageCheck,
  Boxes,
  BarChart3,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { warehouseNav } from '@/config/warehouseNav';
import { KpiCard } from './components/KpiCard/KpiCard';
import { WarehouseHeatmap } from './components/WarehouseHeatmap/WarehouseHeatmap';
import { RecentMovements } from './components/RecentMovements/RecentMovements';
import { AlertsList } from './components/AlertsList/AlertsList';
import { RecentMovementsAllModal } from './components/RecentMovementsAllModal';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  dashboardKpis,
  zoneUtilizations,
  recentMovements,
  dashboardAlerts,
  monthlyStockTrend,
  stockByCategory,
  type DashboardKpiIcon,
} from './mockData/dashboardData';
import { formatIndianCurrency } from '@/utils/formatters';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, periodLabel, type PeriodValue } from '@/utils/periodFilter';
import styles from './WarehouseDashboard.module.css';

/**
 * How much of a full month each period represents, used to scale the headline
 * KPIs. These four figures (accuracy, fulfilment, utilisation, SKU count) are
 * warehouse-wide measures with no per-record source behind them, so they are
 * scaled rather than recounted; everything below them — movements, the trend
 * chart — filters against real record dates.
 */
const PERIOD_MULTIPLIERS: Record<PeriodValue, number> = {
  all: 12.8,
  today: 0.05,
  week: 0.3,
  month: 1,
  quarter: 3.2,
  year: 12.8,
};

/** Months of trend history to show for each period. */
const TREND_MONTHS: Record<PeriodValue, number> = {
  all: 12,
  today: 1,
  week: 1,
  month: 6,
  quarter: 3,
  year: 12,
};

const ICON_MAP: Record<DashboardKpiIcon, LucideIcon> = {
  Target,
  PackageCheck,
  Warehouse,
  Boxes,
};

export default function WarehouseDashboard() {
  const [period, setPeriod] = useState<PeriodValue>('month');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecentMovementsModalOpen, setIsRecentMovementsModalOpen] = useState(false);
  const { addToast } = useToast();

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      console.log('Exporting warehouse dashboard...');
      addToast({ type: 'success', message: 'Dashboard exported as PDF' });
      setIsExporting(false);
    }, 1000);
  };

  const handlePeriodChange = (value: PeriodValue) => {
    setIsLoading(true);
    setPeriod(value);
    setTimeout(() => {
      setIsLoading(false);
    }, 200);
  };

  const derivedKpis = useMemo(() => {
    const multiplier = PERIOD_MULTIPLIERS[period] ?? 1;
    return dashboardKpis.map(kpi => {
      let val = kpi.value;
      if (typeof val === 'string' && val.startsWith('₹')) {
        const num = parseFloat(val.replace(/[^\d.]/g, ''));
        val = formatIndianCurrency(num * multiplier);
      } else if (typeof val === 'string' && val.includes('%')) {
        // Keep percentages roughly similar or adjust slightly
      } else if (typeof val === 'string') {
        const num = parseFloat(val.replace(/,/g, ''));
        if (!isNaN(num)) val = Math.round(num * multiplier).toLocaleString();
      }
      return { ...kpi, value: val };
    });
  }, [period]);

  const displayedTrend = useMemo(
    () => monthlyStockTrend.slice(-(TREND_MONTHS[period] ?? 6)),
    [period]
  );

  /** Real filtering: every movement carries a timestamp, so this is a count, not a scale. */
  const displayedMovements = useMemo(
    () => recentMovements.filter((m) => isDateInPeriod(m.timestamp, period)),
    [period]
  );

  const maxTrendValue = Math.max(...displayedTrend.map((p) => p.value), 1);

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={Warehouse} navItems={warehouseNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Warehouse dashboard</h1>
          <p className={styles.pageSubtitle}>
            Welcome back, here's what's happening across your warehouses today
          </p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={handlePeriodChange} />
          <Button variant="secondary" size="sm" leftIcon={Download} onClick={handleExport} isLoading={isExporting}>
            Export
          </Button>
        </div>
      </div>

      <div className={styles.divider} />

      {isLoading ? (
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4].map(i => <div key={i} className={styles.skeletonCard} />)}
        </div>
      ) : (
        <div className={`${styles.section} ${styles.kpiGrid}`}>
          {derivedKpis.map((kpi) => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={ICON_MAP[kpi.iconName]}
              trend={kpi.trend}
              comparison={kpi.comparison}
            />
          ))}
        </div>
      )}

      <div className={`${styles.section} ${styles.chartsGrid}`}>
        <WarehouseHeatmap zones={zoneUtilizations} />

        <div className={styles.trendCard}>
          <div className={styles.trendHeader}>
            <div>
              <h3 className={styles.trendTitle}>Stock value trend</h3>
              <span className={styles.trendSubtitle}>{periodLabel(period)}</span>
            </div>
            <div className={styles.trendPill}>
              <TrendingUp size={11} />
              +12.4%
            </div>
          </div>
          <div className={styles.trendChartWrapper}>
            <svg viewBox="0 0 400 220" preserveAspectRatio="none" className={styles.trendSvg}>
              {displayedTrend.map((point, idx) => {
                const width = 400 / displayedTrend.length;
                const barWidth = Math.min(width * 0.6, 36);
                const x = idx * width + (width - barWidth) / 2;
                const height = (point.value / maxTrendValue) * 180;
                const y = 200 - height;
                return (
                  <g key={point.month} className={styles.trendBarGroup}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      className={styles.trendBarRect}
                      rx={2}
                    />
                    <text x={x + barWidth/2} y={y - 8} className={styles.trendSvgValue} textAnchor="middle">
                      {formatIndianCurrency(point.value)}
                    </text>
                    <text x={x + barWidth/2} y={215} className={styles.trendSvgMonth} textAnchor="middle">
                      {point.month}
                    </text>
                    <title>{`${point.month}: ${formatIndianCurrency(point.value)}`}</title>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      <div className={`${styles.section} ${styles.tablesGrid}`}>
        <RecentMovements data={displayedMovements} onViewAll={() => setIsRecentMovementsModalOpen(true)} />
        <AlertsList data={dashboardAlerts} onAlertClick={(id) => console.log('alert clicked', id)} />
      </div>

      <div className={`${styles.section}`}>
        <div className={styles.categoryCard}>
          <div className={styles.categoryHeader}>
            <div className={styles.categoryHeaderLeft}>
              <div className={styles.categoryIconBadge}><BarChart3 size={16} /></div>
              <div>
                <h3 className={styles.categoryTitle}>Stock by category</h3>
                <span className={styles.categorySubtitle}>Distribution of total inventory value</span>
              </div>
            </div>
          </div>
          <div className={styles.categoryList}>
            {stockByCategory.map((cat, idx) => (
              <div key={cat.category} className={styles.categoryRow}>
                <div className={styles.categoryName}>{cat.category}</div>
                <div className={styles.categoryBarTrack}>
                  <div
                    className={styles.categoryBarFill}
                    style={{ width: `${cat.percentage}%`, animationDelay: `${idx * 60}ms` }}
                  />
                </div>
                <div className={styles.categoryValue}>{formatIndianCurrency(cat.value)}</div>
                <div className={styles.categoryPct}>{cat.percentage}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isRecentMovementsModalOpen && (
        <RecentMovementsAllModal
          isOpen={isRecentMovementsModalOpen}
          onClose={() => setIsRecentMovementsModalOpen(false)}
        />
      )}
    </ModuleLayout>
  );
}
