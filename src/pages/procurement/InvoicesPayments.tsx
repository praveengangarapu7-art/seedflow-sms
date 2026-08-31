import { useState, useMemo } from 'react';
import {
  ShoppingCart, Plus, Wallet, GitCompare, CheckCircle2, AlertTriangle,
  Check, AlertCircle, X,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { useToast } from '@/components/common/Toast';
import { KpiStrip } from './components/KpiStrip/KpiStrip';
import {
  mockInvoices, INVOICE_TAB_COUNTS, INVOICE_SUPPLIER_OPTIONS, INVOICE_STATUS_OPTIONS,
} from './mockData/invoicesData';
import { formatIndianCurrency } from '@/utils/formatters';
import { procurementNav } from '@/config/procurementNav';
import type { Invoice } from '@/types/procurement';
import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { usePermission } from '@/hooks/usePermission';
import styles from './InvoicesPayments.module.css';

const TABS = [
  { key: 'all',      label: 'All',                  count: INVOICE_TAB_COUNTS.all },
  { key: 'pending',  label: 'Pending 3-Way Match',  count: INVOICE_TAB_COUNTS.pending },
  { key: 'approved', label: 'Approved for Payment', count: INVOICE_TAB_COUNTS.approved },
  { key: 'paid',     label: 'Paid',                 count: INVOICE_TAB_COUNTS.paid },
  { key: 'disputed', label: 'Disputed',             count: INVOICE_TAB_COUNTS.disputed },
];

const PAGE_SIZE = 10;

function buildKpis() {
  const totalPayable = mockInvoices.filter((i) => i.paymentStatus !== 'Paid').reduce((s, i) => s + i.total, 0);
  const pendingMatch = mockInvoices.filter((i) => i.matchStatus !== 'matched').length;
  const approved     = mockInvoices.filter((i) => i.paymentStatus === 'Approved').length;
  const overdue      = mockInvoices.filter((i) => i.paymentStatus === 'Overdue').length;
  return [
    { label: 'Total payable',         value: formatIndianCurrency(totalPayable), icon: Wallet },
    { label: 'Pending 3-way match',   value: String(pendingMatch),               icon: GitCompare },
    { label: 'Approved for payment',  value: String(approved),                   icon: CheckCircle2 },
    { label: 'Overdue payments',      value: String(overdue),                    icon: AlertTriangle },
  ];
}

function payClass(s: Invoice['paymentStatus']): string {
  return s === 'Pending'  ? styles.payPending  :
         s === 'Approved' ? styles.payApproved :
         s === 'Paid'     ? styles.payPaid     :
         s === 'Overdue'  ? styles.payOverdue  :
         styles.payDisputed;
}

const COLUMNS: DataTableColumn<Invoice>[] = [
  {
    key: 'id', header: 'Invoice #', width: '180px',
    render: (row) => <span className={styles.poLink}>{row.id}</span>,
  },
  { key: 'supplier', header: 'Supplier', sortable: true },
  {
    key: 'poReference', header: 'PO Ref', width: '130px',
    render: (row) => <span className={styles.poLink}>{row.poReference}</span>,
  },
  {
    key: 'grnReference', header: 'GRN Ref', width: '130px',
    render: (row) => <span className={styles.poLink}>{row.grnReference}</span>,
  },
  {
    key: 'total', header: 'Total', width: '110px', align: 'right',
    render: (row) => formatIndianCurrency(row.total),
  },
  {
    key: 'matchStatus', header: 'Match', width: '70px', align: 'center',
    render: (row) => (
      <div className={styles.matchIconCell}>
        {row.matchStatus === 'matched' && <Check size={16} className={styles.matchOk} />}
        {row.matchStatus === 'mismatch' && <AlertCircle size={16} className={styles.matchVar} />}
        {row.matchStatus === 'pending' && <span className={styles.matchPending}>—</span>}
      </div>
    ),
  },
  { key: 'dueDate', header: 'Due', width: '110px' },
  {
    key: 'paymentStatus', header: 'Payment', width: '100px',
    render: (row) => (
      <span className={`${styles.paymentBadge} ${payClass(row.paymentStatus)}`}>{row.paymentStatus}</span>
    ),
  },
];

// ── 3-Way Match Detail Modal ─────────────────────────────────────────
function ThreeWayMatchModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { addToast } = useToast();
  const canApprove = usePermission('approve_invoice_payment');
  const hasVariances = invoice.variances && invoice.variances.length > 0;
  const allMatched = invoice.matchStatus === 'matched';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`3-way match — ${invoice.id}`}
      size="xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          {!allMatched && canApprove && <Button variant="ghost" size="sm" leftIcon={X}>Reject invoice</Button>}
          {canApprove && (
            <Button variant="primary" size="sm" onClick={() => {
              addToast(`${invoice.id} approved for payment`, 'success'); onClose();
            }}>Approve for payment</Button>
          )}
        </div>
      }
    >
      {/* 3-column comparison */}
      <div className={styles.threeColumnGrid}>
        {/* PO column */}
        <div className={styles.matchCard}>
          <div className={styles.matchCardHeader}>
            <p className={styles.matchCardType}>Purchase Order</p>
            <p className={styles.matchCardId}>{invoice.poReference}</p>
            <p className={styles.matchCardSub}>{invoice.supplier}</p>
          </div>
          <div className={styles.matchRow + ' ' + styles.matchRowOk}>
            <span className={styles.matchKey}>Quantity</span>
            <span className={styles.matchVal}>50</span>
          </div>
          <div className={`${styles.matchRow} ${hasVariances ? styles.matchRowVar : styles.matchRowOk}`}>
            <span className={styles.matchKey}>Unit price</span>
            <span className={styles.matchVal}>₹8,500</span>
          </div>
          <div className={`${styles.matchRow} ${hasVariances ? styles.matchRowVar : styles.matchRowOk}`}>
            <span className={styles.matchKey}>Total</span>
            <span className={styles.matchVal}>{formatIndianCurrency(invoice.total)}</span>
          </div>
        </div>

        {/* GRN column */}
        <div className={styles.matchCard}>
          <div className={styles.matchCardHeader}>
            <p className={styles.matchCardType}>Goods Receipt</p>
            <p className={styles.matchCardId}>{invoice.grnReference}</p>
            <p className={styles.matchCardSub}>Received {invoice.invoiceDate}</p>
          </div>
          <div className={`${styles.matchRow} ${styles.matchRowOk}`}>
            <span className={styles.matchKey}>Received qty</span>
            <span className={styles.matchVal}>{hasVariances ? '48' : '50'}</span>
          </div>
          <div className={`${styles.matchRow} ${styles.matchRowOk}`}>
            <span className={styles.matchKey}>Unit price</span>
            <span className={styles.matchValDim}>—</span>
          </div>
          <div className={`${styles.matchRow} ${styles.matchRowOk}`}>
            <span className={styles.matchKey}>Total</span>
            <span className={styles.matchValDim}>—</span>
          </div>
        </div>

        {/* Invoice column */}
        <div className={styles.matchCard}>
          <div className={styles.matchCardHeader}>
            <p className={styles.matchCardType}>Invoice</p>
            <p className={styles.matchCardId}>{invoice.id}</p>
            <p className={styles.matchCardSub}>{invoice.invoiceDate}</p>
          </div>
          <div className={styles.matchRow + ' ' + styles.matchRowOk}>
            <span className={styles.matchKey}>Quantity</span>
            <span className={styles.matchVal}>50</span>
          </div>
          <div className={`${styles.matchRow} ${hasVariances ? styles.matchRowVar : styles.matchRowOk}`}>
            <span className={styles.matchKey}>Unit price</span>
            <span className={styles.matchVal}>{hasVariances ? '₹8,800' : '₹8,500'}</span>
          </div>
          <div className={`${styles.matchRow} ${hasVariances ? styles.matchRowVar : styles.matchRowOk}`}>
            <span className={styles.matchKey}>Total</span>
            <span className={styles.matchVal}>{formatIndianCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* Match summary */}
      <div className={`${styles.matchSummary} ${allMatched ? styles.matchSumOk : styles.matchSumWarn}`}>
        {allMatched ? <Check size={18} /> : <AlertTriangle size={18} />}
        <span className={styles.matchSumText}>
          {allMatched
            ? 'All matched — invoice ready for payment approval'
            : `${invoice.variances?.length ?? 0} variance${(invoice.variances?.length ?? 0) > 1 ? 's' : ''} detected — review required`
          }
        </span>
      </div>

      {/* Variance list */}
      {hasVariances && (
        <>
          <p className={styles.sectionTitle}>Variances</p>
          <table className={styles.varianceTable}>
            <thead>
              <tr>
                <th>Field</th><th>PO</th><th>GRN</th><th>Invoice</th><th>Variance</th><th>Tolerance</th>
              </tr>
            </thead>
            <tbody>
              {invoice.variances!.map((v, i) => {
                const within = Math.abs(v.variance) / Math.max(Math.abs(v.poValue), 1) <= 0.02;
                return (
                  <tr key={i}>
                    <td>{v.field}</td>
                    <td>{v.poValue.toLocaleString('en-IN')}</td>
                    <td>{v.grnValue.toLocaleString('en-IN')}</td>
                    <td>{v.invoiceValue.toLocaleString('en-IN')}</td>
                    <td className={v.variance < 0 ? styles.varBad : styles.varBad}>
                      {v.variance > 0 ? '+' : ''}{v.variance.toLocaleString('en-IN')}
                    </td>
                    <td className={within ? styles.varOk : styles.varBad}>
                      {within ? 'Within ±2%' : 'Exceeds tolerance'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Sidebar info */}
      <div className={styles.matchSidebar}>
        <p className={styles.matchSidebarTitle}>Activity</p>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
          <strong>{invoice.invoiceDate}</strong> — Invoice received from {invoice.supplier}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
          <strong>{invoice.invoiceDate}</strong> — Auto 3-way match performed
        </p>
        {invoice.paidDate && (
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <strong>{invoice.paidDate}</strong> — Payment processed
          </p>
        )}
      </div>
    </Modal>
  );
}

// ── Record Invoice Modal ─────────────────────────────────────────────
function RecordInvoiceModal({ onClose }: { onClose: () => void }) {
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [grnId, setGrnId] = useState('');

  const recentGrns = [
    { id: 'GRN-2026-0099', supplier: 'Pioneer Packaging Co', amount: 645000 },
    { id: 'GRN-2026-0098', supplier: 'Mahyco Seeds Ltd',     amount: 1900000 },
    { id: 'GRN-2026-0095', supplier: 'Nuziveedu Seeds Ltd',  amount: 1500000 },
    { id: 'GRN-2026-0094', supplier: 'UPL Limited',          amount: 637200 },
  ];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Record invoice"
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>{step > 0 && <Button variant="secondary" size="sm" onClick={() => setStep(step - 1)}>← Back</Button>}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            {step < 3
              ? <Button variant="primary" size="sm" onClick={() => setStep(step + 1)} disabled={step === 0 && !grnId}>Next →</Button>
              : <Button variant="primary" size="sm" onClick={() => { addToast('Invoice recorded', 'success'); onClose(); }}>Submit</Button>}
          </div>
        </div>
      }
    >
      <Stepper
        steps={[
          { key: 'grn',     label: 'Select GRN' },
          { key: 'details', label: 'Invoice details' },
          { key: 'match',   label: '3-way match' },
          { key: 'confirm', label: 'Confirm' },
        ]}
        currentStep={step}
        onStepClick={(i) => i < step && setStep(i)}
      />

      {step === 0 && (
        <div className={styles.poList}>
          {recentGrns.map((g) => (
            <div
              key={g.id}
              className={`${styles.poItem} ${grnId === g.id ? styles.poItemActive : ''}`}
              onClick={() => setGrnId(g.id)}
            >
              <div className={`${styles.poRadio} ${grnId === g.id ? styles.poRadioActive : ''}`}>
                {grnId === g.id && <div className={styles.poRadioDot} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>{g.id}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{g.supplier}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{formatIndianCurrency(g.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Invoice details</p>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Invoice number</label>
              <input className={styles.input} placeholder="INV-XXX-2026-0000" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Invoice date</label>
              <input type="date" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Subtotal (₹)</label>
              <input type="number" className={styles.input} placeholder="0" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Tax type</label>
              <select className={styles.select}>
                <option>CGST + SGST (intra-state)</option>
                <option>IGST (inter-state)</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Tax rate (%)</label>
              <input type="number" className={styles.input} placeholder="18" defaultValue={18} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Due date</label>
              <input type="date" className={styles.input} />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ padding: 24, textAlign: 'center', background: 'var(--color-accent-light)', borderRadius: 6 }}>
          <Check size={32} color="var(--color-success)" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>3-way match complete</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            All values match between PO, GRN, and Invoice. Ready for approval.
          </p>
        </div>
      )}

      {step === 3 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Final action</p>
          <select className={styles.select} style={{ width: '100%' }}>
            <option>Approve for payment</option>
            <option>Hold for review</option>
            <option>Mark as disputed</option>
          </select>
        </div>
      )}
    </Modal>
  );
}

export default function InvoicesPayments() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]       = useState('');
  const [supplier, setSupplier]   = useState('');
  const [status, setStatus]       = useState('');
  const [page, setPage]           = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [showRecord, setShowRecord] = useState(false);

  const filtered = useMemo(() => {
    let data = mockInvoices;
    if (activeTab === 'pending')  data = data.filter((i) => i.matchStatus !== 'matched');
    if (activeTab === 'approved') data = data.filter((i) => i.paymentStatus === 'Approved');
    if (activeTab === 'paid')     data = data.filter((i) => i.paymentStatus === 'Paid');
    if (activeTab === 'disputed') data = data.filter((i) => i.paymentStatus === 'Disputed');

    const q = search.toLowerCase();
    return data.filter((i) => {
      if (q && !i.id.toLowerCase().includes(q) && !i.supplier.toLowerCase().includes(q) && !i.poReference.toLowerCase().includes(q)) return false;
      if (supplier && i.supplier !== supplier) return false;
      if (status && i.paymentStatus !== status) return false;
      return true;
    });
  }, [activeTab, search, supplier, status]);

  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const canRecord = usePermission('create_invoice');

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <PageHeader
        title="Invoices & payments"
        subtitle="Track invoices and manage supplier payments"
        primaryAction={canRecord ? { label: 'Record invoice', icon: Plus, onClick: () => setShowRecord(true) } : undefined}
      />

      <KpiStrip items={buildKpis()} />

      <Tabs tabs={TABS} activeTab={activeTab} onChange={(k) => { setActiveTab(k); setPage(1); }} />

      <FilterBar
        searchPlaceholder="Invoice number, supplier, PO ref…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { label: 'Supplier', key: 'supplier', options: INVOICE_SUPPLIER_OPTIONS, value: supplier, onChange: (v) => { setSupplier(v); setPage(1); } },
          { label: 'Status',   key: 'status',   options: INVOICE_STATUS_OPTIONS,   value: status,   onChange: (v) => { setStatus(v); setPage(1); } },
        ]}
        selectedCount={selectedIds.length}
        bulkActions={[{ label: 'Export selected', onClick: () => {} }]}
      />

      <DataTable<Invoice>
        columns={COLUMNS}
        data={paginated}
        rowKey="id"
        selectable
        selectedRows={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(row) => setDetailInvoice(row)}
        emptyState={{ icon: Wallet, title: 'No invoices found', description: 'Try adjusting your search or filters.' }}
        pagination={{ total: filtered.length, pageSize: PAGE_SIZE, currentPage: page, onPageChange: setPage }}
        mobileCardRender={(row) => (
          <div className={styles.mobileCard}>
            <div className={styles.mobileRow}>
              <span className={styles.mobileId}>{row.id}</span>
              <span className={`${styles.paymentBadge} ${payClass(row.paymentStatus)}`}>{row.paymentStatus}</span>
            </div>
            <div style={{ fontSize: 13 }}>{row.supplier}</div>
            <div className={styles.mobileRow}>
              <span className={styles.mobileMeta}>Due {row.dueDate}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{formatIndianCurrency(row.total)}</span>
            </div>
          </div>
        )}
      />

      {detailInvoice && (
        <ThreeWayMatchModal invoice={detailInvoice} onClose={() => setDetailInvoice(null)} />
      )}

      {showRecord && <RecordInvoiceModal onClose={() => setShowRecord(false)} />}
    </ModuleLayout>
  );
}
