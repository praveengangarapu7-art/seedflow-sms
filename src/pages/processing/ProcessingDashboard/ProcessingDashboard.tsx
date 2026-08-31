import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Download, Sparkles, TrendingUp, Clock, ShieldCheck, Activity, Plus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { processingNav } from '@/config/processingNav';
import { useToast } from '@/components/common/Toast/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import styles from './ProcessingDashboard.module.css';

const trendData = [
  { day: '01 Jun', volume: 4.2, recovery: 81.5 },
  { day: '02 Jun', volume: 5.1, recovery: 82.0 },
  { day: '03 Jun', volume: 4.8, recovery: 82.1 },
  { day: '04 Jun', volume: 6.2, recovery: 82.5 },
  { day: '05 Jun', volume: 5.5, recovery: 82.3 },
  { day: '06 Jun', volume: 4.9, recovery: 81.8 },
  { day: '07 Jun', volume: 3.8, recovery: 81.2 },
  { day: '08 Jun', volume: 7.2, recovery: 83.1 },
  { day: '09 Jun', volume: 6.8, recovery: 83.5 },
  { day: '10 Jun', volume: 8.5, recovery: 84.1 },
  { day: '11 Jun', volume: 7.9, recovery: 83.9 },
  { day: '12 Jun', volume: 9.1, recovery: 84.2 },
  { day: '13 Jun', volume: 8.2, recovery: 83.8 },
  { day: '14 Jun', volume: 5.5, recovery: 83.0 },
];

