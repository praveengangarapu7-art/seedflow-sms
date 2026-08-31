import { useState } from 'react';
import { PortalLayout } from '../PortalLayout';
import { Card } from '@/components/common/Card/Card';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast';
import { formatIndianCurrency } from '@/utils/formatters';
import { Sprout, Truck, Wallet, Award, Clock } from 'lucide-react';
import styles from './PortalPages.module.css';

// Mock Offers
const MOCK_GROWER_OFFERS = [
  { id: 'OFF-2026-001', cropName: 'Pusa Basmati Hybrid Cotton', quantity: '5,000 kg', estPrice: '₹140/kg', status: 'Approved', period: 'Kharif 2026' },
  { id: 'OFF-2026-002', cropName: 'Pusa Basmati Rice Seed Batch', quantity: '10,000 kg', estPrice: '₹48/kg', status: 'Pending', period: 'Rabi 2026' },
];

// Mock Deliveries
const MOCK_GROWER_DELIVERIES = [
  { id: 'DEL-2026-0044', cropName: 'Pusa Basmati Hybrid Cotton', netQty: '4,850 kg', receivedDate: '2026-05-18', status: 'Accepted', moisture: '10.8%' },
  { id: 'DEL-2026-0022', cropName: 'Pusa Basmati Hybrid Cotton', netQty: '5,000 kg', receivedDate: '2026-05-02', status: 'Accepted', moisture: '11.2%' },
];

// Mock Payouts
const MOCK_GROWER_PAYOUTS = [
  { id: 'PAY-0089', deliveryRef: 'DEL-2026-0044', gross: 679000, deductions: 12000, net: 667000, status: 'Paid', date: '2026-05-24' },
  { id: 'PAY-0072', deliveryRef: 'DEL-2026-0022', gross: 700000, deductions: 15000, net: 685000, status: 'Paid', date: '2026-05-08' },
];

type FarmerTab = 'dashboard' | 'offers' | 'deliveries' | 'payouts' | 'profile';

