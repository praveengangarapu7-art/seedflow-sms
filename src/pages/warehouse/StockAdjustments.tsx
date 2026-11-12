import { useMemo, useState } from 'react';
import {
  Warehouse,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  TrendingDown,
  Target,
  Check,
  X,
  FileDown,
  type LucideIcon,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { BulkActionBar } from '@/components/common/BulkActionBar/BulkActionBar';
import { warehouseNav } from '@/config/warehouseNav';
import { KpiCard } from './components/KpiCard/KpiCard';
import { VarianceSummaryPanel } from './components/VarianceSummaryPanel/VarianceSummaryPanel';
import { AdjustmentTable } from './components/AdjustmentTable/AdjustmentTable';
import { NewAdjustmentModal } from './components/NewAdjustmentModal/NewAdjustmentModal';
import { AdjustmentDetailModal } from './components/AdjustmentDetailModal/AdjustmentDetailModal';
import { ApprovalQuickActionModal } from './components/ApprovalQuickActionModal/ApprovalQuickActionModal';
import { ReversalModal } from './components/ReversalModal/ReversalModal';
import { AdjustmentPolicyModal } from './components/AdjustmentPolicyModal/AdjustmentPolicyModal';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  adjustmentKpis,
  varianceByReason,
  topItemsByVariance,
  adjustmentAlerts,
  adjustments as initialAdjustments,
  type AdjustmentsKpiIcon,
} from './mockData/adjustmentsData';
import type { StockAdjustment, AdjustmentReason, AdjustmentSource } from '@/types/warehouse';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import styles from './StockAdjustments.module.css';

const ICON_MAP: Record<AdjustmentsKpiIcon, LucideIcon> = { Clock, CheckCircle2, TrendingDown, Target };

type AdjTab = 'all' | 'queue' | 'Pending approval' | 'Approved' | 'Posted' | 'Rejected';

const REASONS: AdjustmentReason[] = [
  'Cycle count variance', 'Damaged goods', 'Expired stock', 'Theft / shrinkage', 'Quality rejection', 'System correction', 'Other',
];

const SOURCES: AdjustmentSource[] = ['Manual', 'Cycle count', 'Damage report', 'Quality rejection', 'System reconciliation'];

const CURRENT_USER_ROLE = 'Warehouse manager';

function isCurrentApprover(adj: StockAdjustment): boolean {
  if (adj.status !== 'Pending approval') return false;
  return adj.approvalChain.some((s) => s.status === 'pending' && s.role === CURRENT_USER_ROLE);
}

import { usePermission } from '@/hooks/usePermission';

