import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Download, Plus, MapPin, Activity, CheckCircle, Database } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { ActionMenu } from '@/components/common/ActionMenu/ActionMenu';
import { KpiCard } from '@/pages/warehouse/components/KpiCard/KpiCard';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { rdNav } from '@/config/rdNav';
import { trials as initialTrials } from './mockData/trialsData';
import { Trial, TrialType, TrialDesign } from '@/types/rd';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { RD_TODAY, isDateInPeriod, isYearInPeriod, type PeriodValue } from '@/utils/periodFilter';
import { NewTrialModal } from './components/NewTrialModal/NewTrialModal';
import { usePermission } from '@/hooks/usePermission';
import styles from './Trials.module.css';

const TYPES: TrialType[] = ['Single-location', 'Multi-location', 'On-farm', 'Demonstration'];
const DESIGNS: TrialDesign[] = ['RCBD', 'CRD', 'Alpha-lattice', 'Augmented', 'Split-plot'];
const SEASONS = ['Kharif 2025', 'Rabi 2025-26', 'Zaid 2026', 'Kharif 2026'];

export default function Trials() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [period, setPeriod] = useState<PeriodValue>('all');
  const { items: allTrials, add, update, remove } = useRealtimeMockStore(initialTrials);

  const trialsList = useMemo(
    () => allTrials.filter((t) => isDateInPeriod(t.startDate, period, RD_TODAY)),
    [allTrials, period]
  );

  const canDesign = usePermission('design_trial');
  const canExecute = usePermission('execute_trial');
  const canAnalyze = usePermission('analyze_trial_data');
  const canApprove = usePermission('approve_trial_protocol');
  const canInspect = usePermission('verify_field_observations');

  // States
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom Filters
  const [filterCrop, setFilterCrop] = useState('all');
  const [filterSeason, setFilterSeason] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDesign, setFilterDesign] = useState('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Derived KPI Cards dynamically based on active items in the store
  const kpis = useMemo(() => {
    const totalCount = trialsList.length;
    const activeCount = trialsList.filter(t => t.status === 'In progress' || t.status === 'Sown').length;
    const totalLocations = trialsList.reduce((acc, t) => acc + t.locations.length, 0);
    const analyzedCount = trialsList.filter(t => t.status === 'Analyzed' || t.status === 'Completed').length;

    return [
      {
        label: 'Active experiments',
        value: activeCount.toString(),
        icon: Activity,
        trend: { direction: 'up' as const, percentage: '+8%', isPositive: true },
        comparison: `Out of ${totalCount} total trials`
      },
      {
        label: 'Total testing sites',
        value: totalLocations.toString(),
        icon: MapPin,
        trend: { direction: 'up' as const, percentage: '+15%', isPositive: true },
        comparison: 'Across India centers'
      },
      {
        label: 'Completed analyses',
        value: analyzedCount.toString(),
        icon: CheckCircle,
        trend: { direction: 'up' as const, percentage: `+2`, isPositive: true },
        comparison: 'ANOVA/BLUP stats ready'
      },
      {
        label: 'Acreage under trials',
        value: '14.2 ha',
        icon: Database,
        trend: { direction: 'up' as const, percentage: '+1.5 ha', isPositive: true },
        comparison: 'For crop line testing'
      }
    ];
  }, [trialsList]);

  // Sowing Tabs
  const tabs = useMemo(() => [
    { key: 'all', label: 'All Trials', count: trialsList.length },
    { key: 'Planning', label: 'Planning', count: trialsList.filter(t => t.status === 'Planning').length },
    { key: 'Sown', label: 'Sown', count: trialsList.filter(t => t.status === 'Sown').length },
    { key: 'In progress', label: 'In Progress', count: trialsList.filter(t => t.status === 'In progress').length },
    { key: 'Harvested', label: 'Harvested', count: trialsList.filter(t => t.status === 'Harvested').length },
    { key: 'Analyzed', label: 'Analyzed', count: trialsList.filter(t => t.status === 'Analyzed').length },
    { key: 'Completed', label: 'Completed', count: trialsList.filter(t => t.status === 'Completed').length },
  ], [trialsList]);

  // Dynamic filter options based on available mock data
  const cropOptions = useMemo(() => {
    const crops = Array.from(new Set(trialsList.map(t => t.crop)));
    return [
      { label: 'All Crops', value: 'all' },
      ...crops.map(c => ({ label: c, value: c }))
    ];
  }, [trialsList]);

  const seasonOptions = useMemo(() => [
    { label: 'All Seasons', value: 'all' },
    ...SEASONS.map(s => ({ label: s, value: s }))
  ], []);

  const typeOptions = useMemo(() => [
    { label: 'All Types', value: 'all' },
    ...TYPES.map(t => ({ label: t, value: t }))
  ], []);

  const designOptions = useMemo(() => [
    { label: 'All Designs', value: 'all' },
    ...DESIGNS.map(d => ({ label: d, value: d }))
  ], []);

  // Filter Logic
  const filteredTrials = useMemo(() => {
    return trialsList.filter((trial) => {
      // Tab Status filter
      if (activeTab !== 'all' && trial.status !== activeTab) return false;

      // Dropdowns
      if (filterCrop !== 'all' && trial.crop !== filterCrop) return false;
      if (filterSeason !== 'all' && trial.season !== filterSeason) return false;
      if (filterType !== 'all' && trial.type !== filterType) return false;
      if (filterDesign !== 'all' && trial.design !== filterDesign) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          trial.id.toLowerCase().includes(query) ||
          trial.name.toLowerCase().includes(query) ||
          trial.crop.toLowerCase().includes(query) ||
          trial.leadResearcher.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [trialsList, activeTab, filterCrop, filterSeason, filterType, filterDesign, searchTerm]);

  // Filter bar config
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
    {
      label: 'Design',
      key: 'design',
      options: designOptions,
      value: filterDesign,
      onChange: setFilterDesign,
    },
  ];

  // DataTable Columns Configuration
  const columns = [
    {
      key: 'id',
      label: 'Trial ID',
      render: (t: Trial) => (
        <span className={styles.trialIdText} onClick={() => navigate(`/rd/trials/${t.id}`)}>
          {t.id}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Trial / Experiment Name',
      render: (t: Trial) => (
        <div>
          <div className={styles.tableName} onClick={() => navigate(`/rd/trials/${t.id}`)}>{t.name}</div>
          <div className={styles.tableSubtitle}>{t.crop} · {t.season}</div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type & Design',
      render: (t: Trial) => (
        <div>
          <span className={styles.tableChip}>{t.type}</span>
          <div className={styles.tableSubtitle}>{t.design}</div>
        </div>
      ),
    },
    {
      key: 'locations',
      label: 'Sites / Plots',
      render: (t: Trial) => (
        <div>
          <span className={styles.locationsCount}>{t.locations.length} Stations</span>
          <div className={styles.tableSubtitle}>{t.totalPlots} total plots</div>
        </div>
      ),
    },
    {
      key: 'leadResearcher',
      label: 'Lead Scientist',
      render: (t: Trial) => (
        <span className={styles.scientistText}>{t.leadResearcher}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (t: Trial) => <StatusBadge status={t.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (t: Trial) => (
        <ActionMenu
          items={[
            { label: 'View experimental detail', onClick: () => navigate(`/rd/trials/${t.id}`) },
            ...(canApprove ? [
              { label: 'Approve protocol', onClick: () => { update(t.id, { status: 'In progress' }); addToast(`Protocol approved`, 'success'); } },
            ] : []),
            ...(canExecute ? [
              { label: 'Mark Sown', onClick: () => { update(t.id, { status: 'Sown' }); addToast(`Trial ${t.id} status updated to Sown`, 'success'); } },
              { label: 'Mark In Progress', onClick: () => { update(t.id, { status: 'In progress' }); addToast(`Trial ${t.id} status updated to In progress`, 'success'); } },
              { label: 'Mark Harvested', onClick: () => { update(t.id, { status: 'Harvested' }); addToast(`Trial ${t.id} status updated to Harvested`, 'success'); } },
            ] : []),
            ...(canAnalyze ? [
              { label: 'Set Analyzed', onClick: () => { update(t.id, { status: 'Analyzed' }); addToast(`Trial ${t.id} status updated to Analyzed`, 'success'); } },
              { label: 'Set Completed', onClick: () => { update(t.id, { status: 'Completed' }); addToast(`Trial ${t.id} status updated to Completed`, 'success'); } },
            ] : []),
            ...(canInspect ? [
              { label: 'Record field inspection', onClick: () => addToast('Field inspection recorded', 'success') },
              { label: 'Flag data issue', onClick: () => addToast('Data issue flagged', 'warning') },
            ] : []),
            ...(canApprove ? [
              { label: 'Remove Trial', onClick: () => { remove(t.id); addToast(`Trial ${t.id} removed successfully`, 'success'); }, variant: 'danger' as const },
            ] : []),
          ]}
        />
      ),
    },
  ];

  return (
    <ModuleLayout moduleName="Research & Development" moduleIcon={FlaskConical} navItems={rdNav}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Trials & Field Experiments</h1>
          <p className={styles.pageSubtitle}>Multi-location trials (MLT), agricultural research farms, and field plot grids</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Download}
            onClick={() => addToast('Exporting trials dataset summary...', 'info')}
          >
            Export
          </Button>
          {canDesign && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => setIsAddModalOpen(true)}
            >
              New Trial
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* KPI Cards Grid */}
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

      {/* Trial Status Count Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Filters and Search Bar */}
      <div className={styles.filtersSection}>
        <FilterBar
          searchPlaceholder="Search experiments by ID, trial name, scientist, or crop..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filterConfig}
        />
      </div>

      {/* Main DataTable list area */}
      <div className={styles.contentArea}>
        <div className={styles.tableWrap}>
          <DataTable
            data={filteredTrials}
            columns={columns}
            rowKey="id"
            onRowClick={(item) => navigate(`/rd/trials/${item.id}`)}
          />
          {filteredTrials.length === 0 && (
            <div className={styles.emptyState}>
              No active research trials found matching selected filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* Stepper creation wizard */}
      <NewTrialModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTrial={add}
      />
    </ModuleLayout>
  );
}
