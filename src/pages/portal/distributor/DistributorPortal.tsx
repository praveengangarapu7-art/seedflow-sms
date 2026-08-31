import { useState } from 'react';
import { PortalLayout } from '../PortalLayout';
import { Card } from '@/components/common/Card/Card';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast';
import { formatIndianCurrency } from '@/utils/formatters';
import { ClipboardList, ShoppingBag, Receipt, Building2, CheckCircle, Clock } from 'lucide-react';
import styles from './PortalPages.module.css';

// Mock invited RFQs
const MOCK_INVITED_RFQS = [
  { id: 'RFQ-2026-004', title: 'High-Purity Packaging Bags supply', items: 3, deadline: '2026-06-05', status: 'Pending Response', description: 'Requires 10,000 units of moisture-barrier multi-wall paper bags.' },
  { id: 'RFQ-2026-005', title: 'Processing Equipment lab glassware', items: 12, deadline: '2026-06-12', status: 'Submitted', description: 'Supplying borosilicate beaker and flask batches for laboratory Q3 renewal.' },
];

// Mock POs
const MOCK_DISTRIBUTOR_POS = [
  { id: 'PO-2026-0145', referenceId: 'PR-2026-0089', totalAmount: 1250000, status: 'Sent', expectedDelivery: '2026-06-03', paymentTerms: 'Net 30', lineItems: 4 },
  { id: 'PO-2026-0118', referenceId: 'PR-2026-0062', totalAmount: 645000, status: 'Acknowledged', expectedDelivery: '2026-05-24', paymentTerms: 'Net 30', lineItems: 2 },
];

// Mock Invoices
const MOCK_DISTRIBUTOR_INVOICES = [
  { id: 'INV-PION-091', poReference: 'PO-2026-0118', total: 645000, matchStatus: 'matched', dueDate: '2026-06-24', paymentStatus: 'Approved' },
  { id: 'INV-PION-080', poReference: 'PO-2026-0098', total: 320000, matchStatus: 'matched', dueDate: '2026-05-15', paymentStatus: 'Paid' },
];

type PortalTab = 'dashboard' | 'rfqs' | 'orders' | 'invoices' | 'profile';

