import { useState, useMemo } from 'react';
import { 
  FlaskConical, Sparkles, Plus, Search, BrainCircuit, 
  Cpu, Plane, ShieldCheck, Eye, 
  AlertCircle, Database, Activity 
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { rdNav } from '@/config/rdNav';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { KpiCard } from '@/pages/warehouse/components/KpiCard/KpiCard';
import { usePermission } from '@/hooks/usePermission';

// Mock Data
import { enhancedObservations as initialObservations } from './mockData/phenotypingData';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { RD_TODAY, isDateInPeriod, isYearInPeriod, type PeriodValue } from '@/utils/periodFilter';
import { trials as initialTrials } from './mockData/trialsData';

// Modals
import { RecordObservationModal } from './components/RecordObservationModal/RecordObservationModal';
import { ObservationDetailModal } from './components/ObservationDetailModal/ObservationDetailModal';
import { AIImageAnalysisModal } from './components/AIImageAnalysisModal/AIImageAnalysisModal';

import styles from './Phenotyping.module.css';

export default function Phenotyping() {
  const { addToast } = useToast();

  const canRecord = usePermission('record_phenotyping');
  const canVerify = usePermission('verify_field_observations');

  // Stores
  const [period, setPeriod] = useState<PeriodValue>('all');
  const { items: allObservations, add: addObservation, update: updateObservation } = useRealtimeMockStore(initialObservations);

  const obsList = useMemo(
    () => allObservations.filter((o) => isDateInPeriod(o.date, period, RD_TODAY)),
    [allObservations, period]
  );
  const { items: trialsList } = useRealtimeMockStore(initialTrials);

  // States
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [growthStageFilter, setGrowthStageFilter] = useState('all');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedObs, setSelectedObs] = useState<any | null>(null);

  // Dynamic state-driven KPI cards
  const kpis = useMemo(() => {
    const total = obsList.length;
    const aiAssisted = obsList.filter(o => o.method === 'AI image analysis').length;
    const pending = obsList.filter(o => !o.reviewed).length;
    const iotReadings = obsList.filter(o => o.method === 'IoT sensor').length;

    return [
      {
        label: 'Total Observations',
        value: total.toString(),
        icon: Database,
        trend: { direction: 'up' as const, percentage: '+12%', isPositive: true },
        comparison: 'This crop season'
      },
      {
        label: 'AI-assisted Traits',
        value: aiAssisted.toString(),
        icon: Sparkles,
        trend: { direction: 'up' as const, percentage: '+24%', isPositive: true },
        comparison: `${Math.round((aiAssisted / (total || 1)) * 100)}% of total capture`
      },
      {
        label: 'Pending Review',
        value: pending.toString(),
        icon: AlertCircle,
        trend: { direction: 'down' as const, percentage: '-8%', isPositive: true },
        comparison: 'Needs supervisor sign-off',
        isWarning: pending > 0
      },
      {
        label: 'IoT Node Syncs',
        value: iotReadings.toString(),
        icon: Cpu,
        trend: { direction: 'up' as const, percentage: '+15%', isPositive: true },
        comparison: 'Cellular LoRa readings'
      }
    ];
  }, [obsList]);

  // Tabs for methods & reviews
  const tabs = useMemo(() => [
    { key: 'all', label: 'All Observations', count: obsList.length },
    { key: 'ai', label: 'AI Assisted', count: obsList.filter(o => o.method === 'AI image analysis').length },
    { key: 'drone', label: 'Drone Orthomosaics', count: obsList.filter(o => o.method === 'Drone imagery').length },
    { key: 'iot', label: 'IoT Capacitance Sensors', count: obsList.filter(o => o.method === 'IoT sensor').length },
    { key: 'manual', label: 'Manual Field Walks', count: obsList.filter(o => o.method === 'Manual field walk').length },
    { key: 'pending', label: 'Pending Review', count: obsList.filter(o => !o.reviewed).length },
  ], [obsList]);

  // Derived growth stages options
  const growthStages = useMemo(() => {
    const stages = Array.from(new Set(obsList.map(o => o.growthStage)));
    return [
      { value: 'all', label: 'All Growth Stages' },
      ...stages.map(s => ({ value: s, label: s }))
    ];
  }, [obsList]);

  // Filter logic
  const filteredItems = useMemo(() => {
    let result = [...obsList];

    // 1. Tab filter
    if (activeTab === 'ai') {
      result = result.filter(o => o.method === 'AI image analysis');
    } else if (activeTab === 'drone') {
      result = result.filter(o => o.method === 'Drone imagery');
    } else if (activeTab === 'iot') {
      result = result.filter(o => o.method === 'IoT sensor');
    } else if (activeTab === 'manual') {
      result = result.filter(o => o.method === 'Manual field walk');
    } else if (activeTab === 'pending') {
      result = result.filter(o => !o.reviewed);
    }

    // 2. Growth Stage dropdown filter
    if (growthStageFilter !== 'all') {
      result = result.filter(o => o.growthStage === growthStageFilter);
    }

    // 3. Search filter (Observation ID, Trial ID, Plot, Observer)
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(o => 
        o.id.toLowerCase().includes(q) ||
        o.trialId.toLowerCase().includes(q) ||
        o.plotNumber.toLowerCase().includes(q) ||
        o.entryCode.toLowerCase().includes(q) ||
        o.observedBy.toLowerCase().includes(q)
      );
    }

    return result;
  }, [obsList, activeTab, growthStageFilter, searchTerm]);

  // Method tag rendering helper
  const getMethodBadgeClassAndIcon = (method: string) => {
    switch (method) {
      case 'AI image analysis':
        return { label: 'AI Vision', className: `${styles.methodTag} ${styles.ai}`, icon: Sparkles };
      case 'Drone imagery':
        return { label: 'Drone Geo', className: `${styles.methodTag} ${styles.drone}`, icon: Plane };
      case 'IoT sensor':
        return { label: 'IoT Sensor', className: `${styles.methodTag} ${styles.iot}`, icon: Cpu };
      case 'Lab analysis':
        return { label: 'Lab Sample', className: `${styles.methodTag} ${styles.lab}`, icon: FlaskConical };
      default:
        return { label: 'Manual Walk', className: styles.methodTag, icon: Activity };
    }
  };

  // Trait measurements preview helper
  const renderTraitsPreview = (measurements: any[]) => {
    return (
      <div className={styles.traitBadgeRow}>
        {measurements.slice(0, 2).map((m, idx) => (
          <span key={idx} className={styles.traitBadge}>
            {m.trait}: <strong>{m.value}{m.unit ? ` ${m.unit}` : ''}</strong>
          </span>
        ))}
        {measurements.length > 2 && (
          <span className={styles.traitBadge}>+{measurements.length - 2} more</span>
        )}
      </div>
    );
  };

  // AI confidence score badge
  const renderConfidenceBadge = (measurements: any[]) => {
    const aiMeasurement = measurements.find(m => m.aiConfidence !== undefined);
    if (!aiMeasurement) return <span className={styles.muted}>N/A</span>;

    const conf = aiMeasurement.aiConfidence;
    let className = styles.confLow;
    if (conf >= 90) className = styles.confHigh;
    else if (conf >= 80) className = styles.confMedium;

    return (
      <span className={`${styles.confBadge} ${className}`}>
        {conf}% confidence
      </span>
    );
  };

  const handleRecord = (newObs: any) => {
    addObservation(newObs);
  };

  const handleBulkAdd = (newObsList: any[]) => {
    // Add all programmatically
    newObsList.forEach(obs => addObservation(obs));
  };

  const handleApproveObservation = (id: string) => {
    updateObservation(id, { reviewed: true });
    addToast(`Observation ${id} approved successfully!`, 'success');
  };

  return (
    <ModuleLayout moduleName="Research & Development" moduleIcon={FlaskConical} navItems={rdNav}>
      
      {/* 1. Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Phenotyping & observations</h1>
          <p className={styles.pageSubtitle}>Collect, validate, and analyze plant biological traits data</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          {canRecord && (
            <>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={BrainCircuit}
                onClick={() => setIsBatchModalOpen(true)}
              >
                Batch AI Upload
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={Plus}
                onClick={() => setIsRecordModalOpen(true)}
              >
                Record Observation
              </Button>
            </>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* 2. KPI Cards Strip */}
      <div className={styles.kpiStrip}>
        {kpis.map((kpi, idx) => (
          <KpiCard
            key={idx}
            label={kpi.label}
            value={kpi.value}
            comparison={kpi.comparison}
            icon={kpi.icon}
            trend={kpi.trend}
            className={kpi.isWarning ? styles.kpiWarning : undefined}
          />
        ))}
      </div>

      {/* 3. Horizontal Navigation Tabs */}
      <div className={styles.tabsContainer}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* 4. Search and filters bar */}
      <div className={styles.filterBarRow}>
        <div className={styles.filterLeft}>
          <div className={styles.searchWrapper}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by Obs ID, Trial ID, Plot, Observer..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={growthStageFilter}
            onChange={e => setGrowthStageFilter(e.target.value)}
            className={styles.selectInput}
          >
            {growthStages.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Observations Data Table */}
      <div className={styles.content}>
        <DataTable
          rowKey="id"
          data={filteredItems}
          columns={[
            {
              key: 'id',
              label: 'Obs ID',
              render: (o: any) => <strong className={styles.mono}>{o.id}</strong>
            },
            {
              key: 'date',
              label: 'Date Captured'
            },
            {
              key: 'trialId',
              label: 'Trial ID',
              render: (o: any) => (
                <a href={`/rd/trials/${o.trialId}`} className={styles.mono} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  {o.trialId}
                </a>
              )
            },
            {
              key: 'plotNumber',
              label: 'Plot'
            },
            {
              key: 'entryCode',
              label: 'Entry',
              render: (o: any) => <span className={styles.mono}>{o.entryCode}</span>
            },
            {
              key: 'growthStage',
              label: 'Stage'
            },
            {
              key: 'method',
              label: 'Method',
              render: (o: any) => {
                const info = getMethodBadgeClassAndIcon(o.method);
                const Icon = info.icon;
                return (
                  <span className={info.className}>
                    <Icon size={12} />
                    <span>{info.label}</span>
                  </span>
                );
              }
            },
            {
              key: 'measurements',
              label: 'Captured Trait Values',
              render: (o: any) => renderTraitsPreview(o.measurements)
            },
            {
              key: 'aiConfidence',
              label: 'AI Confidence',
              render: (o: any) => renderConfidenceBadge(o.measurements)
            },
            {
              key: 'reviewed',
              label: 'Status',
              render: (o: any) => (
                <span className={`${styles.reviewBadge} ${o.reviewed ? styles.reviewedOk : styles.reviewedPending}`}>
                  {o.reviewed ? 'Approved' : 'Pending Review'}
                </span>
              )
            },
            {
              key: 'actions',
              label: '',
              render: (o: any) => (
                <div className={styles.actionBtnGroup}>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={Eye}
                    onClick={() => {
                      setSelectedObs(o);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    View
                  </Button>
                  {!o.reviewed && canVerify && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={ShieldCheck}
                      onClick={() => handleApproveObservation(o.id)}
                    >
                      Approve
                    </Button>
                  )}
                </div>
              )
            }
          ]}
        />
      </div>

      {/* ================= SUB-MODALS ================= */}

      {/* Record Observation Modal */}
      <RecordObservationModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onRecord={handleRecord}
        trialsList={trialsList}
      />

      {/* Observation Detail Modal */}
      {selectedObs && (
        <ObservationDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedObs(null);
          }}
          observation={selectedObs}
          onApprove={canVerify ? handleApproveObservation : undefined}
        />
      )}

      {/* Standalone XL AI Batch analysis modal */}
      <AIImageAnalysisModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onBulkAddObservations={handleBulkAdd}
        trialsList={trialsList}
      />

    </ModuleLayout>
  );
}
