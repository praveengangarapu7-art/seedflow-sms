import { useState, useMemo } from 'react';
import { FlaskConical, Plus, ShieldCheck, Beaker, Clock } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { Modal } from '@/components/common/Modal/Modal';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { Badge } from '@/components/common/Badge/Badge';
import { processingNav } from '@/config/processingNav';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { recipes as initialRecipes } from '@/data/processing/recipes';
import { TreatmentRecipe } from '@/types/processing';
import { usePermission } from '@/hooks/usePermission';
import styles from './TreatmentsRecipes.module.css';

const STEPPER_STEPS = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'parameters', label: 'Parameters' },
  { key: 'review', label: 'Review' },
];

export default function TreatmentsRecipesPage() {
  const { addToast } = useToast();
  const { items, add, update } = useRealtimeMockStore<TreatmentRecipe>(initialRecipes);

  const canCreate = usePermission('create_recipe');
  const canApprove = usePermission('approve_recipe_system');
  const canArchive = usePermission('archive_recipe');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    crop: 'all',
    status: 'all',
  });

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [crop, setCrop] = useState('Cotton');
  const [variety, setVariety] = useState('Bt RCH-2 BG-II');
  const [targetGrade, setTargetGrade] = useState<'Foundation Seed' | 'Certified Seed' | 'Truthful Label'>('Certified Seed');
  const [description, setDescription] = useState('');
  const [targetPurity, setTargetPurity] = useState(98);
  const [targetMoisture, setTargetMoisture] = useState(8.5);

  const kpis = useMemo(() => {
    const activeCount = items.filter(r => r.status === 'Active').length;
    const pendingCount = items.filter(r => r.status === 'Pending Approval').length;
    return [
      { icon: FlaskConical, title: 'Active Recipes', value: String(activeCount), subValue: 'Across 8 crops' },
      { icon: Clock, title: 'Pending Approval', value: String(pendingCount), subValue: 'Awaiting Plant Manager approval' },
      { icon: Beaker, title: 'Chemicals in Use', value: '12 tracked', subValue: 'Dosage limits compliant' },
      { icon: ShieldCheck, title: 'Compliance Status', value: '100% compliant', subValue: 'ISTA standards matched' },
    ];
  }, [items]);

  const filterConfig = [
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
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All' },
        { value: 'Active', label: 'Active' },
        { value: 'Pending Approval', label: 'Pending Approval' },
        { value: 'Draft', label: 'Draft' },
      ],
      value: filters.status,
      onChange: (val: string) => setFilters(prev => ({ ...prev, status: val })),
    },
  ];

  const filteredData = useMemo(() => {
    return items.filter(r => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.variety.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCrop = filters.crop === 'all' || r.crop === filters.crop;
      const matchesStatus = filters.status === 'all' || r.status === filters.status;

      return matchesSearch && matchesCrop && matchesStatus;
    });
  }, [items, searchTerm, filters]);

  const handleNext = () => {
    if (currentStep === 0 && !name) {
      addToast('Please enter a recipe name.', 'warning');
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleCreateRecipe = (statusToSet: 'Active' | 'Pending Approval' | 'Draft') => {
    const newRecipe: TreatmentRecipe = {
      id: `RCP-${crop.substring(0,3).toUpperCase()}-${String(items.length + 1).padStart(3, '0')}`,
      name,
      crop,
      variety,
      targetGrade,
      description,
      cleaningParams: {
        enabled: true,
        airFlowRate: 40,
        meshSize: '4.5mm',
        targetPurity,
      },
      dryingParams: {
        enabled: true,
        tempMin: 38,
        tempMax: 42,
        targetMoisture,
        maxDurationHours: 12,
      },
      gradingParams: {
        enabled: true,
        sieveSizeR1: '4.0mm',
        sieveSizeR2: '3.6mm',
      },
      treatmentParams: {
        enabled: true,
        chemicals: [{ chemical: 'Carbendazim 50% WP', dosage: 2, order: 1 }],
      },
      packagingParams: {
        enabled: true,
        allowedPackSizes: ['1 kg', '5 kg'],
      },
      createdBy: 'Mohammed Ismail',
      status: statusToSet,
      timesUsed: 0,
    };

    add(newRecipe);
    addToast(`Recipe ${newRecipe.name} created as ${statusToSet}.`, 'success');
    setIsAddOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentStep(0);
    setName('');
    setDescription('');
  };

  const columns = [
    { key: 'name', label: 'Recipe Name', sortable: true },
    { key: 'variety', label: 'Crop & Variety', render: (r: TreatmentRecipe) => `${r.crop} - ${r.variety}` },
    { key: 'targetGrade', label: 'Grade Target' },
    { key: 'timesUsed', label: 'Times Used', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (r: TreatmentRecipe) => {
        let typeVal = 'neutral' as any;
        if (r.status === 'Active') typeVal = 'success' as any;
        if (r.status === 'Pending Approval') typeVal = 'warning' as any;
        if (r.status === 'Draft') typeVal = 'neutral' as any;
        return <Badge variant={typeVal}>{r.status}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: TreatmentRecipe) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {r.status === 'Pending Approval' && canApprove && (
            <Button variant="primary" size="sm" onClick={() => {
              update(r.id, { status: 'Active', approvedBy: 'Mohammed Ismail' });
              addToast(`Recipe ${r.name} approved successfully.`, 'success');
            }}>
              Approve
            </Button>
          )}
          {r.status === 'Active' && canArchive && (
            <Button variant="secondary" size="sm" onClick={() => {
              update(r.id, { status: 'Draft' });
              addToast(`Recipe ${r.name} archived.`, 'warning');
            }}>
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={FlaskConical} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Treatments & Recipes</h1>
          <p className={styles.pageSubtitle}>
            Manage chemical treatment protocols, plant configurations, HSN compliance checks, and recipe builders
          </p>
        </div>
        <div className={styles.pageActions}>
          {canCreate && (
            <Button variant="primary" leftIcon={Plus} onClick={() => setIsAddOpen(true)}>
              New Recipe
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
          searchPlaceholder="Search recipe name, variety..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filterConfig}
        />
      </div>

      {/* Content Area */}
      <div className={styles.contentArea}>
        <DataTable columns={columns} data={filteredData} rowKey="id" />
      </div>

      {/* Create Modal */}
      {isAddOpen && (
        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Treatment Recipe" size="lg">
          <div className={styles.modalContent}>
            <div className={styles.stepperWrapper}>
              <Stepper steps={STEPPER_STEPS} currentStep={currentStep} />
            </div>

            {currentStep === 0 && (
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Recipe Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cotton-Bt-Premium"
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
                <div>
                  <label className={styles.label}>Target Grade</label>
                  <select value={targetGrade} onChange={(e) => setTargetGrade(e.target.value as any)} className={styles.select}>
                    <option value="Foundation Seed">Foundation Seed</option>
                    <option value="Certified Seed">Certified Seed</option>
                    <option value="Truthful Label">Truthful Label</option>
                  </select>
                </div>
                <div className={styles.fullWidth}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className={styles.textarea}
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Target Purity %</label>
                  <input
                    type="number"
                    value={targetPurity || ''}
                    onChange={(e) => setTargetPurity(Number(e.target.value))}
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Target Final Moisture %</label>
                  <input
                    type="number"
                    value={targetMoisture || ''}
                    onChange={(e) => setTargetMoisture(Number(e.target.value))}
                    className={styles.input}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className={styles.formGrid}>
                <div className={styles.fullWidth} style={{ border: '1px solid var(--color-border-light)', padding: '16px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px' }}>Review New Recipe Config</h4>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Recipe Name:</span>
                    <span className={styles.specVal}>{name}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Crop & Variety:</span>
                    <span className={styles.specVal}>{crop} - {variety}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Grade Target:</span>
                    <span className={styles.specVal}>{targetGrade}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Cleaning Purity / Moisture Target:</span>
                    <span className={styles.specVal}>{targetPurity}% / {targetMoisture}%</span>
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
                <Button variant="ghost" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                {currentStep < STEPPER_STEPS.length - 1 ? (
                  <Button variant="primary" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => handleCreateRecipe('Draft')}>
                      Save Draft
                    </Button>
                    <Button variant="primary" onClick={() => handleCreateRecipe('Active')}>
                      Publish Active
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
