import { useState } from 'react';
import { TrendingUp, TrendingDown, Award, PieChart, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as ReChartsPie, Pie, Cell } from 'recharts';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { processingNav } from '@/config/processingNav';
import { useToast } from '@/components/common/Toast/ToastContext';
import styles from './YieldAndLoss.module.css';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { type PeriodValue } from '@/utils/periodFilter';

import { readCollection } from '@/hooks/persistentCollections';
import defaultBatches from '@/data/processing/batches';
import type { ProcessingBatch } from '@/types/processing';
import { downloadCsv } from '@/utils/fileExport';
const lineData = [
  { month: 'Jul', rate: 80.5 },
  { month: 'Aug', rate: 81.2 },
  { month: 'Sep', rate: 80.8 },
  { month: 'Oct', rate: 82.0 },
  { month: 'Nov', rate: 82.5 },
  { month: 'Dec', rate: 82.1 },
  { month: 'Jan', rate: 81.9 },
  { month: 'Feb', rate: 82.4 },
  { month: 'Mar', rate: 83.1 },
  { month: 'Apr', rate: 82.8 },
  { month: 'May', rate: 82.6 },
  { month: 'Jun', rate: 83.2 },
];

const lossDonutData = [
  { name: 'Dust & Trash', value: 35, color: '#0E5467' },
  { name: 'Moisture Loss', value: 20, color: '#2D7A8F' },
  { name: 'Broken Seeds', value: 25, color: '#F5AF12' },
  { name: 'Off-spec Graded', value: 15, color: '#C0392B' },
  { name: 'Treat Wastage', value: 5, color: '#94A3AB' },
];

