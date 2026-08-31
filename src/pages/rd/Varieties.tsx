import { useState, useMemo } from 'react';
import { FlaskConical, Sprout, Award, Hourglass, Clock, Plus, Upload } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { KpiCard } from '@/pages/warehouse/components/KpiCard/KpiCard';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { ViewToggle } from '@/components/common/ViewToggle/ViewToggle';
import { Button } from '@/components/common/Button/Button';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { ActionMenu } from '@/components/common/ActionMenu/ActionMenu';
import { useToast } from '@/components/common/Toast/ToastContext';
import { rdNav } from '@/config/rdNav';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { varieties as mockVarieties } from './mockData/varietiesData';
import { registrations as mockRegistrations } from './mockData/registrationsData';
import { Variety, AgroClimaticZone } from '@/types/rd';
import { VarietyCard } from './components/VarietyCard/VarietyCard';
import { VarietyDetailModal } from './components/VarietyDetailModal/VarietyDetailModal';
import { NewVarietyModal } from './components/NewVarietyModal/NewVarietyModal';
import { usePermission } from '@/hooks/usePermission';
import styles from './Varieties.module.css';

export default function Varieties() {
  const { addToast } = useToast();
  const { items, add, update } = useRealtimeMockStore<Variety>(mockVarieties);
  const { items: allRegistrations } = useRealtimeMockStore(mockRegistrations);

  const canPropose = usePermission('propose_variety_advancement');
  const canApprove = usePermission('approve_variety_advancement');

  // Layout State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Dynamic KPIs
  const kpis = useMemo(() => {
    const released = items.filter(v => v.status === 'Released').length;
    const candidates = items.filter(v => v.status === 'Candidate').length;
    const prerelease = items.filter(v => v.status === 'Pre-release').length;
    return [
      { title: 'Released varieties', value: released.toString(), icon: Award, sublabel: 'Commercial portfolio' },
      { title: 'Candidates in pipeline', value: candidates.toString(), icon: Sprout, sublabel: 'Under MLT testing' },
      { title: 'Pre-release stage', value: prerelease.toString(), icon: Hourglass, sublabel: 'Awaiting final approval' },
      { title: 'Avg years to release', value: '6.8', icon: Clock, sublabel: 'Cycle from cross to release' }
    ];
  }, [items]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      All: items.length,
      Candidate: items.filter(v => v.status === 'Candidate').length,
      'Pre-release': items.filter(v => v.status === 'Pre-release').length,
      Released: items.filter(v => v.status === 'Released').length,
      Withdrawn: items.filter(v => v.status === 'Withdrawn').length,
    };
  }, [items]);

  const tabs = [
    { key: 'All', label: `All (${tabCounts.All})` },
    { key: 'Candidate', label: `Candidate (${tabCounts.Candidate})` },
    { key: 'Pre-release', label: `Pre-release (${tabCounts['Pre-release']})` },
    { key: 'Released', label: `Released (${tabCounts.Released})` },
    { key: 'Withdrawn', label: `Withdrawn (${tabCounts.Withdrawn})` },
  ];

  // Unique filter values derived from data
  const cropOptions = useMemo(() => 
    Array.from(new Set(items.map(v => v.crop).filter(Boolean))).sort(),
  [items]);

  const categoryOptions = useMemo(() => 
    Array.from(new Set(items.map(v => v.category).filter(Boolean))).sort(),
  [items]);

  const ipOptions = useMemo(() => 
    Array.from(new Set(items.map(v => v.ipProtection).filter(Boolean))).sort(),
  [items]);

  const zoneOptions = useMemo(() => {
    const zones = items.flatMap(v => v.recommendedZones || []);
    return Array.from(new Set(zones)).sort();
  }, [items]);

  // Filter Data
  const filteredVarieties = useMemo(() => {
    return items.filter(v => {
      // 1. Tab Status
      if (activeTab !== 'All' && v.status !== activeTab) {
        return false;
      }
      // 2. Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = v.name.toLowerCase().includes(q);
        const matchesId = v.id.toLowerCase().includes(q);
        const matchesCrop = v.crop.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesCrop) return false;
      }
      // 3. Dropdowns
      if (filters.crop && filters.crop !== 'all' && v.crop !== filters.crop) {
        return false;
      }
      if (filters.category && filters.category !== 'all' && v.category !== filters.category) {
        return false;
      }
      if (filters.ip && filters.ip !== 'all' && v.ipProtection !== filters.ip) {
        return false;
      }
      if (filters.zone && filters.zone !== 'all' && !v.recommendedZones?.includes(filters.zone as AgroClimaticZone)) {
        return false;
      }
      return true;
    });
  }, [items, activeTab, searchTerm, filters]);

  // Map FilterBar config
  const filterConfig = [
    {
      key: 'crop',
      label: 'Crop',
      options: [{ value: 'all', label: 'All crops' }, ...cropOptions.map(c => ({ value: c, label: c }))],
      value: filters.crop || 'all',
      onChange: (val: string) => setFilters(p => ({ ...p, crop: val }))
    },
    {
      key: 'category',
      label: 'Category',
      options: [{ value: 'all', label: 'All categories' }, ...categoryOptions.map(cat => ({ value: cat, label: cat }))],
      value: filters.category || 'all',
      onChange: (val: string) => setFilters(p => ({ ...p, category: val }))
    },
    {
      key: 'ip',
      label: 'IP Protection',
      options: [{ value: 'all', label: 'All protections' }, ...ipOptions.map(ip => ({ value: ip, label: ip }))],
      value: filters.ip || 'all',
      onChange: (val: string) => setFilters(p => ({ ...p, ip: val }))
    },
    {
      key: 'zone',
      label: 'Zone',
      options: [{ value: 'all', label: 'All zones' }, ...zoneOptions.map(z => ({ value: z, label: z }))],
      value: filters.zone || 'all',
      onChange: (val: string) => setFilters(p => ({ ...p, zone: val }))
    }
  ];

  // Details Modal handler
  const handleOpenDetails = (variety: Variety) => {
    setSelectedVariety(variety);
    setIsDetailModalOpen(true);
  };

  const handleAction = (action: string, variety: Variety) => {
    if (action === 'withdraw') {
      update(variety.id, { status: 'Withdrawn', notes: 'Withdrawn by compliance desk during operations review' });
      addToast(`Variety ${variety.name} has been marked as withdrawn.`, 'warning');
      setIsDetailModalOpen(false);
    } else if (action === 'release') {
      update(variety.id, { status: 'Released', releaseYear: new Date().getFullYear() });
      addToast(`Variety ${variety.name} marked as officially released.`, 'success');
      setIsDetailModalOpen(false);
    } else if (action === 'edit') {
      addToast('Variety specs editor initialized.', 'info');
    } else if (action === 'register') {
      addToast('Initiating registration application filing...', 'success');
    }
  };

  // Table Columns Setup
  const columns = [
    {
      key: 'id',
      label: 'Variety ID',
      width: '130px',
      render: (v: Variety) => (
        <span 
          className={styles.idLink} 
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetails(v);
          }}
        >
          {v.id}
        </span>
      )
    },
    {
      key: 'name',
      label: 'Variety Name',
      render: (v: Variety) => (
        <div>
          <strong className={styles.tableName}>{v.name}</strong>
          <span className={styles.tableCropBadge}>{v.crop}</span>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      width: '110px',
      render: (v: Variety) => <span className={styles.tableChip}>{v.category}</span>
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (v: Variety) => {
        const badgeClass = v.status === 'Released' ? styles.releasedBadge : (v.status === 'Pre-release' ? styles.prereleaseBadge : (v.status === 'Candidate' ? styles.candidateBadge : styles.withdrawnBadge));
        return <StatusBadge status={v.status} className={badgeClass} />;
      }
    },
    {
      key: 'yield',
      label: 'Yield Potential',
      width: '110px',
      align: 'right' as const,
      render: (v: Variety) => <span className={styles.mono}>{v.agronomicSpecs.yieldPotential} q/ha</span>
    },
    {
      key: 'maturity',
      label: 'Maturity Cycle',
      width: '110px',
      render: (v: Variety) => <span>{v.agronomicSpecs.daysToMaturity} days</span>
    },
    {
      key: 'zones',
      label: 'Adaptation Zones',
      width: '160px',
      render: (v: Variety) => {
        const zones = v.recommendedZones || [];
        if (zones.length === 0) return '—';
        return (
          <div className={styles.miniChips}>
            <span className={styles.miniChip}>{zones[0]}</span>
            {zones.length > 1 && <span className={styles.miniChipCount}>+{zones.length - 1}</span>}
          </div>
        );
      }
    },
    {
      key: 'ip',
      label: 'IP Protection',
      width: '130px',
      render: (v: Variety) => {
        let labelClass = styles.ipNone;
        if (v.ipProtection.startsWith('PVP')) labelClass = styles.ipPvp;
        else if (v.ipProtection === 'Patent') labelClass = styles.ipPatent;
        else if (v.ipProtection === 'Trade secret') labelClass = styles.ipSecret;
        return <span className={`${styles.ipBadge} ${labelClass}`}>{v.ipProtection.split(' ')[0]}</span>;
      }
    },
    {
      key: 'releaseYear',
      label: 'Release Year',
      width: '110px',
      render: (v: Variety) => <span>{v.releaseYear || '—'}</span>
    },
    {
      key: 'actions',
      label: '',
      width: '60px',
      render: (v: Variety) => {
        const rowMenuItems = [
          { label: 'View variety details', onClick: () => handleOpenDetails(v) },
          ...(canPropose ? [{ label: 'Edit specs', onClick: () => handleAction('edit', v) }] : []),
          ...(canApprove && v.status === 'Pre-release' ? [{ label: 'Mark as released', onClick: () => handleAction('release', v) }] : []),
          ...(canApprove && v.status !== 'Withdrawn' ? [{ label: 'Withdraw variety', onClick: () => handleAction('withdraw', v), variant: 'danger' as const }] : [])
        ];
        return <ActionMenu items={rowMenuItems} />;
      }
    }
  ];

  return (
    <ModuleLayout moduleName="R&D" moduleIcon={FlaskConical} navItems={rdNav}>
      {/* Inline Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Variety portfolio</h1>
          <p className={styles.pageSubtitle}>Manage released varieties, pre-release candidates, and IP filings</p>
        </div>
        <div className={styles.headerActions}>
          <ViewToggle view={viewMode} onChange={setViewMode} />
          <Button 
            variant="secondary" 
            leftIcon={Upload}
            onClick={() => addToast('Exporting catalog as CSV...', 'info')}
          >
            Export
          </Button>
          {canPropose && (
            <Button 
              variant="primary" 
              leftIcon={Plus}
              onClick={() => setIsAddModalOpen(true)}
            >
              New variety
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* KPI Cards Strip */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, idx) => (
          <KpiCard
            key={idx}
            label={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            comparison={kpi.sublabel}
            trend={
              idx === 0
                ? { direction: 'up', percentage: '+4%', isPositive: true }
                : idx === 1
                ? { direction: 'up', percentage: '+10%', isPositive: true }
                : idx === 2
                ? { direction: 'up', percentage: '+8%', isPositive: true }
                : { direction: 'down', percentage: '-5%', isPositive: true }
            }
          />
        ))}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Filters Bar */}
      <div className={styles.filtersSection}>
        <FilterBar
          searchPlaceholder="Search variety by name, ID or crop..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filterConfig}
        />
      </div>

      {/* Content Display Area */}
      <div className={styles.contentArea}>
        {filteredVarieties.length === 0 ? (
          <div className={styles.emptyState}>
            <Sprout size={48} className={styles.emptyIcon} />
            <h3>No varieties match your query</h3>
            <p>Refine your filters, search terms, or status selections above.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className={styles.grid}>
            {filteredVarieties.map((v, index) => {
              const hasReg = allRegistrations.some(r => r.varietyRef === v.id);
              return (
                <VarietyCard 
                  key={v.id} 
                  variety={v} 
                  index={index} 
                  onClick={() => handleOpenDetails(v)}
                  hasRegistration={hasReg}
                  onAction={(action) => handleAction(action, v)}
                />
              );
            })}
          </div>
        ) : (
          <div className={styles.tableCard}>
            <DataTable
              columns={columns}
              data={filteredVarieties}
              rowKey="id"
              onRowClick={handleOpenDetails}
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && (
        <VarietyDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          variety={selectedVariety}
          hasRegistration={allRegistrations.some(r => r.varietyRef === selectedVariety?.id)}
          onAction={handleAction}
        />
      )}

      {/* Wizard Form Modal */}
      {isAddModalOpen && (
        <NewVarietyModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddVariety={add}
        />
      )}
    </ModuleLayout>
  );
}
