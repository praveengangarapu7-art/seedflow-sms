import React from 'react';
import { 
  Download, 
  Calendar, 
  Share2, 
  Clock, 
  Bookmark,
  Construction,
  ArrowUpRight
} from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Badge } from '@/components/common/Badge/Badge';
import { ScoreRing } from '@/components/common/ScoreRing/ScoreRing';
import { useToast } from '@/components/common/Toast/ToastContext';
import { InsightsPanel } from '../InsightsPanel/InsightsPanel';
import { ReportDefinition } from '@/types/warehouse';
import { formatRupees } from '@/utils/formatters';
import styles from './ReportDetailModal.module.css';

// Mock data from other modules (assuming they exist or using hardcoded for demo)
import { inventoryItems } from '../../mockData/inventoryData';
import { cycleCounts } from '../../mockData/cycleCountData';

interface ReportDetailModalProps {
  report: ReportDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleSave: (id: string) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  isOpen,
  onClose,
  onToggleSave
}) => {
  const { addToast } = useToast();
  if (!report) return null;

  const renderPlaceholder = () => (
    <div className={styles.placeholderBody}>
      <div className={styles.placeholderContent}>
        <div className={styles.constructionIcon}>
          <Construction size={64} />
        </div>
        <h3 className={styles.placeholderTitle}>Detailed view coming soon</h3>
        <p className={styles.placeholderDesc}>
          This report's preview shows aggregate metrics. The full detail view with drill-down tables, charts, and insights is currently in development.
        </p>
        <div className={styles.placeholderActions}>
          <Button variant="secondary" leftIcon={Download} onClick={() => { console.log('Export raw data', report.id); addToast({ type: 'success', message: `Raw data export started for ${report.title}` }); }}>
            Export raw data
          </Button>
        </div>
      </div>
      
      <div className={styles.summaryCard}>
        <h4 className={styles.summaryTitle}>Report Summary</h4>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Category</span>
            <span className={styles.summaryValue}>{report.category}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Metric</span>
            <span className={styles.summaryValue}>{report.miniPreviewValue || 'Visual trend'}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Last generated</span>
            <span className={styles.summaryValue}>2h ago</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInventoryValuation = () => (
    <div className={styles.fullDetailBody}>
      <div className={styles.filterStrip}>
        <div className={styles.filterItem}>
          <label>As-of date</label>
          <div className={styles.filterValue}><Calendar size={14} /> Today</div>
        </div>
        <div className={styles.filterItem}>
          <label>Warehouse</label>
          <div className={styles.filterValue}>All warehouses</div>
        </div>
        <div className={styles.filterItem}>
          <label>Valuation method</label>
          <div className={styles.radioGroup}>
            <label><input type="radio" name="valMethod" defaultChecked /> FIFO</label>
            <label><input type="radio" name="valMethod" /> LIFO</label>
            <label><input type="radio" name="valMethod" /> WA</label>
          </div>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiBox}>
          <span className={styles.kpiLabel}>Total inventory value</span>
          <span className={styles.kpiBigValue}>₹2.85 Cr</span>
          <div className={styles.kpiTrend}>
            <ArrowUpRight size={14} /> +4.2% vs last month
          </div>
        </div>
        <div className={styles.kpiBox}>
          <span className={styles.kpiLabel}>Total SKUs</span>
          <span className={styles.kpiBigValue}>1,243</span>
        </div>
        <div className={styles.kpiBox}>
          <span className={styles.kpiLabel}>Total bags equivalent</span>
          <span className={styles.kpiBigValue}>48,562</span>
        </div>
        <div className={styles.kpiBox}>
          <span className={styles.kpiLabel}>Highest-value zone</span>
          <span className={styles.kpiBigValue}>Cold Zone A</span>
          <span className={styles.kpiSubValue}>₹98 L (34%)</span>
        </div>
      </div>

      <div className={styles.chartRow}>
        <div className={styles.chartBox}>
          <h4 className={styles.chartTitle}>Value by warehouse & category</h4>
          <div className={styles.barChart}>
            <svg viewBox="0 0 600 280" className={styles.svgFull}>
              {/* Simple stacked bars */}
              {[180, 220, 150, 120].map((h, i) => (
                <g key={i}>
                  <rect x={50 + i * 140} y={280 - h} width={80} height={h} fill="#40513B" rx="4" />
                  <rect x={50 + i * 140} y={280 - h} width={80} height={h * 0.4} fill="#609966" rx="4" />
                  <rect x={50 + i * 140} y={280 - h} width={80} height={h * 0.15} fill="#9DC08B" rx="4" />
                </g>
              ))}
              {/* X-axis labels */}
              {['Main', 'North', 'South', 'East'].map((name, i) => (
                <text key={i} x={90 + i * 140} y={275} textAnchor="middle" className={styles.chartText}>{name}</text>
              ))}
            </svg>
            <div className={styles.legend}>
              <div className={styles.legendItem}><div className={styles.dot} style={{background: '#40513B'}}/> Finished</div>
              <div className={styles.legendItem}><div className={styles.dot} style={{background: '#609966'}}/> Raw</div>
              <div className={styles.legendItem}><div className={styles.dot} style={{background: '#9DC08B'}}/> Other</div>
            </div>
          </div>
        </div>
        <div className={styles.chartBox}>
          <h4 className={styles.chartTitle}>Distribution by category</h4>
          <div className={styles.donutWrapper}>
            <svg viewBox="0 0 200 200" className={styles.donutFull}>
              <circle cx="100" cy="100" r="70" fill="none" stroke="#edf1d6" strokeWidth="25" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="#40513B" strokeWidth="25" strokeDasharray="200 440" strokeDashoffset="100" transform="rotate(-90 100 100)" />
              <text x="100" y="95" textAnchor="middle" className={styles.donutCenterLabel}>TOTAL</text>
              <text x="100" y="120" textAnchor="middle" className={styles.donutCenterValue}>₹2.85 Cr</text>
            </svg>
          </div>
        </div>
      </div>

      <InsightsPanel insights={[
        { title: 'Cotton hybrid concentration', description: 'Cotton hybrid stock represents 42% of inventory value — concentration risk.' },
        { title: 'Cold storage utilization', description: 'Cold storage holds 65% of value but only 38% of physical units.' },
        { title: 'Valuation impact', description: 'WA valuation would result in ₹4.2 L lower book value vs FIFO.' }
      ]} />

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item name</th>
              <th>Category</th>
              <th>Warehouse</th>
              <th>Qty</th>
              <th>Unit cost</th>
              <th>Total value</th>
            </tr>
          </thead>
          <tbody>
            {inventoryItems.slice(0, 10).map(item => (
              <tr key={item.sku}>
                <td>{item.sku}</td>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>Telangana Main</td>
                <td>{item.quantity} {item.uom}</td>
                <td>{formatRupees(1500)}</td>
                <td>{formatRupees(item.quantity * 1500)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStockAging = () => (
    <div className={styles.fullDetailBody}>
      <div className={styles.filterStrip}>
        <div className={styles.filterItem}>
          <label>Warehouse</label>
          <div className={styles.filterValue}>Telangana Main</div>
        </div>
        <div className={styles.filterItem}>
          <label>Category</label>
          <div className={styles.filterValue}>All categories</div>
        </div>
      </div>

      <div className={styles.agingOverview}>
        <h4 className={styles.sectionTitle}>Aging buckets distribution</h4>
        <div className={styles.horizontalBar}>
          <div className={styles.barSegment} style={{width: '45%', background: '#40513B'}}>0-30d (45%)</div>
          <div className={styles.barSegment} style={{width: '25%', background: '#609966'}}>31-90d (25%)</div>
          <div className={styles.barSegment} style={{width: '15%', background: '#9DC08B'}}>91-180d (15%)</div>
          <div className={styles.barSegment} style={{width: '15%', background: '#d97706'}}>180d+ (15%)</div>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        {[
          { label: '0-30 days', value: '542 items', sub: '₹1.28 Cr' },
          { label: '31-90 days', value: '312 items', sub: '₹72 L' },
          { label: '91-180 days', value: '185 items', sub: '₹42 L' },
          { label: '180+ days', value: '94 items', sub: '₹43 L' }
        ].map((k, i) => (
          <div key={i} className={styles.kpiBox}>
            <span className={styles.kpiLabel}>{k.label}</span>
            <span className={styles.kpiBigValue}>{k.value}</span>
            <span className={styles.kpiSubValue}>{k.sub}</span>
          </div>
        ))}
      </div>

      <InsightsPanel insights={[
        { title: 'Old stock review', description: '₹4.3 L of stock is 180+ days old — review for slow-moving disposition.' },
        { title: 'Fastest aging category', description: 'Lab supplies show fastest aging (avg 45 days).' },
        { title: 'Quarantine aging', description: 'Quarantine zone has 3 items aging beyond 90 days — quality decision needed.' }
      ]} />

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item</th>
              <th>Bin</th>
              <th>Qty</th>
              <th>Received</th>
              <th>Days in stock</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {inventoryItems.slice(0, 8).map((item, i) => (
              <tr key={item.sku}>
                <td>{item.sku}</td>
                <td>{item.name}</td>
                <td>A-0{i+1}-01</td>
                <td>{item.quantity}</td>
                <td>2024-03-{10+i}</td>
                <td>{45+i*10}</td>
                <td>{formatRupees(item.quantity * 1200)}</td>
                <td><Badge variant={i > 5 ? 'warning' : 'success'}>{i > 5 ? 'Slow moving' : 'Fresh'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCycleCountAccuracy = () => (
    <div className={styles.fullDetailBody}>
      <div className={styles.filterStrip}>
        <div className={styles.filterItem}>
          <label>Date range</label>
          <div className={styles.filterValue}>Last 90 days</div>
        </div>
        <div className={styles.filterItem}>
          <label>Strategy</label>
          <div className={styles.filterValue}>ABC-based</div>
        </div>
      </div>

      <div className={styles.topKpis}>
        <div className={styles.accuracyRing}>
          <ScoreRing score={98.7} size="lg" />
          <span className={styles.ringLabel}>Overall Accuracy</span>
        </div>
        <div className={styles.kpiCol}>
          <div className={styles.kpiRow}>
            <div className={styles.kpiMiniBox}>
              <span className={styles.kpiLabel}>Counts completed</span>
              <span className={styles.kpiMidValue}>42</span>
            </div>
            <div className={styles.kpiMiniBox}>
              <span className={styles.kpiLabel}>Total variances</span>
              <span className={styles.kpiMidValue}>54 lines</span>
            </div>
          </div>
          <div className={styles.kpiMiniBox} style={{marginTop: '12px'}}>
            <span className={styles.kpiLabel}>Net variance amount</span>
            <span className={styles.kpiMidValue} style={{color: 'var(--color-danger)'}}>-₹2,18,400</span>
          </div>
        </div>
      </div>

      <div className={styles.chartBox} style={{marginBottom: '24px'}}>
        <h4 className={styles.chartTitle}>Accuracy trend (12 weeks)</h4>
        <div className={styles.lineChart}>
          <svg viewBox="0 0 800 150" className={styles.svgFull}>
            <line x1="0" y1="30" x2="800" y2="30" stroke="#dcfce7" strokeWidth="2" strokeDasharray="4 4" /> {/* Target 98% */}
            <polyline
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="3"
              points="0,60 70,55 140,58 210,40 280,45 350,35 420,38 490,28 560,32 630,25 700,28 770,20"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <InsightsPanel insights={[
        { title: 'Zone-specific variance', description: 'Cold Zone A has 1.4× the variance rate of other zones — consider weekly counts vs monthly.' },
        { title: 'Damage pattern', description: 'Damaged goods is the #1 variance reason (42%) — investigate handling procedures.' },
        { title: 'Class accuracy', description: 'Class A items maintain 99.1% accuracy; Class C drops to 96.8%.' }
      ]} />

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Count ID</th>
              <th>Name</th>
              <th>Strategy</th>
              <th>Lines</th>
              <th>Variances</th>
              <th>Accuracy</th>
              <th>Variance ₹</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {cycleCounts.slice(0, 6).map(count => (
              <tr key={count.id}>
                <td>{count.id}</td>
                <td>{count.name}</td>
                <td>{count.strategy}</td>
                <td>{count.totalLines}</td>
                <td>{count.variancesFound}</td>
                <td>{count.accuracyPct}%</td>
                <td>{formatRupees(count.totalVarianceValue)}</td>
                <td>{count.scheduledDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const getFullDetailContent = () => {
    switch (report.id) {
      case 'RPT-0001': return renderInventoryValuation();
      case 'RPT-0002': return renderStockAging();
      case 'RPT-0008': return renderCycleCountAccuracy();
      default: return renderPlaceholder();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={report.title}
      size="xl"
    >
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <div className={styles.titleInfo}>
            <Badge variant="active">{report.category}</Badge>
            <span className={styles.dateRange}>Last 30 days</span>
          </div>
          <div className={styles.actions}>
            <Button variant="ghost" size="sm" leftIcon={Bookmark} onClick={() => onToggleSave(report.id)}>
              {report.saved ? 'Saved' : 'Save'}
            </Button>
            <Button variant="ghost" size="sm" leftIcon={Share2} onClick={() => { console.log('share report', report.id); addToast({ message: `Share link copied for ${report.title}` }); }}>Share</Button>
            <Button variant="ghost" size="sm" leftIcon={Clock} onClick={() => { console.log('schedule report', report.id); addToast({ message: `Open scheduler for ${report.title}` }); }}>Schedule</Button>
            <div className={styles.exportGroup}>
              <Button variant="secondary" size="sm" leftIcon={Download} onClick={() => { console.log('export report', report.id); addToast({ type: 'success', message: `Export started — ${report.title}.pdf` }); }}>Export</Button>
            </div>
          </div>
        </div>

        <div className={styles.body}>
          {report.hasFullDetailView ? getFullDetailContent() : renderPlaceholder()}
        </div>
      </div>
    </Modal>
  );
};