export default function YieldAndLossPage() {
  const { addToast } = useToast();
  const [period, setPeriod] = useState<PeriodValue>('all');

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={TrendingUp} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Yield & Loss Management</h1>
          <p className={styles.pageSubtitle}>
            Input vs output tracking, loss categorization, and recovery benchmarking
          </p>
        </div>
        <div className={styles.pageActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          <Button variant="secondary" leftIcon={Download} onClick={() => { const rows = readCollection<ProcessingBatch>('processing.batches', defaultBatches).map((b) => { const loss = Object.values(b.losses).reduce((s, x) => s + x, 0); return { batch: b.id, crop: b.crop, variety: b.variety, plant: b.plant, stage: b.currentStage, status: b.status, inputKg: b.inputQuantity, outputKg: b.outputQuantity ?? '', ...b.losses, totalLossKg: loss, recoveryPct: b.inputQuantity ? Math.round(((b.outputQuantity ?? b.inputQuantity - loss) / b.inputQuantity) * 1000) / 10 : '' }; }); downloadCsv(`yield_and_loss_${new Date().toISOString().slice(0, 10)}.csv`, rows); addToast(`Yield report exported (${rows.length} batches)`, 'success'); }}>
            Export Report
          </Button>
        </div>
      </div>

      <div className={styles.divider} />

      {/* KPI Grid */}
      <div className={styles.kpiGrid}>
        <KpiCard
          icon={TrendingUp}
          title="FY26 Recovery Rate"
          value="82.4%"
          subValue="FY26 average"
          trend="up"
          change="+1.8% vs FY25"
        />
        <KpiCard
          icon={TrendingDown}
          title="Total Losses (Month)"
          value="8.2 tonnes"
          subValue="₹4.1 L estimated value"
        />
        <KpiCard
          icon={Award}
          title="Best Performing Crop"
          value="Wheat 87.3%"
          subValue="HD-3086 lots"
        />
        <KpiCard
          icon={PieChart}
          title="Lowest Performing Crop"
          value="Paddy 74.1%"
          subValue="Below 80% target limit"
          trend="down"
          change="Needs review"
        />
      </div>

      {/* Main Content Area */}
      <div className={styles.contentArea}>
        {/* Sankey layout */}
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', margin: '0 0 16px' }}>
          Batch Sourcing Flow & Stage Losses
        </h3>
        
        <div className={styles.sankeyLayout}>
          <div className={styles.sankeyBarGroup}>
            <div className={styles.sankeyLabelRow}>
              <span>Raw Input (480 tonnes)</span>
              <span>100%</span>
            </div>
            <div className={styles.sankeyProgress}>
              <div className={styles.sankeyFill} style={{ width: '100%' }} />
            </div>
          </div>

          <div className={styles.sankeyBarGroup}>
            <div className={styles.sankeyLabelRow}>
              <span>Cleaning Losses (Dust/Trash)</span>
              <span>4.2%</span>
            </div>
            <div className={styles.sankeyProgress}>
              <div className={styles.sankeyLoss} style={{ width: '4.2%' }} />
            </div>
          </div>

          <div className={styles.sankeyBarGroup}>
            <div className={styles.sankeyLabelRow}>
              <span>Drying Losses (Moisture reduction)</span>
              <span>2.1%</span>
            </div>
            <div className={styles.sankeyProgress}>
              <div className={styles.sankeyLoss} style={{ width: '2.1%' }} />
            </div>
          </div>

          <div className={styles.sankeyBarGroup}>
            <div className={styles.sankeyLabelRow}>
              <span>Grading Losses (Small/broken seeds rejected)</span>
              <span>7.8%</span>
            </div>
            <div className={styles.sankeyProgress}>
              <div className={styles.sankeyLoss} style={{ width: '7.8%' }} />
            </div>
          </div>

          <div className={styles.sankeyBarGroup}>
            <div className={styles.sankeyLabelRow}>
              <span>Finished Output (Market tags issued)</span>
              <span>82.4%</span>
            </div>
            <div className={styles.sankeyProgress}>
              <div className={styles.sankeyFill} style={{ width: '82.4%', backgroundColor: '#2E8B5C' }} />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <h4 className={styles.chartTitle}>Monthly Recovery Rate Trend (%)</h4>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4ECEF" />
                  <XAxis dataKey="month" stroke="#94A3AB" fontSize={11} />
                  <YAxis stroke="#94A3AB" fontSize={11} domain={[78, 85]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="#0E5467" strokeWidth={2} activeDot={{ r: 6 }} name="Recovery %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.chartCard}>
            <h4 className={styles.chartTitle}>Loss Distribution by Category (%)</h4>
            <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '50%', height: '100%' }}>
                <ResponsiveContainer>
                  <ReChartsPie>
                    <Pie data={lossDonutData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value">
                      {lossDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </ReChartsPie>
                </ResponsiveContainer>
              </div>
              <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                {lossDonutData.map(entry => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', background: entry.color, borderRadius: '50%' }} />
                    <span style={{ color: 'var(--color-text-secondary)' }}>{entry.name}: {entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recovery by Crop table */}
        <div style={{ marginTop: '24px' }}>
          <h4 className={styles.chartTitle}>Recovery Metrics by Crop & Variety</h4>
          <table className={styles.summaryTable}>
            <thead>
              <tr>
                <th className={styles.th}>Crop</th>
                <th className={styles.th}>Variety</th>
                <th className={styles.th}>Input Vol (tonnes)</th>
                <th className={styles.th}>Output Vol (tonnes)</th>
                <th className={styles.th}>Recovery %</th>
                <th className={styles.th}>Target %</th>
                <th className={styles.th}>Variance</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.tr}>
                <td className={styles.td}>Cotton</td>
                <td className={styles.td}>Bt RCH-2 BG-II</td>
                <td className={styles.td}>142.5</td>
                <td className={styles.td}>119.8</td>
                <td className={styles.td} style={{ fontWeight: '600' }}>84.1%</td>
                <td className={styles.td}>82.0%</td>
                <td className={styles.td} style={{ color: '#137333', fontWeight: '500' }}>+2.1%</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>Paddy</td>
                <td className={styles.td}>Pusa Basmati 1121</td>
                <td className={styles.td}>120.8</td>
                <td className={styles.td}>94.5</td>
                <td className={styles.td} style={{ fontWeight: '600' }}>78.2%</td>
                <td className={styles.td}>80.0%</td>
                <td className={styles.td} style={{ color: '#c5221f', fontWeight: '500' }}>-1.8%</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>Wheat</td>
                <td className={styles.td}>HD-3086</td>
                <td className={styles.td}>180.0</td>
                <td className={styles.td}>157.1</td>
                <td className={styles.td} style={{ fontWeight: '600' }}>87.3%</td>
                <td className={styles.td}>85.0%</td>
                <td className={styles.td} style={{ color: '#137333', fontWeight: '500' }}>+2.3%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ModuleLayout>
  );
}
