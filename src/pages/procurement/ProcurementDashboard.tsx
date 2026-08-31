import { useState, useRef } from 'react';
import { ShoppingCart, Download } from 'lucide-react';
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
import styles from './ProcurementDashboard.module.css';

const DATE_RANGES = [
  'Today',
  'Last 7 days',
  'Last 30 days',
  'Last quarter',
  'Last year',
  'Custom range',
];

export default function ProcurementDashboard() {
  const [dateRange, setDateRange] = useState('Last 30 days');
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

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
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              aria-label="Date range filter"
            >
              {DATE_RANGES.map((r) => (
                <option key={r} value={r}>{r}</option>
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
        {kpiData.map((kpi) => (
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
        <RecentPOsTable data={recentPOs} />
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
