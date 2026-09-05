import { useMemo, useState } from 'react';
import {
  Warehouse,
  Plus,
  Search,
  Truck,
  PackageCheck,
  Clock,
  MapPin,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { warehouseNav } from '@/config/warehouseNav';
import { KpiCard } from './components/KpiCard/KpiCard';
import { AsnList } from './components/AsnList/AsnList';
import { PutawayQueue } from './components/PutawayQueue/PutawayQueue';
import { GrnReceiveModal } from './components/GrnReceiveModal/GrnReceiveModal';
import { PutawayConfirmModal } from './components/PutawayConfirmModal/PutawayConfirmModal';
import { NewReceivingModal } from './components/NewReceivingModal';
import { ASNDetailModal } from './components/ASNDetailModal/ASNDetailModal';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  asnList as initialAsnList,
  putawayTasks as initialPutawayTasks,
  pendingReceipts,
  inboundKpis,
  type InboundKpiIcon,
} from './mockData/inboundData';
import { formatIndianNumber } from '@/utils/formatters';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import type { ASN, PutawayTask, AsnStatus, PutawayPriority } from '@/types/warehouse';
import styles from './Inbound.module.css';

type InboundTab = 'asn' | 'pending' | 'putaway' | 'completed';

const ICON_MAP: Record<InboundKpiIcon, LucideIcon> = {
  Truck,
  PackageCheck,
  Clock,
  MapPin,
};

function isToday(timestamp?: string): boolean {
  if (!timestamp) return false;
  return timestamp.toLowerCase().includes('today');
}

import { usePermission } from '@/hooks/usePermission';

