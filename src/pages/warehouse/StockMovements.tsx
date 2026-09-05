import { useMemo, useState, useRef, useEffect } from 'react';
import {
  Warehouse,
  Plus,
  Search,
  ArrowRightLeft,
  Move,
  Edit3,
  Undo2,
  Factory,
  Clock,
  Boxes,
  TrendingDown,
  Check,
  X,
  ChevronDown,
  Eye,
  Ban,
  type LucideIcon,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { ActionMenu } from '@/components/common/ActionMenu';
import { warehouseNav } from '@/config/warehouseNav';
import { KpiCard } from './components/KpiCard/KpiCard';
import { NewMovementModal, type NewMovementType } from './components/NewMovementModal/NewMovementModal';
import { MovementDetailModal } from './components/MovementDetailModal/MovementDetailModal';
import { ApprovalModal } from './components/ApprovalModal/ApprovalModal';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  movementKpis,
  movementRecords as initialMovementRecords,
  type MovementsKpiIcon,
} from './mockData/movementsData';
import type { MovementRecord, MovementCategory, MovementStatus } from '@/types/warehouse';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './StockMovements.module.css';

const ICON_MAP: Record<MovementsKpiIcon, LucideIcon> = { ArrowRightLeft, Clock, Boxes, TrendingDown };

type MovementsTab = 'all' | 'pending' | 'Transfer' | 'Adjustment' | 'Return' | 'Material issue';

const NEW_OPTIONS: Array<{ key: NewMovementType; label: string; icon: LucideIcon }> = [
  { key: 'Inter-warehouse', label: 'Inter-warehouse transfer', icon: ArrowRightLeft },
  { key: 'Bin-to-bin',      label: 'Bin-to-bin (intra-warehouse)', icon: Move },
  { key: 'Adjustment',      label: 'Stock adjustment', icon: Edit3 },
  { key: 'Return',          label: 'Return (customer / supplier)', icon: Undo2 },
  { key: 'Material issue',  label: 'Material issue to Processing', icon: Factory },
];

const CURRENT_USER_ROLE = 'Warehouse manager';

function getCategoryIcon(c: MovementCategory, sub: string): LucideIcon {
  if (c === 'Transfer') return sub.includes('Bin-to-bin') ? Move : ArrowRightLeft;
  if (c === 'Adjustment') return Edit3;
  if (c === 'Return') return Undo2;
  return Factory;
}

function categoryClass(c: MovementCategory): string {
  switch (c) {
    case 'Transfer':       return styles.catTransfer;
    case 'Adjustment':     return styles.catAdjustment;
    case 'Return':         return styles.catReturn;
    case 'Material issue': return styles.catMaterial;
  }
}

function statusClass(s: MovementStatus): string {
  switch (s) {
    case 'Pending approval': return styles.stPending;
    case 'Approved':         return styles.stApproved;
    case 'In transit':       return styles.stInTransit;
    case 'Completed':        return styles.stCompleted;
    case 'Rejected':         return styles.stRejected;
  }
}

function isPendingForCurrentUser(r: MovementRecord): boolean {
  if (r.status !== 'Pending approval' || !r.approvalChain) return false;
  return r.approvalChain.some((s) => s.status === 'pending' && s.role === CURRENT_USER_ROLE);
}

import { usePermission } from '@/hooks/usePermission';

