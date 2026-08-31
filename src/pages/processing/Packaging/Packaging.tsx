import { useState, useMemo } from 'react';
import { Package, Plus, QrCode, Layers, Search, TrendingUp, Clock } from 'lucide-react';
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
import mockPackages from '@/data/processing/packages';
import { PackageRun } from '@/types/processing';
import { usePermission } from '@/hooks/usePermission';
import styles from './Packaging.module.css';

const MOCK_MATERIALS = [
  { id: 'MAT-001', name: 'HDPE Laminated Bags (1 kg)', type: 'Bag', stock: 12450, unit: 'pcs', status: 'In Stock' },
  { id: 'MAT-002', name: 'HDPE Laminated Bags (5 kg)', type: 'Bag', stock: 8200, unit: 'pcs', status: 'In Stock' },
  { id: 'MAT-003', name: 'HDPE Laminated Bags (10 kg)', type: 'Bag', stock: 450, unit: 'pcs', status: 'Low Stock' },
  { id: 'MAT-004', name: 'Jute/Gunny Bags (25 kg)', type: 'Bag', stock: 3100, unit: 'pcs', status: 'In Stock' },
  { id: 'MAT-005', name: 'Saran-coated Polyester film', type: 'Film', stock: 120, unit: 'rolls', status: 'In Stock' },
  { id: 'MAT-006', name: 'MSSCA Certified Green Tags', type: 'Tag', stock: 18000, unit: 'pcs', status: 'In Stock' },
  { id: 'MAT-007', name: 'APSSCA Certified Blue Tags', type: 'Tag', stock: 150, unit: 'pcs', status: 'Low Stock' },
  { id: 'MAT-008', name: 'Thermal Transfer Ribbon (Premium)', type: 'Ink', stock: 4, unit: 'pcs', status: 'Low Stock' },
];

