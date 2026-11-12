import { useMemo, useState } from 'react';
import {
  Warehouse,
  Plus,
  Search,
  PackageOpen,
  Truck,
  Timer,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { warehouseNav } from '@/config/warehouseNav';
import { KpiCard } from './components/KpiCard/KpiCard';
import { DispatchPipeline } from './components/DispatchPipeline/DispatchPipeline';
import { DispatchOrderCard } from './components/DispatchOrderCard/DispatchOrderCard';
import { NewDispatchModal } from './components/NewDispatchModal/NewDispatchModal';
import { PickingListModal } from './components/PickingListModal/PickingListModal';
import { PackingValidationModal } from './components/PackingValidationModal/PackingValidationModal';
import { DispatchConfirmModal } from './components/DispatchConfirmModal/DispatchConfirmModal';
import { TrackShipmentModal } from './components/TrackShipmentModal/TrackShipmentModal';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  outboundKpis,
  dispatchOrders as initialDispatchOrders,
  type OutboundKpiIcon,
} from './mockData/outboundData';
import type { DispatchOrder, DispatchStatus, DispatchType } from '@/types/warehouse';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import styles from './Outbound.module.css';

const ICON_MAP: Record<OutboundKpiIcon, LucideIcon> = { PackageOpen, Truck, Timer, Clock };

type OutboundTab = 'all' | 'queue' | 'Pending' | 'Picking' | 'Packed' | 'Dispatched' | 'Delivered';

const CURRENT_USER = 'Ramesh Kumar';

const LOGISTICS = ['all', 'Blue Dart', 'VRL Logistics', 'Gati', 'TCI Express', 'Safexpress', 'Self'];

import { usePermission } from '@/hooks/usePermission';

export default function Outbound() {
  const [activeTab, setActiveTab] = useState<OutboundTab>('all');
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DispatchType>('all');
  const [logisticsFilter, setLogisticsFilter] = useState<string>('all');

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [pickOrder, setPickOrder] = useState<DispatchOrder | null>(null);
  const [packOrder, setPackOrder] = useState<DispatchOrder | null>(null);
  const [dispatchOrder, setDispatchOrder] = useState<DispatchOrder | null>(null);
  const [trackOrder, setTrackOrder] = useState<DispatchOrder | null>(null);

  const { items: allDispatchOrders, update } = useRealtimeMockStore(initialDispatchOrders, 'warehouse.dispatch_orders');

  // Tab counts, the KPI row and the table all read this, so they never
  // disagree about which period they are describing.
  const dispatchOrders = useMemo(
    () => allDispatchOrders.filter((o) => isDateInPeriod(o.expectedDispatchDate, period)),
    [allDispatchOrders, period]
  );
  const { addToast } = useToast();

  const canPrepareOutbound = usePermission('prepare_outbound_dispatch');

  const counts = useMemo(() => {
    const c: Record<DispatchStatus, number> = { Pending: 0, Picking: 0, Packed: 0, Dispatched: 0, Delivered: 0, Cancelled: 0 };
    for (const o of dispatchOrders) c[o.status]++;
    return c;
  }, [dispatchOrders]);

  const tabCounts = useMemo(() => ({
    all: dispatchOrders.length,
    queue: dispatchOrders.filter((o) => o.pickerAssigned === CURRENT_USER || o.packerAssigned === CURRENT_USER).length,
    Pending: counts.Pending,
    Picking: counts.Picking,
    Packed: counts.Packed,
    Dispatched: counts.Dispatched,
    Delivered: counts.Delivered,
  }), [counts, dispatchOrders]);

  const filtered = useMemo(() => {
    return dispatchOrders.filter((o) => {
      if (activeTab === 'queue') {
        if (o.pickerAssigned !== CURRENT_USER && o.packerAssigned !== CURRENT_USER) return false;
      } else if (activeTab !== 'all') {
        if (o.status !== activeTab) return false;
      }
      if (typeFilter !== 'all' && o.type !== typeFilter) return false;
      if (logisticsFilter !== 'all' && o.logisticsPartner !== logisticsFilter) return false;
      if (search.trim() !== '') {
        const q = search.trim().toLowerCase();
        const haystack = `${o.id} ${o.salesOrderRef} ${o.consignee.name} ${o.consignee.city} ${o.vehicleNumber ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeTab, typeFilter, logisticsFilter, search, dispatchOrders]);

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={Warehouse} navItems={warehouseNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Outbound (dispatch)</h1>
          <p className={styles.pageSubtitle}>Picking, packing, and shipment of goods</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          {canPrepareOutbound && (
            <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setIsNewOpen(true)}>
              New dispatch order
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.kpiGrid}>
        {outboundKpis.map((kpi) => (
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

      <DispatchPipeline
        counts={counts}
        activeStatus={activeTab === 'all' || activeTab === 'queue' ? null : (activeTab as DispatchStatus)}
        onSelect={(s) => setActiveTab(s as OutboundTab)}
      />

      <Tabs
        tabs={[
          { key: 'all',        label: 'All orders',  count: tabCounts.all },
          { key: 'queue',      label: 'My queue',    count: tabCounts.queue },
          { key: 'Pending',    label: 'Pending pick',count: tabCounts.Pending },
          { key: 'Picking',    label: 'Picking',     count: tabCounts.Picking },
          { key: 'Packed',     label: 'Packed',      count: tabCounts.Packed },
          { key: 'Dispatched', label: 'Dispatched',  count: tabCounts.Dispatched },
          { key: 'Delivered',  label: 'Delivered',   count: tabCounts.Delivered },
        ]}
        activeTab={activeTab}
        onChange={(k) => setActiveTab(k as OutboundTab)}
      />

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.search}
            placeholder="Search order ID, SO, consignee, vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search dispatch orders"
          />
        </div>
        <select className={styles.select} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | DispatchType)} aria-label="Type filter">
          <option value="all">All types</option>
          <option value="Sales order">Sales order</option>
          <option value="Material request">Material request</option>
          <option value="Inter-warehouse">Inter-warehouse</option>
        </select>
        <select className={styles.select} value={logisticsFilter} onChange={(e) => setLogisticsFilter(e.target.value)} aria-label="Logistics filter">
          {LOGISTICS.map((p) => <option key={p} value={p}>{p === 'all' ? 'All carriers' : p}</option>)}
        </select>
      </div>

      <div className={styles.orderList}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No dispatch orders match your filters.</div>
        ) : filtered.map((order) => (
          <DispatchOrderCard
            key={order.id}
            order={order}
            onPick={(o) => setPickOrder(o)}
            onPack={(o) => setPackOrder(o)}
            onDispatch={(o) => setDispatchOrder(o)}
            onTrack={(o) => setTrackOrder(o)}
            onUpdateStatus={(id, status) => {
              update(id, { status });
              addToast({ type: 'success', message: `Order status updated to ${status}` });
            }}
            onAssignPicker={(id) => {
              update(id, { pickerAssigned: CURRENT_USER });
              addToast({ type: 'success', message: `Picker assigned to order` });
            }}
          />
        ))}
      </div>

      <NewDispatchModal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} />
      <PickingListModal isOpen={pickOrder !== null} onClose={() => setPickOrder(null)} order={pickOrder} />
      <PackingValidationModal isOpen={packOrder !== null} onClose={() => setPackOrder(null)} order={packOrder} />
      <DispatchConfirmModal isOpen={dispatchOrder !== null} onClose={() => setDispatchOrder(null)} order={dispatchOrder} />
      <TrackShipmentModal isOpen={trackOrder !== null} onClose={() => setTrackOrder(null)} order={trackOrder} />
    </ModuleLayout>
  );
}
