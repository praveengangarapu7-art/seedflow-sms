import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Plus, Package, Truck, CheckCircle2, TrendingUp,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { KpiStrip } from './components/KpiStrip/KpiStrip';
import { POCreateModal } from './components/POCreateModal/POCreateModal';
import { PO_TAB_COUNTS, SUPPLIER_OPTIONS } from './mockData/ordersData';
import { createPurchaseOrder, usePOs } from './procurementStore';
import { formatIndianCurrency } from '@/utils/formatters';
import { procurementNav } from '@/config/procurementNav';
import type { PurchaseOrder, POStatus } from '@/types/procurement';
import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { usePermission } from '@/hooks/usePermission';
import { PERIOD_OPTIONS, isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import styles from './PurchaseOrders.module.css';

import { useToast } from '@/components/common/Toast';
import { useSearchParams } from 'react-router-dom';
const PO_TABS = [
  { key: 'all',          label: 'All',               count: PO_TAB_COUNTS.all },
  { key: 'draft',        label: 'Draft',              count: PO_TAB_COUNTS.draft },
  { key: 'sent',         label: 'Sent',               count: PO_TAB_COUNTS.sent },
  { key: 'acknowledged', label: 'Acknowledged',       count: PO_TAB_COUNTS.acknowledged },
  { key: 'partial',      label: 'Partially Received', count: PO_TAB_COUNTS.partial },
  { key: 'received',     label: 'Received',           count: PO_TAB_COUNTS.received },
  { key: 'closed',       label: 'Closed',             count: PO_TAB_COUNTS.closed },
];

const PAGE_SIZE = 10;

const COLUMNS: DataTableColumn<PurchaseOrder>[] = [
  { key: 'id',       header: 'PO #',       width: '130px', sortable: true },
  { key: 'supplier', header: 'Supplier',                   sortable: true },
  {
    key: 'prReference',
    header: 'PR Ref',
    width: '130px',
    render: (row) => (
      <span style={{ fontSize: 12, color: row.prReference ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
        {row.prReference ?? '—'}
      </span>
    ),
  },
  {
    key: 'totalAmount',
    header: 'Amount',
    width: '120px',
    align: 'right',
    sortable: true,
    render: (row) => formatIndianCurrency(row.totalAmount),
  },
  {
    key: 'status',
    header: 'Status',
    width: '165px',
    render: (row) => <StatusBadge status={row.status} type="po" />,
  },
  { key: 'expectedDelivery', header: 'Delivery',  width: '110px' },
  { key: 'createdDate',      header: 'Created',   width: '110px' },
  { key: 'paymentTerms',     header: 'Terms',     width: '80px' },
];

function buildKpiItems(pos: PurchaseOrder[]) {
  const active   = pos.filter((p) => !['Draft', 'Closed'].includes(p.status)).length;
  const received = pos.filter((p) => p.status === 'Received' || p.status === 'Closed').length;
  const totalVal = pos.reduce((s, p) => s + p.totalAmount, 0);
  return [
    { label: 'Total POs',     value: String(pos.length),            icon: Package },
    { label: 'Active Orders', value: String(active),   icon: Truck },
    { label: 'Completed',     value: String(received), icon: CheckCircle2 },
    { label: 'Total Spend',   value: formatIndianCurrency(totalVal), icon: TrendingUp },
  ];
}

const STATUS_MAP: Record<string, POStatus> = {
  draft:        'Draft',
  sent:         'Sent',
  acknowledged: 'Acknowledged',
  partial:      'Partially Received',
  received:     'Received',
  closed:       'Closed',
};

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [mockPOs] = usePOs();
  const [searchParams, setSearchParams] = useSearchParams();
  const prFromLink = searchParams.get('pr') ?? undefined;

  const [activeTab,   setActiveTab]   = useState('all');
  const [search,      setSearch]      = useState('');
  const [supplier,    setSupplier]    = useState('');
  const [period,      setPeriod]      = useState<PeriodValue>('all');
  const [page,        setPage]        = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreate,  setShowCreate]  = useState(Boolean(prFromLink));

  const periodFiltered = useMemo(
    () => mockPOs.filter((p) => isDateInPeriod(p.createdDate, period)),
    [period, mockPOs]
  );

  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return periodFiltered;
    return periodFiltered.filter((p) => p.status === STATUS_MAP[activeTab]);
  }, [periodFiltered, activeTab]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tabFiltered.filter((p) => {
      if (q && !p.id.toLowerCase().includes(q) && !p.supplier.toLowerCase().includes(q) && !(p.prReference ?? '').toLowerCase().includes(q)) return false;
      if (supplier && p.supplier !== supplier) return false;
      return true;
    });
  }, [tabFiltered, search, supplier]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  function handleTabChange(key: string) { setActiveTab(key); setPage(1); setSelectedIds([]); }
  function handleSearch(val: string)    { setSearch(val);   setPage(1); }
  function handleSupplier(val: string)  { setSupplier(val); setPage(1); }
  function handlePeriod(val: PeriodValue) { setPeriod(val);  setPage(1); }

  const tabsWithCounts = PO_TABS.map((t) => ({
    ...t,
    count: t.key === 'all' ? periodFiltered.length : periodFiltered.filter((p) => p.status === STATUS_MAP[t.key]).length,
  }));

  const canCreate = usePermission('create_order');

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <PageHeader
        title="Purchase Orders"
        subtitle="Create, track, and manage supplier purchase orders"
        primaryAction={canCreate ? { label: 'Create PO', icon: Plus, onClick: () => setShowCreate(true) } : undefined}
        period={{ value: period, onChange: (v) => handlePeriod(v as PeriodValue), options: PERIOD_OPTIONS }}
      />

      <KpiStrip items={buildKpiItems(periodFiltered)} />

      <Tabs tabs={tabsWithCounts} activeTab={activeTab} onChange={handleTabChange} />

      <FilterBar
        searchPlaceholder="Search PO #, supplier, PR ref…"
        searchValue={search}
        onSearchChange={handleSearch}
        filters={[
          { label: 'Supplier', key: 'supplier', options: SUPPLIER_OPTIONS, value: supplier, onChange: handleSupplier },
        ]}
        selectedCount={selectedIds.length}
        bulkActions={[{ label: 'Export selected', onClick: () => {} }]}
      />

      <DataTable<PurchaseOrder>
        columns={COLUMNS}
        data={paginated}
        rowKey="id"
        selectable
        selectedRows={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(row) => navigate(`/procurement/orders/${row.id}`)}
        emptyState={{ icon: Package, title: 'No purchase orders found', description: 'Try adjusting your search or filters.' }}
        pagination={{ total: filtered.length, pageSize: PAGE_SIZE, currentPage: page, onPageChange: setPage }}
        mobileCardRender={(row) => (
          <div className={styles.mobileCard}>
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileCardId}>{row.id}</span>
              <StatusBadge status={row.status} type="po" />
            </div>
            <div className={styles.mobileCardSupplier}>{row.supplier}</div>
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileCardMeta}>Delivery: {row.expectedDelivery}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{formatIndianCurrency(row.totalAmount)}</span>
            </div>
          </div>
        )}
      />

      <POCreateModal
        isOpen={showCreate}
        preselectedPrId={prFromLink}
        onClose={() => { setShowCreate(false); if (prFromLink) setSearchParams({}); }}
        onSubmit={(data) => {
          const po = createPurchaseOrder(data);
          setShowCreate(false);
          if (prFromLink) setSearchParams({});
          addToast(`${po.id} created as a draft for ${po.supplier}`, 'success');
          navigate(`/procurement/orders/${po.id}`);
        }}
      />
    </ModuleLayout>
  );
}
