import { useMemo, useState } from 'react';
import {
  Warehouse,
  Plus,
  Search,
  Undo2,
  Timer,
  TrendingDown,
  IndianRupee,
  type LucideIcon,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { warehouseNav } from '@/config/warehouseNav';
import { KpiCard } from './components/KpiCard/KpiCard';
import { ReturnsLifecyclePipeline } from './components/ReturnsLifecyclePipeline/ReturnsLifecyclePipeline';
import { ReturnCard } from './components/ReturnCard/ReturnCard';
import { NewReturnModal } from './components/NewReturnModal/NewReturnModal';
import { ReturnInspectionModal } from './components/ReturnInspectionModal/ReturnInspectionModal';
import { ReturnResolutionModal } from './components/ReturnResolutionModal/ReturnResolutionModal';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { returnKpis, returnRecords as initialReturnRecords, type ReturnsKpiIcon } from './mockData/returnsData';
import type { ReturnRecord, ReturnStatus, ReturnDirection, ReturnReason, ReturnDisposition } from '@/types/warehouse';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import styles from './ReturnsManagement.module.css';

const ICON_MAP: Record<ReturnsKpiIcon, LucideIcon> = { Undo2, Timer, TrendingDown, IndianRupee };

type RTab = 'all' | ReturnStatus;

import { usePermission } from '@/hooks/usePermission';

export default function ReturnsManagement() {
  const [activeTab, setActiveTab] = useState<RTab>('all');
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | ReturnDirection>('all');
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<'all' | ReturnReason>('all');
  const [dispositionFilter, setDispositionFilter] = useState<'all' | ReturnDisposition>('all');

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [inspectingRecord, setInspectingRecord] = useState<ReturnRecord | null>(null);
  const [resolvingRecord, setResolvingRecord] = useState<ReturnRecord | null>(null);

  const { items: allReturnRecords, update, add } = useRealtimeMockStore(initialReturnRecords);

  const returnRecords = useMemo(
    () => allReturnRecords.filter((r) => isDateInPeriod(r.initiatedDate, period)),
    [allReturnRecords, period]
  );
  const { addToast } = useToast();

  const canLogReturn = usePermission('log_return');

  const counts = useMemo(() => {
    const c: Record<ReturnStatus, number> = { Initiated: 0, 'In transit': 0, Received: 0, Inspecting: 0, 'Disposition pending': 0, Resolved: 0, Cancelled: 0 };
    for (const r of returnRecords) c[r.status]++;
    return c;
  }, [returnRecords]);

  const tabCounts = useMemo(() => ({
    all: returnRecords.length,
    Initiated: counts.Initiated,
    'In transit': counts['In transit'],
    Received: counts.Received,
    Inspecting: counts.Inspecting,
    'Disposition pending': counts['Disposition pending'],
    Resolved: counts.Resolved,
  } as Record<RTab, number>), [counts, returnRecords]);

  const filtered = useMemo(() => {
    return returnRecords.filter((r) => {
      if (activeTab !== 'all' && r.status !== activeTab) return false;
      if (directionFilter !== 'all' && r.direction !== directionFilter) return false;
      if (reasonFilter !== 'all' && r.reason !== reasonFilter) return false;
      if (dispositionFilter !== 'all' && r.disposition !== dispositionFilter) return false;
      if (search.trim() !== '') {
        const q = search.trim().toLowerCase();
        const haystack = `${r.id} ${r.reference} ${r.party} ${r.reason}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeTab, directionFilter, reasonFilter, dispositionFilter, search, returnRecords]);

  const handleAction = (record: ReturnRecord, action: 'inspect' | 'resolve' | 'transit' | 'received' | 'view') => {
    if (action === 'inspect') setInspectingRecord(record);
    else if (action === 'resolve') setResolvingRecord(record);
    else if (action === 'transit') console.log('mark in transit', record.id);
    else if (action === 'received') console.log('mark received', record.id);
    else console.log('view return', record.id);
  };

  const handleInspectionComplete = (updated: ReturnRecord) => {
    update(updated.id, updated);
    setResolvingRecord(updated);
  };

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={Warehouse} navItems={warehouseNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Returns management</h1>
          <p className={styles.pageSubtitle}>Customer returns, supplier returns, and disposition workflows</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          <div className={styles.chipGroup} role="radiogroup" aria-label="Direction filter">
            {(['all', 'Customer return', 'Supplier return'] as Array<'all' | ReturnDirection>).map((d) => (
               <button
                key={d}
                role="radio"
                aria-checked={directionFilter === d}
                className={`${styles.chip} ${directionFilter === d ? styles.chipActive : ''}`}
                onClick={() => setDirectionFilter(d)}
              >
                {d === 'all' ? 'All' : d === 'Customer return' ? 'Customer' : 'Supplier'}
              </button>
            ))}
          </div>
          {canLogReturn && <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setIsNewOpen(true)}>New return</Button>}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.kpiGrid}>
        {returnKpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} icon={ICON_MAP[k.iconName]} trend={k.trend} comparison={k.comparison} />
        ))}
      </div>

      <ReturnsLifecyclePipeline
        counts={counts}
        activeStatus={activeTab === 'all' ? null : (activeTab as ReturnStatus)}
        onSelect={(s) => setActiveTab(s as RTab)}
      />

      <Tabs
        tabs={[
          { key: 'all',                  label: 'All',                  count: tabCounts.all },
          { key: 'Initiated',            label: 'Initiated',            count: tabCounts.Initiated },
          { key: 'In transit',           label: 'In transit',           count: tabCounts['In transit'] },
          { key: 'Received',             label: 'Received',             count: tabCounts.Received },
          { key: 'Inspecting',           label: 'Inspecting',           count: tabCounts.Inspecting },
          { key: 'Disposition pending',  label: 'Disposition pending',  count: tabCounts['Disposition pending'] },
          { key: 'Resolved',             label: 'Resolved',             count: tabCounts.Resolved },
        ]}
        activeTab={activeTab}
        onChange={(k) => setActiveTab(k as RTab)}
      />

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input type="text" className={styles.search} placeholder="Search return ID, reference, party..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search returns" />
        </div>
        <select className={styles.select} value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value as 'all' | ReturnReason)} aria-label="Reason">
          <option value="all">All reasons</option>
          <option>Damaged in transit</option>
          <option>Quality failure</option>
          <option>Wrong item shipped</option>
          <option>Excess quantity</option>
          <option>Customer cancellation</option>
          <option>Expired stock</option>
          <option>Mislabeled</option>
          <option>Performance complaint</option>
          <option>Other</option>
        </select>
        <select className={styles.select} value={dispositionFilter} onChange={(e) => setDispositionFilter(e.target.value as 'all' | ReturnDisposition)} aria-label="Disposition">
          <option value="all">All dispositions</option>
          <option>Restock</option>
          <option>Quarantine</option>
          <option>Rework</option>
          <option>Dispose</option>
          <option>Return to supplier</option>
          <option>Pending decision</option>
        </select>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No returns match your filters.</div>
        ) : filtered.map((r) => <ReturnCard key={r.id} record={r} onAction={handleAction} onUpdateStatus={(id, status) => { update(id, { status }); addToast({ type: 'success', message: `Status updated to ${status}` }); }} />)}
      </div>

      <NewReturnModal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} defaultDirection={directionFilter !== 'all' ? directionFilter : 'Customer return'} onSave={(data) => { add(data as ReturnRecord); addToast({ type: 'success', message: 'New return created' }); }} />
      <ReturnInspectionModal isOpen={inspectingRecord !== null} onClose={() => setInspectingRecord(null)} record={inspectingRecord} onComplete={handleInspectionComplete} />
      <ReturnResolutionModal isOpen={resolvingRecord !== null} onClose={() => setResolvingRecord(null)} record={resolvingRecord} onResolve={(updated) => { update(updated.id, updated); addToast({ type: 'success', message: 'Return resolved' }); }} />
    </ModuleLayout>
  );
}
