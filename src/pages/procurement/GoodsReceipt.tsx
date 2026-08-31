import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Plus, PackageCheck, Clock, CheckCircle2, Timer,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { useToast } from '@/components/common/Toast';
import { GRNCreateModal } from './components/GRNCreateModal/GRNCreateModal';
import { KpiStrip } from './components/KpiStrip/KpiStrip';
import { mockGRNs, GRN_SUPPLIER_OPTIONS } from './mockData/grnsData';
import { procurementNav } from '@/config/procurementNav';
import type { GRN, GRNStatus } from '@/types/procurement';
import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { usePermission } from '@/hooks/usePermission';
import styles from './GoodsReceipt.module.css';

const GRN_TABS = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending Inspection' },
  { key: 'inspected',   label: 'Inspected' },
  { key: 'accepted',    label: 'Accepted' },
  { key: 'rejected',    label: 'Rejected' },
  { key: 'partial',     label: 'Partial' },
];

const STATUS_MAP: Record<string, GRNStatus> = {
  pending: 'Pending Inspection',
  inspected: 'Inspected',
  accepted: 'Accepted',
  rejected: 'Rejected',
  partial: 'Partial',
};

const PAGE_SIZE = 10;

function getInitials(name: string): string {
  const w = name.split(/\s+/);
  return ((w[0]?.[0] ?? '') + (w[1]?.[0] ?? '')).toUpperCase();
}

const COLUMNS: DataTableColumn<GRN>[] = [
  {
    key: 'id', header: 'GRN #', width: '130px', sortable: true,
    render: (row) => <span className={styles.poLink}>{row.id}</span>,
  },
  {
    key: 'poReference', header: 'PO Ref', width: '130px',
    render: (row) => <span className={styles.poLink}>{row.poReference}</span>,
  },
  { key: 'supplier', header: 'Supplier', sortable: true },
  { key: 'receivedDate', header: 'Received', width: '110px' },
  { key: 'items', header: 'Items', width: '60px', align: 'center' },
  {
    key: 'status', header: 'Status', width: '160px',
    render: (row) => <StatusBadge status={row.status} type="grn" />,
  },
  {
    key: 'aiQualityScore', header: 'AI Score', width: '110px',
    render: (row) => {
      const s = row.aiQualityScore;
      if (s === undefined) return <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>—</span>;
      const cls = s >= 85 ? styles.qualityBarHigh : s >= 60 ? styles.qualityBarMid : styles.qualityBarLow;
      return (
        <div className={styles.qualityCell}>
          <div className={styles.qualityBar}>
            <div className={`${styles.qualityBarFill} ${cls}`} style={{ width: `${s}%` }} />
          </div>
          <span className={styles.qualityScore}>{s}</span>
        </div>
      );
    },
  },
  {
    key: 'inspector', header: 'Inspector', width: '140px',
    render: (row) => row.inspector ? (
      <div className={styles.inspectorCell}>
        <span className={styles.inspectorAvatar}>{getInitials(row.inspector)}</span>
        <span className={styles.inspectorName}>{row.inspector}</span>
      </div>
    ) : <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Unassigned</span>,
  },
];

function buildKpis() {
  const pending  = mockGRNs.filter((g) => g.status === 'Pending Inspection').length;
  const accepted = mockGRNs.filter((g) => g.status === 'Accepted').length;
  const total    = mockGRNs.length;
  const rate     = total ? Math.round((accepted / total) * 1000) / 10 : 0;
  return [
    { label: 'GRNs this month',     value: String(total),    icon: PackageCheck },
    { label: 'Pending inspection',  value: String(pending),  icon: Clock },
    { label: 'Acceptance rate',     value: `${rate}%`,        icon: CheckCircle2 },
    { label: 'Avg inspection time', value: '1.4 days',        icon: Timer },
  ];
}

export default function GoodsReceipt() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]       = useState('');
  const [supplier, setSupplier]   = useState('');
  const [page, setPage]           = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateGRN = (data: any) => {
    addToast(`GRN created successfully for PO ${data.poReference}. Sent for quality inspection.`, 'success');
  };

  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return mockGRNs;
    return mockGRNs.filter((g) => g.status === STATUS_MAP[activeTab]);
  }, [activeTab]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tabFiltered.filter((g) => {
      if (q && !g.id.toLowerCase().includes(q) && !g.poReference.toLowerCase().includes(q) && !g.supplier.toLowerCase().includes(q)) return false;
      if (supplier && g.supplier !== supplier) return false;
      return true;
    });
  }, [tabFiltered, search, supplier]);

  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const tabs = GRN_TABS.map((t) => ({
    ...t,
    count: t.key === 'all' ? mockGRNs.length : mockGRNs.filter((g) => g.status === STATUS_MAP[t.key]).length,
  }));

  const canCreate = usePermission('create_grn');

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <PageHeader
        title="Goods receipt notes"
        subtitle="Record and track incoming material receipts"
        primaryAction={canCreate ? { 
          label: 'Create GRN', 
          icon: Plus, 
          onClick: () => setIsCreateModalOpen(true) 
        } : undefined}
      />

      <KpiStrip items={buildKpis()} />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={(k) => { setActiveTab(k); setPage(1); }} />

      <FilterBar
        searchPlaceholder="Search GRN #, PO ref, supplier…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { label: 'Supplier', key: 'supplier', options: GRN_SUPPLIER_OPTIONS, value: supplier, onChange: (v) => { setSupplier(v); setPage(1); } },
        ]}
        selectedCount={selectedIds.length}
        bulkActions={[{ label: 'Export selected', onClick: () => {} }]}
      />

      <DataTable<GRN>
        columns={COLUMNS}
        data={paginated}
        rowKey="id"
        selectable
        selectedRows={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(row) => navigate(`/procurement/grn/${row.id}`)}
        emptyState={{ icon: PackageCheck, title: 'No GRNs found', description: 'Try adjusting your search or filters.' }}
        pagination={{ total: filtered.length, pageSize: PAGE_SIZE, currentPage: page, onPageChange: setPage }}
        mobileCardRender={(row) => (
          <div className={styles.mobileCard}>
            <div className={styles.mobileRow}>
              <span className={styles.mobileId}>{row.id}</span>
              <StatusBadge status={row.status} type="grn" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{row.supplier}</div>
            <div className={styles.mobileRow}>
              <span className={styles.mobileMeta}>PO: {row.poReference}</span>
              <span className={styles.mobileMeta}>{row.receivedDate}</span>
            </div>
          </div>
        )}
      />

      <GRNCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateGRN}
      />
    </ModuleLayout>
  );
}
