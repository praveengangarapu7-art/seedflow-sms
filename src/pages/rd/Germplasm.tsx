import React, { useState, useMemo } from 'react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { KpiCard } from '@/pages/warehouse/components/KpiCard/KpiCard';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { ViewToggle } from '@/components/common/ViewToggle/ViewToggle';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { ActionMenu } from '@/components/common/ActionMenu/ActionMenu';
import { useToast } from '@/components/common/Toast/ToastContext';
import { FlaskConical, Sprout, Database, AlertCircle, Archive, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { rdNav } from '@/config/rdNav';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { accessions as mockAccessions, germplasmKpis } from './mockData/germplasmData';
import type { GermplasmAccession } from '@/types/rd';
import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { usePermission } from '@/hooks/usePermission';

import { AccessionCard } from './components/AccessionCard/AccessionCard';
import { NewAccessionFormModal } from './components/NewAccessionFormModal/NewAccessionFormModal';
import { AccessionDetailModal } from './components/AccessionDetailModal/AccessionDetailModal';

import styles from './Germplasm.module.css';

export default function Germplasm() {
  const { addToast } = useToast();
  const { items } = useRealtimeMockStore<GermplasmAccession>(mockAccessions);
  
  const canCatalog = usePermission('catalog_germplasm');
  const canArchive = usePermission('archive_germplasm');

  // State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  
  // Trait quick-filters
  const [activeTraitFilters, setActiveTraitFilters] = useState<string[]>([]);
  const traitFilterOptions = [
    'Drought tolerant', 'Disease resistant', 'High yield', 'Early maturity',
    'Heat tolerant', 'Salt tolerant', 'Has genomic data', 'Has pedigree'
  ];

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailModalId, setDetailModalId] = useState<string | null>(null);

  // Derived options for FilterBar
  const cropOptions = useMemo(() => 
    Array.from(new Set(items.map((a: GermplasmAccession) => a.crop).filter(Boolean))).sort() as string[],
  [items]);

  const originOptions = useMemo(() => 
    Array.from(new Set(items.map((a: GermplasmAccession) => a.origin.country).filter(Boolean))).sort() as string[],
  [items]);

  // Derived filtered data
  const filteredItems = useMemo(() => {
    let result: GermplasmAccession[] = [...items];

    // 1. Tab filter
    if (activeTab !== 'All') {
      result = result.filter((a: GermplasmAccession) => a.status === activeTab);
    }

    // 2. Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((a: GermplasmAccession) => 
        a.name.toLowerCase().includes(q) || 
        a.accessionNumber.toLowerCase().includes(q) ||
        a.crop.toLowerCase().includes(q)
      );
    }

    // 3. Dropdown filters
    if (filters.crop && filters.crop !== 'all') {
      result = result.filter((a: GermplasmAccession) => a.crop === filters.crop);
    }
    if (filters.type && filters.type !== 'all') {
      result = result.filter((a: GermplasmAccession) => a.type === filters.type);
    }
    if (filters.origin && filters.origin !== 'all') {
      result = result.filter((a: GermplasmAccession) => a.origin.country === filters.origin);
    }
    if (filters.status && filters.status !== 'all') {
      result = result.filter((a: GermplasmAccession) => a.status === filters.status);
    }

    // 4. Trait quick filters (AND logic)
    if (activeTraitFilters.length > 0) {
      result = result.filter((a: GermplasmAccession) => {
        return activeTraitFilters.every(tf => {
          if (tf === 'Has genomic data') return a.hasGenomicData;
          if (tf === 'Has pedigree') return !!(a.parentMaleId || a.parentFemaleId);
          // Simple string match for traits
          return a.traits.some((t: any) => t.name.toLowerCase().includes(tf.toLowerCase().replace(' tolerant', ' tolerance').replace(' resistant', ' resistance').replace('high ', '')));
        });
      });
    }

    return result;
  }, [items, activeTab, searchTerm, filters, activeTraitFilters]);

  // Derived tab counts
  const tabCounts = useMemo(() => ({
    'All': items.length,
    'Active': items.filter((a: GermplasmAccession) => a.status === 'Active').length,
    'Quarantine': items.filter((a: GermplasmAccession) => a.status === 'Quarantine').length,
    'Archived': items.filter((a: GermplasmAccession) => a.status === 'Archived').length,
    'Restricted': items.filter((a: GermplasmAccession) => a.status === 'Restricted').length,
  }), [items]);

  const tabs = [
    { key: 'All', label: `All (${tabCounts['All']})` },
    { key: 'Active', label: `Active (${tabCounts['Active']})` },
    { key: 'Quarantine', label: `Quarantine (${tabCounts['Quarantine']})` },
    { key: 'Archived', label: `Archived (${tabCounts['Archived']})` },
    { key: 'Restricted', label: `Restricted (${tabCounts['Restricted']})` },
  ];

  const handleTraitFilterToggle = (trait: string) => {
    setActiveTraitFilters(prev => 
      prev.includes(trait) ? prev.filter(t => t !== trait) : [...prev, trait]
    );
  };

  // Check URL params for ?action=new
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setIsAddModalOpen(true);
      // Clean up URL so it doesn't reopen on refresh
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const filterConfig = [
    {
      key: 'crop',
      label: 'Crop',
      options: [{ value: 'all', label: 'All crops' }, ...cropOptions.map(c => ({ value: c, label: c }))],
      value: filters.crop || 'all',
      onChange: (val: string) => setFilters(p => ({...p, crop: val}))
    },
    {
      key: 'type',
      label: 'Type',
      options: [
        { value: 'all', label: 'All types' },
        { value: 'Landrace', label: 'Landrace' },
        { value: 'Wild relative', label: 'Wild relative' },
        { value: 'Cultivar', label: 'Cultivar' },
        { value: 'Breeding line', label: 'Breeding line' },
        { value: 'Hybrid', label: 'Hybrid' },
        { value: 'Genetic stock', label: 'Genetic stock' },
      ],
      value: filters.type || 'all',
      onChange: (val: string) => setFilters(p => ({...p, type: val}))
    },
    {
      key: 'origin',
      label: 'Origin',
      options: [{ value: 'all', label: 'All origins' }, ...originOptions.map(o => ({ value: o, label: o }))],
      value: filters.origin || 'all',
      onChange: (val: string) => setFilters(p => ({...p, origin: val}))
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All statuses' },
        { value: 'Active', label: 'Active' },
        { value: 'Quarantine', label: 'Quarantine' },
        { value: 'Archived', label: 'Archived' },
        { value: 'Restricted', label: 'Restricted' },
      ],
      value: filters.status || 'all',
      onChange: (val: string) => setFilters(p => ({...p, status: val}))
    }
  ];

  // DataTable columns
  const columns: DataTableColumn<GermplasmAccession>[] = [
    { 
      key: 'checkbox',
      label: '☐',
      render: () => <input type="checkbox" style={{cursor: 'pointer'}} />
    },
    { key: 'accessionNumber', label: 'Accession #' },
    { 
      key: 'name', 
      label: 'Name',
      render: (a: GermplasmAccession) => (
        <div>
          <div className={styles.tableName}>{a.name}</div>
          <div className={styles.tableId}>{a.id}</div>
        </div>
      )
    },
    { key: 'crop', label: 'Crop' },
    { 
      key: 'type', 
      label: 'Type',
      render: (a: GermplasmAccession) => <span className={styles.tableChip}>{a.type}</span>
    },
    { 
      key: 'origin', 
      label: 'Origin',
      render: (a: GermplasmAccession) => `${a.origin.state ? a.origin.state + ', ' : ''}${a.origin.country}`
    },
    { key: 'custody', label: 'Custody' },
    { 
      key: 'traits', 
      label: 'Traits',
      render: (a: GermplasmAccession) => <span className={styles.tableBadge}>{a.traits.length}</span>
    },
    { 
      key: 'genomic', 
      label: 'Genomic',
      render: (a: GermplasmAccession) => a.hasGenomicData ? '✓' : '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (a: GermplasmAccession) => <StatusBadge status={a.status} />
    },
    {
      key: 'actions',
      label: '',
      render: (a: GermplasmAccession) => (
        <ActionMenu 
          items={[
            { label: 'View profile', onClick: () => setDetailModalId(a.id) },
            ...(canCatalog ? [
              { label: 'Edit accession', onClick: () => addToast('Edit mode', 'info') },
              { label: 'Add trait', onClick: () => addToast('Add trait form', 'info') },
              { label: 'Mark quarantine', onClick: () => addToast('Quarantined', 'success') },
            ] : []),
            ...(canArchive ? [
              { label: 'Archive', onClick: () => addToast('Archived', 'success'), variant: 'danger' as const },
            ] : []),
          ]}
        />
      )
    }
  ];

  const getIcon = (name: string) => {
    switch (name) {
      case 'Database': return Database;
      case 'Sprout': return Sprout;
      case 'AlertCircle': return AlertCircle;
      case 'Archive': return Archive;
      default: return FlaskConical;
    }
  };

  return (
    <ModuleLayout moduleName="Research & Development" moduleIcon={FlaskConical} navItems={rdNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Germplasm catalog</h1>
          <p className={styles.pageSubtitle}>Manage genetic resources, accessions, and pedigree</p>
        </div>
        <div className={styles.headerActions}>
          <ViewToggle view={viewMode} onChange={setViewMode} />
          {canCatalog && (
            <>
              <Button 
                variant="secondary" 
                size="sm" 
                leftIcon={Upload} 
                onClick={() => addToast('Importing...', 'info')}
              >
                Import accessions
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                leftIcon={Plus} 
                onClick={() => setIsAddModalOpen(true)}
              >
                Add accession
              </Button>
            </>
          )}
        </div>
      </div>
      <div className={styles.divider} />

        <div className={styles.kpiStrip}>
          {germplasmKpis.map((kpi, i) => (
            <KpiCard
              key={kpi.id}
              label={kpi.title}
              value={i === 0 ? items.length.toString() : kpi.value}
              comparison={kpi.subValue}
              icon={getIcon(kpi.icon)}
              trend={{ 
                direction: kpi.trendType === 'negative' ? 'down' : 'up',
                percentage: kpi.trend,
                isPositive: kpi.trendType !== 'negative'
              }}
            />
          ))}
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className={styles.filtersSection}>
          <FilterBar 
            searchPlaceholder="Search accessions by name, ID or crop..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            filters={filterConfig}
          />
          
          <div className={styles.traitQuickFilters}>
            {traitFilterOptions.map(t => (
              <button 
                key={t}
                className={`${styles.traitFilterChip} ${activeTraitFilters.includes(t) ? styles.traitFilterActive : ''}`}
                onClick={() => handleTraitFilterToggle(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.contentArea}>
          {viewMode === 'grid' ? (
            <div className={styles.grid}>
              {filteredItems.map((item: GermplasmAccession, i: number) => (
                <AccessionCard 
                  key={item.id} 
                  accession={item} 
                  onClick={setDetailModalId}
                  index={i}
                />
              ))}
              {filteredItems.length === 0 && (
                <div className={styles.emptyGrid}>No accessions found matching the criteria.</div>
              )}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <DataTable 
                data={filteredItems}
                columns={columns as any}
                rowKey="id"
                onRowClick={(item: any) => setDetailModalId((item as GermplasmAccession).id)}
              />
            </div>
          )}
        </div>

      <NewAccessionFormModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        cropOptions={cropOptions}
      />

      <AccessionDetailModal 
        isOpen={!!detailModalId}
        onClose={() => setDetailModalId(null)}
        accession={items.find((a: GermplasmAccession) => a.id === detailModalId) || null}
        allAccessions={items}
      />
    </ModuleLayout>
  );
}
