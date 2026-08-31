import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Grid } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { DatePicker } from '@/components/common/DatePicker/DatePicker';
import { useToast } from '@/components/common/Toast/ToastContext';
import { Nursery, NurseryType } from '@/types/rd';
import styles from './NewNurseryModal.module.css';

interface NewNurseryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNursery: (nursery: Nursery) => void;
  programOptions?: string[];
}

const NURSERY_TYPES: NurseryType[] = [
  'Crossing block',
  'Selection nursery',
  'Multiplication',
  'Quarantine',
];

const CROPS = ['Cotton', 'Maize', 'Paddy', 'Sorghum', 'Sunflower', 'Soybean', 'Tomato', 'Chilli'];
const SEASONS = ['Kharif 2026', 'Rabi 2026-27', 'Zaid 2027'];

export const NewNurseryModal: React.FC<NewNurseryModalProps> = ({
  isOpen,
  onClose,
  onAddNursery,
  programOptions = [],
}) => {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<NurseryType>(NURSERY_TYPES[0]);
  const [crop, setCrop] = useState(CROPS[0]);
  const [season, setSeason] = useState(SEASONS[0]);

  const [facility, setFacility] = useState('');
  const [block, setBlock] = useState('');
  const [rows, setRows] = useState('20');
  const [plants, setPlants] = useState('50');
  const [sownDate, setSownDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [harvestDate, setHarvestDate] = useState<string | null>('');

  const [linkedProgram, setLinkedProgram] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [additionalStaff, setAdditionalStaff] = useState('');

  const steps = [
    { key: 'basics', label: 'Basics' },
    { key: 'location', label: 'Location & Size' },
    { key: 'team', label: 'Team & Program' },
    { key: 'review', label: 'Review' },
  ];

  const handleNext = () => {
    if (currentStep === 0 && !name.trim()) {
      addToast('Nursery name is required', 'warning');
      return;
    }
    if (currentStep === 1 && (!facility.trim() || !block.trim() || !rows || !plants)) {
      addToast('Facility, Block, and grid sizing details are required', 'warning');
      return;
    }
    if (currentStep === 2 && !supervisor.trim()) {
      addToast('Supervising staff member is required', 'warning');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !facility.trim() || !block.trim() || !supervisor.trim()) {
      addToast('Please fill in all required fields', 'warning');
      return;
    }

    const staffList = [
      supervisor.trim(),
      ...additionalStaff
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ];

    const newNursery: Nursery = {
      id: `NUR-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      name,
      type,
      crop,
      season,
      location: {
        facility,
        block,
        rows: parseInt(rows) || 10,
        plants: parseInt(plants) || 30,
      },
      status: sownDate ? 'Sown' : 'Planned',
      sownDate: sownDate || undefined,
      harvestDate: harvestDate || undefined,
      programRefs: linkedProgram ? [linkedProgram] : [],
      entriesPlanted: [],
      crossesMade: 0,
      crossesSuccessful: 0,
      responsibleStaff: staffList,
    };

    onAddNursery(newNursery);
    addToast(`Nursery ${newNursery.id} created successfully`, 'success');
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCurrentStep(0);
    setName('');
    setType(NURSERY_TYPES[0]);
    setCrop(CROPS[0]);
    setSeason(SEASONS[0]);
    setFacility('');
    setBlock('');
    setRows('20');
    setPlants('50');
    setSownDate(new Date().toISOString().split('T')[0]);
    setHarvestDate('');
    setLinkedProgram('');
    setSupervisor('');
    setAdditionalStaff('');
  };

  const totalCapacity = (parseInt(rows) || 0) * (parseInt(plants) || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Create Nursery Block"
      size="lg"
    >
      <div className={styles.modalContent}>
        <div className={styles.stepperWrapper}>
          <Stepper
            steps={steps}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* STEP 1: BASICS */}
          {currentStep === 0 && (
            <div className={styles.stepContent}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Nursery Block Name <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Rabi Crossing Block Alpha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Nursery Type</label>
                <select
                  className={styles.select}
                  value={type}
                  onChange={(e) => setType(e.target.value as NurseryType)}
                >
                  {NURSERY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Target Crop</label>
                  <select
                    className={styles.select}
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                  >
                    {CROPS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Active Season</label>
                  <select
                    className={styles.select}
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                  >
                    {SEASONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION & SIZE */}
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Research Facility <span className={styles.required}>*</span></label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Central Research Farm"
                    value={facility}
                    onChange={(e) => setFacility(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Block / Plot ID <span className={styles.required}>*</span></label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. RS-24"
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.sizeSection}>
                <h4 className={styles.subTitle}>
                  <Grid size={15} />
                  <span>Planting Grid Sizing</span>
                </h4>
                <div className={styles.row}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Number of Rows</label>
                    <input
                      type="number"
                      className={styles.input}
                      min="1"
                      max="100"
                      value={rows}
                      onChange={(e) => setRows(e.target.value)}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Plants per Row</label>
                    <input
                      type="number"
                      className={styles.input}
                      min="1"
                      max="200"
                      value={plants}
                      onChange={(e) => setPlants(e.target.value)}
                    />
                  </div>
                </div>
                {rows && plants && (
                  <div className={styles.capacityText}>
                    This creates a layout plot map of <strong>{rows} rows</strong> and <strong>{plants} cells</strong>, totaling <strong>{totalCapacity.toLocaleString()} physical plant positions</strong>.
                  </div>
                )}
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <DatePicker
                    label="Sowing Date"
                    value={sownDate}
                    onChange={setSownDate}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <DatePicker
                    label="Expected Harvest Date"
                    value={harvestDate}
                    onChange={setHarvestDate}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PROGRAM & TEAM */}
          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Link Breeding Program</label>
                <select
                  className={styles.select}
                  value={linkedProgram}
                  onChange={(e) => setLinkedProgram(e.target.value)}
                >
                  <option value="">No Program (Generic Parental Block)</option>
                  {programOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <span className={styles.helperText}>Selects parent accessions dynamically based on the program</span>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Supervising Supervisor <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Dr. Anita Desai"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Additional Staff (comma-separated)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. S. Kulkarni, M. Verma"
                  value={additionalStaff}
                  onChange={(e) => setAdditionalStaff(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <div className={styles.reviewCard}>
                <h4 className={styles.reviewTitle}>Nursery configuration recap</h4>
                <div className={styles.reviewGrid}>
                  <div><strong>Block Name:</strong> {name}</div>
                  <div><strong>Nursery Type:</strong> {type}</div>
                  <div><strong>Crop:</strong> {crop}</div>
                  <div><strong>Season:</strong> {season}</div>
                  <div><strong>Location:</strong> {facility} (Block: {block})</div>
                  <div><strong>Grid Specs:</strong> {rows} rows x {plants} plants ({totalCapacity.toLocaleString()} slots)</div>
                  <div><strong>Sown Date:</strong> {sownDate || 'Planned'}</div>
                  {harvestDate && <div><strong>Harvest Date:</strong> {harvestDate}</div>}
                  <div><strong>Linked Program:</strong> {linkedProgram || 'None (Generic Reservoir)'}</div>
                  <div><strong>Supervisor:</strong> {supervisor}</div>
                  {additionalStaff && <div><strong>Assisting Staff:</strong> {additionalStaff}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className={styles.actions}>
            {currentStep > 0 && (
              <Button
                variant="secondary"
                type="button"
                onClick={handleBack}
                leftIcon={ArrowLeft}
              >
                Back
              </Button>
            )}
            
            <div className={styles.rightActions}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
              >
                Cancel
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleNext}
                  rightIcon={ArrowRight}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  type="submit"
                  leftIcon={Check}
                >
                  Create Nursery
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
