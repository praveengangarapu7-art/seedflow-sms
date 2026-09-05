import { useState, useMemo } from 'react';
import { BadgeCheck, Plus, FileText, Download, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { Modal } from '@/components/common/Modal/Modal';
import { Badge } from '@/components/common/Badge/Badge';
import { processingNav } from '@/config/processingNav';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { certifications as mockCertifications } from '@/data/processing/certifications';
import { CertificationRecord } from '@/types/processing';
import { usePermission } from '@/hooks/usePermission';
import styles from './Certification.module.css';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { PROCESSING_TODAY, isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';

export default function CertificationPage() {
  const { addToast } = useToast();
  const { items: allCertifications, add, update } = useRealtimeMockStore<CertificationRecord>(mockCertifications);
  const [period, setPeriod] = useState<PeriodValue>('all');

  const items = useMemo(
    () => allCertifications.filter((c) => isDateInPeriod(c.issueDate, period, PROCESSING_TODAY)),
    [allCertifications, period]
  );

  const canSubmit = usePermission('submit_for_certification');
  const canManage = usePermission('manage_certification_records');

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    agency: 'all',
    level: 'all',
    status: 'all',
  });

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CertificationRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form States
  const [formLotId, setFormLotId] = useState('BT-2026-1142');
  const [formCrop, setFormCrop] = useState('Cotton');
  const [formVariety, setFormVariety] = useState('Bt RCH-2 BG-II');
  const [formLevel, setFormLevel] = useState<'Foundation' | 'Certified' | 'Truthful Label'>('Foundation');
  const [formAgency, setFormAgency] = useState('Maharashtra State Seeds Certification Agency');
  const [formFieldInspectionDate, setFormFieldInspectionDate] = useState('2026-06-10');

  // KPIs
  const kpis = useMemo(() => {
    const activeCount = items.filter(c => c.status === 'Active').length;
    const expiringCount = items.filter(c => c.status === 'Expiring Soon').length;
    const expiredCount = items.filter(c => c.status === 'Expired').length;
    return [
      { icon: BadgeCheck, title: 'Active Certificates', value: String(activeCount), subValue: 'Fully valid lots' },
      { icon: AlertTriangle, title: 'Expiring (30 days)', value: String(expiringCount), subValue: 'Requires retest/action' },
      { icon: FileText, title: 'Expired Licenses', value: String(expiredCount), subValue: 'Quarantined lots' },
      { icon: ShieldCheck, title: 'Agency Audits Passed', value: '100%', subValue: 'Zero compliance issues' },
    ];
  }, [items]);

  // Filters
  const filteredCerts = useMemo(() => {
    return items.filter(c => {
      const matchesSearch =
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lotId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.variety.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAgency = filters.agency === 'all' || c.authority === filters.agency;
      const matchesLevel = filters.level === 'all' || c.level === filters.level;
      const matchesStatus = filters.status === 'all' || c.status === filters.status;

      return matchesSearch && matchesAgency && matchesLevel && matchesStatus;
    });
  }, [items, searchTerm, filters]);

  // Handle Form Submission
  const handleSaveCert = (e: React.FormEvent) => {
    e.preventDefault();
    const issueDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newCert: CertificationRecord = {
      id: `CERT-${formAgency.includes('Maharashtra') ? 'MH' : formAgency.includes('Telangana') ? 'TS' : 'MP'}-2026-${String(items.length + 1).padStart(4, '0')}`,
      lotId: formLotId,
      crop: formCrop,
      variety: formVariety,
      level: formLevel,
      authority: formAgency,
      issueDate,
      expiryDate,
      fieldInspectionDate: formFieldInspectionDate,
      status: 'Active',
      certificateUrl: '/docs/cert-generic.pdf',
    };

    add(newCert);
    addToast(`Certificate ${newCert.id} created successfully!`, 'success');
    setIsAddModalOpen(false);
  };

  const handleDownload = (cert: CertificationRecord) => {
    addToast(`Downloading official Certificate ${cert.id} PDF...`, 'success');
  };

  const handleOpenDetail = (cert: CertificationRecord) => {
    setSelectedCert(cert);
    setIsDetailModalOpen(true);
  };

  const filterConfig = [
    {
      key: 'agency',
      label: 'Authority / Agency',
      options: [
        { value: 'all', label: 'All Agencies' },
        { value: 'Maharashtra State Seeds Certification Agency', label: 'MSSCA (Maharashtra)' },
        { value: 'Telangana State Seed Certification Agency', label: 'TSSCA (Telangana)' },
        { value: 'Madhya Pradesh State Seed Certification Agency', label: 'MPSSCA (MP)' },
      ],
      value: filters.agency,
      onChange: (val: string) => setFilters(prev => ({ ...prev, agency: val })),
    },
    {
      key: 'level',
      label: 'Class',
      options: [
        { value: 'all', label: 'All Classes' },
        { value: 'Foundation', label: 'Foundation' },
        { value: 'Certified', label: 'Certified' },
        { value: 'Truthful Label', label: 'Truthful Label' },
      ],
      value: filters.level,
      onChange: (val: string) => setFilters(prev => ({ ...prev, level: val })),
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'Active', label: 'Active' },
        { value: 'Expiring Soon', label: 'Expiring Soon' },
        { value: 'Expired', label: 'Expired' },
        { value: 'Recalled', label: 'Recalled' },
      ],
      value: filters.status,
      onChange: (val: string) => setFilters(prev => ({ ...prev, status: val })),
    },
  ];

  const columns = [
    { key: 'id', label: 'Cert ID', sortable: true },
    { key: 'lotId', label: 'Lot / Batch ID', sortable: true },
    { key: 'crop', label: 'Crop & Variety', render: (r: CertificationRecord) => `${r.crop} - ${r.variety}` },
    { key: 'level', label: 'Class' },
    { key: 'authority', label: 'Issuing Authority', render: (r: CertificationRecord) => r.authority.replace(' State Seed Certification Agency', '').replace(' State Seeds Certification Agency', '') },
    { key: 'expiryDate', label: 'Expiry Date', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (r: CertificationRecord) => {
        let type = 'neutral' as any;
        if (r.status === 'Active') type = 'success' as any;
        if (r.status === 'Expiring Soon') type = 'warning' as any;
        if (r.status === 'Expired') type = 'danger' as any;
        if (r.status === 'Recalled') type = 'danger' as any;
        return <Badge variant={type}>{r.status}</Badge>;
      }
    },
    {
      key: 'actions',
      label: '',
      render: (r: CertificationRecord) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(r)}>
            Details
          </Button>
          <Button variant="secondary" size="sm" leftIcon={Download} onClick={() => handleDownload(r)}>
            PDF
          </Button>
        </div>
      )
    }
  ];

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={BadgeCheck} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Seed Certification & Compliance</h1>
          <p className={styles.pageSubtitle}>
            Monitor seed certification status, field inspection approvals, and official agency compliance documentation
          </p>
        </div>
        <div className={styles.pageActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          {canSubmit && (
            <Button variant="primary" leftIcon={Plus} onClick={() => setIsAddModalOpen(true)}>
              Add Certificate
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {kpis.map((k, idx) => (
          <KpiCard key={idx} icon={k.icon} title={k.title} value={k.value} subValue={k.subValue} />
        ))}
      </div>

      {/* Main Panel */}
      <div className={styles.panel}>
        <div className={styles.filtersSection}>
          <FilterBar
            searchPlaceholder="Search Cert ID, Lot ID, variety..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            filters={filterConfig}
          />
        </div>
        
        <DataTable columns={columns} data={filteredCerts} rowKey="id" />
      </div>

      {/* New Certification Modal */}
      {isAddModalOpen && (
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register Seed Certificate" size="md">
          <form onSubmit={handleSaveCert} className={styles.form}>
            <div className={styles.formGrid}>
              <div>
                <label className={styles.label}>Lot / Batch ID</label>
                <input
                  type="text"
                  value={formLotId}
                  onChange={(e) => setFormLotId(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <div>
                <label className={styles.label}>Crop</label>
                <input
                  type="text"
                  value={formCrop}
                  onChange={(e) => setFormCrop(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.fullWidth}>
                <label className={styles.label}>Variety</label>
                <input
                  type="text"
                  value={formVariety}
                  onChange={(e) => setFormVariety(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <div>
                <label className={styles.label}>Seed Class</label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value as any)}
                  className={styles.select}
                >
                  <option value="Foundation">Foundation</option>
                  <option value="Certified">Certified</option>
                  <option value="Truthful Label">Truthful Label</option>
                </select>
              </div>
              <div>
                <label className={styles.label}>Field Inspection Date</label>
                <input
                  type="date"
                  value={formFieldInspectionDate}
                  onChange={(e) => setFormFieldInspectionDate(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.fullWidth}>
                <label className={styles.label}>Certifying Authority</label>
                <select
                  value={formAgency}
                  onChange={(e) => setFormAgency(e.target.value)}
                  className={styles.select}
                >
                  <option value="Maharashtra State Seeds Certification Agency">Maharashtra (MSSCA)</option>
                  <option value="Telangana State Seed Certification Agency">Telangana (TSSCA)</option>
                  <option value="Madhya Pradesh State Seed Certification Agency">Madhya Pradesh (MPSSCA)</option>
                </select>
              </div>
            </div>

            <div className={styles.formActions}>
              <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Submit Certification
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Certificate Details Modal */}
      {isDetailModalOpen && selectedCert && (
        <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Certificate Details: ${selectedCert.id}`} size="md">
          <div className={styles.detailGrid}>
            <div className={styles.certMetaCard}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Authority:</span>
                <span className={styles.metaValue}>{selectedCert.authority}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Lot Reference:</span>
                <span className={styles.metaValue}>{selectedCert.lotId}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Crop / Variety:</span>
                <span className={styles.metaValue}>{selectedCert.crop} - {selectedCert.variety}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Seed Class:</span>
                <span className={styles.metaValue}>
                  <strong style={{
                    color: selectedCert.level === 'Foundation' ? '#137333' :
                           selectedCert.level === 'Certified' ? '#1a73e8' : '#e67c73'
                  }}>{selectedCert.level}</strong>
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Field Inspection:</span>
                <span className={styles.metaValue}>{selectedCert.fieldInspectionDate}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Issue Date:</span>
                <span className={styles.metaValue}>{selectedCert.issueDate}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Expiry Date:</span>
                <span className={styles.metaValue}>{selectedCert.expiryDate}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Status:</span>
                <span>
                  <Badge variant={selectedCert.status === 'Active' ? 'success' : selectedCert.status === 'Expiring Soon' ? 'warning' : 'danger'}>{selectedCert.status}</Badge>
                </span>
              </div>
            </div>

            <div className={styles.pdfPreviewBox}>
              <FileText size={48} className={styles.pdfIcon} />
              <h4>{selectedCert.id}.pdf</h4>
              <p>Official State Seed Certification Document</p>
              <Button variant="primary" leftIcon={Download} onClick={() => handleDownload(selectedCert)}>
                Download PDF Document
              </Button>
            </div>

            <div className={styles.actionsRow}>
              {selectedCert.status !== 'Recalled' ? (
                canManage ? (
                  <Button
                    variant="danger"
                    leftIcon={AlertTriangle}
                    onClick={() => {
                      update(selectedCert.id, { status: 'Recalled' });
                      addToast(`Lot ${selectedCert.lotId} certificate revoked & marked Recalled.`, 'error');
                      setIsDetailModalOpen(false);
                    }}
                  >
                    Revoke & Recall Lot
                  </Button>
                ) : null
              ) : (
                <div style={{ color: '#d93025', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} /> Certificate has been recalled and is invalid.
                </div>
              )}
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ModuleLayout>
  );
}
