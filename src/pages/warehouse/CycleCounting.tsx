import { useMemo, useState } from 'react';
import {
  Warehouse,
  Plus,
  Calendar,
  Search,
  ClipboardList,
  Target,
  BarChart3,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { warehouseNav } from '@/config/warehouseNav';
import { KpiCard } from './components/KpiCard/KpiCard';
import { ActiveCountCard } from './components/ActiveCountCard/ActiveCountCard';
import { CountSchedulePanel } from './components/CountSchedulePanel/CountSchedulePanel';
import { CountsTable } from './components/CountsTable/CountsTable';
import { NewCountModal } from './components/NewCountModal/NewCountModal';
import { CountExecutionModal } from './components/CountExecutionModal/CountExecutionModal';
import { CountReviewModal, type VarianceDecision } from './components/CountReviewModal/CountReviewModal';
import { VarianceApprovalModal } from './components/VarianceApprovalModal/VarianceApprovalModal';
import { ScheduleManagerModal } from './components/ScheduleManagerModal/ScheduleManagerModal';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  cycleCountKpis,
  recurringSchedule,
  cycleCounts as initialCycleCounts,
  type CycleCountKpiIcon,
} from './mockData/cycleCountData';
import type { CycleCount, CountStatus, CountStrategy } from '@/types/warehouse';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import styles from './CycleCounting.module.css';

const ICON_MAP: Record<CycleCountKpiIcon, LucideIcon> = { ClipboardList, Target, BarChart3, AlertTriangle };

type CCTab = 'all' | 'Scheduled' | 'In progress' | 'Pending review' | 'Variance approval' | 'Completed';

const ACTIVE_STATUSES: CountStatus[] = ['In progress', 'Pending review', 'Variance approval'];

const WEEK_DAYS = [
  { label: 'Mon', date: '04', dots: ['dotWeekly'] },
  { label: 'Tue', date: '05', dots: ['dotWeekly'] },
  { label: 'Wed', date: '06', dots: [] },
  { label: 'Thu', date: '07', dots: ['dotMonthly'] },
  { label: 'Fri', date: '08', dots: ['dotWeekly', 'dotDaily'] },
  { label: 'Sat', date: '09', dots: [] },
  { label: 'Sun', date: '10', dots: [] },
];

import { usePermission } from '@/hooks/usePermission';