export default function StockAdjustments() {
  const [activeTab, setActiveTab] = useState<AdjTab>('all');
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<'all' | AdjustmentReason>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | AdjustmentSource>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<'all' | string>('all');
  const [impactFilter, setImpactFilter] = useState<'all' | 'major' | 'moderate' | 'minor'>('all');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [detailAdj, setDetailAdj] = useState<StockAdjustment | null>(null);
  const [quickAction, setQuickAction] = useState<{ adj: StockAdjustment; decision: 'approve' | 'reject' } | null>(null);
  const [reversalAdj, setReversalAdj] = useState<StockAdjustment | null>(null);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);

  const { items: allAdjustments, update } = useRealtimeMockStore(initialAdjustments, 'warehouse.adjustments');

  const adjustments = useMemo(
    () => allAdjustments.filter((a) => isDateInPeriod(a.initiatedAt, period)),
    [allAdjustments, period]
  );
  const { addToast } = useToast();

  const canPropose = usePermission('propose_stock_adjustment');
  const canApprove = usePermission('approve_stock_adjustment');

  const tabCounts = useMemo(() => ({
    all: adjustments.length,
    queue: adjustments.filter(isCurrentApprover).length,
    'Pending approval': adjustments.filter((a) => a.status === 'Pending approval').length,
    'Approved': adjustments.filter((a) => a.status === 'Approved').length,
    'Posted': adjustments.filter((a) => a.status === 'Posted').length,
    'Rejected': adjustments.filter((a) => a.status === 'Rejected').length,
  } as Record<AdjTab, number>), [adjustments]);

  const filtered = useMemo(() => {
    return adjustments.filter((a) => {
      if (activeTab === 'queue') {
        if (!isCurrentApprover(a)) return false;
      } else if (activeTab !== 'all') {
        if (a.status !== activeTab) return false;
      }
      if (reasonFilter !== 'all' && a.reason !== reasonFilter) return false;
      if (sourceFilter !== 'all' && a.source !== sourceFilter) return false;
      if (warehouseFilter !== 'all' && a.warehouse !== warehouseFilter) return false;
      if (impactFilter !== 'all') {
        const abs = Math.abs(a.varianceValue);
        if (impactFilter === 'major' && abs <= 50_000) return false;
        if (impactFilter === 'moderate' && (abs <= 10_000 || abs > 50_000)) return false;
        if (impactFilter === 'minor' && abs > 10_000) return false;
      }
      if (search.trim() !== '') {
        const q = search.trim().toLowerCase();
        const haystack = `${a.id} ${a.itemSku} ${a.itemName} ${a.batch}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeTab, reasonFilter, sourceFilter, warehouseFilter, impactFilter, search, adjustments]);

  const toggleRow = (id: string) => setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const togglePage = (ids: string[]) => {
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) setSelectedIds(selectedIds.filter((id) => !ids.includes(id)));
    else setSelectedIds(Array.from(new Set([...selectedIds, ...ids])));
  };

  const handleItemClick = (adjustmentId: string) => {
    const a = adjustments.find((x) => x.id === adjustmentId);
    if (a) setDetailAdj(a);
  };

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={Warehouse} navItems={warehouseNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Stock adjustments</h1>
          <p className={styles.pageSubtitle}>Review variances, approve adjustments, and post to inventory</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          <button className={styles.policyLink} onClick={() => setIsPolicyOpen(true)}>
            Adjustment policy
          </button>
          {canPropose && (
            <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setIsNewOpen(true)}>
              New adjustment
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.kpiGrid}>
        {adjustmentKpis.map((k) => (
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

      <VarianceSummaryPanel
        varianceByReason={varianceByReason}
        topItems={topItemsByVariance}
        alerts={adjustmentAlerts}
        onItemClick={handleItemClick}
      />

      <Tabs
        tabs={[
          { key: 'all',              label: 'All',                count: tabCounts.all },
          { key: 'queue',            label: 'My approval queue',  count: tabCounts.queue },
          { key: 'Pending approval', label: 'Pending review',     count: tabCounts['Pending approval'] },
          { key: 'Approved',         label: 'Approved',           count: tabCounts.Approved },
          { key: 'Posted',           label: 'Posted',             count: tabCounts.Posted },
          { key: 'Rejected',         label: 'Rejected',           count: tabCounts.Rejected },
        ]}
        activeTab={activeTab}
        onChange={(k) => setActiveTab(k as AdjTab)}
      />

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.search}
            placeholder="Search SKU, item name, adjustment ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search adjustments"
          />
        </div>
        <select className={styles.select} value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value as 'all' | AdjustmentReason)} aria-label="Reason">
          <option value="all">All reasons</option>
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className={styles.select} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as 'all' | AdjustmentSource)} aria-label="Source">
          <option value="all">All sources</option>
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={styles.select} value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} aria-label="Warehouse">
          <option value="all">All warehouses</option>
          <option value="Telangana Main">Telangana Main</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Maharashtra">Maharashtra</option>
        </select>
        <select className={styles.select} value={impactFilter} onChange={(e) => setImpactFilter(e.target.value as typeof impactFilter)} aria-label="Variance impact">
          <option value="all">All impact</option>
          <option value="major">Major (&gt;₹50K)</option>
          <option value="moderate">Moderate (₹10K-50K)</option>
          <option value="minor">Minor (&lt;₹10K)</option>
        </select>
      </div>

      <AdjustmentTable
        rows={filtered}
        selectedIds={selectedIds}
        onToggleSelect={toggleRow}
        onTogglePage={togglePage}
        onRowClick={(adj) => setDetailAdj(adj)}
        onApprove={(adj) => setQuickAction({ adj, decision: 'approve' })}
        onReject={(adj) => setQuickAction({ adj, decision: 'reject' })}
        isCurrentApprover={isCurrentApprover}
      />
      
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          ...(canApprove ? [
            {
              label: 'Bulk approve',
              icon: Check,
              onClick: () => {
                selectedIds.forEach((id) => update(id, { status: 'Approved' }));
                setSelectedIds([]);
                addToast({ type: 'success', message: `${selectedIds.length} adjustments approved` });
              },
            },
            {
              label: 'Bulk reject',
              icon: X,
              variant: 'danger' as const,
              onClick: () => {
                selectedIds.forEach((id) => update(id, { status: 'Rejected' }));
                setSelectedIds([]);
                addToast({ type: 'success', message: `${selectedIds.length} adjustments rejected` });
              },
            },
          ] : []),
          {
            label: 'Export',
            icon: FileDown,
            onClick: () => addToast({ message: 'Exporting selected adjustments...' }),
          },
        ]}
      />

      <NewAdjustmentModal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} />

      <AdjustmentDetailModal
        isOpen={detailAdj !== null}
        onClose={() => setDetailAdj(null)}
        adjustment={detailAdj}
        isCurrentApprover={detailAdj ? isCurrentApprover(detailAdj) : false}
        onApprove={(adj) => { setDetailAdj(null); setQuickAction({ adj, decision: 'approve' }); }}
        onReject={(adj) => { setDetailAdj(null); setQuickAction({ adj, decision: 'reject' }); }}
        onPost={(adj) => { update(adj.id, { status: 'Posted' }); setDetailAdj(null); addToast({ message: 'Adjustment posted successfully' }); }}
        onReverse={(adj) => { setDetailAdj(null); setReversalAdj(adj); }}
        onResubmit={(adj) => { update(adj.id, { status: 'Pending approval' }); setDetailAdj(null); addToast({ message: 'Adjustment resubmitted' }); }}
      />

      <ApprovalQuickActionModal
        isOpen={quickAction !== null}
        onClose={() => setQuickAction(null)}
        adjustment={quickAction?.adj ?? null}
        decision={quickAction?.decision ?? 'approve'}
      />

      <ReversalModal
        isOpen={reversalAdj !== null}
        onClose={() => setReversalAdj(null)}
        adjustment={reversalAdj}
      />

      <AdjustmentPolicyModal isOpen={isPolicyOpen} onClose={() => setIsPolicyOpen(false)} />
    </ModuleLayout>
  );
}
