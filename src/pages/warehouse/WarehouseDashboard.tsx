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
import styles from './WarehouseDashboard.module.css';

const DATE_RANGES = ['Today', 'Last 7 days', 'Last 30 days', 'Last quarter', 'Last year', 'Custom range'];
const periodMultipliers: Record<string, number> = { 'Today': 0.05, 'Last 7 days': 0.3, 'Last 30 days': 1, 'Last quarter': 3.2, 'Last year': 12.8, 'Custom range': 1 };

const ICON_MAP: Record<DashboardKpiIcon, LucideIcon> = {
  Target,
  PackageCheck,
  Warehouse,
  Boxes,
};

export default function WarehouseDashboard() {
  const [dateRange, setDateRange] = useState('Last 30 days');
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

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsLoading(true);
    setDateRange(e.target.value);
    setTimeout(() => {
      setIsLoading(false);
    }, 200);
  };

  const derivedKpis = useMemo(() => {
    const multiplier = periodMultipliers[dateRange] || 1;
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
  }, [dateRange]);

  const displayedTrend = useMemo(() => {
    if (dateRange === 'Last year') return monthlyStockTrend;
    if (dateRange === 'Last quarter') return monthlyStockTrend.slice(-3);
    if (dateRange === 'Last 7 days') return monthlyStockTrend.slice(-1);
    return monthlyStockTrend.slice(-6); // default to 6 months for 30 days
  }, [dateRange]);

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
          <select
            className={styles.dateSelect}
            value={dateRange}
            onChange={handleDateRangeChange}
            aria-label="Date range filter"
          >
            {DATE_RANGES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
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
              <span className={styles.trendSubtitle}>{dateRange}</span>
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
        <RecentMovements data={recentMovements} onViewAll={() => setIsRecentMovementsModalOpen(true)} />
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