export default function CycleCounting() {
  const [activeTab, setActiveTab] = useState<CCTab>('all');
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [search, setSearch] = useState('');
  const [strategyFilter, setStrategyFilter] = useState<'all' | CountStrategy>('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | string>('all');

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [executionCount, setExecutionCount] = useState<CycleCount | null>(null);
  const [reviewCount, setReviewCount] = useState<CycleCount | null>(null);
  const [postingCount, setPostingCount] = useState<{ count: CycleCount; decisions: VarianceDecision[] } | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const { items: allCycleCounts, update, add } = useRealtimeMockStore(initialCycleCounts);

  const cycleCounts = useMemo(
    () => allCycleCounts.filter((c) => isDateInPeriod(c.scheduledDate, period)),
    [allCycleCounts, period]
  );
  const { addToast } = useToast();

  const canSchedule = usePermission('schedule_cycle_count');

  const tabCounts = useMemo(() => ({
    all: cycleCounts.length,
    'Scheduled':         cycleCounts.filter((c) => c.status === 'Scheduled').length,
    'In progress':       cycleCounts.filter((c) => c.status === 'In progress').length,
    'Pending review':    cycleCounts.filter((c) => c.status === 'Pending review').length,
    'Variance approval': cycleCounts.filter((c) => c.status === 'Variance approval').length,
    'Completed':         cycleCounts.filter((c) => c.status === 'Completed').length,
  } as Record<CCTab, number>), [cycleCounts]);

  const activeCounts = cycleCounts.filter((c) => ACTIVE_STATUSES.includes(c.status));

  const filtered = useMemo(() => {
    return cycleCounts.filter((c) => {
      if (activeTab !== 'all' && c.status !== activeTab) return false;
      if (strategyFilter !== 'all' && c.strategy !== strategyFilter) return false;
      if (warehouseFilter !== 'all' && c.warehouse !== warehouseFilter) return false;
      if (frequencyFilter !== 'all' && c.frequency !== frequencyFilter) return false;
      if (search.trim() !== '') {
        const q = search.trim().toLowerCase();
        const haystack = `${c.id} ${c.name} ${c.zonesScope.join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeTab, strategyFilter, warehouseFilter, frequencyFilter, search, cycleCounts]);

  const handleCountAction = (c: CycleCount) => {
    if (c.status === 'In progress' || c.status === 'Scheduled') {
      setExecutionCount(c);
    } else if (c.status === 'Pending review' || c.status === 'Variance approval') {
      setReviewCount(c);
    } else {
      console.log('open count detail', c.id);
    }
  };

  const handlePostVariances = (count: CycleCount, decisions: VarianceDecision[]) => {
    setReviewCount(null);
    setPostingCount({ count, decisions });
  };

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={Warehouse} navItems={warehouseNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Cycle counting</h1>
          <p className={styles.pageSubtitle}>Plan, execute, and reconcile physical inventory counts</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          {canSchedule && <Button variant="secondary" size="sm" leftIcon={Calendar} onClick={() => setIsScheduleOpen(true)}>Schedule</Button>}
          {canSchedule && <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setIsNewOpen(true)}>New count</Button>}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.kpiGrid}>
        {cycleCountKpis.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            icon={ICON_MAP[k.iconName]}
            trend={k.trend}
            comparison={k.comparison}
          />
        ))}
      </div>

      <div className={styles.layoutGrid}>
        <div className={styles.activeCountsCard}>
          <div className={styles.activeHeader}>
            <div>
              <h3 className={styles.activeTitle}>Active cycle counts</h3>
              <span className={styles.activeSubtitle}>In progress · pending review · variance approval</span>
            </div>
            <button className={styles.viewAllLink} onClick={() => setActiveTab('In progress')}>View all →</button>
          </div>
          <div className={styles.activeList}>
            {activeCounts.length === 0 ? (
              <div className={styles.emptyActive}>No active counts. Schedule a new one.</div>
            ) : activeCounts.map((c) => (
              <ActiveCountCard key={c.id} count={c} onAction={handleCountAction} />
            ))}
          </div>
        </div>

        <CountSchedulePanel
          recurring={recurringSchedule}
          weekDays={WEEK_DAYS}
          onManageSchedule={() => console.log('manage schedule')}
        />
      </div>

      <Tabs
        tabs={[
          { key: 'all',                label: 'All counts',           count: tabCounts.all },
          { key: 'Scheduled',          label: 'Scheduled',            count: tabCounts.Scheduled },
          { key: 'In progress',        label: 'In progress',          count: tabCounts['In progress'] },
          { key: 'Pending review',     label: 'Pending review',       count: tabCounts['Pending review'] },
          { key: 'Variance approval',  label: 'Variance approval',    count: tabCounts['Variance approval'] },
          { key: 'Completed',          label: 'Completed',            count: tabCounts.Completed },
        ]}
        activeTab={activeTab}
        onChange={(k) => setActiveTab(k as CCTab)}
      />

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.search}
            placeholder="Search count ID, name, zones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search counts"
          />
        </div>
        <select className={styles.select} value={strategyFilter} onChange={(e) => setStrategyFilter(e.target.value as 'all' | CountStrategy)} aria-label="Strategy">
          <option value="all">All strategies</option>
          <option value="ABC-based">ABC-based</option>
          <option value="Zone-based">Zone-based</option>
          <option value="Random">Random</option>
          <option value="Full physical">Full physical</option>
          <option value="Specific items">Specific items</option>
        </select>
        <select className={styles.select} value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} aria-label="Warehouse">
          <option value="all">All warehouses</option>
          <option value="Telangana Main">Telangana Main</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Maharashtra">Maharashtra</option>
        </select>
        <select className={styles.select} value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value)} aria-label="Frequency">
          <option value="all">All frequencies</option>
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
          <option value="Quarterly">Quarterly</option>
          <option value="Annual">Annual</option>
          <option value="Ad-hoc">Ad-hoc</option>
        </select>
      </div>

      <CountsTable rows={filtered} onRowClick={handleCountAction} onUpdateStatus={(id, status) => { update(id, { status }); addToast({ type: 'success', message: `Count status updated to ${status}` }); }} />

      <NewCountModal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} onSave={(data) => { add(data as CycleCount); addToast({ type: 'success', message: 'New count scheduled' }); }} />

      <CountExecutionModal
        isOpen={executionCount !== null}
        onClose={() => setExecutionCount(null)}
        count={executionCount}
        onComplete={(c) => { update(c.id, { status: 'Pending review' }); setExecutionCount(null); addToast({ type: 'success', message: 'Count completed, ready for review' }); }}
      />

      <CountReviewModal
        isOpen={reviewCount !== null}
        onClose={() => setReviewCount(null)}
        count={reviewCount}
        onPostVariances={handlePostVariances}
      />

      <VarianceApprovalModal
        isOpen={postingCount !== null}
        onClose={() => setPostingCount(null)}
        count={postingCount?.count ?? null}
        decisions={postingCount?.decisions ?? []}
        onApprove={(c) => { update(c.id, { status: 'Completed' }); setPostingCount(null); addToast({ type: 'success', message: 'Variances approved and count completed' }); }}
      />

      <ScheduleManagerModal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} />
    </ModuleLayout>
  );
}
