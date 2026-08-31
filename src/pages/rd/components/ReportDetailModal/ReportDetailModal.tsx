import React from 'react';
import { 
  Download, 
  Bookmark, 
  BookmarkCheck,
  Share2, 
  Sparkles, 
  Wrench, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Badge } from '@/components/common/Badge/Badge';
import { useToast } from '@/components/common/Toast/ToastContext';
import { ReportDefinition } from '../../mockData/reportsData';
import styles from './ReportDetailModal.module.css';

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

  const handleExport = (format: string) => {
    addToast({ 
      type: 'success', 
      message: `Exporting "${report.title}" as ${format} — File generated successfully (1.4 MB)` 
    });
  };

  const renderMLTReport = () => {
    const leaderBoard = [
      { rank: 1, code: 'VAR-26-001', name: 'SeedSphere Cotton Bt-102', crop: 'Cotton', yield: '32.4', diff: '+15.2%' },
      { rank: 2, code: 'VAR-26-007', name: 'SeedSphere Tomato Ruby-5', crop: 'Tomato', yield: '482.0', diff: '+12.8%' },
      { rank: 3, code: 'VAR-26-003', name: 'SeedSphere Paddy Surya-91', crop: 'Paddy', yield: '68.5', diff: '+11.4%' },
      { rank: 4, code: 'VAR-26-010', name: 'SF Bajra Shakti-50', crop: 'Pearl millet', yield: '34.2', diff: '+9.8%' },
      { rank: 5, code: 'VAR-26-004', name: 'SF Sunflower SunGold-40', crop: 'Sunflower', yield: '22.4', diff: '+8.7%' }
    ];

    const locationYields = [
      { name: 'Hyderabad Station', yield: 85 },
      { name: 'Guntur Research Farm', yield: 78 },
      { name: 'Coimbatore Substation', yield: 64 },
      { name: 'Dharwad Trial Field', yield: 72 },
      { name: 'Ludhiana Plains Farm', yield: 92 }
    ];

    return (
      <div className={styles.reportContent}>
        {/* Section 1: Executive KPI Blocks */}
        <div className={styles.section}>
          <h3 className={styles.sectionHeader}>Executive Yield Summary</h3>
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Total Trials Conducted</span>
              <span className={styles.kpiValue}>24</span>
              <span className={styles.kpiMeta}>Across 12 Indian states</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Total Entry Varieties</span>
              <span className={styles.kpiValue}>142</span>
              <span className={styles.kpiMeta}>Hybrids & OPVs</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Top Performer</span>
              <span className={styles.kpiValue} style={{ fontSize: '16px', fontWeight: '700' }}>Bt-102 (Cotton)</span>
              <span className={styles.kpiMeta}>32.4 q/ha mean yield</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Avg Yield vs Checks</span>
              <span className={styles.kpiValue} style={{ color: 'var(--color-success)' }}>+9.2%</span>
              <span className={styles.kpiMeta}>Significant genetic gain</span>
            </div>
          </div>
        </div>

        {/* Section 2: Entry Leaderboard */}
        <div className={styles.section}>
          <h3 className={styles.sectionHeader}>Top 5 Entry Leaderboard</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Variety Code</th>
                  <th>Variety Name</th>
                  <th>Crop</th>
                  <th className={styles.num}>Mean Yield</th>
                  <th className={styles.num}>Advantage vs Best Check</th>
                </tr>
              </thead>
              <tbody>
                {leaderBoard.map((row) => (
                  <tr key={row.rank}>
                    <td><strong>#{row.rank}</strong></td>
                    <td className={styles.mono}>{row.code}</td>
                    <td>{row.name}</td>
                    <td><Badge variant="neutral">{row.crop}</Badge></td>
                    <td className={styles.num}><strong>{row.yield}</strong></td>
                    <td className={styles.num} style={{ color: 'var(--color-success)', fontWeight: '600' }}>{row.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Location Performance SVG Bar Chart */}
        <div className={styles.section}>
          <h3 className={styles.sectionHeader}>Mean Site Performance index (Relative Base)</h3>
          <div className={styles.chartContainer}>
            <svg viewBox="0 0 600 200" className={styles.svgChart}>
              {/* Axes */}
              <line x1="160" y1="20" x2="160" y2="170" stroke="var(--color-border)" strokeWidth="1.5" />
              <line x1="160" y1="170" x2="550" y2="170" stroke="var(--color-border)" strokeWidth="1.5" />
              
              {/* Gridlines */}
              <line x1="250" y1="20" x2="250" y2="170" stroke="var(--color-border-light)" strokeDasharray="3" />
              <line x1="350" y1="20" x2="350" y2="170" stroke="var(--color-border-light)" strokeDasharray="3" />
              <line x1="450" y1="20" x2="450" y2="170" stroke="var(--color-border-light)" strokeDasharray="3" />
              <line x1="550" y1="20" x2="550" y2="170" stroke="var(--color-border-light)" strokeDasharray="3" />

              {/* Data Rows */}
              {locationYields.map((loc, idx) => {
                const y = 35 + idx * 30;
                return (
                  <g key={loc.name}>
                    <text x="145" y={y + 12} textAnchor="end" className={styles.chartText}>{loc.name}</text>
                    <rect x="160" y={y} width={loc.yield * 3.8} height="16" fill="var(--color-primary)" rx="2" />
                    <text x={170 + loc.yield * 3.8} y={y + 12} className={styles.chartVal}>{loc.yield}% Index</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Section 4: AI Cross-Trial Insights */}
        <div className={styles.section}>
          <div className={styles.insightsCard}>
            <div className={styles.insightHeaderTitle}>
              <Sparkles size={16} className={styles.insightIcon} />
              <h4>AI-Generated Cross-Trial Recommendations</h4>
            </div>
            <ul className={styles.insightList}>
              <li><strong>Coimbatore Soil Anomaly:</strong> Highly significant spatial yield suppression correlates directly to clay compacted layers in Block C. Precision subsoiling recommended before next planting.</li>
              <li><strong>Ludhiana Weather Interaction:</strong> Early heat spikes in Punjab favored early maturing Maize lines. VAR-26-002 demonstrated standard canopy index stability under EC dry windows.</li>
              <li><strong>GxE Adaptability:</strong> SeedSphere Tomato Ruby-5 maintains vegetative consistency across coastal and peninsular regions with standard leaf area density indices.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderBreedingReport = () => {
    const riskPrograms = [
      { id: 'BP-CT-2026', name: 'Cotton Insect-Resistance Crossing', stage: 'F4 Selection', duration: '22 mos', limit: '14 mos', risk: 'High' },
      { id: 'BP-MZ-2025', name: 'Maize High-Starch Synthetic Inbreds', stage: 'F5 Inbreeding', duration: '18 mos', limit: '12 mos', risk: 'Medium' }
    ];

    return (
      <div className={styles.reportContent}>
        {/* Section 1: SVG Pipeline Funnel Chart */}
        <div className={styles.section}>
          <h3 className={styles.sectionHeader}>R&D Breeding Pipeline Funnel (Active Programs)</h3>
          <div className={styles.funnelContainer}>
            <svg viewBox="0 0 500 180" className={styles.svgChart}>
              {/* Funnel Stage 1: Crossing */}
              <polygon points="50,20 450,20 380,55 120,55" fill="var(--color-primary)" opacity="0.9" />
              <text x="250" y="38" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">Crossing & F1 Nurseries (48 Active)</text>

              {/* Funnel Stage 2: Segregating */}
              <polygon points="122,58 378,58 320,93 180,93" fill="var(--color-primary)" opacity="0.8" />
              <text x="250" y="76" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">F2 - F5 Segregating (32 Active)</text>

              {/* Funnel Stage 3: MLT Trials */}
              <polygon points="182,96 318,96 280,131 220,131" fill="var(--color-primary)" opacity="0.75" />
              <text x="250" y="114" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">MLT Multi-Location (18 Active)</text>

              {/* Funnel Stage 4: Released */}
              <polygon points="222,134 278,134 260,165 240,165" fill="var(--color-secondary)" />
              <text x="250" y="152" textAnchor="middle" fill="white" fontSize="10" fontWeight="700">Commercial Release (6 Granted)</text>
            </svg>
          </div>
        </div>

        {/* Section 2: Stage-wise Durations */}
        <div className={styles.section}>
          <h3 className={styles.sectionHeader}>Mean Segment Durations (Target vs Realized)</h3>
          <div className={styles.chartContainer}>
            <svg viewBox="0 0 600 160" className={styles.svgChart}>
              <text x="10" y="35" className={styles.chartLabel}>F1 - F3 Propagation</text>
              <rect x="160" y="22" width="180" height="14" fill="var(--color-border)" rx="2" />
              <rect x="160" y="22" width="170" height="14" fill="var(--color-primary)" rx="2" />
              <text x="350" y="33" className={styles.chartVal}>12 mos (Target: 14)</text>

              <text x="10" y="75" className={styles.chartLabel}>F4 - F6 Selection Blocks</text>
              <rect x="160" y="62" width="180" height="14" fill="var(--color-border)" rx="2" />
              <rect x="160" y="62" width="240" height="14" fill="var(--color-danger)" rx="2" />
              <text x="410" y="73" className={styles.chartVal} style={{ color: 'var(--color-danger)', fontWeight: '600' }}>18 mos (Target: 12) - BOTTLE-NECK</text>

              <text x="10" y="115" className={styles.chartLabel}>MLT Testing Rounds</text>
              <rect x="160" y="102" width="180" height="14" fill="var(--color-border)" rx="2" />
              <rect x="160" y="102" width="190" height="14" fill="var(--color-primary)" rx="2" />
              <text x="360" y="113" className={styles.chartVal}>26 mos (Target: 24)</text>
            </svg>
          </div>
        </div>

        {/* Section 3: Programs at Risk */}
        <div className={styles.section}>
          <div className={styles.alertHeaderRow}>
            <AlertTriangle size={18} className={styles.alertIcon} />
            <h3 className={styles.sectionHeader} style={{ margin: 0 }}>Breeding Programs Exceeding Target Cycles</h3>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Program ID</th>
                  <th>Description Target</th>
                  <th>Current Stage</th>
                  <th>Elapsed Duration</th>
                  <th>Target Limit</th>
                  <th>Risk Priority</th>
                </tr>
              </thead>
              <tbody>
                {riskPrograms.map((p) => (
                  <tr key={p.id}>
                    <td className={styles.mono}>{p.id}</td>
                    <td>{p.name}</td>
                    <td><Badge variant="info">{p.stage}</Badge></td>
                    <td><strong style={{ color: 'var(--color-danger)' }}>{p.duration}</strong></td>
                    <td>{p.limit}</td>
                    <td><Badge variant="danger">{p.risk}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderComplianceReport = () => {
    const deadlines = [
      { id: 'REG-26-002', name: 'SF Maize Gold-88', type: 'UPOV', filed: '2025-03-10', deadline: '2026-06-10', action: 'Upload Year 1 DUS Results' },
      { id: 'REG-26-011', name: 'SeedSphere Cotton Bt-105', type: 'PPV&FRA', filed: '2026-02-12', deadline: '2026-06-15', action: 'Submit Botanical Descriptors' },
      { id: 'REG-26-013', name: 'SeedSphere Paddy Basmati-Plus', type: 'UPOV', filed: 'Drafting', deadline: '2026-06-30', action: 'Lodge Filing Package' }
    ];

    return (
      <div className={styles.reportContent}>
        {/* Section 1: SVG Active Applications Pie Chart */}
        <div className={styles.section}>
          <h3 className={styles.sectionHeader}>Filing Portfolio Status Matrix</h3>
          <div className={styles.pieMatrixRow}>
            <div className={styles.pieChartBlock}>
              <svg width="140" height="140" viewBox="0 0 36 36" className={styles.svgPie}>
                {/* Background grey circle */}
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#eee" strokeWidth="4" />
                
                {/* 60% Granted (Olive green) */}
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-primary)" strokeWidth="4" 
                        strokeDasharray="60 100" strokeDashoffset="25" />
                
                {/* 25% Under Review (Warning Yellow) */}
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-warning)" strokeWidth="4" 
                        strokeDasharray="25 100" strokeDashoffset="85" />
                
                {/* 15% Draft (Info Grey) */}
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-text-muted)" strokeWidth="4" 
                        strokeDasharray="15 100" strokeDashoffset="10" />
              </svg>
              <div className={styles.pieLegend}>
                <div className={styles.legendRow}><span className={styles.dot} style={{ background: 'var(--color-primary)' }} /> 60% Granted (9)</div>
                <div className={styles.legendRow}><span className={styles.dot} style={{ background: 'var(--color-warning)' }} /> 25% Under Review (4)</div>
                <div className={styles.legendRow}><span className={styles.dot} style={{ background: 'var(--color-text-muted)' }} /> 15% Draft / Prep (3)</div>
              </div>
            </div>
            <div className={styles.statCardsGroup}>
              <div className={styles.miniStatCard}>
                <span className={styles.miniLabel}>Total Filed Certificates</span>
                <span className={styles.miniVal}>16</span>
              </div>
              <div className={styles.miniStatCard}>
                <span className={styles.miniLabel}>Upcoming DUS Audits</span>
                <span className={styles.miniVal}>3 Locations</span>
              </div>
              <div className={styles.miniStatCard}>
                <span className={styles.miniLabel}>Regulatory Health Index</span>
                <span className={styles.miniVal} style={{ color: 'var(--color-success)' }}>98% Compliance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Upcoming Deadlines */}
        <div className={styles.section}>
          <h3 className={styles.sectionHeader}>Upcoming Regulatory Deadlines (Next 45 Days)</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Filing Code</th>
                  <th>Crop Variety</th>
                  <th>Filing Type</th>
                  <th>Filed Date</th>
                  <th>Submission Deadline</th>
                  <th>Required Action</th>
                </tr>
              </thead>
              <tbody>
                {deadlines.map((d) => (
                  <tr key={d.id}>
                    <td className={styles.mono}>{d.id}</td>
                    <td><strong>{d.name}</strong></td>
                    <td><Badge variant="neutral">{d.type}</Badge></td>
                    <td>{d.filed}</td>
                    <td><strong style={{ color: 'var(--color-danger)' }}>{d.deadline}</strong></td>
                    <td>
                      <span className={styles.actionCellRow}>
                        <ShieldCheck size={14} className={styles.actionRowIcon} />
                        {d.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPlaceholder = () => {
    return (
      <div className={styles.placeholderBlock}>
        <Wrench size={48} className={styles.placeholderIcon} />
        <h4>Interactive Template Under Development</h4>
        <p>
          The layout configurations and data correlation schemas for the report 
          <strong> "{report.title}" </strong> are currently being finalized by the R&D compliance team.
        </p>
        <div className={styles.progressPlaceholderRow}>
          <span>Development Status</span>
          <Badge variant="warning">Awaiting Field Integration</Badge>
        </div>
      </div>
    );
  };

  const isFullyBuilt = 
    report.id === 'RPT-TRL-001' || 
    report.id === 'RPT-BRD-001' || 
    report.id === 'RPT-CMP-001';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title=""
    >
      <div className={styles.modalContainer}>
        {/* Custom Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleArea}>
            <span className={styles.reportId}>{report.id}</span>
            <h2 className={styles.title}>{report.title}</h2>
            <div className={styles.badges}>
              <Badge variant="info">{report.category}</Badge>
              <span className={styles.metaLabel}>Last compiled: {report.lastRunAt}</span>
            </div>
          </div>
          <div className={styles.actions}>
            <button 
              className={styles.bookmarkBtn} 
              onClick={() => onToggleSave(report.id)}
              aria-label={report.saved ? 'Remove from saved' : 'Save report'}
            >
              {report.saved ? (
                <BookmarkCheck size={20} className={styles.activeStar} />
              ) : (
                <Bookmark size={20} className={styles.emptyStar} />
              )}
            </button>
            <Button 
              variant="secondary" 
              leftIcon={Share2}
              onClick={() => addToast({ message: 'Sharing link copied to clipboard' })}
            >
              Share
            </Button>
            <Button 
              variant="primary" 
              leftIcon={Download}
              onClick={() => handleExport('PDF')}
            >
              Export PDF
            </Button>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Content Body */}
        <div className={styles.body}>
          {report.id === 'RPT-TRL-001' && renderMLTReport()}
          {report.id === 'RPT-BRD-001' && renderBreedingReport()}
          {report.id === 'RPT-CMP-001' && renderComplianceReport()}
          {!isFullyBuilt && renderPlaceholder()}
        </div>
      </div>
    </Modal>
  );
};