export default function ProcessingDashboard() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);

  const canCreateIntake = usePermission('create_raw_intake');
  const canCreateBatch = usePermission('create_processing_batch');
  const canInspect = usePermission('in_process_quality_check');
  const canScheduleCalibration = usePermission('schedule_maintenance');

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      addToast('PDF report generated successfully.', 'success');
    }, 1500);
  };

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={Factory} navItems={processingNav}>
      <div className={styles.dashboardContainer}>
        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Processing dashboard</h1>
            <p className={styles.pageSubtitle}>
              Real-time view of plants, batches, recovery, and quality across all processing operations
            </p>
          </div>
          <div className={styles.headerActions}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Download}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Quick Actions Gated Row */}
        {(canCreateIntake || canCreateBatch || canInspect) && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Quick Actions:</span>
            {canCreateIntake && (
              <Button size="sm" variant="secondary" leftIcon={Plus} onClick={() => navigate('/processing/intake')}>
                New intake
              </Button>
            )}
            {canCreateBatch && (
              <Button size="sm" variant="secondary" leftIcon={Plus} onClick={() => navigate('/processing/batches')}>
                Start batch
              </Button>
            )}
            {canInspect && (
              <Button size="sm" variant="secondary" leftIcon={ShieldCheck} onClick={() => navigate('/processing/batches')}>
                My inspection queue
              </Button>
            )}
          </div>
        )}

        {/* KPI Grid */}
        <div className={styles.kpiGrid}>
          <KpiCard
            icon={Factory}
            title="Active Batches"
            value="24"
            subValue="Across 3 plants"
            trend="neutral"
            change="8 pending QC"
          />
          <KpiCard
            icon={TrendingUp}
            title="Processing Recovery"
            value="82.4%"
            subValue="FY26 average"
            trend="up"
            change="+1.8% vs last month"
          />
          <KpiCard
            icon={Clock}
            title="Batch Turnaround"
            value="2.6 days"
            subValue="Raw intake to finished lot"
            trend="down"
            change="-1.1 days vs Q1"
          />
          <KpiCard
            icon={ShieldCheck}
            title="Rejection Rate"
            value="4.2%"
            subValue="30-day rolling"
            trend="down"
            change="-2.8% vs last quarter"
          />
        </div>

        {/* AI Insight Card */}
        <div className={styles.aiInsightCard}>
          <div className={styles.aiIconWrap}>
            <Sparkles size={24} />
          </div>
          <div className={styles.aiContent}>
            <h4 className={styles.aiTitle}>
              AI Production Recommendation
            </h4>
            <p className={styles.aiBody}>
              Aurangabad Plant cotton recovery rate has been declining 0.4% per week over the past 4 weeks. Top contributing factor: Cleaner-03 air-flow rate drift. Recommended action: Schedule Cleaner-03 calibration before Lot LOT-COT-2026-0149 starts on Friday. Estimated impact: restore 1.2% recovery, save ₹2.4 L annually.
            </p>
            {canScheduleCalibration && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={Activity}
                onClick={() => addToast('Cleaner-03 calibration request sent to maintenance team.', 'success')}
              >
                Schedule Calibration
              </Button>
            )}
          </div>
        </div>

        {/* Two Columns Section */}
        <div className={styles.layoutGrid}>
          {/* Active Production Lines */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Active Production Lines</h3>
            <div className={styles.linesStack}>
              {/* Aurangabad */}
              <div className={styles.plantLineCard}>
                <div className={styles.plantLineHeader}>
                  <div className={styles.plantNameGroup}>
                    <h4 className={styles.plantName}>Aurangabad Plant</h4>
                    <span className={`${styles.activeBadge}`} style={{ background: '#e6f4ea', color: '#137333' }}>
                      Operational
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>82% Utilization</span>
                </div>
                <div className={styles.plantStatusRow}>
                  <span>9 Active Batches</span>
                  <span>Location: Maharashtra</span>
                </div>
                <div className={styles.batchProgressList}>
                  <div className={styles.batchProgressItem}>
                    <div className={styles.batchMeta}>
                      <span className={styles.batchName}>BT-2026-1142 (Cotton — Bt RCH-2)</span>
                      <span className={styles.batchStage}>Cleaning (45%)</span>
                    </div>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar} style={{ width: '45%' }} />
                    </div>
                  </div>
                  <div className={styles.batchProgressItem}>
                    <div className={styles.batchMeta}>
                      <span className={styles.batchName}>BT-2026-1141 (Cotton — Bt RCH-2)</span>
                      <span className={styles.batchStage}>Treatment (75%)</span>
                    </div>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar} style={{ width: '75%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hyderabad */}
              <div className={styles.plantLineCard}>
                <div className={styles.plantLineHeader}>
                  <div className={styles.plantNameGroup}>
                    <h4 className={styles.plantName}>Hyderabad Plant</h4>
                    <span className={`${styles.activeBadge}`} style={{ background: '#e6f4ea', color: '#137333' }}>
                      Operational
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>76% Utilization</span>
                </div>
                <div className={styles.plantStatusRow}>
                  <span>8 Active Batches</span>
                  <span>Location: Telangana</span>
                </div>
                <div className={styles.batchProgressList}>
                  <div className={styles.batchProgressItem}>
                    <div className={styles.batchMeta}>
                      <span className={styles.batchName}>BT-2026-1140 (Paddy — Pusa Basmati 1121)</span>
                      <span className={styles.batchStage}>Packaging (90%)</span>
                    </div>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar} style={{ width: '90%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Quality Alerts */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Today's Quality Alerts</h3>
            <div className={styles.alertsStack}>
              <div className={`${styles.alertItem} ${styles.alertWarning}`}>
                <div className={styles.alertText}>
                  <strong>Batch BT-2026-1142:</strong> moisture 11.2% — above 10% target. Drying time extended.
                  <span className={styles.alertTime}>10 mins ago</span>
                </div>
              </div>
              <div className={`${styles.alertItem} ${styles.alertSuccess}`}>
                <div className={styles.alertText}>
                  <strong>Batch BT-2026-1138:</strong> in-process quality check passed. Cleared for treatment.
                  <span className={styles.alertTime}>1 hr ago</span>
                </div>
              </div>
              <div className={`${styles.alertItem} ${styles.alertInfo}`}>
                <div className={styles.alertText}>
                  <strong>Dryer-02 Status:</strong> efficiency at 91% — below 95% target. Maintenance recommended.
                  <span className={styles.alertTime}>3 hrs ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Production Trend Chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Daily Production Trend — Last 30 Days</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0E5467" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0E5467" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRecovery" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5AF12" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F5AF12" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4ECEF" />
                <XAxis dataKey="day" stroke="#94A3AB" fontSize={12} />
                <YAxis stroke="#94A3AB" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="volume" stroke="#0E5467" fillOpacity={1} fill="url(#colorVolume)" name="Volume (tonnes)" />
                <Area type="monotone" dataKey="recovery" stroke="#F5AF12" fillOpacity={0.2} fill="url(#colorRecovery)" name="Recovery %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
