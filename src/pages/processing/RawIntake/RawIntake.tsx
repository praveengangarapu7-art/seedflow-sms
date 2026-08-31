import { useState, useMemo } from 'react';
import { Truck, Plus, Clock, ShieldCheck } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { Modal } from '@/components/common/Modal/Modal';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { Badge } from '@/components/common/Badge/Badge';
import { processingNav } from '@/config/processingNav';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { rawIntakes as mockIntakes } from '@/data/processing/rawIntakes';
import { RawIntake, IntakeStatus } from '@/types/processing';
import { usePermission } from '@/hooks/usePermission';
import styles from './RawIntake.module.css';

const STEPPER_STEPS = [
  { key: 'source', label: 'Source' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'weighbridge', label: 'Weighbridge' },
  { key: 'quality', label: 'Quality' },
  { key: 'review', label: 'Review' },
];

export default function RawIntakePage() {
  const { addToast } = useToast();
  const { items, add, update } = useRealtimeMockStore<RawIntake>(mockIntakes);

  const canCreate = usePermission('create_raw_intake');
  const canInspect = usePermission('pre_processing_inspection');
  const canAcceptReject = usePermission('accept_reject_raw_lot');
  const canMarkReady = usePermission('mark_raw_lot_ready');
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    status: 'all',
    crop: 'all',
    plant: 'all',
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIntake, setSelectedIntake] = useState<RawIntake | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // New Intake Form State
  const [sourceType, setSourceType] = useState<'Contract Farm' | 'R&D Unit' | 'Warehouse Transfer' | 'Direct Farmer'>('Contract Farm');
  const [sourceName, setSourceName] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [plotId, setPlotId] = useState('');
  const [crop, setCrop] = useState('Cotton');
  const [variety, setVariety] = useState('Bt RCH-2 BG-II');
  const [season] = useState('Kharif 2026');
  const [receivingPlant, setReceivingPlant] = useState('Aurangabad Plant');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [grossWeight, setGrossWeight] = useState(0);
  const [tareWeight, setTareWeight] = useState(0);
  const [moisture, setMoisture] = useState(10);
  const [impurity, setImpurity] = useState(1.5);
  const [notes, setNotes] = useState('');

  // KPIs
  const kpis = useMemo(() => {
    const todayCount = items.filter(r => r.arrivalTime?.startsWith('2026-06-14')).length;
    const pendingCount = items.filter(r => r.status === 'Pending QC').length;
    const acceptedCount = items.filter(r => r.status === 'Accepted').length;
    const acceptRate = items.length ? Math.round((acceptedCount / items.length) * 100) : 100;
    return [
      { icon: Truck, title: "Today's Arrivals", value: `${todayCount || 9} lots`, subValue: '32.4 tonnes total' },
      { icon: Clock, title: 'Pending Quality Check', value: String(pendingCount), subValue: 'Awaiting lab results' },
      { icon: ShieldCheck, title: 'Acceptance Rate (30d)', value: `${acceptRate}%`, subValue: 'Quality standard compliant' },
      { icon: Clock, title: 'Avg Intake-to-Process', value: '8.2 hrs', subValue: 'Receipt to first stage' },
    ];
  }, [items]);

  // Filter Config
  const filterConfig = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'Pending QC', label: 'Pending QC' },
        { value: 'Accepted', label: 'Accepted' },
        { value: 'Reprocess', label: 'Reprocess' },
        { value: 'Rejected', label: 'Rejected' },
      ],
      value: filters.status,
      onChange: (val: string) => setFilters(prev => ({ ...prev, status: val })),
    },
    {
      key: 'crop',
      label: 'Crop',
      options: [
        { value: 'all', label: 'All Crops' },
        { value: 'Cotton', label: 'Cotton' },
        { value: 'Paddy', label: 'Paddy' },
        { value: 'Wheat', label: 'Wheat' },
        { value: 'Maize', label: 'Maize' },
      ],
      value: filters.crop,
      onChange: (val: string) => setFilters(prev => ({ ...prev, crop: val })),
    },
    {
      key: 'plant',
      label: 'Plant',
      options: [
        { value: 'all', label: 'All Plants' },
        { value: 'Aurangabad Plant', label: 'Aurangabad' },
        { value: 'Hyderabad Plant', label: 'Hyderabad' },
        { value: 'Indore Plant', label: 'Indore' },
      ],
      value: filters.plant,
      onChange: (val: string) => setFilters(prev => ({ ...prev, plant: val })),
    },
  ];

  const filteredData = useMemo(() => {
    return items.filter(r => {
      const matchesSearch =
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.sourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.farmerName && r.farmerName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = filters.status === 'all' || r.status === filters.status;
      const matchesCrop = filters.crop === 'all' || r.crop === filters.crop;
      const matchesPlant = filters.plant === 'all' || r.receivingPlant === filters.plant;

      return matchesSearch && matchesStatus && matchesCrop && matchesPlant;
    });
  }, [items, searchTerm, filters]);

  const handleNext = () => {
    if (currentStep === 0 && !sourceName) {
      addToast('Please enter a source name.', 'warning');
      return;
    }
    if (currentStep === 1 && !vehicleNumber) {
      addToast('Please enter a vehicle number.', 'warning');
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSaveIntake = (statusToSet: IntakeStatus) => {
    const netWeight = Math.max(0, grossWeight - tareWeight);
    const newIntake: RawIntake = {
      id: `LOT-${crop.substring(0, 3).toUpperCase()}-2026-${String(items.length + 1).padStart(4, '0')}`,
      sourceType,
      sourceName,
      farmerName: farmerName || undefined,
      plotId: plotId || undefined,
      crop,
      variety,
      season,
      receivingPlant,
      vehicleNumber,
      driverName: driverName || undefined,
      driverPhone: driverPhone || undefined,
      arrivalTime: new Date().toISOString(),
      grossWeight,
      tareWeight,
      netWeight,
      weighbridgeTicket: `WB-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      moisture,
      impurity,
      notes: notes || undefined,
      status: statusToSet,
    };
    
    add(newIntake);
    addToast(`Lot ${newIntake.id} recorded with status: ${statusToSet}`, 'success');
    setIsAddModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentStep(0);
    setSourceName('');
    setFarmerName('');
    setPlotId('');
    setVehicleNumber('');
    setDriverName('');
    setDriverPhone('');
    setGrossWeight(0);
    setTareWeight(0);
    setMoisture(10);
    setImpurity(1.5);
    setNotes('');
  };

  const handleRowClick = (row: RawIntake) => {
    setSelectedIntake(row);
    setIsDetailOpen(true);
  };

  const columns = [
    { key: 'id', label: 'Lot ID', sortable: true },
    { key: 'sourceName', label: 'Source', sortable: true },
    { key: 'crop', label: 'Crop & Variety', render: (r: RawIntake) => `${r.crop} - ${r.variety}` },
    { key: 'netWeight', label: 'Net Qty (kg)', render: (r: RawIntake) => r.netWeight.toLocaleString('en-IN') },
    { key: 'moisture', label: 'Moisture %', render: (r: RawIntake) => `${r.moisture}%` },
    { key: 'impurity', label: 'Impurity %', render: (r: RawIntake) => `${r.impurity}%` },
    { key: 'vehicleNumber', label: 'Vehicle #' },
    { key: 'receivingPlant', label: 'Plant' },
    {
      key: 'status',
      label: 'Status',
      render: (r: RawIntake) => {
        let badgeType = 'neutral' as any;
        if (r.status === 'Accepted') badgeType = 'success' as any;
        if (r.status === 'Pending QC') badgeType = 'warning' as any;
        if (r.status === 'Reprocess') badgeType = 'info' as any;
        if (r.status === 'Rejected') badgeType = 'danger' as any;
        return <Badge variant={badgeType}>{r.status}</Badge>;
      },
    },
  ];

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={Truck} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Raw Intake</h1>
          <p className={styles.pageSubtitle}>
            Record raw seed arrivals with source traceability, weighbridge data, and initial quality checks
          </p>
        </div>
        <div className={styles.pageActions}>
          {canCreate && (
            <Button variant="primary" leftIcon={Plus} onClick={() => setIsAddModalOpen(true)}>
              New Intake
            </Button>
          )}
          {canInspect && (
            <Button variant="secondary" leftIcon={ShieldCheck} onClick={() => addToast('Pre-processing inspection batch run started.', 'success')}>
              Start pre-processing inspection
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* KPI Grid */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, idx) => (
          <KpiCard key={idx} icon={kpi.icon} title={kpi.title} value={kpi.value} subValue={kpi.subValue} />
        ))}
      </div>

      {/* Filter Bar */}
      <div className={styles.filtersSection}>
        <FilterBar
          searchPlaceholder="Search Lot ID, farmer, or vehicle..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filterConfig}
        />
      </div>

      {/* Content Area */}
      <div className={styles.contentArea}>
        <DataTable
          columns={columns}
          data={filteredData}
          rowKey="id"
          onRowClick={handleRowClick}
        />
      </div>

      {/* Create Modal */}
      {isAddModalOpen && (
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="New Raw Seed Intake" size="lg">
          <div className={styles.modalContent}>
            <div className={styles.stepperWrapper}>
              <Stepper steps={STEPPER_STEPS} currentStep={currentStep} />
            </div>

            {currentStep === 0 && (
              <div className={styles.formGrid}>
                <div className={styles.fullWidth}>
                  <label className={styles.label}>Source Type</label>
                  <div className={styles.radioGrid}>
                    {(['Contract Farm', 'R&D Unit', 'Warehouse Transfer', 'Direct Farmer'] as const).map(t => (
                      <label key={t} className={styles.radioItem}>
                        <input
                          type="radio"
                          name="sourceType"
                          checked={sourceType === t}
                          onChange={() => setSourceType(t)}
                          className={styles.radioInput}
                        />
                        <div className={styles.radioContent}>
                          <span className={styles.radioLabelText}>{t}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={styles.label}>Source Name (Entity)</label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="e.g. Patel Cotton Growers"
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Farmer Name (Optional)</label>
                  <input
                    type="text"
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    placeholder="e.g. Rajesh Patel"
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Crop</label>
                  <select value={crop} onChange={(e) => setCrop(e.target.value)} className={styles.select}>
                    <option value="Cotton">Cotton</option>
                    <option value="Paddy">Paddy</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Maize">Maize</option>
                  </select>
                </div>
                <div>
                  <label className={styles.label}>Variety</label>
                  <input
                    type="text"
                    value={variety}
                    onChange={(e) => setVariety(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Vehicle Number</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. MH-12-AB-1234"
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Receiving Plant</label>
                  <select value={receivingPlant} onChange={(e) => setReceivingPlant(e.target.value)} className={styles.select}>
                    <option value="Aurangabad Plant">Aurangabad Plant</option>
                    <option value="Hyderabad Plant">Hyderabad Plant</option>
                    <option value="Indore Plant">Indore Plant</option>
                  </select>
                </div>
                <div>
                  <label className={styles.label}>Driver Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Driver Phone</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Gross Weight (kg)</label>
                  <input
                    type="number"
                    value={grossWeight || ''}
                    onChange={(e) => setGrossWeight(Number(e.target.value))}
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Tare Weight (kg)</label>
                  <input
                    type="number"
                    value={tareWeight || ''}
                    onChange={(e) => setTareWeight(Number(e.target.value))}
                    className={styles.input}
                  />
                </div>
                <div className={styles.fullWidth}>
                  <div className={styles.weighbridgeSummary}>
                    <div className={styles.summaryRow}>
                      <span>Gross Weight:</span>
                      <span>{grossWeight.toLocaleString()} kg</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Tare Weight:</span>
                      <span>{tareWeight.toLocaleString()} kg</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Net Weight:</span>
                      <span>{Math.max(0, grossWeight - tareWeight).toLocaleString()} kg</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Moisture %</label>
                  <input
                    type="number"
                    value={moisture || ''}
                    onChange={(e) => setMoisture(Number(e.target.value))}
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Impurity %</label>
                  <input
                    type="number"
                    value={impurity || ''}
                    onChange={(e) => setImpurity(Number(e.target.value))}
                    className={styles.input}
                  />
                </div>
                <div className={styles.fullWidth}>
                  <label className={styles.label}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className={styles.textarea}
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className={styles.formGrid}>
                <div className={styles.fullWidth} style={{ border: '1px solid var(--color-border-light)', padding: '16px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px' }}>Review Raw Intake Details</h4>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Source:</span>
                    <span className={styles.specVal}>{sourceName} ({sourceType})</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Crop & Variety:</span>
                    <span className={styles.specVal}>{crop} - {variety}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Vehicle:</span>
                    <span className={styles.specVal}>{vehicleNumber}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Net Qty:</span>
                    <span className={styles.specVal}>{Math.max(0, grossWeight - tareWeight).toLocaleString()} kg</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Moisture / Impurity:</span>
                    <span className={styles.specVal}>{moisture}% / {impurity}%</span>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.formActions}>
              {currentStep > 0 ? (
                <Button variant="secondary" onClick={handlePrev}>
                  Back
                </Button>
              ) : (
                <div />
              )}
              <div className={styles.rightActions}>
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                {currentStep < STEPPER_STEPS.length - 1 ? (
                  <Button variant="primary" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => handleSaveIntake('Pending QC')}>
                      Hold for QC
                    </Button>
                    <Button variant="primary" onClick={() => handleSaveIntake('Accepted')}>
                      Accept & Save
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Details Modal */}
      {isDetailOpen && selectedIntake && (
        <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Intake Details: ${selectedIntake.id}`} size="md">
          <div className={styles.detailGrid}>
            <div className={styles.infoCard} style={{ gridColumn: '1 / -1' }}>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Status:</span>
                <span className={styles.specVal}>
                  <Badge variant={
                    selectedIntake.status === 'Accepted' ? 'success' :
                    selectedIntake.status === 'Pending QC' ? 'warning' :
                    selectedIntake.status === 'Reprocess' ? 'info' : 'danger'
                  }>{selectedIntake.status}</Badge>
                </span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Source Name:</span>
                <span className={styles.specVal}>{selectedIntake.sourceName}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Source Type:</span>
                <span className={styles.specVal}>{selectedIntake.sourceType}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Crop & Variety:</span>
                <span className={styles.specVal}>{selectedIntake.crop} - {selectedIntake.variety}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Receiving Plant:</span>
                <span className={styles.specVal}>{selectedIntake.receivingPlant}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Arrival Time:</span>
                <span className={styles.specVal}>{new Date(selectedIntake.arrivalTime).toLocaleString()}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Vehicle Number:</span>
                <span className={styles.specVal}>{selectedIntake.vehicleNumber}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Net Weight:</span>
                <span className={styles.specVal}>{selectedIntake.netWeight.toLocaleString()} kg</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Moisture %:</span>
                <span className={styles.specVal}>{selectedIntake.moisture}%</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Impurity %:</span>
                <span className={styles.specVal}>{selectedIntake.impurity}%</span>
              </div>
              {selectedIntake.notes && (
                <div className={styles.specRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span className={styles.specLabel}>Notes:</span>
                  <span className={styles.specVal} style={{ fontWeight: '400', fontSize: '13px' }}>{selectedIntake.notes}</span>
                </div>
              )}
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {selectedIntake.status === 'Pending QC' && canAcceptReject && (
                <>
                  <Button variant="danger" onClick={() => {
                    update(selectedIntake.id, { status: 'Rejected' });
                    addToast('Lot rejected.', 'error');
                    setIsDetailOpen(false);
                  }}>
                    Reject Lot
                  </Button>
                  <Button variant="primary" onClick={() => {
                    update(selectedIntake.id, { status: 'Accepted' });
                    addToast('Lot accepted.', 'success');
                    setIsDetailOpen(false);
                  }}>
                    Accept Lot
                  </Button>
                </>
              )}
              {selectedIntake.status === 'Pending QC' && canInspect && !canAcceptReject && (
                <Button variant="secondary" onClick={() => {
                  addToast('Pre-processing QC check recorded.', 'success');
                  setIsDetailOpen(false);
                }}>
                  Run pre-processing QC
                </Button>
              )}
              {selectedIntake.status === 'Accepted' && canMarkReady && (
                <Button variant="primary" onClick={() => {
                  addToast('Lot marked ready for processing.', 'success');
                  setIsDetailOpen(false);
                }}>
                  Mark ready for processing
                </Button>
              )}
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ModuleLayout>
  );
}
