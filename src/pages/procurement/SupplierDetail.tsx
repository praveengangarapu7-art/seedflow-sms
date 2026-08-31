import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, ChevronRight, Edit, Send, Ban, FileText, Upload,
  Package, Star, UserPlus, Mail, Phone, MapPin,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { ScoreRing } from '@/components/common/ScoreRing/ScoreRing';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { mockSuppliers } from './mockData/suppliersData';
import { mockPOs } from './mockData/ordersData';
import { formatIndianCurrency } from '@/utils/formatters';
import { procurementNav } from '@/config/procurementNav';
import type { PurchaseOrder } from '@/types/procurement';
import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { usePermission } from '@/hooks/usePermission';
import styles from './SupplierDetail.module.css';

type DetailTab = 'overview' | 'performance' | 'documents' | 'history' | 'activity';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'overview',    label: 'Overview' },
  { key: 'performance', label: 'Performance' },
  { key: 'documents',   label: 'Documents' },
  { key: 'history',     label: 'PO History' },
  { key: 'activity',    label: 'Activity' },
];

const PO_COLS: DataTableColumn<PurchaseOrder>[] = [
  { key: 'id',          header: 'PO #',     width: '130px' },
  {
    key: 'status',      header: 'Status',   width: '160px',
    render: (row) => <StatusBadge status={row.status} type="po" />,
  },
  {
    key: 'totalAmount', header: 'Amount',   width: '120px', align: 'right',
    render: (row) => formatIndianCurrency(row.totalAmount),
  },
  { key: 'expectedDelivery', header: 'Delivery', width: '110px' },
  {
    key: 'lineItems',   header: 'Items',    width: '70px', align: 'center',
    render: (row) => row.lineItems.length,
  },
];

function getInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function maskAccount(acc: string): string {
  if (!acc) return '';
  return '****' + acc.slice(-4);
}