export default function Inbound() {
  const [activeTab, setActiveTab] = useState<InboundTab>('asn');
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [search, setSearch] = useState('');
  const [asnStatusFilter, setAsnStatusFilter] = useState<'all-active' | AsnStatus>('all-active');
  const [putawayPriorityFilter, setPutawayPriorityFilter] = useState<'all' | PutawayPriority>('all');

  const [grnModalAsn, setGrnModalAsn] = useState<ASN | null>(null);
  const [putawayModalTask, setPutawayModalTask] = useState<PutawayTask | null>(null);
  const [isNewReceivingOpen, setIsNewReceivingOpen] = useState(false);
  const [detailAsn, setDetailAsn] = useState<ASN | null>(null);

  const { items: allAsns, add: addAsn, update: updateAsn } = useRealtimeMockStore(initialAsnList);
  const { items: allPutawayTasks, update: updatePutaway } = useRealtimeMockStore(initialPutawayTasks);

  // One period filter, applied to each of the three inbound lists against the
  // date that list is actually keyed on.
  const asnList = useMemo(() => allAsns.filter((a) => isDateInPeriod(a.expectedDate, period)), [allAsns, period]);
  const putawayTasks = useMemo(
    () => allPutawayTasks.filter((t) => isDateInPeriod(t.completedAt ?? t.createdAt, period)),
    [allPutawayTasks, period]
  );
  const periodPendingReceipts = useMemo(
    () => pendingReceipts.filter((r) => isDateInPeriod(r.receivedAt, period)),
    [period]
  );
  const { addToast } = useToast();

  const canReceive = usePermission('receive_incoming_goods');

  const tabCounts = useMemo(() => {
    const asnCount = asnList.filter((a) => a.status !== 'Completed' && a.status !== 'Cancelled').length;
    const pendingCount = periodPendingReceipts.length;
    const putawayCount = putawayTasks.filter((t) => t.status !== 'Completed').length;
    const completedCount = putawayTasks.filter((t) => t.status === 'Completed' && isToday(t.completedAt)).length;
    return { asn: asnCount, pending: pendingCount, putaway: putawayCount, completed: completedCount };
  }, [asnList, putawayTasks]);

  const filteredAsns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return asnList.filter((a) => {
      if (asnStatusFilter === 'all-active') {
        if (a.status === 'Completed' || a.status === 'Cancelled') return false;
      } else if (asnStatusFilter === 'Arrived' || asnStatusFilter === 'Receiving') {
        if (a.status !== 'Arrived' && a.status !== 'Receiving') return false;
      } else if (a.status !== asnStatusFilter) {
        return false;
      }
      if (q !== '') {
        const haystack = `${a.id} ${a.poReference} ${a.supplier} ${a.vehicleNumber ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [asnList, search, asnStatusFilter]);

  const filteredPutaway = useMemo(() => {
    const q = search.trim().toLowerCase();
    return putawayTasks.filter((t) => {
      if (activeTab === 'completed') {
        if (t.status !== 'Completed' || !isToday(t.completedAt)) return false;
      } else {
        if (t.status === 'Completed') return false;
      }
      if (putawayPriorityFilter !== 'all' && t.priority !== putawayPriorityFilter) return false;
      if (q !== '') {
        const haystack = `${t.id} ${t.itemName} ${t.sku} ${t.grnReference}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [putawayTasks, search, putawayPriorityFilter, activeTab]);

  const filteredPendingReceipts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pendingReceipts.filter((r) => {
      if (q === '') return true;
      const haystack = `${r.id} ${r.grnReference} ${r.supplier}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [search]);

  const handleTabChange = (key: string) => {
    setActiveTab(key as InboundTab);
    setSearch('');
    setAsnStatusFilter('all-active');
    setPutawayPriorityFilter('all');
  };

  const searchPlaceholder =
    activeTab === 'asn'      ? 'Search ASN, PO, supplier, vehicle...'
    : activeTab === 'pending' ? 'Search receipt, GRN, supplier...'
    : 'Search task, item, SKU, GRN...';

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={Warehouse} navItems={warehouseNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Inbound (receiving)</h1>
          <p className={styles.pageSubtitle}>
            Track incoming shipments and route goods to their storage locations
          </p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          {canReceive && (
            <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setIsNewReceivingOpen(true)}>
              New ASN
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.kpiGrid}>
        {inboundKpis.map((kpi) => (
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
          { key: 'asn',       label: 'Advance shipments',  count: tabCounts.asn },
          { key: 'pending',   label: 'Pending receipts',   count: tabCounts.pending },
          { key: 'putaway',   label: 'Putaway queue',      count: tabCounts.putaway },
          { key: 'completed', label: 'Completed today',    count: tabCounts.completed },
        ]}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.search}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search"
          />
        </div>

        {activeTab === 'asn' && (
          <select
            className={styles.select}
            value={asnStatusFilter}
            onChange={(e) => setAsnStatusFilter(e.target.value as 'all-active' | AsnStatus)}
            aria-label="ASN status filter"
          >
            <option value="all-active">All active</option>
            <option value="Expected">Expected</option>
            <option value="Arrived">Arrived & receiving</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        )}

        {(activeTab === 'putaway' || activeTab === 'completed') && (
          <select
            className={styles.select}
            value={putawayPriorityFilter}
            onChange={(e) => setPutawayPriorityFilter(e.target.value as 'all' | PutawayPriority)}
            aria-label="Priority filter"
          >
            <option value="all">All priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        )}
      </div>

      {activeTab === 'asn' && (
        <AsnList
          asns={filteredAsns}
          onReceive={(asn) => setGrnModalAsn(asn)}
          onViewDetails={(asn) => setDetailAsn(asn)}
          onUpdateStatus={(id, status) => {
            updateAsn(id, { status });
            addToast({ type: 'success', message: `ASN status updated to ${status}` });
          }}
        />
      )}

      {activeTab === 'pending' && (
        <div className={styles.pendingList}>
          {filteredPendingReceipts.length === 0 ? (
            <div className={styles.empty}>No pending receipts.</div>
          ) : (
            filteredPendingReceipts.map((r) => (
              <div key={r.id} className={styles.pendingCard}>
                <div className={styles.pendingIcon}><PackageCheck size={20} /></div>
                <div className={styles.pendingBody}>
                  <div className={styles.pendingHeaderRow}>
                    <span className={styles.pendingId}>{r.id}</span>
                    <span className={styles.pendingGrn}>GRN {r.grnReference}</span>
                  </div>
                  <h4 className={styles.pendingSupplier}>{r.supplier}</h4>
                  <div className={styles.pendingMeta}>
                    <span>{r.itemCount} items</span>
                    <span className={styles.metaSep}>·</span>
                    <span>{formatIndianNumber(r.totalQuantity)} {r.uom}</span>
                    <span className={styles.metaSep}>·</span>
                    <span>{r.stagingLocation}</span>
                    <span className={styles.metaSep}>·</span>
                    <span>received {r.receivedAt}</span>
                  </div>
                </div>
                <div className={styles.pendingAction}>
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={ArrowRight}
                    onClick={() => setActiveTab('putaway')}
                  >
                    View putaway tasks
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {(activeTab === 'putaway' || activeTab === 'completed') && (
        <PutawayQueue
          tasks={filteredPutaway}
          onAction={(task) => setPutawayModalTask(task)}
        />
      )}

      <GrnReceiveModal
        isOpen={grnModalAsn !== null}
        onClose={() => setGrnModalAsn(null)}
        asn={grnModalAsn}
      />

      <PutawayConfirmModal
        isOpen={putawayModalTask !== null}
        onClose={() => setPutawayModalTask(null)}
        task={putawayModalTask}
        onComplete={(taskId, finalLocation) => {
          updatePutaway(taskId, { status: 'Completed', completedAt: 'Today' });
          const code = `${finalLocation.zone} / ${finalLocation.rack} / ${finalLocation.shelf} / ${finalLocation.bin}`;
          addToast({ type: 'success', message: `Putaway completed — moved to ${code}` });
          setActiveTab('completed');
        }}
      />
      
      {isNewReceivingOpen && (
        <NewReceivingModal
          isOpen={isNewReceivingOpen}
          onClose={() => setIsNewReceivingOpen(false)}
          onSave={(data) => {
            addAsn(data as ASN);
            addToast({ type: 'success', message: 'Advance Shipment Notice created' });
          }}
        />
      )}

      <ASNDetailModal
        isOpen={detailAsn !== null}
        onClose={() => setDetailAsn(null)}
        asn={detailAsn}
        onCancel={(id) => updateAsn(id, { status: 'Cancelled' })}
      />
    </ModuleLayout>
  );
}
