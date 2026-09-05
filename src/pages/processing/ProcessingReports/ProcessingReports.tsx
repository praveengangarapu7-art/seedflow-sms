import { useState } from 'react';
import { BarChart3, TrendingUp, Cpu, ShieldCheck, Sparkles, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { useToast } from '@/components/common/Toast/ToastContext';
import { processingNav } from '@/config/processingNav';
import styles from './ProcessingReports.module.css';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { type PeriodValue } from '@/utils/periodFilter';

// Chart Mock Data
const EFFICIENCY_DATA = [
  { crop: 'Cotton', raw: 120, recovery: 98.8, rate: 82.4 },
  { crop: 'Paddy', raw: 250, recovery: 206.5, rate: 82.6 },
  { crop: 'Wheat', raw: 180, recovery: 149.2, rate: 82.8 },
  { crop: 'Maize', raw: 90, recovery: 73.6, rate: 81.7 },
];

const UTILIZATION_DATA = [
  { name: 'Aurangabad Plant', running: 78, maintenance: 12, idle: 10 },
  { name: 'Hyderabad Plant', running: 72, maintenance: 15, idle: 13 },
  { name: 'Indore Plant', running: 65, maintenance: 20, idle: 15 },
];

const QUALITY_DATA = [
  { month: 'Jan', germination: 88, moisture: 10.1, purity: 98.9 },
  { month: 'Feb', germination: 89, moisture: 9.8, purity: 99.1 },
  { month: 'Mar', germination: 90, moisture: 9.9, purity: 99.2 },
  { month: 'Apr', germination: 91, moisture: 10.2, purity: 99.0 },
  { month: 'May', germination: 92, moisture: 9.6, purity: 99.4 },
  { month: 'Jun', germination: 93, moisture: 9.5, purity: 99.5 },
];

const FORECAST_DATA = [
  { week: 'Wk 25', actual: 45, forecasted: 45 },
  { week: 'Wk 26', actual: 48, forecasted: 49 },
  { week: 'Wk 27', actual: null, forecasted: 54 },
  { week: 'Wk 28', actual: null, forecasted: 58 },
  { week: 'Wk 29', actual: null, forecasted: 62 },
];

export default function ProcessingReportsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'efficiency' | 'utilization' | 'quality' | 'forecasting'>('efficiency');
  const [period, setPeriod] = useState<PeriodValue>('month');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      addToast('CSV spreadsheet report downloaded successfully.', 'success');
    }, 1200);
  };

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={BarChart3} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Reports & Analytics</h1>
          <p className={styles.pageSubtitle}>
            Analyze factory throughput, machine utilization, seed quality compliance rates, and AI forecasting models
          </p>
        </div>
        <div className={styles.pageActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Download}
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Navigation tabs for Reports Section */}
      <div className={styles.tabHeader}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'efficiency' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('efficiency')}
        >
          <TrendingUp size={16} /> Efficiency & Yield
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'utilization' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('utilization')}
        >
          <Cpu size={16} /> Asset Utilization
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'quality' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('quality')}
        >
          <ShieldCheck size={16} /> Quality Trends
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'forecasting' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('forecasting')}
        >
          <Sparkles size={16} /> AI Forecasts
        </button>
      </div>

      {/* Main KPI Panel for context */}
      <div className={styles.kpiGrid}>
        <KpiCard icon={TrendingUp} title="Average Recovery Rate" value="82.4%" subValue="FY26 Target: 81.5%" />
        <KpiCard icon={Cpu} title="Overall Equipment Effectiveness" value="78.2%" subValue="Up 3.4% this quarter" />
        <KpiCard icon={ShieldCheck} title="Avg Germination Rate" value="91.6%" subValue="Government Standard: 90%" />
        <KpiCard icon={Sparkles} title="AI Forecast Accuracy" value="96.8%" subValue="Based on rolling 90d tests" />
      </div>

      {/* Report panels */}
      <div className={styles.reportPanel}>
        {activeTab === 'efficiency' && (
          <div className={styles.chartSection}>
            <div className={styles.chartHeader}>
              <h3>Seed Recovery Volume & Rates by Crop Type</h3>
              <p>Compares raw intake volume against finished output seed volume in Metric Tonnes (MT)</p>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={EFFICIENCY_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4ECEF" />
                  <XAxis dataKey="crop" stroke="#94A3AB" fontSize={12} />
                  <YAxis stroke="#94A3AB" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="raw" fill="#0E5467" name="Raw Input Seed (MT)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recovery" fill="#F5AF12" name="Finished Yield (MT)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'utilization' && (
          <div className={styles.chartSection}>
            <div className={styles.chartHeader}>
              <h3>Plant Runtime & Status Utilization</h3>
              <p>Breakdown of operational hours, maintenance downtime, and idle states across processing plants</p>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={UTILIZATION_DATA} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4ECEF" />
                  <XAxis type="number" stroke="#94A3AB" fontSize={12} unit="%" />
                  <YAxis type="category" dataKey="name" stroke="#94A3AB" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="running" stackId="a" fill="#137333" name="Running %" />
                  <Bar dataKey="maintenance" stackId="a" fill="#ea4335" name="Maintenance %" />
                  <Bar dataKey="idle" stackId="a" fill="#94A3AB" name="Idle %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className={styles.chartSection}>
            <div className={styles.chartHeader}>
              <h3>Purity & Germination Rates Over Time</h3>
              <p>Compliance trends showing average germination and physical purity percentage metrics</p>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={QUALITY_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4ECEF" />
                  <XAxis dataKey="month" stroke="#94A3AB" fontSize={12} />
                  <YAxis stroke="#94A3AB" fontSize={12} domain={[80, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="germination" stroke="#0E5467" strokeWidth={3} name="Germination %" />
                  <Line type="monotone" dataKey="purity" stroke="#F5AF12" strokeWidth={3} name="Physical Purity %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'forecasting' && (
          <div className={styles.forecastContainer}>
            <div className={styles.chartSection} style={{ flexGrow: 1 }}>
              <div className={styles.chartHeader}>
                <h3>AI Throughput Prediction (Next 4 Weeks)</h3>
                <p>Machine learning projection model estimating processing volumes in Metric Tonnes</p>
              </div>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={FORECAST_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4ECEF" />
                    <XAxis dataKey="week" stroke="#94A3AB" fontSize={12} />
                    <YAxis stroke="#94A3AB" fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="actual" stroke="#0E5467" strokeWidth={3} name="Actual (MT)" />
                    <Line type="monotone" dataKey="forecasted" stroke="#F5AF12" strokeDasharray="5 5" strokeWidth={3} name="Projected (MT)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.forecastInfoPanel}>
              <div className={styles.aiHeader}>
                <Sparkles size={20} className={styles.sparkleIcon} />
                <h4>AI Insights & Scheduling Tweaks</h4>
              </div>
              <ul className={styles.insightList}>
                <li>
                  <strong>Volume Spike Expected:</strong> Paddy harvest intake at Hyderabad is expected to peak in Week 28. Recommend moving Dryer-04 schedule from Indore to Hyderabad by Week 27.
                </li>
                <li>
                  <strong>Optimal Batch Size:</strong> History shows batches of 25,000 kg yield 1.4% higher recovery than 15,000 kg batches due to machinery fill ratios.
                </li>
                <li>
                  <strong>Humidity Risk Alert:</strong> Aurangabad weather forecasts predict 85% humidity in Week 29. Recommend reducing raw intake store hold times to 12 hours max to prevent mold risk.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