export default function StockMovements() {
  const [activeTab, setActiveTab] = useState<MovementsTab>('all');
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MovementStatus>('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');

  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [newType, setNewType] = useState<NewMovementType | null>(null);
  const [detailRecord, setDetailRecord] = useState<MovementRecord | null>(null);
  const [approvalState, setApprovalState] = useState<{ record: MovementRecord; decision: 'approve' | 'reject' } | null>(null);

  const { items: allMovementRecords, update } = useRealtimeMockStore(initialMovementRecords);

  const movementRecords = useMemo(
    () => allMovementRecords.filter((r) => isDateInPeriod(r.initiatedAt, period)),
    [allMovementRecords, period]
  );
  const { addToast } = useToast();

  const canLogMovement = usePermission('log_stock_movement');
  const canApprove = usePermission('approve_stock_adjustment');

  const newBtnRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!newMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (newBtnRef.current && !newBtnRef.current.contains(e.target as Node)) setNewMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [newMenuOpen]);

  const tabCounts = useMemo(() => ({
    all: movementRecords.length,
    pending: movementRecords.filter((r) => r.status === 'Pending approval').length,
    Transfer: movementRecords.filter((r) => r.category === 'Transfer').length,
    Adjustment: movementRecords.filter((r) => r.category === 'Adjustment').length,
    Return: movementRecords.filter((r) => r.category === 'Return').length,
    'Material issue': movementRecords.filter((r) => r.category === 'Material issue').length,
  }), [movementRecords]);

  const filtered = useMemo(() => {
    return movementRecords.filter((r) => {
      if (activeTab === 'pending' && r.status !== 'Pending approval') return false;
      if (activeTab !== 'all' && activeTab !== 'pending' && r.category !== activeTab) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (warehouseFilter !== 'all') {
        const wh = warehouseFilter.toLowerCase();
        if (!`${r.fromLocation ?? ''} ${r.toLocation ?? ''}`.toLowerCase().includes(wh)) return false;
      }
      if (search.trim() !== '') {
        const q = search.trim().toLowerCase();
        const haystack = `${r.id} ${r.itemName} ${r.sku} ${r.batch} ${r.reference ?? ''} ${r.initiatedBy}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeTab, statusFilter, warehouseFilter, search, movementRecords]);

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={Warehouse} navItems={warehouseNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Stock movements</h1>
          <p className={styles.pageSubtitle}>Transfers, adjustments, returns, and material issues</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          {canLogMovement && (
            <div className={styles.newWrap} ref={newBtnRef}>
              <Button variant="primary" size="sm" leftIcon={Plus} rightIcon={ChevronDown} onClick={() => setNewMenuOpen((o) => !o)}>
                New movement
              </Button>
              {newMenuOpen && (
                <div className={styles.newMenu} role="menu">
                  {NEW_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        className={styles.newMenuItem}
                        role="menuitem"
                        onClick={() => { setNewType(opt.key); setNewMenuOpen(false); }}
                      >
                        <Icon size={14} /> {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.kpiGrid}>
        {movementKpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={ICON_MAP[kpi.iconName]}
            trend={kpi.trend}
            comparison={kpi.comparison}
          />
        ))}
      </div>

      <Tabs
        tabs={[
          { key: 'all',             label: 'All movements',    count: tabCounts.all },
          { key: 'pending',         label: 'Pending approval', count: tabCounts.pending },
          { key: 'Transfer',        label: 'Transfers',         count: tabCounts.Transfer },
          { key: 'Adjustment',      label: 'Adjustments',       count: tabCounts.Adjustment },
          { key: 'Return',          label: 'Returns',           count: tabCounts.Return },
          { key: 'Material issue',  label: 'Material issues',   count: tabCounts['Material issue'] },
        ]}
        activeTab={activeTab}
        onChange={(k) => setActiveTab(k as MovementsTab)}
      />

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.search}
            placeholder="Search ID, item, SKU, batch, reference, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search movements"
          />
        </div>
        <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | MovementStatus)} aria-label="Status filter">
          <option value="all">All statuses</option>
          <option value="Pending approval">Pending approval</option>
          <option value="Approved">Approved</option>
          <option value="In transit">In transit</option>
          <option value="Completed">Completed</option>
          <option value="Rejected">Rejected</option>
        </select>
        <select className={styles.select} value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} aria-label="Warehouse filter">
          <option value="all">All warehouses</option>
          <option value="Telangana">Telangana Main</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Maharashtra">Maharashtra</option>
        </select>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-label="Stock movements">
            <thead>
              <tr>
                <th>Movement ID</th>
                <th>Type</th>
                <th>Item</th>
                <th className={styles.alignRight}>Quantity</th>
                <th>From → To</th>
                <th>Reason</th>
                <th>Reference</th>
                <th>Initiated by</th>
                <th>Status</th>
                <th>Initiated at</th>
                <th className={styles.actionsCell}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className={styles.emptyRow}>No movements match your filters.</td></tr>
              ) : filtered.map((r) => {
                const Icon = getCategoryIcon(r.category, r.subType);
                const showInline = isPendingForCurrentUser(r);
                return (
                  <tr key={r.id} className={`${styles.row} ${r.status === 'In transit' ? styles.rowInTransit : ''}`} onClick={() => setDetailRecord(r)}>
                    <td className={styles.id}>{r.id}</td>
                    <td>
                      <span className={`${styles.typeChip} ${categoryClass(r.category)}`}>
                        <Icon size={12} /> {r.subType}
                      </span>
                    </td>
                    <td>
                      <div className={styles.itemName} title={r.itemName}>{r.itemName}</div>
                      <div className={styles.itemSku}>{r.sku} · {r.batch}</div>
                    </td>
                    <td className={`${styles.alignRight} ${styles.qtyCell}`}>
                      <span className={r.quantity < 0 ? styles.qtyNeg : styles.qtyPos}>
                        {r.quantity > 0 ? '+' : ''}{formatIndianNumber(r.quantity)}
                      </span>
                      <span className={styles.uom}> {r.uom}</span>
                    </td>
                    <td>
                      {r.fromLocation && <div className={styles.locLine}>{r.fromLocation}</div>}
                      {r.fromLocation && r.toLocation && <div className={styles.arrow}>↓</div>}
                      {r.toLocation && <div className={styles.locLine}>{r.toLocation}</div>}
                    </td>
                    <td>{r.reason ? <span className={styles.reasonChip}>{r.reason}</span> : '—'}</td>
                    <td className={styles.mono}>{r.reference ?? '—'}</td>
                    <td className={styles.byCell}>{r.initiatedBy}</td>
                    <td><span className={`${styles.statusChip} ${statusClass(r.status)}`}>{r.status}</span></td>
                    <td className={styles.timeCell}>{r.initiatedAt}</td>
                    <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                      {showInline && canApprove ? (
                        <div className={styles.inlineActions}>
                          <button
                            className={`${styles.iconBtn} ${styles.btnApprove}`}
                            onClick={() => setApprovalState({ record: r, decision: 'approve' })}
                            aria-label={`Approve ${r.id}`}
                            title="Approve"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.btnReject}`}
                            onClick={() => setApprovalState({ record: r, decision: 'reject' })}
                            aria-label={`Reject ${r.id}`}
                            title="Reject"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <ActionMenu
                          items={[
                            { label: 'View details', icon: Eye, onClick: () => setDetailRecord(r) },
                            ...(r.status === 'Pending approval' && canApprove ? [
                              { label: 'Approve', icon: Check, onClick: () => setApprovalState({ record: r, decision: 'approve' }) },
                              { label: 'Reject', icon: X, variant: 'danger' as const, onClick: () => setApprovalState({ record: r, decision: 'reject' }) },
                            ] : []),
                            ...(r.status === 'Approved' && canApprove ? [
                              { label: 'Cancel', icon: Ban, variant: 'danger' as const, onClick: () => { update(r.id, { status: 'Cancelled' as any }); addToast({ message: 'Movement cancelled' }); } },
                            ] : []),
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <NewMovementModal isOpen={newType !== null} onClose={() => setNewType(null)} type={newType} />
      <MovementDetailModal isOpen={detailRecord !== null} onClose={() => setDetailRecord(null)} record={detailRecord} />
      <ApprovalModal
        isOpen={approvalState !== null}
        onClose={() => setApprovalState(null)}
        record={approvalState?.record ?? null}
        decision={approvalState?.decision ?? 'approve'}
      />
    </ModuleLayout>
  );
}
