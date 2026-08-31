import { useState } from 'react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/pages/warehouse/components/KpiCard/KpiCard';
import { useToast } from '@/components/common/Toast/ToastContext';
import { Modal } from '@/components/common/Modal/Modal';
import { FlaskConical, Download, Sprout, TrendingUp, FlaskConical as FlaskIcon, Workflow } from 'lucide-react';
import { rdNav } from '@/config/rdNav';
import { rdKpis } from './mockData/dashboardData';

import { BreedingPipelineFunnel } from './components/BreedingPipelineFunnel/BreedingPipelineFunnel';
import { ActiveTrialsMap } from './components/ActiveTrialsMap/ActiveTrialsMap';
import { RecentObservationsFeed } from './components/RecentObservationsFeed/RecentObservationsFeed';
import { PendingTasksPanel } from './components/PendingTasksPanel/PendingTasksPanel';
import { GeneticGainTrendChart } from './components/GeneticGainTrendChart/GeneticGainTrendChart';

import styles from './RDDashboard.module.css';

const seasons = [
  'Kharif 2025',
  'Rabi 2025-26',
  'Kharif 2026',
  'Rabi 2026-27',
  'Kharif 2027',
  'Rabi 2027-28',
];

interface DetailModalState {
  isOpen: boolean;
  title: string;
  type: 'funnel' | 'map' | 'chart' | null;
  data: any;
}