export default function DistributorPortal() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<PortalTab>('dashboard');
  
  // Bid form state
  const [bidModal, setBidModal] = useState<any | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [bidNotes, setBidNotes] = useState('');

  // PO Acknowledge state
  const [ackModal, setAckModal] = useState<any | null>(null);

  // Invoice Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadInvoiceNo, setUploadInvoiceNo] = useState('');
  const [uploadAmount, setUploadAmount] = useState('');
  const [selectedPo, setSelectedPo] = useState('');

  const tabs = [
    { key: 'dashboard', label: 'Overview Dashboard' },
    { key: 'rfqs', label: 'RFQ Invitations' },
    { key: 'orders', label: 'Purchase Orders' },
    { key: 'invoices', label: 'Invoices & Payments' },
    { key: 'profile', label: 'Partner Profile' },
  ];

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidPrice || !deliveryDays) {
      addToast('Please complete the bidding values.', 'error');
      return;
    }
    addToast(`Bid successfully submitted for ${bidModal.id} at ₹${Number(bidPrice).toLocaleString('en-IN')}`, 'success');
    setBidModal(null);
    setBidPrice('');
    setDeliveryDays('');
    setBidNotes('');
  };

  const handleAcknowledge = () => {
    addToast(`Purchase Order ${ackModal.id} acknowledged. Supply schedule confirmed.`, 'success');
    setAckModal(null);
  };

  const handleUploadInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadInvoiceNo || !uploadAmount || !selectedPo) {
      addToast('Please fill out all invoice details', 'error');
      return;
    }
    addToast(`Invoice ${uploadInvoiceNo} recorded successfully against ${selectedPo}. Sent for 3-way match.`, 'success');
    setShowUploadModal(false);
    setUploadInvoiceNo('');
    setUploadAmount('');
    setSelectedPo('');
  };

  return (
    <PortalLayout title="Supplier Portal" roleLabel="Distributor / Vendor">
      <div style={{ width: '100%' }}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={(k) => setActiveTab(k as PortalTab)} />

        <div className={styles.tabContent}>
          {/* Overview Dashboard */}
          {activeTab === 'dashboard' && (
            <div className={styles.dashboardGrid}>
              <div className={styles.kpiRow}>
                <Card className={styles.kpiCard}>
                  <ClipboardList className={styles.kpiIcon} />
                  <div>
                    <span className={styles.kpiLabel}>Open RFQ Invitations</span>
                    <span className={styles.kpiValue}>1</span>
                  </div>
                </Card>
                <Card className={styles.kpiCard}>
                  <ShoppingBag className={styles.kpiIcon} style={{ color: 'var(--color-success)' }} />
                  <div>
                    <span className={styles.kpiLabel}>Active Purchase Orders</span>
                    <span className={styles.kpiValue}>2</span>
                  </div>
                </Card>
                <Card className={styles.kpiCard}>
                  <Receipt className={styles.kpiIcon} style={{ color: 'var(--color-warning)' }} />
                  <div>
                    <span className={styles.kpiLabel}>Approved Payments (YTD)</span>
                    <span className={styles.kpiValue}>₹9,65,000</span>
                  </div>
                </Card>
              </div>

              <div className={styles.splitGrid}>
                <Card className={styles.mainCard}>
                  <h3 className={styles.sectionTitle}>Supplier Performance Scorecard</h3>
                  <div className={styles.scoreRow}>
                    <div className={styles.scoreDial}>
                      <span className={styles.scoreNumber}>94</span>
                      <span className={styles.scoreLabel}>Overall Score</span>
                    </div>
                    <div className={styles.scoresList}>
                      <div className={styles.scoreLine}>
                        <span>Quality Accuracy</span>
                        <strong>98%</strong>
                      </div>
                      <div className={styles.scoreLine}>
                        <span>On-Time Delivery</span>
                        <strong>92%</strong>
                      </div>
                      <div className={styles.scoreLine}>
                        <span>Invoice Matching Tolerance</span>
                        <strong>100%</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: '#f0f9ff', padding: 12, borderRadius: 6, fontSize: 13, color: '#0369a1', marginTop: 16 }}>
                    <strong>⭐ Preferred Supplier Rating:</strong> You qualify as a Tier-1 Preferred Vendor for SeedSphere. All invoices benefit from accelerated 15-day tolerance approvals.
                  </div>
                </Card>

                <Card className={styles.sideCard}>
                  <h3 className={styles.sectionTitle}>Active Notice Board</h3>
                  <div className={styles.timeline}>
                    <div className={styles.timelineItem}>
                      <Clock size={14} className={styles.timelineTime} />
                      <div className={styles.timelineBody}>
                        <strong>RFQ Deadline Approaching</strong>
                        <p>Bidding for RFQ-2026-004 expires in 3 days. Ensure technical document uploads are completed.</p>
                      </div>
                    </div>
                    <div className={styles.timelineItem}>
                      <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                      <div className={styles.timelineBody}>
                        <strong>GRN Received Successfully</strong>
                        <p>SeedSphere QC inspected and accepted 50 units under GRN-2026-0098.</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* RFQs tab */}
          {activeTab === 'rfqs' && (
            <Card className={styles.mainCard}>
              <h3 className={styles.sectionTitle}>Invitations to Bid</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {MOCK_INVITED_RFQS.map((rfq) => (
                  <div key={rfq.id} className={styles.portalRowItem}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className={styles.rowId}>{rfq.id}</span>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{rfq.title}</h4>
                        <span className={rfq.status === 'Submitted' ? styles.statusBadgeActive : styles.statusBadgePending}>
                          {rfq.status}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '8px 0 0' }}>{rfq.description}</p>
                      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        <span><strong>Items requested:</strong> {rfq.items}</span>
                        <span><strong>Submission deadline:</strong> {rfq.deadline}</span>
                      </div>
                    </div>
                    <div>
                      {rfq.status !== 'Submitted' ? (
                        <Button variant="primary" size="sm" onClick={() => setBidModal(rfq)}>Submit quote</Button>
                      ) : (
                        <Button variant="ghost" size="sm" disabled>Submitted</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Purchase Orders tab */}
          {activeTab === 'orders' && (
            <Card className={styles.mainCard}>
              <h3 className={styles.sectionTitle}>Active Purchase Orders</h3>
              <DataTable
                rowKey="id"
                columns={[
                  { key: 'id', header: 'PO #' },
                  { key: 'expectedDelivery', header: 'Est Delivery' },
                  { key: 'paymentTerms', header: 'Terms' },
                  { key: 'lineItems', header: 'Items' },
                  {
                    key: 'totalAmount',
                    header: 'Value',
                    render: (row) => formatIndianCurrency(row.totalAmount),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => <StatusBadge status={row.status} type="po" />,
                  },
                  {
                    key: 'id',
                    header: 'Actions',
                    align: 'center',
                    render: (row) => (
                      row.status === 'Sent' ? (
                        <Button variant="primary" size="sm" onClick={() => setAckModal(row)}>Acknowledge PO</Button>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>Acknowledged ✓</span>
                      )
                    ),
                  },
                ]}
                data={MOCK_DISTRIBUTOR_POS}
              />
            </Card>
          )}

          {/* Invoices & Payments tab */}
          {activeTab === 'invoices' && (
            <Card className={styles.mainCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Supplier Invoices</h3>
                <Button variant="primary" size="sm" onClick={() => setShowUploadModal(true)}>Upload Invoice</Button>
              </div>
              <DataTable
                rowKey="id"
                columns={[
                  { key: 'id', header: 'Invoice #' },
                  { key: 'poReference', header: 'PO Reference' },
                  {
                    key: 'total',
                    header: 'Amount',
                    render: (row) => formatIndianCurrency(row.total),
                  },
                  {
                    key: 'matchStatus',
                    header: '3-Way Match',
                    render: () => (
                      <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 12 }}>Matched ✓</span>
                    ),
                  },
                  { key: 'dueDate', header: 'Payment Due' },
                  {
                    key: 'paymentStatus',
                    header: 'Payment Status',
                    render: (row) => (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: row.paymentStatus === 'Paid' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                        color: row.paymentStatus === 'Paid' ? 'var(--color-success)' : 'var(--color-warning)',
                      }}>
                        {row.paymentStatus}
                      </span>
                    ),
                  },
                ]}
                data={MOCK_DISTRIBUTOR_INVOICES}
              />
            </Card>
          )}

          {/* Partner Profile tab */}
          {activeTab === 'profile' && (
            <div className={styles.splitGrid}>
              <Card className={styles.mainCard}>
                <h3 className={styles.sectionTitle}>Vendor Demographics</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  <div className={styles.profileRow}>
                    <span>Legal Company Name</span>
                    <strong>Pioneer Packaging & Distributor Co</strong>
                  </div>
                  <div className={styles.profileRow}>
                    <span>GSTIN</span>
                    <strong>27AAAAP2026F1Z4</strong>
                  </div>
                  <div className={styles.profileRow}>
                    <span>PAN</span>
                    <strong>AAAAP2026F</strong>
                  </div>
                  <div className={styles.profileRow}>
                    <span>Primary Logistics Hub</span>
                    <strong>Mumbai Industrial Zone, Complex B, MH</strong>
                  </div>
                </div>
              </Card>

              <Card className={styles.sideCard}>
                <Building2 className={styles.buildingIcon} />
                <h4 style={{ textAlign: 'center', margin: '12px 0 4px', fontSize: 16 }}>Authorized Accounts</h4>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                  Bank: State Bank of India<br />
                  A/C: *******9081<br />
                  IFSC: SBIN0001044
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Bid Modal */}
      {bidModal && (
        <Modal
          isOpen
          onClose={() => setBidModal(null)}
          title={`Submit Bidding Quote — ${bidModal.id}`}
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => setBidModal(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleBidSubmit}>Submit quote</Button>
            </div>
          }
        >
          <form onSubmit={handleBidSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
              Invited for: <strong>{bidModal.title}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Total Bid Price (₹) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                type="number"
                placeholder="Enter total contract quote"
                required
                style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6 }}
                value={bidPrice}
                onChange={(e) => setBidPrice(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Delivery Timeframe (Days) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                type="number"
                placeholder="e.g. 5 days"
                required
                style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6 }}
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Bidding Comments / Technical Tolerances</label>
              <textarea
                placeholder="Detail technical specifications, packaging tolerances, or shipping modes..."
                style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6, minHeight: 80, fontFamily: 'inherit' }}
                value={bidNotes}
                onChange={(e) => setBidNotes(e.target.value)}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Acknowledge PO Modal */}
      {ackModal && (
        <Modal
          isOpen
          onClose={() => setAckModal(null)}
          title={`Acknowledge Purchase Order — ${ackModal.id}`}
          size="sm"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => setAckModal(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleAcknowledge}>Acknowledge Order</Button>
            </div>
          }
        >
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)', margin: 0 }}>
            By acknowledging, you confirm your ability to supply the requested items under PO value <strong>{formatIndianCurrency(ackModal.totalAmount)}</strong> and meet the scheduled delivery date of <strong>{ackModal.expectedDelivery}</strong>.
          </p>
        </Modal>
      )}

      {/* Record Invoice Modal */}
      {showUploadModal && (
        <Modal
          isOpen
          onClose={() => setShowUploadModal(false)}
          title="Upload New Supplier Invoice"
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleUploadInvoice}>Upload Invoice</Button>
            </div>
          }
        >
          <form onSubmit={handleUploadInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Associated Purchase Order <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <select
                style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6, backgroundColor: '#fff' }}
                value={selectedPo}
                onChange={(e) => setSelectedPo(e.target.value)}
                required
              >
                <option value="">Select active PO</option>
                <option value="PO-2026-0145">PO-2026-0145 (Cotton Seed Procurement)</option>
                <option value="PO-2026-0118">PO-2026-0118 (Packaging batch)</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Invoice Number <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                type="text"
                placeholder="e.g. INV-PION-095"
                required
                style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6 }}
                value={uploadInvoiceNo}
                onChange={(e) => setUploadInvoiceNo(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Invoice Amount (₹) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                type="number"
                placeholder="Must precisely match PO value"
                required
                style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6 }}
                value={uploadAmount}
                onChange={(e) => setUploadAmount(e.target.value)}
              />
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
