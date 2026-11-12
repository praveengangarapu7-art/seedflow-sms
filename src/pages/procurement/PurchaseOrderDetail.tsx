import { useState } from 'react';
import { CustomFieldsPanel } from '@/components/customFields/CustomFieldsPanel';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ChevronRight, Download, Send } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { POLifecycleTimeline } from './components/POLifecycleTimeline/POLifecycleTimeline';
import { updatePO, usePOs } from './procurementStore';
import { formatIndianCurrency } from '@/utils/formatters';
import { procurementNav } from '@/config/procurementNav';
import type { GRNReference, InvoiceReference } from '@/types/procurement';
import { usePermission } from '@/hooks/usePermission';
import styles from './PurchaseOrderDetail.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
import { useToast } from '@/components/common/Toast';
import { printDocument } from '@/utils/fileExport';
type DetailTab = 'overview' | 'lineItems' | 'grn' | 'invoices' | 'activity';

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'overview',  label: 'Overview' },
  { key: 'lineItems', label: 'Line Items' },
  { key: 'grn',       label: 'GRN History' },
  { key: 'invoices',  label: 'Invoices' },
  { key: 'activity',  label: 'Activity Log' },
];

function grnStatusClass(status: GRNReference['status']): string {
  if (status === 'Accepted') return styles.grnAccepted;
  if (status === 'Partial')  return styles.grnPartial;
  if (status === 'Rejected') return styles.grnRejected;
  return styles.grnPending;
}

function invStatusClass(status: InvoiceReference['status']): string {
  if (status === 'Paid')     return styles.invPaid;
  if (status === 'Overdue')  return styles.invOverdue;
  if (status === 'Disputed') return styles.invDisputed;
  return styles.invPending;
}