// ── Performance trend chart ─────────────────────────────────────────
function PerfChart({ overallScore }: { overallScore: number }) {
  const months = ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  const scores = [82, 85, 87, 84, 89, 91, 88, 90, 93, 91, 94, overallScore];
  const W = 720, H = 180, P = 32;
  const xStep = (W - P * 2) / (months.length - 1);
  const yMin = 60, yMax = 100;
  const yScale = (s: number) => H - P - ((s - yMin) / (yMax - yMin)) * (H - P * 2);

  const path = scores.map((s, i) => `${i === 0 ? 'M' : 'L'} ${P + i * xStep} ${yScale(s)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart}>
      {[60, 70, 80, 90, 100].map((g) => (
        <g key={g}>
          <line x1={P} x2={W - P} y1={yScale(g)} y2={yScale(g)}
            stroke="var(--color-border-light)" strokeDasharray="3 3" />
          <text x={4} y={yScale(g) + 4} fontSize="10" fill="var(--color-text-muted)">{g}</text>
        </g>
      ))}
      {months.map((m, i) => (
        <text key={m} x={P + i * xStep} y={H - 8} fontSize="10"
          fill="var(--color-text-muted)" textAnchor="middle">{m}</text>
      ))}
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
      <circle cx={P + (scores.length - 1) * xStep} cy={yScale(scores[scores.length - 1])}
        r="5" fill="var(--color-primary)" />
    </svg>
  );
}

// ── Page ────────────────────────────────────────────────────────────
export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const canEditSupplier = usePermission('edit_supplier');
  const canCreateRfq = usePermission('create_rfq');

  const supplier = mockSuppliers.find((s) => s.id === id);

  if (!supplier) {
    return (
      <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
        <div className={styles.notFound}>
          <p style={{ fontSize: 18, fontWeight: 700 }}>Supplier not found</p>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>"{id}" does not exist.</p>
          <Button variant="primary" size="sm" onClick={() => navigate('/procurement/suppliers')}>
            Back to Suppliers
          </Button>
        </div>
      </ModuleLayout>
    );
  }

  const supplierPOs = mockPOs.filter((p) => p.supplier === supplier.name);

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={() => navigate('/procurement/suppliers')}>
          Suppliers
        </button>
        <ChevronRight size={13} />
        <span>{supplier.name}</span>
      </div>

      {/* Header */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar64}>{getInitials(supplier.name)}</div>
            <div>
              <h1 className={styles.supplierName}>{supplier.name}</h1>
              <p className={styles.supplierCode}>{supplier.code} · {supplier.category}</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <StatusBadge status={supplier.classification} type="supplier" />
            {canEditSupplier && <Button variant="ghost" size="sm" leftIcon={Edit}>Edit</Button>}
            {canCreateRfq && <Button variant="ghost" size="sm" leftIcon={Send}>Send RFQ</Button>}
            {supplier.classification !== 'Blacklisted' && canEditSupplier && (
              <Button variant="ghost" size="sm" leftIcon={Ban}>Blacklist</Button>
            )}
          </div>
        </div>
      </div>

      {/* Performance banner */}
      <div className={styles.perfBanner}>
        <div className={styles.perfRings}>
          <div className={styles.perfRing}>
            <ScoreRing score={supplier.qualityScore} size="md" />
            <span className={styles.perfRingLabel}>Quality</span>
          </div>
          <div className={styles.perfRing}>
            <ScoreRing score={supplier.deliveryScore} size="md" />
            <span className={styles.perfRingLabel}>Delivery</span>
          </div>
          <div className={styles.perfRing}>
            <ScoreRing score={supplier.costScore} size="md" />
            <span className={styles.perfRingLabel}>Cost</span>
          </div>
        </div>
        <div className={styles.overallScore}>
          <span className={styles.overallScoreNum}>{supplier.overallScore}</span>
          <span className={styles.overallScoreLabel}>Overall score</span>
        </div>
      </div>

      <div className={styles.tabs}>
        <Tabs tabs={TABS} activeTab={activeTab} onChange={(k) => setActiveTab(k as DetailTab)} />
      </div>

      <div className={styles.tabContent}>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className={styles.infoGrid2}>
            <div className={styles.subCard}>
              <p className={styles.cardTitle}>Contact</p>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Person</span>
                <span className={styles.infoVal}>{supplier.contact.person}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}><Mail size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Email</span>
                <a className={styles.infoLink} href={`mailto:${supplier.contact.email}`}>{supplier.contact.email}</a>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}><Phone size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Phone</span>
                <a className={styles.infoLink} href={`tel:${supplier.contact.phone}`}>{supplier.contact.phone}</a>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}><MapPin size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Address</span>
                <span className={styles.infoVal}>
                  {[supplier.address.line1, supplier.address.city, supplier.address.state, supplier.address.pincode].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>

            <div className={styles.subCard}>
              <p className={styles.cardTitle}>Business</p>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Categories</span>
                <span><span className={styles.chip}>{supplier.category}</span></span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Payment terms</span>
                <span className={styles.infoVal}>{supplier.paymentTerms}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Onboarded</span>
                <span className={styles.infoVal}>{supplier.onboardingDate}</span>
              </div>
              {supplier.notes && (
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Notes</span>
                  <span className={styles.infoVal}>{supplier.notes}</span>
                </div>
              )}
              {supplier.blacklistReason && (
                <div className={styles.infoRow}>
                  <span className={styles.infoKey} style={{ color: 'var(--color-danger)' }}>Blacklist reason</span>
                  <span className={styles.infoVal} style={{ color: 'var(--color-danger)' }}>{supplier.blacklistReason}</span>
                </div>
              )}
            </div>

            <div className={styles.subCard}>
              <p className={styles.cardTitle}>Banking</p>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Bank</span>
                <span className={styles.infoVal}>{supplier.bankDetails.bank}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Account</span>
                <span className={styles.infoVal}>{maskAccount(supplier.bankDetails.accountNumber)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>IFSC</span>
                <span className={styles.infoVal}>{supplier.bankDetails.ifsc}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Account holder</span>
                <span className={styles.infoVal}>{supplier.bankDetails.accountHolder}</span>
              </div>
            </div>

            <div className={styles.subCard}>
              <p className={styles.cardTitle}>Tax</p>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>GST</span>
                <span className={styles.infoVal}>{supplier.gst}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>PAN</span>
                <span className={styles.infoVal}>{supplier.pan}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Total POs</span>
                <span className={styles.infoVal}>{supplier.totalPOs}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Total spend</span>
                <span className={styles.infoVal}>{formatIndianCurrency(supplier.totalSpend)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Performance */}
        {activeTab === 'performance' && (
          <>
            <div className={styles.chartWrap}>
              <p className={styles.cardTitle}>Performance trend — last 12 months</p>
              <PerfChart overallScore={supplier.overallScore} />
            </div>
            <div>
              <p className={styles.cardTitle}>Recent reviews</p>
              <table className={styles.reviewTable}>
                <thead>
                  <tr>
                    <th>Date</th><th>PO Ref</th><th>Quality</th><th>Delivery</th><th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>22 Apr 2026</td><td>PO-2026-0142</td><td>★★★★★</td><td>★★★★★</td><td>Excellent batch, on-time delivery</td></tr>
                  <tr><td>15 Mar 2026</td><td>PO-2026-0118</td><td>★★★★☆</td><td>★★★★★</td><td>Minor moisture variance, accepted</td></tr>
                  <tr><td>02 Feb 2026</td><td>PO-2026-0089</td><td>★★★★★</td><td>★★★★☆</td><td>1 day late, quality good</td></tr>
                  <tr><td>18 Jan 2026</td><td>PO-2026-0067</td><td>★★★★★</td><td>★★★★★</td><td>Perfect delivery</td></tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Documents */}
        {activeTab === 'documents' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p className={styles.cardTitle} style={{ marginBottom: 0, borderBottom: 'none' }}>
                Documents ({supplier.documents.length})
              </p>
              <Button variant="primary" size="sm" leftIcon={Upload}>Upload document</Button>
            </div>
            <div className={styles.docGrid}>
              {supplier.documents.map((doc, idx) => (
                <div key={idx} className={styles.docCard}>
                  <FileText size={20} color="var(--color-primary)" />
                  <span className={styles.docName}>{doc.name}</span>
                  <span className={styles.docDate}>Uploaded {doc.uploadedDate}</span>
                  <div className={styles.docActions}>
                    <Button variant="ghost" size="sm">View</Button>
                    <Button variant="ghost" size="sm">Download</Button>
                  </div>
                </div>
              ))}
              <div className={styles.docCardDashed}>
                <Upload size={20} color="var(--color-primary)" />
                <span className={styles.docName}>Upload new</span>
                <span className={styles.docDate}>PDF, JPG, PNG</span>
              </div>
            </div>
          </>
        )}

        {/* PO History */}
        {activeTab === 'history' && (
          <>
            <p className={styles.cardTitle}>Purchase order history</p>
            {supplierPOs.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No POs yet"
                description="This supplier has no purchase orders on record."
              />
            ) : (
              <DataTable<PurchaseOrder>
                columns={PO_COLS}
                data={supplierPOs}
                rowKey="id"
                onRowClick={(row) => navigate(`/procurement/orders/${row.id}`)}
              />
            )}
          </>
        )}

        {/* Activity */}
        {activeTab === 'activity' && (
          <>
            <p className={styles.cardTitle}>Recent activity</p>
            <div className={styles.activityList}>
              {[
                { time: '24 Apr 2026 · 11:00 AM', icon: FileText, text: 'PO-2026-0142 created' },
                { time: '10 Apr 2026 · 9:00 AM',  icon: Package,  text: 'Goods received — GRN-2026-0089' },
                { time: '01 Mar 2026 · 2:00 PM',  icon: Star,     text: `Classified as ${supplier.classification} supplier` },
                { time: `${supplier.onboardingDate} · 10:00 AM`, icon: UserPlus, text: 'Supplier onboarded' },
              ].map((a, idx) => {
                const Icon = a.icon;
                return (
                  <div key={idx} className={styles.activityItem}>
                    <div className={styles.activityDot}><Icon size={15} /></div>
                    <div className={styles.activityBody}>
                      <p className={styles.activityText}>{a.text}</p>
                      <p className={styles.activityTime}>{a.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </ModuleLayout>
  );
}
