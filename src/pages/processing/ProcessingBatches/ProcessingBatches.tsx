import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Plus, TrendingUp, CheckCircle, AlertOctagon } from 'lucide-react';
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
import defaultBatches from '@/data/processing/batches';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { PROCESSING_TODAY, isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import { rawIntakes as mockIntakes } from '@/data/processing/rawIntakes';
import { recipes as mockRecipes } from '@/data/processing/recipes';
import { machines as mockMachines } from '@/data/processing/machines';
import { ProcessingBatch } from '@/types/processing';
import { usePermission } from '@/hooks/usePermission';
import styles from './ProcessingBatches.module.css';

const STEPPER_STEPS = [
  { key: 'identification', label: 'Identification' },
  { key: 'recipe', label: 'Recipe Selection' },
  { key: 'resources', label: 'Resource Allocation' },
  { key: 'review', label: 'Review' },
];

export default function ProcessingBatchesPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { items: allBatches, add } = useRealtimeMockStore<ProcessingBatch>(defaultBatches);
  const [period, setPeriod] = useState<PeriodValue>('all');

  const items = useMemo(
    () => allBatches.filter((b) => isDateInPeriod(b.startedDate, period, PROCESSING_TODAY)),
    [allBatches, period]
  );

  const canCreate = usePermission('create_processing_batch');
  const canApproveRecipe = usePermission('approve_batch_recipe');
  const canPauseResume = usePermission('pause_resume_batch');
  const canCancel = usePermission('cancel_batch');
  const canInspect = usePermission('in_process_quality_check');
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    stage: 'all',
    plant: 'all',
    crop: 'all',
  });

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [sourceLot, setSourceLot] = useState('');
  const [plant, setPlant] = useState('Aurangabad Plant');
  const [targetGrade, setTargetGrade] = useState<'Foundation Seed' | 'Certified Seed' | 'Truthful Label'>('Certified Seed');
  const [inputQuantity, setInputQuantity] = useState(5000);
  const [recipeId, setRecipeId] = useState('RCP-COT-002');
  const [assignedMachine, setAssignedMachine] = useState('');
  const [operator, setOperator] = useState('Gopal Patil');

  // Filter lists
  const eligibleLots = useMemo(() => {
    return mockIntakes.filter(lot => lot.status === 'Accepted');
  }, []);

  const selectedLotObj = useMemo(() => {
    return eligibleLots.find(l => l.id === sourceLot) || null;
  }, [eligibleLots, sourceLot]);

  const selectedRecipeObj = useMemo(() => {
    return mockRecipes.find(r => r.id === recipeId) || null;
  }, [recipeId]);

  const plantMachines = useMemo(() => {
    return mockMachines.filter(m => m.plantId === (plant === 'Aurangabad Plant' ? 'PL-AUR' : (plant === 'Hyderabad Plant' ? 'PL-HYD' : 'PL-IND')));
  }, [plant]);

  // Set default form values
  useMemo(() => {
    if (eligibleLots.length > 0 && !sourceLot) {
      setSourceLot(eligibleLots[0].id);
    }
    if (plantMachines.length > 0 && !assignedMachine) {
      setAssignedMachine(plantMachines[0].id);
    }
  }, [eligibleLots, sourceLot, plantMachines, assignedMachine]);

  // KPIs
  const kpis = useMemo(() => {
    const activeCount = items.filter(b => b.status === 'In Progress').length;
    const holds = items.filter(b => b.status === 'Quality Hold').length;
    const completedThisWeek = items.filter(b => b.status === 'Completed').length;
    return [
      { icon: Factory, title: 'Active Batches', value: String(activeCount), subValue: 'Across 3 plants' },
      { icon: TrendingUp, title: 'Avg Recovery (Week)', value: '83.1%', subValue: 'High yield output' },
      { icon: CheckCircle, title: 'Completed This Week', value: String(completedThisWeek || 18), subValue: '112 tonnes finished' },
      { icon: AlertOctagon, title: 'Quality Holds', value: String(holds), subValue: 'Awaiting lab results' },
    ];
  }, [items]);

  // Filter Bar Config
  const filterConfig = [
    {
      key: 'stage',
      label: 'Stage',
      options: [
        { value: 'all', label: 'All Stages' },
        { value: 'Planned', label: 'Planned' },
        { value: 'Cleaning', label: 'Cleaning' },
        { value: 'Drying', label: 'Drying' },
        { value: 'Grading', label: 'Grading' },
        { value: 'Treatment', label: 'Treatment' },
        { value: 'Packaging', label: 'Packaging' },
        { value: 'Completed', label: 'Completed' },
      ],
      value: filters.stage,
      onChange: (val: string) => setFilters(prev => ({ ...prev, stage: val })),
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
  ];

  const filteredData = useMemo(() => {
    return items.filter(b => {
      const matchesSearch =
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.crop.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.variety.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStage = filters.stage === 'all' || b.currentStage === filters.stage;
      const matchesPlant = filters.plant === 'all' || b.plant === filters.plant;
      const matchesCrop = filters.crop === 'all' || b.crop === filters.crop;

      return matchesSearch && matchesStage && matchesPlant && matchesCrop;
    });
  }, [items, searchTerm, filters]);

  const handleNext = () => {
    if (currentStep === 0 && !sourceLot) {
      addToast('Please select a source lot.', 'warning');
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleCreateBatch = (statusToSet: 'Planned' | 'In Progress') => {
    const newBatch: ProcessingBatch = {
      id: `BT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      sourceLots: [sourceLot],
      crop: selectedLotObj?.crop || 'Cotton',
      variety: selectedLotObj?.variety || 'Bt RCH-2 BG-II',
      plant,
      inputQuantity,
      currentStage: statusToSet === 'Planned' ? 'Planned' : 'Cleaning',
      progress: 0,
      startedDate: statusToSet === 'In Progress' ? new Date().toISOString() : undefined,
      recipeId,
      targetGrade,
      operator,
      status: statusToSet,
      stageHistory: [],
      qualityCheckpoints: {},
      labResults: [],
      losses: { cleaning: 0, drying: 0, grading: 0, treatment: 0, rejected: 0 },
    };

    add(newBatch);
    addToast(`Batch ${newBatch.id} created successfully as ${statusToSet}.`, 'success');
    setIsAddModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentStep(0);
    setInputQuantity(5000);
  };

  const columns = [
    { key: 'id', label: 'Batch ID', sortable: true },
    { key: 'crop', label: 'Crop & Variety', render: (b: ProcessingBatch) => `${b.crop} - ${b.variety}` },
    { key: 'plant', label: 'Plant' },
    { key: 'inputQuantity', label: 'Qty (kg)', render: (b: ProcessingBatch) => b.inputQuantity.toLocaleString('en-IN') },
    {
      key: 'currentStage',
      label: 'Stage',
      render: (b: ProcessingBatch) => {
        let badgeType = 'neutral' as any;
        if (b.currentStage === 'Completed') badgeType = 'success' as any;
        if (b.currentStage === 'Planned') badgeType = 'info' as any;
        if (b.currentStage === 'Rejected') badgeType = 'danger' as any;
        return <Badge variant={badgeType}>{b.currentStage}</Badge>;
      },
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (b: ProcessingBatch) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px' }}>
          <div style={{ flexGrow: 1, height: '6px', background: '#EEF4F6', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${b.progress}%`, height: '100%', background: '#0E5467', borderRadius: '3px' }} />
          </div>
          <span style={{ fontSize: '12px', color: '#5A6E76' }}>{b.progress}%</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (b: ProcessingBatch) => {
        let typeVal = 'neutral' as any;
        if (b.status === 'Completed') typeVal = 'success' as any;
        if (b.status === 'In Progress') typeVal = 'info' as any;
        if (b.status === 'Quality Hold') typeVal = 'warning' as any;
        if (b.status === 'Rejected') typeVal = 'danger' as any;
        return <Badge variant={typeVal}>{b.status}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (b: ProcessingBatch) => {
        const handleStopPropagation = (e: React.MouseEvent) => e.stopPropagation();
        return (
          <div style={{ display: 'flex', gap: '6px' }} onClick={handleStopPropagation}>
            {canApproveRecipe && b.status === 'Planned' && (
              <Button size="sm" variant="secondary" onClick={() => addToast(`Recipe approved for batch ${b.id}`, 'success')}>
                Approve Recipe
              </Button>
            )}
            {canPauseResume && b.status === 'In Progress' && (
              <Button size="sm" variant="secondary" onClick={() => addToast(`Batch ${b.id} paused`, 'info')}>
                Pause
              </Button>
            )}
            {canCancel && b.status !== 'Completed' && b.status !== 'Rejected' && (
              <Button size="sm" variant="danger" onClick={() => addToast(`Batch ${b.id} cancelled`, 'error')}>
                Cancel
              </Button>
            )}
            {canInspect && b.status === 'In Progress' && (
              <Button size="sm" variant="secondary" onClick={() => addToast(`In-process QC check started for ${b.id}`, 'info')}>
                Run QC
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={Factory} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Processing Batches</h1>
          <p className={styles.pageSubtitle}>
            Active and historical batches across cleaning, drying, grading, treatment, and packaging stages
          </p>
        </div>
        <div className={styles.pageActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          {canCreate && (
            <Button variant="primary" leftIcon={Plus} onClick={() => setIsAddModalOpen(true)}>
              New Batch
            </Button>
          )}
          {canApproveRecipe && (
            <Button variant="secondary" onClick={() => addToast('Pending recipe approvals menu opened.', 'success')}>
              Pending recipe approvals
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
          searchPlaceholder="Search Batch ID, variety..."
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
          onRowClick={(row) => navigate(`/processing/batches/${row.id}`)}
        />
      </div>

      {/* Create Batch Modal */}
      {isAddModalOpen && (
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Processing Batch" size="lg">
          <div className={styles.modalContent}>
            <div className={styles.stepperWrapper}>
              <Stepper steps={STEPPER_STEPS} currentStep={currentStep} />
            </div>

            {currentStep === 0 && (
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Select Raw Seed Lot</label>
                  <select value={sourceLot} onChange={(e) => setSourceLot(e.target.value)} className={styles.select}>
                    {eligibleLots.map(lot => (
                      <option key={lot.id} value={lot.id}>
                        {lot.id} ({lot.crop} - {lot.variety}, {lot.netWeight.toLocaleString()} kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={styles.label}>Target Plant</label>
                  <select value={plant} onChange={(e) => setPlant(e.target.value)} className={styles.select}>
                    <option value="Aurangabad Plant">Aurangabad Plant</option>
                    <option value="Hyderabad Plant">Hyderabad Plant</option>
                    <option value="Indore Plant">Indore Plant</option>
                  </select>
                </div>
                <div>
                  <label className={styles.label}>Target Grade</label>
                  <select value={targetGrade} onChange={(e) => setTargetGrade(e.target.value as any)} className={styles.select}>
                    <option value="Foundation Seed">Foundation Seed</option>
                    <option value="Certified Seed">Certified Seed</option>
                    <option value="Truthful Label">Truthful Label</option>
                  </select>
                </div>
                <div>
                  <label className={styles.label}>Input Quantity (kg)</label>
                  <input
                    type="number"
                    value={inputQuantity || ''}
                    onChange={(e) => setInputQuantity(Number(e.target.value))}
                    max={selectedLotObj?.netWeight || 10000}
                    className={styles.input}
                  />
                  {selectedLotObj && (
                    <span style={{ fontSize: '11px', color: '#5A6E76' }}>
                      Max available: {selectedLotObj.netWeight.toLocaleString()} kg
                    </span>
                  )}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className={styles.formGrid}>
                <div className={styles.fullWidth}>
                  <label className={styles.label}>Select Treatment Recipe</label>
                  <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} className={styles.select}>
                    {mockRecipes.filter(r => r.status === 'Active').map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.targetGrade})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedRecipeObj && (
                  <div className={styles.fullWidth}>
                    <div className={styles.recipePreviewBox}>
                      <div className={styles.recipePreviewTitle}>Recipe Preview: {selectedRecipeObj.name}</div>
                      <div>• Cleaning: {selectedRecipeObj.cleaningParams.enabled ? `Yes (${selectedRecipeObj.cleaningParams.targetPurity}% Purity)` : 'No'}</div>
                      <div>• Drying: {selectedRecipeObj.dryingParams.enabled ? `Yes (Temp: ${selectedRecipeObj.dryingParams.tempMin}-${selectedRecipeObj.dryingParams.tempMax}°C)` : 'No'}</div>
                      <div>• Grading: {selectedRecipeObj.gradingParams.enabled ? 'Yes' : 'No'}</div>
                      <div>• Treatment: {selectedRecipeObj.treatmentParams.enabled ? `Yes (${selectedRecipeObj.treatmentParams.chemicals.map(c => c.chemical).join(', ')})` : 'No'}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Assign Machine</label>
                  <select value={assignedMachine} onChange={(e) => setAssignedMachine(e.target.value)} className={styles.select}>
                    {plantMachines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={styles.label}>Plant Supervisor</label>
                  <select value={operator} onChange={(e) => setOperator(e.target.value)} className={styles.select}>
                    <option value="Gopal Patil">Gopal Patil</option>
                    <option value="Suresh Patil">Suresh Patil</option>
                    <option value="J. Srinivas">J. Srinivas</option>
                    <option value="Kartar Singh">Kartar Singh</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className={styles.formGrid}>
                <div className={styles.fullWidth} style={{ border: '1px solid var(--color-border-light)', padding: '16px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px' }}>Review Batch Configuration</h4>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Source Lot:</span>
                    <span className={styles.specVal}>{sourceLot}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Variety / Crop:</span>
                    <span className={styles.specVal}>{selectedLotObj?.variety} ({selectedLotObj?.crop})</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Plant:</span>
                    <span className={styles.specVal}>{plant}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Input Quantity:</span>
                    <span className={styles.specVal}>{inputQuantity.toLocaleString()} kg</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Recipe:</span>
                    <span className={styles.specVal}>{selectedRecipeObj?.name}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Operator / Machine:</span>
                    <span className={styles.specVal}>{operator} / {assignedMachine}</span>
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
                    <Button variant="secondary" onClick={() => handleCreateBatch('Planned')}>
                      Plan Only
                    </Button>
                    <Button variant="primary" onClick={() => handleCreateBatch('In Progress')}>
                      Start Cleaning
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </ModuleLayout>
  );
}
