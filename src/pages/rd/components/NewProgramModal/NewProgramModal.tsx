import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, IndianRupee } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { DatePicker } from '@/components/common/DatePicker/DatePicker';
import { useToast } from '@/components/common/Toast/ToastContext';
import { BreedingProgram, BreedingObjective, ProgramStatus } from '@/types/rd';
import { formatIndianCurrency } from '@/utils/formatters';
import styles from './NewProgramModal.module.css';

interface NewProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProgram: (program: BreedingProgram) => void;
}

const OBJECTIVES: BreedingObjective[] = [
  'Yield improvement',
  'Disease resistance',
  'Stress tolerance',
  'Quality traits',
  'Hybrid development',
  'Variety release',
];

const CROPS = ['Cotton', 'Maize', 'Paddy', 'Sorghum', 'Sunflower', 'Soybean', 'Groundnut', 'Pearl millet', 'Tomato', 'Chilli'];

export const NewProgramModal: React.FC<NewProgramModalProps> = ({
  isOpen,
  onClose,
  onAddProgram,
}) => {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [crop, setCrop] = useState(CROPS[0]);
  const [objective, setObjective] = useState<BreedingObjective>(OBJECTIVES[0]);
  const [status, setStatus] = useState<ProgramStatus>('Planning');
  const [description, setDescription] = useState('');

  const [parentMale, setParentMale] = useState('');
  const [parentFemale, setParentFemale] = useState('');

  const [startDate, setStartDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [expectedEndDate, setExpectedEndDate] = useState<string | null>('');
  const [budget, setBudget] = useState('');

  const [leadBreeder, setLeadBreeder] = useState('');
  const [teamMembersInput, setTeamMembersInput] = useState('');

  const steps = [
    { key: 'basics', label: 'Basics' },
    { key: 'parents', label: 'Parents' },
    { key: 'timeline', label: 'Timeline & Budget' },
    { key: 'team', label: 'Team & Review' },
  ];

  const handleNext = () => {
    if (currentStep === 0 && !name.trim()) {
      addToast('Program name is required', 'warning');
      return;
    }
    if (currentStep === 2 && (!startDate || !budget)) {
      addToast('Start date and budget are required', 'warning');
      return;
    }
    if (currentStep === 3 && !leadBreeder.trim()) {
      addToast('Lead breeder is required', 'warning');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !budget || !leadBreeder.trim()) {
      addToast('Please fill in all required fields', 'warning');
      return;
    }

    const teamMembers = teamMembersInput
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const parsedBudget = parseFloat(budget) * 100000; // in Lakhs

    const newProgram: BreedingProgram = {
      id: `BP-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      name,
      crop,
      objective,
      description,
      status,
      startDate,
      expectedEndDate: expectedEndDate || new Date(new Date(startDate).setFullYear(new Date(startDate).getFullYear() + 5)).toISOString().split('T')[0],
      currentStage: 'P (parents)',
      leadBreeder,
      teamMembers,
      budget: parsedBudget,
      spentToDate: 0,
      parentMale: parentMale ? { accessionId: 'GRM-2026-MOCK', accessionName: parentMale } : undefined,
      parentFemale: parentFemale ? { accessionId: 'GRM-2026-MOCK', accessionName: parentFemale } : undefined,
      generations: [],
    };

    onAddProgram(newProgram);
    addToast(`Program ${newProgram.id} created successfully`, 'success');
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCurrentStep(0);
    setName('');
    setCrop(CROPS[0]);
    setObjective(OBJECTIVES[0]);
    setStatus('Planning');
    setDescription('');
    setParentMale('');
    setParentFemale('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setExpectedEndDate('');
    setBudget('');
    setLeadBreeder('');
    setTeamMembersInput('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Create Breeding Program"
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
                <label className={styles.label}>Program Name <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Drought-Tolerant Hybrid Maize Cycle 4"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
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
                  <label className={styles.label}>Breeding Objective</label>
                  <select
                    className={styles.select}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value as BreedingObjective)}
                  >
                    {OBJECTIVES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Initial Status</label>
                <select
                  className={styles.select}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProgramStatus)}
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="On hold">On hold</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Program Description</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Describe program goals, target ecological zones, and expected milestones..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* STEP 2: PARENTS */}
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <p className={styles.stepIntro}>
                Select the male and female breeding lines to initialize the hybridization cross.
              </p>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Parent Male (♂)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Enter accession code or variety name (e.g. Wagad Landrace)"
                  value={parentMale}
                  onChange={(e) => setParentMale(e.target.value)}
                />
                <span className={styles.helperText}>Select parents from germplasm catalog</span>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Parent Female (♀)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Enter accession code or variety name (e.g. Modern Hybrid H-12)"
                  value={parentFemale}
                  onChange={(e) => setParentFemale(e.target.value)}
                />
                <span className={styles.helperText}>Select parents from germplasm catalog</span>
              </div>
            </div>
          )}

          {/* STEP 3: TIMELINE & BUDGET */}
          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={setStartDate}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <DatePicker
                    label="Expected End Date"
                    value={expectedEndDate}
                    onChange={setExpectedEndDate}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Allocated Budget (in Lakhs INR) <span className={styles.required}>*</span></label>
                <div className={styles.currencyInputWrapper}>
                  <IndianRupee size={16} className={styles.currencyIcon} />
                  <input
                    type="number"
                    className={styles.currencyInput}
                    placeholder="e.g. 45"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    required
                  />
                </div>
                {budget && (
                  <span className={styles.helperText}>
                    Formated Budget: {formatIndianCurrency(parseFloat(budget) * 100000)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: TEAM & REVIEW */}
          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Lead Breeder <span className={styles.required}>*</span></label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Dr. Anita Desai"
                    value={leadBreeder}
                    onChange={(e) => setLeadBreeder(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Team Members (comma-separated)</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. S. Kulkarni, M. Verma"
                    value={teamMembersInput}
                    onChange={(e) => setTeamMembersInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Review card */}
              <div className={styles.reviewCard}>
                <h4 className={styles.reviewTitle}>Program summary</h4>
                <div className={styles.reviewGrid}>
                  <div><strong>Name:</strong> {name}</div>
                  <div><strong>Crop:</strong> {crop}</div>
                  <div><strong>Objective:</strong> {objective}</div>
                  <div><strong>Status:</strong> {status}</div>
                  <div><strong>Timeline:</strong> {startDate} to {expectedEndDate || 'Generational'}</div>
                  <div><strong>Budget:</strong> {budget ? formatIndianCurrency(parseFloat(budget) * 100000) : '₹0'}</div>
                  <div><strong>Lead Breeder:</strong> {leadBreeder}</div>
                  {parentMale && <div><strong>Parent Male:</strong> {parentMale}</div>}
                  {parentFemale && <div><strong>Parent Female:</strong> {parentFemale}</div>}
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
                  Save Program
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
