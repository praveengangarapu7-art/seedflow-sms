import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Plus, FileQuestion, TrendingDown, Users, Clock,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { useToast } from '@/components/common/Toast';
import { RFQCreateModal } from './components/RFQCreateModal/RFQCreateModal';
import { KpiStrip } from './components/KpiStrip/KpiStrip';
import { createRFQ, useRFQs } from './procurementStore';
import { procurementNav } from '@/config/procurementNav';
import type { RFQ, RFQStatus } from '@/types/procurement';
import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { usePermission } from '@/hooks/usePermission';
import { PERIOD_OPTIONS, isDateInPeriod, MOCK_TODAY, type PeriodValue } from '@/utils/periodFilter';
import styles from './RFQQuotations.module.css';

const RFQ_TABS = [
  { key: 'all',       label: 'All' },
  { key: 'draft',     label: 'Draft' },
  { key: 'sent',      label: 'Sent' },
  { key: 'responses', label: 'Responses Received' },
  { key: 'awarded',   label: 'Awarded' },
  { key: 'closed',    label: 'Closed' },
];

const STATUS_MAP: Record<string, RFQStatus> = {
  draft: 'Draft', sent: 'Sent', responses: 'Responses Received',
  awarded: 'Awarded', closed: 'Closed',
};

const PAGE_SIZE = 10;

function daysUntil(date: string): number {
  const d = new Date(date);
  return Math.round((d.getTime() - MOCK_TODAY.getTime()) / 86_400_000);
}

const COLUMNS: DataTableColumn<RFQ>[] = [
  {
    key: 'id', header: 'RFQ #', width: '120px', sortable: true,
    render: (row) => <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{row.id}</span>,
  },
  { key: 'title', header: 'Title', sortable: true },
  {
    key: 'items', header: 'Items', width: '70px', align: 'center',
    render: (row) => `${row.items}`,
  },
  {
    key: 'suppliersInvited', header: 'Invited', width: '110px',
    render: (row) => {
      const max = Math.min(row.suppliersInvited, 4);
      return (
        <div className={styles.avatarGroup}>
          {Array.from({ length: max }).map((_, i) => (
            <span key={i} className={styles.avatarMini}>S{i + 1}</span>
          ))}
          {row.suppliersInvited > 4 && (
            <span className={`${styles.avatarMini} ${styles.avatarMore}`}>+{row.suppliersInvited - 4}</span>
          )}
        </div>
      );
    },
  },
  {
    key: 'responsesReceived', header: 'Responses', width: '120px',
    render: (row) => {
      const pct = row.suppliersInvited ? (row.responsesReceived / row.suppliersInvited) * 100 : 0;
      return (
        <div className={styles.respCell}>
          <span className={styles.respText}>{row.responsesReceived} of {row.suppliersInvited}</span>
          <div className={styles.respBar}>
            <div className={styles.respBarFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    },
  },
  {
    key: 'deadline', header: 'Deadline', width: '130px',
    render: (row) => {
      const days = daysUntil(row.deadline);
      const overdue = days < 0;
      const soon = !overdue && days <= 3;
      return (
        <div className={styles.deadlineCell}>
          <span className={styles.deadlineDate}>{row.deadline}</span>
          <span className={`${styles.deadlineLeft} ${overdue ? styles.deadlineOverdue : soon ? styles.deadlineSoon : ''}`}>
            {overdue ? `${Math.abs(days)} days overdue` : days === 0 ? 'today' : `${days} days left`}
          </span>
        </div>
      );
    },
  },
  {
    key: 'status', header: 'Status', width: '160px',
    render: (row) => <StatusBadge status={row.status} type="rfq" />,
  },
];

function buildKpis(rfqs: RFQ[]) {
  const active = rfqs.filter((r) => ['Sent', 'Responses Received'].includes(r.status)).length;
  return [
    { label: 'Active RFQs',           value: String(active),  icon: FileQuestion },
    { label: 'Avg cost savings',      value: '12.4%',         icon: TrendingDown },
    { label: 'Avg suppliers per RFQ', value: '4.2',           icon: Users },
    { label: 'Avg response time',     value: '2.8 days',      icon: Clock },
  ];
}

export default function RFQQuotations() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]       = useState('');
  const [period, setPeriod]       = useState<PeriodValue>('all');
  const [page, setPage]           = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [mockRFQs] = useRFQs();

  const handleCreateRFQ = (data: any) => {
    const rfq = createRFQ(data);
    navigate(`/procurement/rfq/${rfq.id}`);
    addToast(`RFQ "${data.title}" has been created and sent to ${data.invitedSuppliers.length} suppliers.`, 'success');
  };

  const periodFiltered = useMemo(
    () => mockRFQs.filter((r) => isDateInPeriod(r.createdDate, period)),
    [period, mockRFQs]
  );

  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return periodFiltered;
    return periodFiltered.filter((r) => r.status === STATUS_MAP[activeTab]);
  }, [periodFiltered, activeTab]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tabFiltered.filter((r) => {
      if (q && !r.id.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tabFiltered, search]);

  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const tabs = RFQ_TABS.map((t) => ({
    ...t,
    count: t.key === 'all' ? periodFiltered.length : periodFiltered.filter((r) => r.status === STATUS_MAP[t.key]).length,
  }));

  const canCreate = usePermission('create_rfq');

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <PageHeader
        title="Request for quotations"
        subtitle="Compare bids and select best suppliers"
        primaryAction={canCreate ? { 
          label: 'New RFQ', 
          icon: Plus, 
          onClick: () => setIsCreateModalOpen(true) 
        } : undefined}
        period={{ value: period, onChange: (v) => { setPeriod(v as PeriodValue); setPage(1); }, options: PERIOD_OPTIONS }}
      />

      <KpiStrip items={buildKpis(periodFiltered)} />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={(k) => { setActiveTab(k); setPage(1); }} />

      <FilterBar
        searchPlaceholder="Search RFQ #, title…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        selectedCount={selectedIds.length}
        bulkActions={[{ label: 'Export selected', onClick: () => {} }]}
      />

      <DataTable<RFQ>
        columns={COLUMNS}
        data={paginated}
        rowKey="id"
        selectable
        selectedRows={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(row) => navigate(`/procurement/rfq/${row.id}`)}
        emptyState={{ icon: FileQuestion, title: 'No RFQs found', description: 'Try adjusting your search or filter.' }}
        pagination={{ total: filtered.length, pageSize: PAGE_SIZE, currentPage: page, onPageChange: setPage }}
        mobileCardRender={(row) => (
          <div className={styles.mobileCard}>
            <div className={styles.mobileRow}>
              <span className={styles.mobileId}>{row.id}</span>
              <StatusBadge status={row.status} type="rfq" />
            </div>
            <div className={styles.mobileTitle}>{row.title}</div>
            <div className={styles.mobileRow}>
              <span className={styles.mobileMeta}>{row.responsesReceived}/{row.suppliersInvited} responses</span>
              <span className={styles.mobileMeta}>{row.deadline}</span>
            </div>
          </div>
        )}
      />

      <RFQCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRFQ}
      />
    </ModuleLayout>
  );
}
