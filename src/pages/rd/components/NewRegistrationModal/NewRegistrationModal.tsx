import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Check, FileText, Award } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { DatePicker } from '@/components/common/DatePicker/DatePicker';
import { useToast } from '@/components/common/Toast/ToastContext';
import { Variety, VarietyRegistration, RegStatus, DUSTestStatus } from '@/types/rd';
import styles from './NewRegistrationModal.module.css';

interface NewRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  varieties: Variety[];
  onAddRegistration: (registration: VarietyRegistration) => void;
}

const APP_TYPES = [
  { key: 'PPV&FRA', label: 'PPV&FRA Filing', desc: 'Protection of Plant Varieties & Farmers Rights Act (India)', validity: 15, fee: 15000 },
  { key: 'UPOV', label: 'UPOV Convention', desc: 'International Union for the Protection of New Varieties of Plants', validity: 20, fee: 35000 },
  { key: 'CSC', label: 'Central Seed Committee (CSC)', desc: 'National variety notification and release for sales (India)', validity: 10, fee: 5000 },
  { key: 'Patent', label: 'Patent Application', desc: 'Standard industrial patent protection for novel genetic elements', validity: 20, fee: 25000 },
  { key: 'GMO biosafety', label: 'GMO Biosafety Clearance', desc: 'GEAC regulatory approval for transgenic trait varieties', validity: 10, fee: 50000 },
] as const;