export default function FarmerPortal() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<FarmerTab>('dashboard');

  // Submit crop offer state
  const [offerModal, setOfferModal] = useState(false);
  const [cropName, setCropName] = useState('');
  const [cropQty, setCropQty] = useState('');
  const [cropPrice, setCropPrice] = useState('');
  const [season, setSeason] = useState('Kharif 2026');

  const tabs = [
    { key: 'dashboard', label: 'Overview Dashboard' },
    { key: 'offers', label: 'Seasonal Crop Offers' },
    { key: 'deliveries', label: 'Delivery History' },
    { key: 'payouts', label: 'Payment Slips' },
    { key: 'profile', label: 'Grower Profile' },
  ];

  const handleOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropName || !cropQty || !cropPrice) {
      addToast('Please complete the crop offer values.', 'error');
      return;
    }
    addToast(`Seasonal crop offer for ${cropName} submitted successfully. SeedSphere Procurement will review.`, 'success');
    setOfferModal(false);
    setCropName('');
    setCropQty('');
    setCropPrice('');
  };

  return (
    <PortalLayout title="Contract Grower Portal" roleLabel="Farmer Partner">
      <div style={{ width: '100%' }}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={(k) => setActiveTab(k as FarmerTab)} />

        <div className={styles.tabContent}>
          {/* Overview Dashboard */}
          {activeTab === 'dashboard' && (
            <div className={styles.dashboardGrid}>
              <div className={styles.kpiRow}>
                <Card className={styles.kpiCard}>
                  <Sprout className={styles.kpiIcon} />
                  <div>
                    <span className={styles.kpiLabel}>Approved Active Offers</span>
                    <span className={styles.kpiValue}>1</span>
                  </div>
                </Card>
                <Card className={styles.kpiCard}>
                  <Truck className={styles.kpiIcon} style={{ color: 'var(--color-success)' }} />
                  <div>
                    <span className={styles.kpiLabel}>Total Deliveries YTD</span>
                    <span className={styles.kpiValue}>2 shipments</span>
                  </div>
                </Card>
                <Card className={styles.kpiCard}>
                  <Wallet className={styles.kpiIcon} style={{ color: 'var(--color-warning)' }} />
                  <div>
                    <span className={styles.kpiLabel}>Total Payouts Released</span>
                    <span className={styles.kpiValue}>₹13,52,000</span>
                  </div>
                </Card>
              </div>

              <div className={styles.splitGrid}>
                <Card className={styles.mainCard}>
                  <h3 className={styles.sectionTitle}>Grower Quality & Compliance Status</h3>
                  <div className={styles.scoreRow}>
                    <div className={styles.scoreDial}>
                      <span className={styles.scoreNumber}>A+</span>
                      <span className={styles.scoreLabel}>Seed Grade</span>
                    </div>
                    <div className={styles.scoresList}>
                      <div className={styles.scoreLine}>
                        <span>Average Moisture Content</span>
                        <strong>11.0% (Optimal)</strong>
                      </div>
                      <div className={styles.scoreLine}>
                        <span>Genetic Purity Score</span>
                        <strong>99.1% (Exceeds Spec)</strong>
                      </div>
                      <div className={styles.scoreLine}>
                        <span>Visual Blemish Rate</span>
                        <strong>0.4%</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: '#f0f9ff', padding: 12, borderRadius: 6, fontSize: 13, color: '#0369a1', marginTop: 16 }}>
                    <strong>⭐ Quality Bonus Eligible:</strong> Your genetic purity score qualifies for a 5% crop premium payout bonus for Basmati Cotton this Kharif season.
                  </div>
                </Card>

                <Card className={styles.sideCard}>
                  <h3 className={styles.sectionTitle}>Season Calendar & Alerts</h3>
                  <div className={styles.timeline}>
                    <div className={styles.timelineItem}>
                      <Award size={14} style={{ color: 'var(--color-success)' }} />
                      <div className={styles.timelineBody}>
                        <strong>Certification Approved</strong>
                        <p>Soil certification and crop genetic purity reports have been verified for Rabi basmati rice sowing.</p>
                      </div>
                    </div>
                    <div className={styles.timelineItem}>
                      <Clock size={14} className={styles.timelineTime} />
                      <div className={styles.timelineBody}>
                        <strong>Rabi Sowing Offers Open</strong>
                        <p>SeedSphere has opened bids for contract growers. Submit your Rabi basmati rice offers before June 15.</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Offers tab */}
          {activeTab === 'offers' && (
            <Card className={styles.mainCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Contract Sowing Offers</h3>
                <Button variant="primary" size="sm" onClick={() => setOfferModal(true)}>Submit New Offer</Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {MOCK_GROWER_OFFERS.map((offer) => (
                  <div key={offer.id} className={styles.portalRowItem}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className={styles.rowId}>{offer.id}</span>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{offer.cropName}</h4>
                        <span className={offer.status === 'Approved' ? styles.statusBadgeActive : styles.statusBadgePending}>
                          {offer.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        <span><strong>Offered quantity:</strong> {offer.quantity}</span>
                        <span><strong>Expected unit price:</strong> {offer.estPrice}</span>
                        <span><strong>Growing Season:</strong> {offer.period}</span>
                      </div>
                    </div>
                    <div>
                      {offer.status === 'Pending' && <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>Under Review</span>}
                      {offer.status === 'Approved' && <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>Contract Signed ✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Deliveries tab */}
          {activeTab === 'deliveries' && (
            <Card className={styles.mainCard}>
              <h3 className={styles.sectionTitle}>Seed Deliveries History</h3>
              <DataTable
                rowKey="id"
                columns={[
                  { key: 'id', header: 'Delivery #' },
                  { key: 'cropName', header: 'Crop / Variety' },
                  { key: 'netQty', header: 'Net Weight' },
                  { key: 'receivedDate', header: 'Arrival Date' },
                  { key: 'moisture', header: 'Moisture %' },
                  {
                    key: 'status',
                    header: 'QC Decision',
                    render: () => (
                      <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 12 }}>Accepted ✓</span>
                    ),
                  },
                ]}
                data={MOCK_GROWER_DELIVERIES}
              />
            </Card>
          )}

          {/* Payment Slips tab */}
          {activeTab === 'payouts' && (
            <Card className={styles.mainCard}>
              <h3 className={styles.sectionTitle}>Seasonal Payout Slips</h3>
              <DataTable
                rowKey="id"
                columns={[
                  { key: 'id', header: 'Payout slip #' },
                  { key: 'deliveryRef', header: 'Delivery Ref' },
                  { key: 'date', header: 'Release Date' },
                  {
                    key: 'gross',
                    header: 'Gross (₹)',
                    render: (row) => formatIndianCurrency(row.gross),
                  },
                  {
                    key: 'deductions',
                    header: 'Deductions (₹)',
                    render: (row) => formatIndianCurrency(row.deductions),
                  },
                  {
                    key: 'net',
                    header: 'Net Payout (₹)',
                    render: (row) => (
                      <strong style={{ color: 'var(--color-primary)' }}>{formatIndianCurrency(row.net)}</strong>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Payout Status',
                    render: (row) => (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: 'var(--color-success-bg)',
                        color: 'var(--color-success)',
                      }}>
                        {row.status}
                      </span>
                    ),
                  },
                ]}
                data={MOCK_GROWER_PAYOUTS}
              />
            </Card>
          )}

          {/* Grower Profile tab */}
          {activeTab === 'profile' && (
            <div className={styles.splitGrid}>
              <Card className={styles.mainCard}>
                <h3 className={styles.sectionTitle}>Grower Demographic Profile</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  <div className={styles.profileRow}>
                    <span>Contract Grower Name</span>
                    <strong>Devendra Patel Farms</strong>
                  </div>
                  <div className={styles.profileRow}>
                    <span>Land Size (Acreage)</span>
                    <strong>45 Acres (Organic Certified)</strong>
                  </div>
                  <div className={styles.profileRow}>
                    <span>Soil Quality Health Index</span>
                    <strong>9.1/10 (Optimal NPK levels)</strong>
                  </div>
                  <div className={styles.profileRow}>
                    <span>Growing Region</span>
                    <strong>Indore Regional Hub, Madhya Pradesh</strong>
                  </div>
                </div>
              </Card>

              <Card className={styles.sideCard}>
                <Award className={styles.buildingIcon} style={{ color: 'var(--color-primary)' }} />
                <h4 style={{ textAlign: 'center', margin: '12px 0 4px', fontSize: 16 }}>Certified Grower</h4>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                  Active License: GP-2026-IND-891<br />
                  Certified Organic Sowing 2026-2029
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Submit Crop Offer Modal */}
      {offerModal && (
        <Modal
          isOpen
          onClose={() => setOfferModal(false)}
          title="Submit Seasonal Crop Offer"
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => setOfferModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleOfferSubmit}>Submit Sowing Offer</Button>
            </div>
          }
        >
          <form onSubmit={handleOfferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Crop Variety / Seed Type <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                type="text"
                placeholder="e.g. Basmati Rice Hybrid Seed Batch"
                required
                style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6 }}
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sowing Season</label>
              <select
                style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6, backgroundColor: '#fff' }}
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              >
                <option value="Kharif 2026">Kharif 2026</option>
                <option value="Rabi 2026">Rabi 2026</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Estimated Output Quantity (kg) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                type="number"
                placeholder="Expected harvest weight in kg"
                required
                style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6 }}
                value={cropQty}
                onChange={(e) => setCropQty(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Minimum Support Price Requested (₹/kg) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                type="number"
                placeholder="e.g. 50"
                required
                style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6 }}
                value={cropPrice}
                onChange={(e) => setCropPrice(e.target.value)}
              />
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