export default function RDDashboard() {
  const { addToast } = useToast();
  const [season, setSeason] = useState('Kharif 2026');
  const [detailModal, setDetailModal] = useState<DetailModalState>({
    isOpen: false,
    title: '',
    type: null,
    data: null,
  });
  const handleExport = () => {
    addToast('Dashboard exported as PDF', 'success');
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'Workflow': return Workflow;
      case 'Sprout': return Sprout;
      case 'TrendingUp': return TrendingUp;
      default: return FlaskIcon;
    }
  };

  const handleFunnelClick = (stage: any) => {
    setDetailModal({
      isOpen: true,
      title: `${stage.label} Details`,
      type: 'funnel',
      data: stage,
    });
  };

  const handleMapClick = (location: any) => {
    setDetailModal({
      isOpen: true,
      title: `Research Station: ${location.name}`,
      type: 'map',
      data: location,
    });
  };

  const handleChartClick = (point: any) => {
    setDetailModal({
      isOpen: true,
      title: `Breeding Cycle: ${point.cycleLabel}`,
      type: 'chart',
      data: point,
    });
  };

  const getFunnelDetailContent = (data: any) => {
    if (!data) return null;
    const mockItems: Record<string, Array<{ name: string; details: string; status: string }>> = {
      'stage-germplasm': [
        { name: 'IC-384729 (Kaveri Sprout)', details: 'Landrace · Collected from Maharashtra · High drought tolerance', status: 'Active' },
        { name: 'IC-948201 (Deccan Gold)', details: 'Cultivar · Source: IARI · High yield potential', status: 'Active' },
        { name: 'SF-Elite-10 (Cotton Parent)', details: 'Breeding line · Focus: Staple length', status: 'Quarantine' },
        { name: 'SF-Elite-12 (Maize Inbred)', details: 'Breeding line · Focus: Drought resistance', status: 'Active' },
      ],
      'stage-f1': [
        { name: 'BP-2026-F1-04 (Coimbatore Cross)', details: 'Maize cross · Kaveri Sprout × Deccan Gold', status: 'In progress' },
        { name: 'BP-2026-F1-08 (Ludhiana Hybrid)', details: 'Wheat cross · PBW-343 derivative × local elite', status: 'In progress' },
        { name: 'BP-2026-F1-12 (Hyderabad Cotton)', details: 'Cotton cross · High strength × high GIN', status: 'Completed' },
      ],
      'stage-f2-f4': [
        { name: 'BP-2025-F2-19 (Drought Maize)', details: 'F2 Segregating population · Selected for deep root system', status: 'Selection phase' },
        { name: 'BP-2024-F4-02 (Pest Res Wheat)', details: 'F4 Stable families · Selected for rust resistance', status: 'Yield checks' },
        { name: 'BP-2025-F3-08 (Extra Long Cotton)', details: 'F3 Families · Target staple length >32mm', status: 'Selection phase' },
      ],
      'stage-mlt': [
        { name: 'TRL-2026-014 (Cotton Hybrid MLT)', details: 'Testing at Coimbatore, Hyderabad, and Pune · 5 replications', status: 'Data entry' },
        { name: 'TRL-2026-012 (Maize Drought MLT)', details: 'Testing at Ludhiana, Jaipur, and Bhopal · Moisture stress focus', status: 'Mid-season obs' },
        { name: 'TRL-2026-009 (Sunflower Yield MLT)', details: 'Testing at Bangalore and Hyderabad · Oil content focus', status: 'Flowering obs' },
      ],
      'stage-pre-release': [
        { name: 'SeedFlow Maize-901', details: 'Pre-release validation trials · Undergoing DUS testing (Year 2)', status: 'Approved for MLT' },
        { name: 'SeedFlow Cotton-402', details: 'Awaiting variety release committee review · High yield in south zone', status: 'Pending release' },
      ],
      'stage-released': [
        { name: 'SeedFlow Rice-Super-1', details: 'Released in Rabi 2025 · High tolerance to salinity · East Coast zone', status: 'Released' },
        { name: 'SeedFlow Bajra-Eco', details: 'Released in Kharif 2025 · Extremely low water requirements · Rajasthan zone', status: 'Released' },
      ]
    };

    const list = mockItems[data.id] || [];

    return (
      <div className={styles.detailContainer}>
        <p className={styles.detailDesc}>{data.description}</p>
        <div className={styles.statsSummary}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Entries</span>
            <span className={styles.statVal}>{data.count}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Active Projects</span>
            <span className={styles.statVal}>{list.length} tracked</span>
          </div>
        </div>
        
        <h4 className={styles.detailSectionTitle}>Tracked varieties/lines in this stage</h4>
        {list.length > 0 ? (
          <div className={styles.detailList}>
            {list.map((item, idx) => (
              <div key={idx} className={styles.detailItem}>
                <div className={styles.detailItemHeader}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={`${styles.itemStatus} ${styles[item.status.toLowerCase().replace(/ /g, '')] || ''}`}>
                    {item.status}
                  </span>
                </div>
                <p className={styles.itemSub}>{item.details}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noData}>No specific detail data available for this mock segment.</p>
        )}
      </div>
    );
  };

  const getMapDetailContent = (data: any) => {
    if (!data) return null;

    // Helper to fetch rich metadata for a given crop
    const getCropMetadata = (crop: string) => {
      const lower = crop.toLowerCase();
      if (lower.includes('rice') || lower.includes('paddy')) {
        return {
          varieties: 'SeedFlow Rice-Super-1, local coastal landraces, Sub1-introgressed lines',
          traits: 'Coastal salinity tolerance, submergence recovery index, reproductive drought adaptibility',
          phase: 'Multi-Location Yield Trials (MLT)'
        };
      } else if (lower.includes('cotton')) {
        return {
          varieties: 'SeedFlow Cotton-402, SF-Elite-10 (Cotton parent), high-GIN breeding lines',
          traits: 'Fiber staple length (>32mm), bollworm resistance (Cry1Ac/Cry2Ab), lodging tolerance under drip',
          phase: 'Awaiting variety release committee review / PVP DUS'
        };
      } else if (lower.includes('maize')) {
        return {
          varieties: 'SeedFlow Maize-901, BP-2026-F1-04 (Coimbatore Cross), SF-Elite-12 inbred parent',
          traits: 'Deep root drought resilience, late-season lodging index, nitrogen use efficiency',
          phase: 'Stage 2 DUS validation'
        };
      } else if (lower.includes('wheat')) {
        return {
          varieties: 'BP-2024-F4-02 (Stable families), PBW-343 derivatives',
          traits: 'Ug99 rust resistance, early heat stress adaptation, zinc/iron enrichment index',
          phase: 'DUS Year 1 testing'
        };
      } else if (lower.includes('sorghum')) {
        return {
          varieties: 'SF-Sorghum-Elite-11, local dryland selections',
          traits: 'Post-rainy moisture adaptibility, shoot fly resistance indices, grain starch content',
          phase: 'Advanced selection trials'
        };
      } else if (lower.includes('soybean')) {
        return {
          varieties: 'SF-Soy-2025 (Pod selection), local early-maturity lines',
          traits: 'Yellow mosaic virus resistance, pod shattering resistance, girdle beetle tolerance',
          phase: 'Replicated progeny yield trials'
        };
      } else if (lower.includes('millet') || lower.includes('bajra')) {
        return {
          varieties: 'SeedFlow Bajra-Eco, drought-hardy hybrid parents',
          traits: 'Extreme high-temperature adaptibility, downy mildew screening, drought recovery index',
          phase: 'State trials'
        };
      } else if (lower.includes('tomato') || lower.includes('chilli')) {
        return {
          varieties: 'SF-Tomato-Lycopene-Plus, Chilli-Thrips-Res hybrid selections',
          traits: 'Bacterial wilt resistance (Ralstonia), thrips & mites tolerance, fruit firmness & shelf life',
          phase: 'Station trial validation'
        };
      } else if (lower.includes('pulses') || lower.includes('chickpea')) {
        return {
          varieties: 'SF-Chickpea-Fusarium-Res, green gram moisture stress lines',
          traits: 'Fusarium wilt resistance in chickpea, moisture stress tolerance during grain filling',
          phase: 'Progeny screening nursery'
        };
      } else if (lower.includes('sunflower')) {
        return {
          varieties: 'SF-Sun-High-Oleic, drought-hardy hybrid parents',
          traits: 'High oleic acid breeding lines, deep root architecture for drought adaptibility',
          phase: 'Multi-Location Trial'
        };
      } else {
        return {
          varieties: 'SeedFlow Elite breeding selections, station parent stock',
          traits: 'Yield index superiority, lodging prevention, local disease screening',
          phase: 'Evaluation phase'
        };
      }
    };

    return (
      <div className={styles.detailContainer}>
        <div className={styles.locationHeader} style={{ marginBottom: '16px' }}>
          <span className={styles.stateLabel}>{data.state} Station</span>
        </div>

        {/* Environmental Parameters Grid */}
        {data.environmental && (
          <div className={styles.environmentalGrid} style={{ marginBottom: '18px' }}>
            <div className={styles.envItem}>
              <span className={styles.envLabel}>Average Temp</span>
              <span className={styles.envValue}>{data.environmental.avgTemp}</span>
            </div>
            <div className={styles.envItem}>
              <span className={styles.envLabel}>Annual Rainfall</span>
              <span className={styles.envValue}>{data.environmental.rainfall}</span>
            </div>
            <div className={styles.envItem}>
              <span className={styles.envLabel}>Soil Type</span>
              <span className={styles.envValue}>{data.environmental.soilType}</span>
            </div>
            <div className={styles.envItem}>
              <span className={styles.envLabel}>Last Sync</span>
              <span className={styles.envValue}>{data.environmental.lastObservation}</span>
            </div>
          </div>
        )}

        <div className={styles.statsSummary} style={{ marginBottom: '20px' }}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Active Trials</span>
            <span className={styles.statVal}>{data.activeTrials}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Crops Handled</span>
            <span className={styles.statVal}>{data.crops.join(', ')}</span>
          </div>
        </div>
        
        <h4 className={styles.detailSectionTitle} style={{ marginBottom: '12px' }}>Crop Breeding & Trial Details</h4>
        <div className={styles.detailList} style={{ maxHeight: '350px' }}>
          {data.crops.map((cropName: string) => {
            // Filter trials matching this crop name
            const cropTrials = data.trials?.filter((t: any) => t.crop.toLowerCase() === cropName.toLowerCase()) || [];
            const meta = getCropMetadata(cropName);

            return (
              <div key={cropName} className={styles.detailItem} style={{ borderLeft: '4px solid var(--color-primary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className={styles.detailItemHeader} style={{ margin: 0 }}>
                  <span className={styles.itemName} style={{ fontSize: '14px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🌾 {cropName} Operations
                  </span>
                  <span className={`${styles.itemStatus} ${styles.active}`} style={{ fontSize: '10px' }}>
                    {cropTrials.length || 1} Active {cropTrials.length === 1 ? 'Trial' : 'Trials'}
                  </span>
                </div>
                
                {/* Crop-specific active trials list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-border-light)', paddingTop: '8px' }}>
                  {cropTrials.length > 0 ? (
                    cropTrials.map((trial: any) => (
                      <div key={trial.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                          <span style={{ color: 'var(--color-text-primary)' }}>{trial.id} — {trial.focus}</span>
                        </div>
                        <p className={styles.itemSub}>
                          🔬 Coordinator: <strong>{trial.coordinator}</strong> · Status: <span style={{ color: '#137333', fontWeight: '500' }}>{trial.status}</span>
                        </p>
                      </div>
                    ))
                  ) : (
                    // Generate fallback mock trials if none present in static data
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                        <span style={{ color: 'var(--color-text-primary)' }}>TRL-2026-X01 — Advanced progeny screening trials</span>
                      </div>
                      <p className={styles.itemSub}>
                        🔬 Coordinator: <strong>Dr. Priya Sharma</strong> · Status: <span style={{ color: '#137333', fontWeight: '500' }}>Active</span>
                      </p>
                    </div>
                  )}

                  {/* Rich Crop Metadata Details Block */}
                  <div style={{ 
                    marginTop: '4px', 
                    padding: '8px 10px', 
                    backgroundColor: 'var(--color-accent-light)', 
                    borderRadius: '4px',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border-light)'
                  }}>
                    <div style={{ marginBottom: '3px' }}>
                      🧬 <strong>Breeding Lines under observation:</strong> <span style={{ color: 'var(--color-text-secondary)' }}>{meta.varieties}</span>
                    </div>
                    <div style={{ marginBottom: '3px' }}>
                      🎯 <strong>Targeted Phenotypic Traits:</strong> <span style={{ color: 'var(--color-text-secondary)' }}>{meta.traits}</span>
                    </div>
                    <div>
                      ⚡ <strong>Trial Breeding Phase:</strong> <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>{meta.phase}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getChartDetailContent = (data: any) => {
    if (!data) return null;
    return (
      <div className={styles.detailContainer}>
        <div className={styles.statsSummary}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Actual Yield Gain</span>
            <span className={styles.statVal} style={{ color: 'var(--color-primary)' }}>+{data.actualGainPct}%</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Target Gain</span>
            <span className={styles.statVal} style={{ color: 'var(--color-text-secondary)' }}>+{data.targetGainPct}%</span>
          </div>
        </div>
        
        <h4 className={styles.detailSectionTitle}>Cycle achievements & highlights</h4>
        <div className={styles.achievementContent}>
          <p className={styles.achievementHighlight}>
            During <strong>{data.cycleLabel}</strong>, breeding programs surpassed the target yield index by {(data.actualGainPct - data.targetGainPct).toFixed(1)}%.
          </p>
          <ul className={styles.achievementList}>
            <li>🚀 Key breakthrough in Maize breeding line selection, leading to +12.4% yield performance in semi-arid zones.</li>
            <li>🌾 Completed DUS characterization for 18 salt-tolerant rice landraces on the east coast.</li>
            <li>💡 Implemented high-throughput AI phenotyping (leaf-area index estimation) resulting in 3x faster trial observations.</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <ModuleLayout moduleName="Research & Development" moduleIcon={FlaskConical} navItems={rdNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Research & Development dashboard</h1>
          <p className={styles.pageSubtitle}>Welcome to research operations</p>
        </div>
        <div className={styles.headerActions}>
          <select 
            className={styles.seasonSelect}
            value={season}
            onChange={(e) => {
              setSeason(e.target.value);
              addToast(`Switched to ${e.target.value}`, 'info');
            }}
            aria-label="Season selector"
          >
            {seasons.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button variant="secondary" size="sm" leftIcon={Download} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      <div className={styles.divider} />

        <div className={styles.kpiStrip}>
          {rdKpis.map(kpi => (
            <KpiCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              comparison={kpi.subLabel || ''}
              icon={getIcon(kpi.icon)}
              trend={{ 
                direction: kpi.trendType === 'negative' ? 'down' : 'up',
                percentage: kpi.trend,
                isPositive: kpi.trendType !== 'negative'
              }}
            />
          ))}
        </div>

        <div className={styles.twoColumnGrid}>
          <div className={styles.col60}>
            <BreedingPipelineFunnel onSegmentClick={handleFunnelClick} />
          </div>
          <div className={styles.col40}>
            <ActiveTrialsMap onLocationClick={handleMapClick} />
          </div>
        </div>

        <div className={styles.twoColumnGrid}>
          <div className={styles.col60}>
            <RecentObservationsFeed />
          </div>
          <div className={styles.col40}>
            <PendingTasksPanel />
          </div>
        </div>

        <div className={styles.fullWidthRow}>
          <GeneticGainTrendChart onPointClick={handleChartClick} />
        </div>

        {/* Dynamic Detail Modal */}
        <Modal
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal(prev => ({ ...prev, isOpen: false }))}
          title={detailModal.title}
          size="md"
        >
          {detailModal.type === 'funnel' && getFunnelDetailContent(detailModal.data)}
          {detailModal.type === 'map' && getMapDetailContent(detailModal.data)}
          {detailModal.type === 'chart' && getChartDetailContent(detailModal.data)}
        </Modal>
    </ModuleLayout>
  );
}