export const NewRegistrationModal: React.FC<NewRegistrationModalProps> = ({
  isOpen,
  onClose,
  varieties,
  onAddRegistration,
}) => {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // Filter out pre-release and released varieties
  const eligibleVarieties = varieties.filter(
    v => v.status === 'Released' || v.status === 'Pre-release'
  );

  // --- Step 1: Variety Selection ---
  const [selectedVarietyId, setSelectedVarietyId] = useState('');
  const selectedVariety = varieties.find(v => v.id === selectedVarietyId) || null;

  // --- Step 2: Application Details ---
  const [appType, setAppType] = useState<typeof APP_TYPES[number]['key']>('PPV&FRA');
  const [appNo, setAppNo] = useState('');
  const [filedDate, setFiledDate] = useState<string | null>(null);
  const [validityYears, setValidityYears] = useState('15');
  const [applicant, setApplicant] = useState('SeedFlow Biosciences Pvt Ltd');
  const [submittedBy, setSubmittedBy] = useState('Dr. Anita Desai');

  // --- Step 3: DUS Testing Plan ---
  const [dusLocationsInput, setDusLocationsInput] = useState('Hyderabad, Coimbatore');
  const [selectedYears, setSelectedYears] = useState<string[]>(['Year 1', 'Year 2']);
  const [dusStatus, setDusStatus] = useState<DUSTestStatus>('Not started');

  // --- Step 4: Documents & Fees ---
  const [appFee, setAppFee] = useState('15000');
  const [paymentStatus, setPaymentStatus] = useState<'Unpaid' | 'Paid'>('Paid');

  const steps = [
    { key: 'variety', label: 'Select Variety' },
    { key: 'details', label: 'Application Type' },
    { key: 'dus', label: 'DUS Trial Plan' },
    { key: 'documents', label: 'Documents & Fees' },
    { key: 'review', label: 'Review & Submit' },
  ];

  // Auto-fill parameters when application type changes
  useEffect(() => {
    const config = APP_TYPES.find(t => t.key === appType);
    if (config) {
      setValidityYears(config.validity.toString());
      setAppFee(config.fee.toString());
    }
  }, [appType]);

  // Set default variety on load
  useEffect(() => {
    if (eligibleVarieties.length > 0 && !selectedVarietyId) {
      setSelectedVarietyId(eligibleVarieties[0].id);
    }
  }, [eligibleVarieties, selectedVarietyId]);

  const handleNext = () => {
    if (currentStep === 0 && !selectedVarietyId) {
      addToast('Please select a target variety to register', 'warning');
      return;
    }
    if (currentStep === 1 && (!applicant.trim() || !submittedBy.trim())) {
      addToast('Applicant and Submitted By fields are required', 'warning');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const toggleYear = (yr: string) => {
    setSelectedYears(prev =>
      prev.includes(yr) ? prev.filter(y => y !== yr) : [...prev, yr]
    );
  };

  const handleSubmit = (statusToSet: RegStatus) => {
    if (!selectedVariety) return;

    const dusLocations = dusLocationsInput
      .split(',')
      .map(l => l.trim())
      .filter(Boolean);

    const newReg: VarietyRegistration = {
      id: `REG-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      varietyRef: selectedVariety.id,
      varietyName: selectedVariety.name,
      applicationType: appType,
      applicationNumber: appNo || undefined,
      status: statusToSet,
      filedDate: filedDate || undefined,
      validityYears: parseInt(validityYears) || undefined,
      dusStatus,
      dusLocations: dusLocations.length > 0 ? dusLocations : undefined,
      dusYears: selectedYears,
      applicant,
      submittedBy,
      documents: [
        { name: 'Application Form 1A.pdf', uploadedAt: new Date().toISOString().split('T')[0], type: 'Application' }
      ],
      fees: {
        applicationFee: parseFloat(appFee) || 0,
        testingFee: appType === 'PPV&FRA' || appType === 'UPOV' ? 50000 : 0
      },
      timeline: [
        { stage: 'Application Formulated', date: new Date().toISOString().split('T')[0], user: submittedBy, comment: 'Initial filing package compiled' }
      ]
    };

    onAddRegistration(newReg);
    addToast(`Filing ${newReg.id} recorded as ${statusToSet}`, 'success');
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCurrentStep(0);
    setSelectedVarietyId(eligibleVarieties[0]?.id || '');
    setAppType('PPV&FRA');
    setAppNo('');
    setFiledDate(null);
    setValidityYears('15');
    setApplicant('SeedFlow Biosciences Pvt Ltd');
    setSubmittedBy('Dr. Anita Desai');
    setDusLocationsInput('Hyderabad, Coimbatore');
    setSelectedYears(['Year 1', 'Year 2']);
    setDusStatus('Not started');
    setAppFee('15000');
    setPaymentStatus('Paid');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Initiate Variety Registration"
      size="lg"
    >
      <div className={styles.modalContent}>
        <div className={styles.stepperWrapper}>
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        <div className={styles.formContainer}>
          {/* STEP 1: VARIETY SELECTION */}
          {currentStep === 0 && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Select Candidate Variety for Registration</h3>
              <p className={styles.stepDescription}>
                Only varieties verified as "Pre-release" or commercial "Released" qualify for official agency filings.
              </p>
              
              <div className={styles.inputGroup}>
                <label className={styles.label}>Select Variety</label>
                <select
                  className={styles.select}
                  value={selectedVarietyId}
                  onChange={(e) => setSelectedVarietyId(e.target.value)}
                >
                  {eligibleVarieties.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.id})</option>
                  ))}
                  {eligibleVarieties.length === 0 && (
                    <option value="">No qualifying varieties available</option>
                  )}
                </select>
              </div>

              {selectedVariety && (
                <div className={styles.varietyBriefCard}>
                  <div className={styles.briefHeader}>
                    <div>
                      <h4 className={styles.briefName}>{selectedVariety.name}</h4>
                      <span className={styles.briefId}>{selectedVariety.id}</span>
                    </div>
                    <span className={styles.briefCrop}>{selectedVariety.crop} · {selectedVariety.category}</span>
                  </div>
                  <div className={styles.briefGrid}>
                    <div className={styles.briefItem}>
                      <span className={styles.briefLabel}>Status</span>
                      <strong className={styles.briefVal}>{selectedVariety.status}</strong>
                    </div>
                    <div className={styles.briefItem}>
                      <span className={styles.briefLabel}>Yield potential</span>
                      <strong className={styles.briefVal}>{selectedVariety.agronomicSpecs.yieldPotential} q/ha</strong>
                    </div>
                    <div className={styles.briefItem}>
                      <span className={styles.briefLabel}>Pedigree (♂ × ♀)</span>
                      <strong className={styles.briefVal}>{selectedVariety.parentLines?.male} × {selectedVariety.parentLines?.female}</strong>
                    </div>
                    <div className={styles.briefItem}>
                      <span className={styles.briefLabel}>Key Traits</span>
                      <span className={styles.briefTraits}>{selectedVariety.keyTraits.slice(0, 2).join(', ')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: APPLICATION DETAILS */}
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Regulatory Authority & Applicant Specifications</h3>
              <div className={styles.formSection}>
                <label className={styles.label}>Application Authority Type</label>
                <div className={styles.radioGrid}>
                  {APP_TYPES.map((type) => (
                    <label key={type.key} className={styles.radioItem}>
                      <input
                        type="radio"
                        name="appType"
                        checked={appType === type.key}
                        onChange={() => setAppType(type.key)}
                        className={styles.radioInput}
                      />
                      <div className={styles.radioContent}>
                        <strong className={styles.radioLabelText}>{type.label}</strong>
                        <span className={styles.radioDesc}>{type.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Authority Application # (Optional)</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. APP/CT/2026/089"
                    value={appNo}
                    onChange={(e) => setAppNo(e.target.value)}
                  />
                  <span className={styles.helperText}>Leave blank if draft pre-filing</span>
                </div>

                <div className={styles.inputGroup}>
                  <DatePicker
                    label="Filing Submission Date (Optional)"
                    value={filedDate}
                    onChange={setFiledDate}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Protection Validity Period</label>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      className={styles.input}
                      value={validityYears}
                      onChange={(e) => setValidityYears(e.target.value)}
                      min="1"
                    />
                    <span className={styles.unit}>years</span>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Applicant Corporate Entity</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={applicant}
                    onChange={(e) => setApplicant(e.target.value)}
                  />
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Responsible Technical Officer</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={submittedBy}
                    onChange={(e) => setSubmittedBy(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DUS TRIAL PLAN */}
          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>DUS Field Testing Trial Design</h3>
              <p className={styles.stepDescription}>Plan the multi-site DUS tests required for official registration verification.</p>
              
              <div className={styles.formGrid}>
                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Planned Trial Stations (Comma-separated)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={dusLocationsInput}
                    onChange={(e) => setDusLocationsInput(e.target.value)}
                    placeholder="e.g. Hyderabad Farm, Coimbatore Station, Dharwad Block"
                  />
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Trial Evaluation Cycles</label>
                  <div className={styles.chipGrid}>
                    {['Year 1', 'Year 2', 'Year 3'].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        className={`${styles.selectionBtn} ${selectedYears.includes(yr) ? styles.active : ''}`}
                        onClick={() => toggleYear(yr)}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Current DUS Evaluation Status</label>
                  <select
                    className={styles.select}
                    value={dusStatus}
                    onChange={(e) => setDusStatus(e.target.value as DUSTestStatus)}
                  >
                    <option value="Not started">Not started</option>
                    <option value="In progress">In progress</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                    <option value="Re-test required">Re-test required</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: DOCUMENTS & FEES */}
          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Filing Fees & Compliance Document Packages</h3>
              
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Filing Authority Fee</label>
                  <div className={styles.inputWithUnit}>
                    <span className={styles.rupeePrefix}>₹</span>
                    <input
                      type="number"
                      className={styles.input}
                      style={{ paddingLeft: '24px' }}
                      value={appFee}
                      onChange={(e) => setAppFee(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Payment Status</label>
                  <div className={styles.toggleGrid}>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${paymentStatus === 'Paid' ? styles.activePaid : ''}`}
                      onClick={() => setPaymentStatus('Paid')}
                    >
                      Paid
                    </button>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${paymentStatus === 'Unpaid' ? styles.activeUnpaid : ''}`}
                      onClick={() => setPaymentStatus('Unpaid')}
                    >
                      Unpaid
                    </button>
                  </div>
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Filing Documents Package (Mock)</label>
                  <div className={styles.uploadArea}>
                    <FileText size={32} className={styles.uploadIcon} />
                    <p className={styles.uploadText}>
                      Drag and drop official <strong>Technical Questionnaire</strong> or <strong>Application Form 1A</strong>
                    </p>
                    <span className={styles.uploadHelper}>Supports PDF, DOCX up to 10MB</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & SUBMIT */}
          {currentStep === 4 && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Final Application Filing Review</h3>
              
              <div className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <div>
                    <h4 className={styles.reviewVariety}>{selectedVariety?.name || 'Selected Variety'}</h4>
                    <span className={styles.reviewMeta}>Category: {appType} Filing · Target Validity: {validityYears} Years</span>
                  </div>
                  <span className={styles.reviewStatus}>Draft Review</span>
                </div>

                <div className={styles.reviewGrid}>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Applicant Corporate Entity</span>
                    <span className={styles.reviewVal}>{applicant}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Filing Representative</span>
                    <span className={styles.reviewVal}>{submittedBy}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>DUS Trial Sites</span>
                    <span className={styles.reviewVal}>{dusLocationsInput || 'None specified'}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Filing Fee Amount</span>
                    <span className={styles.reviewVal}>₹{parseFloat(appFee).toLocaleString('en-IN')} ({paymentStatus})</span>
                  </div>
                </div>
              </div>

              <div className={styles.reviewAlert}>
                <Award size={18} />
                <span>Confirming registration triggers an audit-trail milestone event for authority DUS field trials.</span>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className={styles.formActions}>
            {currentStep > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
                leftIcon={ArrowLeft}
              >
                Back
              </Button>
            )}
            
            <div className={styles.rightActions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
              >
                Cancel
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
                  rightIcon={ArrowRight}
                >
                  Next
                </Button>
              ) : (
                <div className={styles.submitRow}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleSubmit('Draft')}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    leftIcon={Check}
                    onClick={() => handleSubmit('Submitted')}
                  >
                    Submit Application
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
