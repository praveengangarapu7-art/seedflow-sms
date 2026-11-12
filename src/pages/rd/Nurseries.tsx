import { useState, useMemo } from 'react';
import {
  FlaskConical,
  Download,
  Plus,
  Compass,
  Activity,
  Heart,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { KpiCard } from '@/pages/warehouse/components/KpiCard/KpiCard';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { rdNav } from '@/config/rdNav';
import { nurseries as initialNurseries } from './mockData/nurseriesData';
import { programs as initialPrograms } from './mockData/breedingData';
import { Nursery, NurseryType } from '@/types/rd';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { RD_TODAY, isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import { NurseryCard } from './components/NurseryCard/NurseryCard';
import { NurseryDetailModal } from './components/NurseryDetailModal/NurseryDetailModal';
import { NewNurseryModal } from './components/NewNurseryModal/NewNurseryModal';
import { usePermission } from '@/hooks/usePermission';
import styles from './Nurseries.module.css';

import { downloadCsv } from '@/utils/fileExport';
const TYPES: NurseryType[] = [
  'Crossing block',
  'Selection nursery',
  'Multiplication',
  'Quarantine',
];

const SEASONS = ['Kharif 2026', 'Rabi 2026-27', 'Zaid 2027'];

export default function Nurseries() {
  const { addToast } = useToast();
  const [period, setPeriod] = useState<PeriodValue>('all');
  const { items: allNurseries, add, update, remove } = useRealtimeMockStore(initialNurseries, 'rd.nurseries');

  const nurseries = useMemo(
    () => allNurseries.filter((n) => isDateInPeriod(n.sownDate, period, RD_TODAY)),
    [allNurseries, period]
  );
  
  const canCreate = usePermission('create_nursery');
  const canInspect = usePermission('inspect_nursery');

  // Fetch programs to allow linking them in the creation wizard
  const programRefsList = useMemo(() => {
    return initialPrograms.map(p => p.id);
  }, []);

  // States
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom filters
  const [filterCrop, setFilterCrop] = useState('all');
  const [filterSeason, setFilterSeason] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const [selectedNurseryId, setSelectedNurseryId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Derived KPI Cards
  const kpis = useMemo(() => {
    const activeCount = nurseries.filter(n => n.status !== 'Completed').length;
    const totalCrosses = nurseries.reduce((acc, n) => acc + (n.crossesMade || 0), 0);
    const successfulCrosses = nurseries.reduce((acc, n) => acc + (n.crossesSuccessful || 0), 0);
    const totalPlants = nurseries.reduce((acc, n) => acc + (n.location.rows * n.location.plants), 0);
    const successRate = totalCrosses ? Math.round((successfulCrosses / totalCrosses) * 100) : 0;

    return [
      {
        label: 'Active nurseries',
        value: activeCount.toString(),
        icon: Compass,
        trend: { direction: 'up' as const, percentage: '+12%', isPositive: true },
        comparison: 'In field operations'
      },
      {
        label: 'Crosses planned',
        value: totalCrosses.toLocaleString(),
        icon: Activity,
        trend: { direction: 'up' as const, percentage: '+18%', isPositive: true },
        comparison: 'Across crossing blocks'
      },
      {
        label: 'Successful crosses',
        value: `${successfulCrosses.toLocaleString()}`,
        icon: Heart,
        trend: { direction: 'up' as const, percentage: `+${successRate}%`, isPositive: true },
        comparison: `${successRate}% hybridization rate`
      },
      {
        label: 'Plants observed',
        value: totalPlants.toLocaleString(),
        icon: Eye,
        trend: { direction: 'up' as const, percentage: '+6%', isPositive: true },
        comparison: 'Individual mapped slots'
      }
    ];
  }, [nurseries]);

  // Sowing Tabs
  const tabs = useMemo(() => [
    { key: 'all', label: 'All Nurseries', count: nurseries.length },
    { key: 'Planned', label: 'Planned', count: nurseries.filter(n => n.status === 'Planned').length },
    { key: 'Sown', label: 'Sown', count: nurseries.filter(n => n.status === 'Sown').length },
    { key: 'Growing', label: 'Growing', count: nurseries.filter(n => n.status === 'Growing').length },
    { key: 'Completed', label: 'Completed', count: nurseries.filter(n => n.status === 'Completed').length },
  ], [nurseries]);

  // Dynamic filter option dropdown lists
  const cropOptions = useMemo(() => {
    const crops = Array.from(new Set(nurseries.map(n => n.crop)));
    return [
      { label: 'All Crops', value: 'all' },
      ...crops.map(c => ({ label: c, value: c }))
    ];
  }, [nurseries]);

  const seasonOptions = useMemo(() => [
    { label: 'All Seasons', value: 'all' },
    ...SEASONS.map(s => ({ label: s, value: s }))
  ], []);

  const typeOptions = useMemo(() => [
    { label: 'All Types', value: 'all' },
    ...TYPES.map(t => ({ label: t, value: t }))
  ], []);

  // Filtering Logic
  const filteredNurseries = useMemo(() => {
    return nurseries.filter((n) => {
      // Sowing Tab Filter
      if (activeTab !== 'all' && n.status !== activeTab) return false;

      // Select Dropdowns Filters
      if (filterCrop !== 'all' && n.crop !== filterCrop) return false;
      if (filterSeason !== 'all' && n.season !== filterSeason) return false;
      if (filterType !== 'all' && n.type !== filterType) return false;

      // Search field
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          n.id.toLowerCase().includes(query) ||
          n.name.toLowerCase().includes(query) ||
          n.crop.toLowerCase().includes(query) ||
          n.location.facility.toLowerCase().includes(query) ||
          n.location.block.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [nurseries, activeTab, filterCrop, filterSeason, filterType, searchTerm]);

  // FilterBar configuration
  const filterConfig = [
    {
      label: 'Crop',
      key: 'crop',
      options: cropOptions,
      value: filterCrop,
      onChange: setFilterCrop,
    },
    {
      label: 'Season',
      key: 'season',
      options: seasonOptions,
      value: filterSeason,
      onChange: setFilterSeason,
    },
    {
      label: 'Type',
      key: 'type',
      options: typeOptions,
      value: filterType,
      onChange: setFilterType,
    },
  ];

  const handleStatusChange = (id: string, newStatus: Nursery['status']) => {
    update(id, { status: newStatus });
    addToast(`Nursery ${id} marked as ${newStatus}`, 'success');
  };

  const handleDelete = (id: string) => {
    remove(id);
    addToast(`Nursery ${id} removed successfully`, 'success');
  };

  const selectedNursery = nurseries.find(n => n.id === selectedNurseryId) || null;

  return (
    <ModuleLayout moduleName="Research & Development" moduleIcon={FlaskConical} navItems={rdNav}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Nurseries & crossing blocks</h1>
          <p className={styles.pageSubtitle}>Manage parental blocks, hybridizations, and early-generation plots</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Download}
            onClick={() => { downloadCsv(`nurseries_${new Date().toISOString().slice(0, 10)}.csv`, allNurseries.flatMap((n) => (n.entriesPlanted.length ? n.entriesPlanted : [null]).map((e) => ({ nursery: n.id, name: n.name, type: n.type, crop: n.crop, season: n.season, status: n.status, facility: n.location.facility, block: n.location.block, rows: n.location.rows, plantsPerRow: n.location.plants, entry: e?.entryCode ?? '', female: e?.parentFemale ?? '', male: e?.parentMale ?? '', plots: e?.plotsAssigned ?? '', survived: e?.survived ?? '' })))); addToast('Nursery layouts exported', 'success'); }}
          >
            Export
          </Button>
          {canInspect && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={ShieldCheck}
              onClick={() => {
                const active = allNurseries.filter((n) => n.status !== 'Completed' && n.status !== 'Planned');
                const pickName = window.prompt(`Inspect which nursery?\n${active.map((n) => `${n.id} — ${n.name}`).join('\n')}`, active[0]?.id ?? '');
                const n = active.find((x) => x.id === pickName?.trim()) ?? null;
                if (!n) return;
                const obs = window.prompt(`Inspection notes for ${n.name} (stand, off-types, disease)`);
                if (!obs?.trim()) return;
                update(n.id, { notes: [n.notes, `[Inspection ${new Date().toLocaleDateString('en-IN')}] ${obs.trim()}`].filter(Boolean).join('\n') });
                addToast(`Inspection recorded for ${n.name}`, 'success');
              }}
            >
              Start inspection
            </Button>
          )}
          {canCreate && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => setIsAddModalOpen(true)}
            >
              New nursery
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* KPI grid cards */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, idx) => (
          <KpiCard
            key={idx}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            trend={kpi.trend}
            comparison={kpi.comparison}
          />
        ))}
      </div>

      {/* Season Sowing Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Custom filter select dropdowns */}
      <div className={styles.filtersSection}>
        <FilterBar
          searchPlaceholder="Search nurseries by block name, facility, or crop..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filterConfig}
        />
      </div>

      {/* Card Grid Content Area */}
      <div className={styles.contentArea}>
        <div className={styles.grid}>
          {filteredNurseries.map((nursery, idx) => (
            <NurseryCard
              key={nursery.id}
              nursery={nursery}
              index={idx}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onClick={setSelectedNurseryId}
            />
          ))}
          {filteredNurseries.length === 0 && (
            <div className={styles.emptyState}>
              No active nurseries found matching selected filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* Detail Deep-dive Modal */}
      {selectedNursery && (
        <NurseryDetailModal
          isOpen={!!selectedNurseryId}
          onClose={() => setSelectedNurseryId(null)}
          nursery={selectedNursery}
        />
      )}

      {/* Creation stepper modal */}
      <NewNurseryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddNursery={add}
        programOptions={programRefsList}
      />
    </ModuleLayout>
  );
}
