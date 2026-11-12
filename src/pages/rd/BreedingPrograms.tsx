import { useState, useMemo } from 'react';
import {
  FlaskConical,
  Workflow,
  Clock,
  Award,
  Target,
  Download,
  Plus,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { KpiCard } from '@/pages/warehouse/components/KpiCard/KpiCard';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { rdNav } from '@/config/rdNav';
import { programs as initialPrograms } from './mockData/breedingData';
import { BreedingProgram, BreedingObjective, GenerationStage } from '@/types/rd';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { RD_TODAY, isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import { BreedingProgramCard } from './components/BreedingProgramCard/BreedingProgramCard';
import { NewProgramModal } from './components/NewProgramModal/NewProgramModal';
import { usePermission } from '@/hooks/usePermission';
import styles from './BreedingPrograms.module.css';

const STAGES: GenerationStage[] = [
  'P (parents)',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6+',
  'Pre-release',
  'Released',
];

const OBJECTIVES: BreedingObjective[] = [
  'Yield improvement',
  'Disease resistance',
  'Stress tolerance',
  'Quality traits',
  'Hybrid development',
  'Variety release',
];

export default function BreedingPrograms() {
  const { addToast } = useToast();
  const [period, setPeriod] = useState<PeriodValue>('all');
  const { items: allPrograms, add, update, remove } = useRealtimeMockStore(initialPrograms, 'rd.programs');

  const programs = useMemo(
    () => allPrograms.filter((p) => isDateInPeriod(p.startDate, period, RD_TODAY)),
    [allPrograms, period]
  );

  const canCreate = usePermission('create_breeding_program');

  // States
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom filters
  const [filterCrop, setFilterCrop] = useState('all');
  const [filterObjective, setFilterObjective] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterBreeder, setFilterBreeder] = useState('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Derived KPI data
  const kpis = useMemo(() => {
    const activeCount = programs.filter(p => p.status === 'Active').length;
    const preReleaseCount = programs.filter(p => p.currentStage === 'Pre-release').length;
    const cropCount = new Set(programs.map(p => p.crop)).size;

    return [
      {
        label: 'Active programs',
        value: activeCount.toString(),
        icon: Workflow,
        trend: { direction: 'up' as const, percentage: '+8%', isPositive: true },
        comparison: `across ${cropCount} crops`
      },
      {
        label: 'Avg cycle time',
        value: '2.4 years',
        icon: Clock,
        trend: { direction: 'down' as const, percentage: '-12%', isPositive: true }, // decreasing cycle time is positive
        comparison: 'From P to release'
      },
      {
        label: 'Pre-release stage',
        value: preReleaseCount.toString(),
        icon: Award,
        trend: { direction: 'up' as const, percentage: '+25%', isPositive: true },
        comparison: 'Ready for release'
      },
      {
        label: 'Success rate',
        value: '68%',
        icon: Target,
        trend: { direction: 'up' as const, percentage: '+3%', isPositive: true },
        comparison: 'Programs reaching release'
      }
    ];
  }, [programs]);

  // Status Tabs
  const tabs = useMemo(() => [
    { key: 'all', label: 'All', count: programs.length },
    { key: 'Planning', label: 'Planning', count: programs.filter(p => p.status === 'Planning').length },
    { key: 'Active', label: 'Active', count: programs.filter(p => p.status === 'Active').length },
    { key: 'On hold', label: 'On hold', count: programs.filter(p => p.status === 'On hold').length },
    { key: 'Completed', label: 'Completed', count: programs.filter(p => p.status === 'Completed').length },
  ], [programs]);

  // Filter options lists
  const cropOptions = useMemo(() => {
    const crops = Array.from(new Set(programs.map(p => p.crop)));
    return [
      { label: 'All Crops', value: 'all' },
      ...crops.map(c => ({ label: c, value: c }))
    ];
  }, [programs]);

  const objectiveOptions = useMemo(() => [
    { label: 'All Objectives', value: 'all' },
    ...OBJECTIVES.map(o => ({ label: o, value: o }))
  ], []);

  const stageOptions = useMemo(() => [
    { label: 'All Stages', value: 'all' },
    ...STAGES.map(s => ({ label: s, value: s }))
  ], []);

  const breederOptions = useMemo(() => {
    const breeders = Array.from(new Set(programs.map(p => p.leadBreeder).filter(Boolean)));
    return [
      { label: 'All Breeders', value: 'all' },
      ...breeders.map(b => ({ label: b, value: b }))
    ];
  }, [programs]);

  // Filtering Logic
  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      // Tab status filter
      if (activeTab !== 'all' && p.status !== activeTab) return false;

      // Filter select dropdowns
      if (filterCrop !== 'all' && p.crop !== filterCrop) return false;
      if (filterObjective !== 'all' && p.objective !== filterObjective) return false;
      if (filterStage !== 'all' && p.currentStage !== filterStage) return false;
      if (filterBreeder !== 'all' && p.leadBreeder !== filterBreeder) return false;

      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          p.id.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query) ||
          p.crop.toLowerCase().includes(query) ||
          p.leadBreeder.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [programs, activeTab, filterCrop, filterObjective, filterStage, filterBreeder, searchTerm]);

  // Filter config for FilterBar
  const filterConfig = [
    {
      label: 'Crop',
      key: 'crop',
      options: cropOptions,
      value: filterCrop,
      onChange: setFilterCrop,
    },
    {
      label: 'Objective',
      key: 'objective',
      options: objectiveOptions,
      value: filterObjective,
      onChange: setFilterObjective,
    },
    {
      label: 'Stage',
      key: 'stage',
      options: stageOptions,
      value: filterStage,
      onChange: setFilterStage,
    },
    {
      label: 'Lead Breeder',
      key: 'breeder',
      options: breederOptions,
      value: filterBreeder,
      onChange: setFilterBreeder,
    },
  ];

  const handleStatusChange = (id: string, newStatus: BreedingProgram['status']) => {
    update(id, { status: newStatus });
    addToast(`Program ${id} marked as ${newStatus}`, 'success');
  };

  const handleArchive = (id: string) => {
    remove(id);
    addToast(`Program ${id} archived successfully`, 'success');
  };

  const handleAddProgram = (newProgram: BreedingProgram) => {
    add(newProgram);
    addToast(`Program ${newProgram.id} created`, 'success');
    setIsAddModalOpen(false);
  };

  const handleExport = () => {
    addToast('Exporting breeding programs as CSV', 'success');
  };

  return (
    <ModuleLayout moduleName="Research & Development" moduleIcon={FlaskConical} navItems={rdNav}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Breeding programs</h1>
          <p className={styles.pageSubtitle}>Plan crosses, advance generations, track variety pipelines</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          <Button variant="secondary" size="sm" leftIcon={Download} onClick={handleExport}>
            Export
          </Button>
          {canCreate && (
            <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setIsAddModalOpen(true)}>
              New program
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <KpiCard
            key={i}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            trend={kpi.trend}
            comparison={kpi.comparison}
          />
        ))}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Filter Bar */}
      <div className={styles.filtersSection}>
        <FilterBar
          searchPlaceholder="Search programs by name, ID or crop..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filterConfig}
        />
      </div>

      {/* Content Area */}
      <div className={styles.contentArea}>
        {filteredPrograms.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="No programs match your filters"
            description="Try adjusting the tab or filter selections, or create a new program."
          />
        ) : (
          <div className={styles.grid}>
            {filteredPrograms.map((program, index) => (
              <BreedingProgramCard
                key={program.id}
                program={program}
                index={index}
                onStatusChange={handleStatusChange}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stepper creation modal */}
      {isAddModalOpen && (
        <NewProgramModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddProgram={handleAddProgram}
        />
      )}
    </ModuleLayout>
  );
}
