import { useState, useRef, useMemo } from 'react';
import { ShoppingCart, Download, Clock, Wallet, Users, Percent } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { procurementNav } from '@/config/procurementNav';
import { KpiCard } from './components/KpiCard';
import { SpendByCategoryChart } from './components/SpendByCategoryChart';
import { PoStatusDonut } from './components/PoStatusDonut';
import { RecentPOsTable } from './components/RecentPOsTable';
import { PendingApprovalsList } from './components/PendingApprovalsList';
import { TopSuppliersList } from './components/TopSuppliersList';
import { AlertsList } from './components/AlertsList';
import {
  kpiData,
  spendByCategory,
  poStatusData,
  recentPOs,
  pendingApprovals,
  topSuppliers,
  activeAlerts,
} from './mockData/dashboardData';
import { usePermission } from '@/hooks/usePermission';
import { PERIOD_OPTIONS, isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import type { KpiData } from '@/types/procurement';
import styles from './ProcurementDashboard.module.css';

// Period-aware variants of the top KPI strip. 'month' matches the dashboard's
// original always-on figures; the rest are plausible period-scaled variants.
const KPI_DATA_BY_PERIOD: Record<PeriodValue, KpiData[]> = {
  today: [
    { label: 'Procurement cycle time', value: '11 days', icon: Clock, trend: { direction: 'down', percentage: '8.3%', isPositive: true }, comparison: 'vs 12 days yesterday' },
    { label: 'Cost savings today',     value: '₹0.4 L',  icon: Wallet, trend: { direction: 'up', percentage: '12.1%', isPositive: true }, comparison: 'vs ₹0.35 L yesterday' },
    { label: 'Active suppliers',       value: '47',      icon: Users, trend: { direction: 'up', percentage: '0%', isPositive: true }, comparison: 'no change today' },
    { label: 'Purchase price variance', value: '2.1%',   icon: Percent, trend: { direction: 'down', percentage: '0.3%', isPositive: true }, comparison: 'within target range' },
  ],
  week: [
    { label: 'Procurement cycle time', value: '11.5 days', icon: Clock, trend: { direction: 'down', percentage: '10.2%', isPositive: true }, comparison: 'vs 12.8 days last week' },
    { label: 'Cost savings this week', value: '₹0.9 L',    icon: Wallet, trend: { direction: 'up', percentage: '15.8%', isPositive: true }, comparison: 'vs ₹0.8 L last week' },
    { label: 'Active suppliers',       value: '47',        icon: Users, trend: { direction: 'up', percentage: '2.2%', isPositive: true }, comparison: '1 onboarded this week' },
    { label: 'Purchase price variance', value: '2.2%',     icon: Percent, trend: { direction: 'down', percentage: '0.5%', isPositive: true }, comparison: 'within target range' },
  ],
  month: kpiData,
  quarter: [
    { label: 'Procurement cycle time', value: '12.6 days', icon: Clock, trend: { direction: 'down', percentage: '9.7%', isPositive: true }, comparison: 'vs 14 days last quarter' },
    { label: 'Cost savings this quarter', value: '₹8.6 L', icon: Wallet, trend: { direction: 'up', percentage: '18.9%', isPositive: true }, comparison: 'vs ₹7.2 L last quarter' },
    { label: 'Active suppliers',       value: '49',        icon: Users, trend: { direction: 'up', percentage: '6.5%', isPositive: true }, comparison: '5 onboarded this quarter' },
    { label: 'Purchase price variance', value: '2.6%',     icon: Percent, trend: { direction: 'down', percentage: '0.6%', isPositive: true }, comparison: 'within target range' },
  ],
  year: [
    { label: 'Procurement cycle time', value: '13.1 days', icon: Clock, trend: { direction: 'down', percentage: '7.4%', isPositive: true }, comparison: 'vs 14.2 days last year' },
    { label: 'Cost savings this year', value: '₹31.4 L',   icon: Wallet, trend: { direction: 'up', percentage: '24.6%', isPositive: true }, comparison: 'vs ₹25.2 L last year' },
    { label: 'Active suppliers',       value: '52',        icon: Users, trend: { direction: 'up', percentage: '13.0%', isPositive: true }, comparison: '12 onboarded this year' },
    { label: 'Purchase price variance', value: '2.9%',     icon: Percent, trend: { direction: 'down', percentage: '0.4%', isPositive: true }, comparison: 'within target range' },
  ],
  all: [
    { label: 'Procurement cycle time', value: '13.4 days', icon: Clock, trend: { direction: 'down', percentage: '6.1%', isPositive: true }, comparison: 'vs 14.3 days prior average' },
    { label: 'Cost savings all time',  value: '₹58.2 L',   icon: Wallet, trend: { direction: 'up', percentage: '—', isPositive: true }, comparison: 'cumulative since launch' },
    { label: 'Active suppliers',       value: '52',        icon: Users, trend: { direction: 'up', percentage: '—', isPositive: true }, comparison: '52 suppliers onboarded to date' },
    { label: 'Purchase price variance', value: '3.1%',     icon: Percent, trend: { direction: 'down', percentage: '—', isPositive: true }, comparison: 'within target range' },
  ],
};

export default function ProcurementDashboard() {
  const [period, setPeriod] = useState<PeriodValue>('month');
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const displayedKpis = KPI_DATA_BY_PERIOD[period];
  const displayedRecentPOs = useMemo(
    () => recentPOs.filter((po) => isDateInPeriod(po.date, period)),
    [period]
  );

  const canApprove = usePermission('approve_order') || usePermission('approve_requisition') || usePermission('approve_invoice_payment');
  const isManagement = false;

  const handleExport = async () => {
    if (!dashboardRef.current) return;

    setIsExporting(true);
    try {
      const element = dashboardRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (el) => {
          return el.getAttribute('data-export-ignore') === 'true';
        }
      });

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`SeedFlow_Procurement_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <div ref={dashboardRef} className={styles.dashboardContainer}>
        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Procurement dashboard</h1>
            <p className={styles.pageSubtitle}>
              Welcome back, here's what's happening with procurement today
            </p>
          </div>
          <div className={styles.headerActions} data-export-ignore="true">
            <select
              className={styles.dateSelect}
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodValue)}
              aria-label="Period filter"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button 
              variant="secondary" 
              size="sm" 
              leftIcon={Download}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>

      <div className={styles.divider} />

      {/* KPI cards */}
      <div className={`${styles.section} ${styles.kpiGrid}`}>
        {displayedKpis.map((kpi) => (
          <KpiCard key={kpi.label} data={kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className={`${styles.section} ${styles.chartsGrid}`}>
        <SpendByCategoryChart data={spendByCategory} />
        <PoStatusDonut data={poStatusData} />
      </div>

      {/* Tables */}
      <div className={`${styles.section} ${styles.tablesGrid}`}>
        <RecentPOsTable data={displayedRecentPOs} />
        {isManagement ? (
          <div className={styles.executivePanel}>
            <h3 className={styles.executiveTitle}>Executive Summary</h3>
            <p className={styles.executiveText}>
              Platform spend is fully optimized within the approved Q2 budget limits. All Purchase Orders above ₹50L are queued and highlighted for your immediate high-value executive approval review.
            </p>
          </div>
        ) : (
          (canApprove || usePermission('approve_requisition')) && <PendingApprovalsList data={pendingApprovals} />
        )}
      </div>

      {/* Bottom row */}
      <div className={`${styles.section} ${styles.bottomGrid}`}>
        <TopSuppliersList data={topSuppliers} />
        {!isManagement && <AlertsList data={activeAlerts} />}
      </div>
      </div>
    </ModuleLayout>
  );
}