export default function PackagingPage() {
  const { addToast } = useToast();
  const { items, add, update } = useRealtimeMockStore<PackageRun>(mockPackages);

  const canGenerate = usePermission('generate_packages');
  const canPrint = usePermission('print_labels_qr');
  const canVerify = usePermission('verify_final_package_quality');

  // States
  const [activeTab, setActiveTab] = useState<'runs' | 'materials'>('runs');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    crop: 'all',
    size: 'all',
    status: 'all',
  });

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PackageRun | null>(null);

  // Form States
  const [formBatchId, setFormBatchId] = useState('BT-2026-1142');
  const [formCrop, setFormCrop] = useState('Cotton');
  const [formVariety, setFormVariety] = useState('Bt RCH-2 BG-II');
  const [formPackSize, setFormPackSize] = useState('1 kg');
  const [formUnits, setFormUnits] = useState(100);
  const [formCertLevel, setFormCertLevel] = useState<'Foundation' | 'Certified' | 'Truthful Label'>('Foundation');

  // KPIs
  const kpis = useMemo(() => {
    const totalPacked = items.reduce((sum, p) => sum + p.totalWeight, 0);
    const runsCount = items.length;
    const pendingLabel = items.filter(p => p.qrCodeStatus !== 'Applied').length;
    return [
      { icon: Package, title: 'Total Pack Runs', value: `${runsCount} Runs`, subValue: 'Last 30 days' },
      { icon: TrendingUp, title: 'Total Qty Packed', value: `${(totalPacked / 1000).toFixed(1)} MT`, subValue: 'Cotton & Paddy majorly' },
      { icon: QrCode, title: 'Pending Label Application', value: String(pendingLabel), subValue: 'Awaiting QR tags' },
      { icon: Clock, title: 'Avg Packaging Loss', value: '0.45%', subValue: 'Below 0.8% threshold' },
    ];
  }, [items]);

  // Filter runs
  const filteredRuns = useMemo(() => {
    return items.filter(p => {
      const matchesSearch =
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.variety.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCrop = filters.crop === 'all' || p.crop === filters.crop;
      const matchesSize = filters.size === 'all' || p.packSize === filters.size;
      const matchesStatus = filters.status === 'all' || p.status === filters.status;

      return matchesSearch && matchesCrop && matchesSize && matchesStatus;
    });
  }, [items, searchTerm, filters]);

  // Handle Save New Run
  const handleSaveRun = (e: React.FormEvent) => {
    e.preventDefault();
    const sizeMultiplier = parseFloat(formPackSize.replace(/[^0-9.]/g, '')) || 1;
    const totalWeight = formUnits * sizeMultiplier;

    const newRun: PackageRun = {
      id: `PKG-${formBatchId}-${String(items.length + 1).padStart(4, '0')}`,
      batchId: formBatchId,
      crop: formCrop,
      variety: formVariety,
      packSize: formPackSize,
      unitsPacked: formUnits,
      totalWeight,
      labelIssueDate: new Date().toISOString().split('T')[0],
      qrCodeStatus: 'Generated',
      certificationLevel: formCertLevel,
      status: 'Created',
    };

    add(newRun);
    addToast(`Packaging Run ${newRun.id} created successfully!`, 'success');
    setIsAddModalOpen(false);
  };

  const handleOpenLabel = (run: PackageRun) => {
    setSelectedRun(run);
    setIsLabelModalOpen(true);
  };

  const handlePrintLabels = (run: PackageRun) => {
    update(run.id, { qrCodeStatus: 'Applied', status: 'Labeled' });
    addToast(`QR Labels printed and marked 'Applied' for ${run.id}.`, 'success');
    setIsLabelModalOpen(false);
  };

  // Filter Config
  const filterConfig = [
    {
      key: 'crop',
      label: 'Crop',
      options: [
        { value: 'all', label: 'All Crops' },
        { value: 'Cotton', label: 'Cotton' },
        { value: 'Paddy', label: 'Paddy' },
      ],
      value: filters.crop,
      onChange: (val: string) => setFilters(prev => ({ ...prev, crop: val })),
    },
    {
      key: 'size',
      label: 'Pack Size',
      options: [
        { value: 'all', label: 'All Sizes' },
        { value: '1 kg', label: '1 kg' },
        { value: '5 kg', label: '5 kg' },
        { value: '10 kg', label: '10 kg' },
        { value: '25 kg', label: '25 kg' },
      ],
      value: filters.size,
      onChange: (val: string) => setFilters(prev => ({ ...prev, size: val })),
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'Created', label: 'Created' },
        { value: 'Labeled', label: 'Labeled' },
        { value: 'Stored', label: 'Stored' },
        { value: 'Dispatched', label: 'Dispatched' },
      ],
      value: filters.status,
      onChange: (val: string) => setFilters(prev => ({ ...prev, status: val })),
    },
  ];

  const columnsRuns = [
    { key: 'id', label: 'Run ID', sortable: true },
    { key: 'batchId', label: 'Batch ID', sortable: true },
    { key: 'crop', label: 'Crop & Variety', render: (r: PackageRun) => `${r.crop} - ${r.variety}` },
    { key: 'packSize', label: 'Pack Size' },
    { key: 'unitsPacked', label: 'Units', render: (r: PackageRun) => r.unitsPacked.toLocaleString() },
    { key: 'totalWeight', label: 'Total Qty (kg)', render: (r: PackageRun) => r.totalWeight.toLocaleString() },
    {
      key: 'qrCodeStatus',
      label: 'QR Labels',
      render: (r: PackageRun) => (
        <span className={styles.qrStatusBadge} onClick={() => handleOpenLabel(r)} style={{ cursor: 'pointer' }}>
          <QrCode size={14} className={styles.qrIcon} />
          {r.qrCodeStatus}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: PackageRun) => {
        let type = 'neutral' as any;
        if (r.status === 'Dispatched') type = 'success' as any;
        if (r.status === 'Stored') type = 'info' as any;
        if (r.status === 'Labeled') type = 'warning' as any;
        return <Badge variant={type}>{r.status}</Badge>;
      }
    },
    {
      key: 'actions',
      label: '',
      render: (r: PackageRun) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" size="sm" onClick={() => handleOpenLabel(r)}>
            Preview Label
          </Button>
          {canVerify && r.status === 'Labeled' && (
            <Button variant="primary" size="sm" onClick={() => {
              update(r.id, { status: 'Stored' });
              addToast(`Final Quality Verified for ${r.id}. Marked as Stored.`, 'success');
            }}>
              Verify Quality
            </Button>
          )}
        </div>
      )
    }
  ];

  const columnsMaterials = [
    { key: 'id', label: 'Material ID', sortable: true },
    { key: 'name', label: 'Item Name', sortable: true },
    { key: 'type', label: 'Type' },
    { key: 'stock', label: 'Stock Balance', render: (r: any) => r.stock.toLocaleString() },
    { key: 'unit', label: 'Unit' },
    {
      key: 'status',
      label: 'Status',
      render: (r: any) => {
        const type = r.status === 'In Stock' ? 'success' : 'danger';
        return <Badge variant={type}>{r.status}</Badge>;
      }
    },
    {
      key: 'actions',
      label: '',
      render: (r: any) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => addToast(`Reorder request submitted for ${r.name}`, 'success')}
        >
          Reorder
        </Button>
      )
    }
  ];

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={Package} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Packaging & Labeling</h1>
          <p className={styles.pageSubtitle}>
            Manage pack runs, generate QR-coded security labels, and monitor packaging material stock levels
          </p>
        </div>
        <div className={styles.pageActions}>
          {canGenerate && (
            <Button variant="primary" leftIcon={Plus} onClick={() => setIsAddModalOpen(true)}>
              New Pack Run
            </Button>
          )}
          {canVerify && (
            <Button variant="secondary" onClick={() => addToast('Batch package verification queue loaded.', 'success')}>
              Verify Final Quality
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

      {/* Navigation tabs for Packaging Section */}
      <div className={styles.tabHeader}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'runs' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('runs')}
        >
          <Package size={16} /> Packaging Runs
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'materials' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('materials')}
        >
          <Layers size={16} /> Material Inventory
        </button>
      </div>

      {/* Main Content Area */}
      <div className={styles.panel}>
        {activeTab === 'runs' ? (
          <>
            <div className={styles.filtersSection}>
              <FilterBar
                searchPlaceholder="Search Run ID, Batch ID, variety..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                filters={filterConfig}
              />
            </div>
            <DataTable columns={columnsRuns} data={filteredRuns} rowKey="id" />
          </>
        ) : (
          <>
            <div className={styles.filtersSection}>
              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>
            <DataTable
              columns={columnsMaterials}
              data={MOCK_MATERIALS.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))}
              rowKey="id"
            />
          </>
        )}
      </div>

      {/* Create Packaging Run Modal */}
      {isAddModalOpen && (
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="New Packaging Run" size="md">
          <form onSubmit={handleSaveRun} className={styles.form}>
            <div className={styles.formGrid}>
              <div>
                <label className={styles.label}>Batch ID</label>
                <select value={formBatchId} onChange={(e) => setFormBatchId(e.target.value)} className={styles.select}>
                  <option value="BT-2026-1142">BT-2026-1142 (Cotton)</option>
                  <option value="BT-2026-1140">BT-2026-1140 (Paddy)</option>
                  <option value="BT-2026-1138">BT-2026-1138 (Wheat)</option>
                </select>
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
                <label className={styles.label}>Pack Size</label>
                <select value={formPackSize} onChange={(e) => setFormPackSize(e.target.value)} className={styles.select}>
                  <option value="1 kg">1 kg</option>
                  <option value="5 kg">5 kg</option>
                  <option value="10 kg">10 kg</option>
                  <option value="25 kg">25 kg</option>
                </select>
              </div>
              <div>
                <label className={styles.label}>Units to Pack</label>
                <input
                  type="number"
                  value={formUnits}
                  onChange={(e) => setFormUnits(Number(e.target.value))}
                  className={styles.input}
                  min={1}
                  required
                />
              </div>
              <div className={styles.fullWidth}>
                <label className={styles.label}>Certification Level</label>
                <select
                  value={formCertLevel}
                  onChange={(e) => setFormCertLevel(e.target.value as any)}
                  className={styles.select}
                >
                  <option value="Foundation">Foundation (Green Tag)</option>
                  <option value="Certified">Certified (Blue Tag)</option>
                  <option value="Truthful Label">Truthful Label (Opal Tag)</option>
                </select>
              </div>
            </div>

            <div className={styles.formActions}>
              <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create & Generate Labels
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Label Preview Modal */}
      {isLabelModalOpen && selectedRun && (
        <Modal isOpen={isLabelModalOpen} onClose={() => setIsLabelModalOpen(false)} title="Label Preview & Print" size="md">
          <div className={styles.labelModalContent}>
            <div className={styles.labelTagPreview}>
              <div className={styles.tagHeader} style={{
                background: selectedRun.certificationLevel === 'Foundation' ? '#137333' :
                            selectedRun.certificationLevel === 'Certified' ? '#1a73e8' : '#e67c73'
              }}>
                <h3>SEEDSPHERE SECURE QR LABEL</h3>
                <span>{selectedRun.certificationLevel.toUpperCase()} SEED</span>
              </div>
              
              <div className={styles.tagBody}>
                <div className={styles.tagInfo}>
                  <div className={styles.tagField}>
                    <span className={styles.tagFieldLabel}>RUN ID</span>
                    <span className={styles.tagFieldValue}>{selectedRun.id}</span>
                  </div>
                  <div className={styles.tagField}>
                    <span className={styles.tagFieldLabel}>BATCH REF</span>
                    <span className={styles.tagFieldValue}>{selectedRun.batchId}</span>
                  </div>
                  <div className={styles.tagField}>
                    <span className={styles.tagFieldLabel}>CROP & VARIETY</span>
                    <span className={styles.tagFieldValue}>{selectedRun.crop} - {selectedRun.variety}</span>
                  </div>
                  <div className={styles.tagField}>
                    <span className={styles.tagFieldLabel}>NET WEIGHT</span>
                    <span className={styles.tagFieldValue}>{selectedRun.packSize} (Units: {selectedRun.unitsPacked})</span>
                  </div>
                  <div className={styles.tagField}>
                    <span className={styles.tagFieldLabel}>ISSUE DATE</span>
                    <span className={styles.tagFieldValue}>{selectedRun.labelIssueDate}</span>
                  </div>
                </div>

                <div className={styles.tagQrCode}>
                  <div className={styles.qrPlaceholder}>
                    <QrCode size={90} color="#333" />
                  </div>
                  <span className={styles.qrSerial}>#SS-{selectedRun.id.split('-').pop()}</span>
                </div>
              </div>

              <div className={styles.tagFooter}>
                <span>Guaranteed Authentic & Traceable via Qmics AI</span>
              </div>
            </div>

            <div className={styles.labelActions}>
              <Button variant="secondary" onClick={() => setIsLabelModalOpen(false)}>
                Close
              </Button>
              {selectedRun.qrCodeStatus !== 'Applied' ? (
                canPrint ? (
                  <Button variant="primary" leftIcon={QrCode} onClick={() => handlePrintLabels(selectedRun)}>
                    Print & Apply Labels
                  </Button>
                ) : (
                  <Button variant="secondary" disabled>
                    Print Restricted
                  </Button>
                )
              ) : (
                <Button variant="secondary" disabled>
                  Labels Already Printed
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </ModuleLayout>
  );
}