function matchClass(match: InvoiceReference['matchStatus']): string {
  if (match === 'matched')  return styles.matchMatched;
  if (match === 'mismatch') return styles.matchMismatch;
  return styles.matchPending;
}

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const canSend = usePermission('create_order');

  const { addToast } = useToast();
  const [pos] = usePOs();
  const po = pos.find((p) => p.id === id);

  if (!po) {
    return (
      <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
        <div className={styles.notFound}>
          <p className={styles.notFoundTitle}>Purchase Order not found</p>
          <p className={styles.notFoundDesc}>The order "{id}" does not exist.</p>
          <Button variant="primary" size="sm" onClick={() => navigate('/procurement/orders')}>
            Back to Purchase Orders
          </Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>

      <CustomFieldsPanel entityType="purchase_order" entityId={po.id} />
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={() => navigate('/procurement/orders')}>
          Purchase Orders
        </button>
        <ChevronRight size={13} className={styles.breadcrumbSep} />
        <span>{po.id}</span>
      </div>

      <RecordAiPanel recordType="procurement.purchase_order" record={po} label={po.id} />
      {/* ── Header card ─────────────────────────────────────────────── */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <div className={styles.poNumber}>{po.id}</div>
            <div className={styles.poSupplier}>{po.supplier}</div>
          </div>
          <div className={styles.headerActions}>
            <StatusBadge status={po.status} type="po" />
            <Button variant="ghost" size="sm" leftIcon={Download} onClick={() => printDocument(`Purchase Order ${po.id}`, [
              { fields: [['Supplier', po.supplier], ['Status', po.status], ['Created', po.createdDate], ['Expected delivery', po.expectedDelivery], ['Payment terms', po.paymentTerms], ['Delivery address', po.deliveryAddress], ['Requisition', po.prReference ?? '—']] },
              { heading: 'Line items', table: { columns: ['Description', 'Qty', 'Unit', 'Unit price', 'Tax %', 'Total'], rows: po.lineItems.map((l) => [l.description, l.quantity, l.unit, formatIndianCurrency(l.unitPrice), l.taxPercent, formatIndianCurrency(l.total)]) } },
              { fields: [['Order total', formatIndianCurrency(po.totalAmount)]] },
            ])}>Export PDF</Button>
            {po.status === 'Draft' && canSend && (
              <Button variant="primary" size="sm" leftIcon={Send} onClick={() => {
                updatePO(po.id, { status: 'Sent' }, `PO sent to ${po.supplier}`);
                addToast(`${po.id} sent to ${po.supplier}`, 'success');
              }}>Send to Supplier</Button>
            )}
          </div>
        </div>

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>PR Reference</span>
            <span className={styles.metaVal}>{po.prReference ?? '—'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Created Date</span>
            <span className={styles.metaVal}>{po.createdDate}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Expected Delivery</span>
            <span className={styles.metaVal}>{po.expectedDelivery}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Payment Terms</span>
            <span className={styles.metaVal}>{po.paymentTerms}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Order Value</span>
            <span className={styles.metaVal}>{formatIndianCurrency(po.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* ── Lifecycle timeline ──────────────────────────────────────── */}
      <div className={styles.timelineWrap}>
        <POLifecycleTimeline status={po.status} />
      </div>

      {/* ── Detail tabs ─────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        {DETAIL_TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.card}>

        {/* ── Overview ────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            <p className={styles.sectionTitle}>Order Details</p>
            <div className={styles.overviewGrid}>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldKey}>Supplier</span>
                <span className={styles.fieldVal}>{po.supplier}</span>
              </div>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldKey}>Delivery Address</span>
                <span className={styles.fieldVal}>{po.deliveryAddress}</span>
              </div>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldKey}>Payment Terms</span>
                <span className={styles.fieldVal}>{po.paymentTerms}</span>
              </div>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldKey}>PR Reference</span>
                <span className={styles.fieldVal}>{po.prReference ?? '— (Direct PO)'}</span>
              </div>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldKey}>Line Items</span>
                <span className={styles.fieldVal}>{po.lineItems.length} items</span>
              </div>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldKey}>GRNs Raised</span>
                <span className={styles.fieldVal}>{po.grns?.length ?? 0}</span>
              </div>
            </div>
          </>
        )}

        {/* ── Line Items ──────────────────────────────────────────── */}
        {activeTab === 'lineItems' && (
          <>
            <p className={styles.sectionTitle}>Line Items</p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th className={styles.tdCenter}>Qty</th>
                  <th>Unit</th>
                  <th className={styles.tdRight}>Unit Price</th>
                  <th className={styles.tdCenter}>Tax %</th>
                  <th className={styles.tdRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {po.lineItems.map((li, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{li.description}</td>
                    <td className={styles.tdCenter}>{li.quantity}</td>
                    <td>{li.unit}</td>
                    <td className={styles.tdRight}>₹{li.unitPrice.toLocaleString('en-IN')}</td>
                    <td className={styles.tdCenter}>{li.taxPercent}%</td>
                    <td className={styles.tdRight}>{formatIndianCurrency(li.total)}</td>
                  </tr>
                ))}
                <tr className={styles.totalRow}>
                  <td colSpan={6} style={{ textAlign: 'right', paddingRight: 10 }}>Order Total</td>
                  <td className={styles.tdRight}>{formatIndianCurrency(po.totalAmount)}</td>
                </tr>
              </tbody>
            </table>

            <div className={styles.amountSummary}>
              <div className={styles.amountBox}>
                <span className={styles.amountLabel}>Total Order Value</span>
                <span className={styles.amountValue}>{formatIndianCurrency(po.totalAmount)}</span>
              </div>
            </div>
          </>
        )}

        {/* ── GRN History ─────────────────────────────────────────── */}
        {activeTab === 'grn' && (
          <>
            <p className={styles.sectionTitle}>Goods Receipt Notes</p>
            {!po.grns || po.grns.length === 0 ? (
              <p className={styles.emptyTabState}>No GRNs raised yet for this order.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>GRN #</th>
                    <th>Date</th>
                    <th className={styles.tdCenter}>Received</th>
                    <th className={styles.tdCenter}>Accepted</th>
                    <th className={styles.tdCenter}>Damaged</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {po.grns.map((grn, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{grn.grnNumber}</td>
                      <td>{grn.date}</td>
                      <td className={styles.tdCenter}>{grn.receivedQty}</td>
                      <td className={styles.tdCenter}>{grn.acceptedQty ?? '—'}</td>
                      <td className={styles.tdCenter}>{grn.damagedQty ?? 0}</td>
                      <td>
                        <span className={`${styles.grnStatus} ${grnStatusClass(grn.status)}`}>
                          {grn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ── Invoices ────────────────────────────────────────────── */}
        {activeTab === 'invoices' && (
          <>
            <p className={styles.sectionTitle}>Invoices</p>
            {!po.invoices || po.invoices.length === 0 ? (
              <p className={styles.emptyTabState}>No invoices received yet for this order.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th className={styles.tdRight}>Amount</th>
                    <th>Payment</th>
                    <th>3-Way Match</th>
                  </tr>
                </thead>
                <tbody>
                  {po.invoices.map((inv, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{inv.invoiceNumber}</td>
                      <td>{inv.date}</td>
                      <td className={styles.tdRight}>{formatIndianCurrency(inv.amount)}</td>
                      <td>
                        <span className={`${styles.invStatus} ${invStatusClass(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.matchBadge} ${matchClass(inv.matchStatus)}`}>
                          {inv.matchStatus === 'matched' ? 'Matched' : inv.matchStatus === 'mismatch' ? 'Mismatch' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ── Activity Log ────────────────────────────────────────── */}
        {activeTab === 'activity' && (
          <>
            <p className={styles.sectionTitle}>Activity Log</p>
            <div className={styles.activityList}>
              {po.activityLog.map((entry, idx) => (
                <div key={idx} className={styles.activityItem}>
                  <span className={styles.activityTime}>{entry.time}</span>
                  <div className={styles.activityBody}>
                    <span className={styles.activityUser}>{entry.user} </span>
                    <span className={styles.activityAction}>— {entry.action}</span>
                    {entry.details && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{entry.details}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>

    </ModuleLayout>
  );
}
