import { useState, useMemo } from 'react';
import { ShoppingCart, Plus, FileText, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { KpiStrip } from './components/KpiStrip/KpiStrip';
import { PRFormModal } from './components/PRFormModal/PRFormModal';
import { PRDetailModal } from './components/PRDetailModal/PRDetailModal';
import { mockPRs, PR_TAB_COUNTS } from './mockData/requisitionsData';
import { formatIndianCurrency } from '@/utils/formatters';
import { procurementNav } from '@/config/procurementNav';
import type { PurchaseRequisition, PRStatus, Priority, Department } from '@/types/procurement';
import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { usePermission } from '@/hooks/usePermission';
import styles from './PurchaseRequisitions.module.css';

const PR_TABS = [
  { key: 'all',       label: 'All',              count: PR_TAB_COUNTS.all },
  { key: 'draft',     label: 'Draft',            count: PR_TAB_COUNTS.draft },
  { key: 'pending',   label: 'Pending Approval', count: PR_TAB_COUNTS.pending },
  { key: 'approved',  label: 'Approved',         count: PR_TAB_COUNTS.approved },
  { key: 'rejected',  label: 'Rejected',         count: PR_TAB_COUNTS.rejected },
  { key: 'converted', label: 'Converted to PO',  count: PR_TAB_COUNTS.converted },
];

const DEPT_OPTIONS = [
  { label: 'All Departments', value: '' },
  { label: 'Laboratory',  value: 'Laboratory' },
  { label: 'Procurement', value: 'Procurement' },
  { label: 'Warehouse',   value: 'Warehouse' },
  { label: 'R&D',         value: 'R&D' },
  { label: 'Processing',  value: 'Processing' },
  { label: 'Admin',       value: 'Admin' },
];

const PRIORITY_OPTIONS = [
  { label: 'All Priorities', value: '' },
  { label: 'Low',    value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High',   value: 'High' },
  { label: 'Urgent', value: 'Urgent' },
];

const PAGE_SIZE = 10;

const COLUMNS: DataTableColumn<PurchaseRequisition>[] = [
  { key: 'id',         header: 'PR #',       width: '130px', sortable: true },
  { key: 'title',      header: 'Title',                      sortable: true },
  { key: 'department', header: 'Department', width: '120px', sortable: true },
  { key: 'items',      header: 'Items',      width: '60px',  align: 'center' },
  {
    key: 'totalValue',
    header: 'Value',
    width: '120px',
    align: 'right',
    sortable: true,
    render: (row) => formatIndianCurrency(row.totalValue),
  },
  {
    key: 'priority',
    header: 'Priority',
    width: '90px',
    render: (row) => <StatusBadge status={row.priority} type="priority" />,
  },
  {
    key: 'status',
    header: 'Status',
    width: '155px',
    render: (row) => <StatusBadge status={row.status} type="pr" />,
  },
  { key: 'createdDate', header: 'Created',     width: '110px' },
  { key: 'requiredBy',  header: 'Required By', width: '110px' },
];

function buildKpiItems(prs: PurchaseRequisition[]) {
  const total    = prs.length;
  const pending  = prs.filter((p) => p.status === 'Pending Approval').length;
  const approved = prs.filter((p) => p.status === 'Approved').length;
  const totalVal = prs.reduce((s, p) => s + p.totalValue, 0);
  return [
    { label: 'Total PRs',        value: String(total),                  icon: FileText },
    { label: 'Pending Approval', value: String(pending),                icon: Clock },
    { label: 'Approved',         value: String(approved),               icon: CheckCircle2 },
    { label: 'Total Value',      value: formatIndianCurrency(totalVal), icon: TrendingUp },
  ];
}

export default function PurchaseRequisitions() {
  const [activeTab,   setActiveTab]   = useState('all');
  const [search,      setSearch]      = useState('');
  const [deptFilter,  setDeptFilter]  = useState('');
  const [prioFilter,  setPrioFilter]  = useState('');
  const [page,        setPage]        = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showNew,     setShowNew]     = useState(false);
  const [detailPR,    setDetailPR]    = useState<PurchaseRequisition | null>(null);

  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return mockPRs;
    const map: Record<string, PRStatus> = {
      draft:     'Draft',
      pending:   'Pending Approval',
      approved:  'Approved',
      rejected:  'Rejected',
      converted: 'Converted to PO',
    };
    return mockPRs.filter((p) => p.status === map[activeTab]);
  }, [activeTab]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tabFiltered.filter((p) => {
      if (q && !p.id.toLowerCase().includes(q) && !p.title.toLowerCase().includes(q) && !p.createdBy.toLowerCase().includes(q)) return false;
      if (deptFilter && p.department !== (deptFilter as Department)) return false;
      if (prioFilter && p.priority   !== (prioFilter as Priority))   return false;
      return true;
    });
  }, [tabFiltered, search, deptFilter, prioFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  function handleTabChange(key: string) { setActiveTab(key); setPage(1); setSelectedIds([]); }
  function handleSearch(val: string)    { setSearch(val);    setPage(1); }
  function handleDept(val: string)      { setDeptFilter(val); setPage(1); }
  function handlePrio(val: string)      { setPrioFilter(val); setPage(1); }

  const canCreate = usePermission('create_requisition');

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <PageHeader
        title="Purchase Requisitions"
        subtitle="Manage and track internal purchase requests across departments"
        primaryAction={canCreate ? { label: 'New Requisition', icon: Plus, onClick: () => setShowNew(true) } : undefined}
      />

      <KpiStrip items={buildKpiItems(mockPRs)} />

      <Tabs tabs={PR_TABS} activeTab={activeTab} onChange={handleTabChange} />

      <FilterBar
        searchPlaceholder="Search PR #, title, requester…"
        searchValue={search}
        onSearchChange={handleSearch}
        filters={[
          { label: 'Department', key: 'dept', options: DEPT_OPTIONS, value: deptFilter, onChange: handleDept },
          { label: 'Priority',   key: 'prio', options: PRIORITY_OPTIONS, value: prioFilter, onChange: handlePrio },
        ]}
        selectedCount={selectedIds.length}
        bulkActions={[{ label: 'Export selected', onClick: () => {} }]}
      />

      <DataTable<PurchaseRequisition>
        columns={COLUMNS}
        data={paginated}
        rowKey="id"
        selectable
        selectedRows={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(row) => setDetailPR(row)}
        emptyState={{ icon: FileText, title: 'No requisitions found', description: 'Try adjusting your search or tab filter.' }}
        pagination={{ total: filtered.length, pageSize: PAGE_SIZE, currentPage: page, onPageChange: setPage }}
        mobileCardRender={(row) => (
          <div className={styles.mobileCard}>
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileCardId}>{row.id}</span>
              <StatusBadge status={row.status} type="pr" />
            </div>
            <div className={styles.mobileCardTitle}>{row.title}</div>
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileCardMeta}>{row.department} · {row.items} items</span>
              <StatusBadge status={row.priority} type="priority" />
            </div>
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileCardMeta}>Created {row.createdDate}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{formatIndianCurrency(row.totalValue)}</span>
            </div>
          </div>
        )}
      />

      <PRFormModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onSubmit={() => setShowNew(false)}
      />

      <PRDetailModal
        pr={detailPR}
        isOpen={!!detailPR}
        onClose={() => setDetailPR(null)}
      />
    </ModuleLayout>
  );
}
