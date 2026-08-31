import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Shield, Lock, EyeOff } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { useToast } from '@/components/common/Toast/ToastContext';
import { Variety, VarietyStatus, IPProtection, AgroClimaticZone } from '@/types/rd';
import styles from './NewVarietyModal.module.css';

interface NewVarietyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVariety: (variety: Variety) => void;
}

const CROPS = [
  'Cotton', 'Maize', 'Paddy', 'Sorghum', 'Sunflower', 
  'Soybean', 'Groundnut', 'Pearl millet', 'Tomato', 'Chilli', 'Pulses'
];

const CATEGORIES = ['Hybrid', 'Open-pollinated', 'Composite', 'Synthetic'] as const;

const IP_PROTECTIONS: IPProtection[] = [
  'None',
  'PVP (Plant variety protection)',
  'Patent',
  'Trade secret'
];

const ZONES: AgroClimaticZone[] = [
  'North-West plains', 'Western dry', 'Central plateau', 'Eastern plateau',
  'Southern peninsular', 'Hill region', 'Coastal', 'North-East'
];

const SEASONS = ['Kharif', 'Rabi', 'Zaid'];

export const NewVarietyModal: React.FC<NewVarietyModalProps> = ({
  isOpen,
  onClose,
  onAddVariety,
}) => {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // --- Step 1: Basics ---
  const [name, setName] = useState('');
  const [crop, setCrop] = useState(CROPS[0]);
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('Hybrid');
  const [status, setStatus] = useState<VarietyStatus>('Candidate');
  const [programRef, setProgramRef] = useState('');
  const [parentMale, setParentMale] = useState('');
  const [parentFemale, setParentFemale] = useState('');

  // --- Step 2: Agronomic Specs ---
  const [daysToMaturity, setDaysToMaturity] = useState('120');
  const [plantHeight, setPlantHeight] = useState('110');
  const [yieldPotential, setYieldPotential] = useState('25');
  const [seedRate, setSeedRate] = useState('8');

  // --- Step 3: Quality Specs ---
  const [germinationMin, setGerminationMin] = useState('80');
  const [physicalPurityMin, setPhysicalPurityMin] = useState('98');
  const [geneticPurityMin, setGeneticPurityMin] = useState('95');
  const [moistureMax, setMoistureMax] = useState('10');

  // --- Step 4: Adaptation & IP ---
  const [selectedZones, setSelectedZones] = useState<AgroClimaticZone[]>(['Southern peninsular']);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(['Kharif']);
  const [targetMarketsInput, setTargetMarketsInput] = useState('Telangana, Andhra Pradesh');
  const [keyTraitsInput, setKeyTraitsInput] = useState('High yield, Disease resistant');
  const [ipProtection, setIpProtection] = useState<IPProtection>('None');
  const [mltTrialsInput, setMltTrialsInput] = useState('');

  // --- Step 5: Notes & Review ---
  const [notes, setNotes] = useState('');

  const steps = [
    { key: 'basics', label: 'Basics' },
    { key: 'agronomy', label: 'Agronomic' },
    { key: 'quality', label: 'Quality' },
    { key: 'adaptation', label: 'Adaptation & IP' },
    { key: 'review', label: 'Review' },
  ];

  const handleNext = () => {
    if (currentStep === 0 && !name.trim()) {
      addToast('Variety name is required', 'warning');
      return;
    }
    if (currentStep === 1) {
      if (!daysToMaturity || !plantHeight || !yieldPotential || !seedRate) {
        addToast('All agronomic specifications are required', 'warning');
        return;
      }
    }
    if (currentStep === 2) {
      if (!germinationMin || !physicalPurityMin || !geneticPurityMin || !moistureMax) {
        addToast('All quality specifications are required', 'warning');
        return;
      }
    }
    if (currentStep === 3) {
      if (selectedZones.length === 0) {
        addToast('At least one recommended agro-climatic zone is required', 'warning');
        return;
      }
      if (selectedSeasons.length === 0) {
        addToast('At least one recommended season is required', 'warning');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const toggleZone = (zone: AgroClimaticZone) => {
    setSelectedZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
    );
  };

  const toggleSeason = (season: string) => {
    setSelectedSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const targetMarkets = targetMarketsInput
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const keyTraits = keyTraitsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const multiLocationTrialRefs = mltTrialsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newVariety: Variety = {
      id: `VAR-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      name,
      crop,
      category,
      status,
      parentMale: parentMale || 'Parent Line M',
      parentFemale: parentFemale || 'Parent Line F',
      parentLines: {
        male: parentMale || 'M-Line',
        female: parentFemale || 'F-Line',
      },
      programRef: programRef || undefined,
      ipProtection,
      recommendedZones: selectedZones,
      recommendedSeasons: selectedSeasons,
      targetMarkets,
      agronomicSpecs: {
        daysToMaturity: parseInt(daysToMaturity) || 0,
        plantHeight: parseInt(plantHeight) || 0,
        yieldPotential: parseFloat(yieldPotential) || 0,
        seedRate: parseFloat(seedRate) || 0,
      },
      qualitySpecs: {
        germinationMin: parseInt(germinationMin) || 0,
        physicalPurityMin: parseInt(physicalPurityMin) || 0,
        geneticPurityMin: parseInt(geneticPurityMin) || 0,
        moistureMax: parseInt(moistureMax) || 0,
      },
      keyTraits,
      multiLocationTrialRefs,
      releaseDocuments: [],
      notes: notes || undefined,
    };

    onAddVariety(newVariety);
    addToast(`Variety ${newVariety.id} created successfully`, 'success');
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCurrentStep(0);
    setName('');
    setCrop(CROPS[0]);
    setCategory('Hybrid');
    setStatus('Candidate');
    setProgramRef('');
    setParentMale('');
    setParentFemale('');
    setDaysToMaturity('120');
    setPlantHeight('110');
    setYieldPotential('25');
    setSeedRate('8');
    setGerminationMin('80');
    setPhysicalPurityMin('98');
    setGeneticPurityMin('95');
    setMoistureMax('10');
    setSelectedZones(['Southern peninsular']);
    setSelectedSeasons(['Kharif']);
    setTargetMarketsInput('Telangana, Andhra Pradesh');
    setKeyTraitsInput('High yield, Disease resistant');
    setIpProtection('None');
    setMltTrialsInput('');
    setNotes('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Register New Variety"
      size="lg"
    >
      <div className={styles.modalContent}>
        <div className={styles.stepperWrapper}>
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          {/* STEP 1: BASICS */}
          {currentStep === 0 && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Variety Identification & Lineage</h3>
              <div className={styles.formGrid}>
                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Variety Name <span className={styles.required}>*</span></label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. SeedFlow Cotton Bt-102"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Crop Type <span className={styles.required}>*</span></label>
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
                  <label className={styles.label}>Status <span className={styles.required}>*</span></label>
                  <select
                    className={styles.select}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as VarietyStatus)}
                  >
                    <option value="Candidate">Candidate</option>
                    <option value="Pre-release">Pre-release</option>
                    <option value="Released">Released</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Category <span className={styles.required}>*</span></label>
                  <div className={styles.radioGrid}>
                    {CATEGORIES.map((cat) => (
                      <label key={cat} className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="category"
                          checked={category === cat}
                          onChange={() => setCategory(cat)}
                          className={styles.radioInput}
                        />
                        <span>{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Parent Line ♂ (Male)</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. M-102"
                    value={parentMale}
                    onChange={(e) => setParentMale(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Parent Line ♀ (Female)</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. F-085"
                    value={parentFemale}
                    onChange={(e) => setParentFemale(e.target.value)}
                  />
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Breeding Program Reference (BP-XXXX)</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. BP-2025-012 (Optional)"
                    value={programRef}
                    onChange={(e) => setProgramRef(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AGRONOMIC SPECS */}
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Agronomic Performance Targets</h3>
              <p className={styles.stepDescription}>Specify the agronomic standards for this variety measured under trials.</p>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Days to Maturity <span className={styles.required}>*</span></label>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      className={styles.input}
                      value={daysToMaturity}
                      onChange={(e) => setDaysToMaturity(e.target.value)}
                      min="1"
                      required
                    />
                    <span className={styles.unit}>days</span>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Plant Height <span className={styles.required}>*</span></label>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      className={styles.input}
                      value={plantHeight}
                      onChange={(e) => setPlantHeight(e.target.value)}
                      min="1"
                      required
                    />
                    <span className={styles.unit}>cm</span>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Yield Potential <span className={styles.required}>*</span></label>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      className={styles.input}
                      value={yieldPotential}
                      onChange={(e) => setYieldPotential(e.target.value)}
                      min="0.1"
                      step="0.1"
                      required
                    />
                    <span className={styles.unit}>q/ha</span>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Sowing Seed Rate <span className={styles.required}>*</span></label>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      className={styles.input}
                      value={seedRate}
                      onChange={(e) => setSeedRate(e.target.value)}
                      min="0.1"
                      step="0.1"
                      required
                    />
                    <span className={styles.unit}>kg/ha</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: QUALITY SPECS */}
          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>ISTA Lab Quality Minimum Thresholds</h3>
              <p className={styles.stepDescription}>Declare the minimum seed quality thresholds required for batch approval.</p>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Minimum Germination <span className={styles.required}>*</span></label>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      className={styles.input}
                      value={germinationMin}
                      onChange={(e) => setGerminationMin(e.target.value)}
                      min="1"
                      max="100"
                      required
                    />
                    <span className={styles.unit}>%</span>
                  </div>
                  <span className={styles.helperText}>ISTA Standard min: 70-80%</span>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Physical Purity <span className={styles.required}>*</span></label>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      className={styles.input}
                      value={physicalPurityMin}
                      onChange={(e) => setPhysicalPurityMin(e.target.value)}
                      min="1"
                      max="100"
                      required
                    />
                    <span className={styles.unit}>%</span>
                  </div>
                  <span className={styles.helperText}>ISTA Standard min: 98%</span>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Genetic Purity <span className={styles.required}>*</span></label>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      className={styles.input}
                      value={geneticPurityMin}
                      onChange={(e) => setGeneticPurityMin(e.target.value)}
                      min="1"
                      max="100"
                      required
                    />
                    <span className={styles.unit}>%</span>
                  </div>
                  <span className={styles.helperText}>Standard min: 95%</span>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Maximum Moisture <span className={styles.required}>*</span></label>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      className={styles.input}
                      value={moistureMax}
                      onChange={(e) => setMoistureMax(e.target.value)}
                      min="1"
                      max="100"
                      required
                    />
                    <span className={styles.unit}>%</span>
                  </div>
                  <span className={styles.helperText}>ISTA Standard max: 10-12%</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: ADAPTATION & IP */}
          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Environmental Adaptation & Intellectual Property</h3>
              <div className={styles.formSection}>
                <label className={styles.label}>Recommended Agro-Climatic Zones <span className={styles.required}>*</span></label>
                <div className={styles.checkboxGrid}>
                  {ZONES.map((zone) => (
                    <button
                      key={zone}
                      type="button"
                      className={`${styles.selectionButton} ${selectedZones.includes(zone) ? styles.active : ''}`}
                      onClick={() => toggleZone(zone)}
                    >
                      {zone}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formSection}>
                <label className={styles.label}>Recommended Seasons <span className={styles.required}>*</span></label>
                <div className={styles.checkboxGrid}>
                  {SEASONS.map((season) => (
                    <button
                      key={season}
                      type="button"
                      className={`${styles.selectionButton} ${selectedSeasons.includes(season) ? styles.active : ''}`}
                      onClick={() => toggleSeason(season)}
                    >
                      {season}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Target State Markets (Comma-separated)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={targetMarketsInput}
                    onChange={(e) => setTargetMarketsInput(e.target.value)}
                    placeholder="e.g. Telangana, Maharashtra, Gujarat"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Key Traits / Breeding Markers (Comma-separated)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={keyTraitsInput}
                    onChange={(e) => setKeyTraitsInput(e.target.value)}
                    placeholder="e.g. Drought resistant, Stem borer resistant"
                  />
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Intellectual Property (IP) Protection</label>
                  <div className={styles.ipRadioGrid}>
                    {IP_PROTECTIONS.map((ip) => (
                      <label key={ip} className={styles.ipRadioLabel}>
                        <input
                          type="radio"
                          name="ipProtection"
                          checked={ipProtection === ip}
                          onChange={() => setIpProtection(ip)}
                          className={styles.radioInput}
                        />
                        <div className={styles.ipRadioContent}>
                          {ip.startsWith('PVP') ? <Shield size={16} /> : ip === 'Patent' ? <Lock size={16} /> : ip === 'Trade secret' ? <EyeOff size={16} /> : null}
                          <span>{ip}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Multi-Location Trial (MLT) IDs (Comma-separated)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={mltTrialsInput}
                    onChange={(e) => setMltTrialsInput(e.target.value)}
                    placeholder="e.g. TRL-2024-001, TRL-2025-012"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: NOTES & REVIEW */}
          {currentStep === 4 && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Variety Registration Summary</h3>
              <div className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <div>
                    <h4 className={styles.reviewName}>{name || 'Unnamed Variety'}</h4>
                    <span className={styles.reviewSub}>{crop} · {category} · Status: {status}</span>
                  </div>
                  <span className={styles.reviewIp}>{ipProtection}</span>
                </div>

                <div className={styles.reviewGrid}>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Maturity Cycle</span>
                    <span className={styles.reviewVal}>{daysToMaturity} days</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Yield Potential</span>
                    <span className={styles.reviewVal}>{yieldPotential} q/ha</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Pedigree (♂ × ♀)</span>
                    <span className={styles.reviewVal}>{parentMale || 'M-Line'} × {parentFemale || 'F-Line'}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Adaptation Zones</span>
                    <span className={styles.reviewVal}>{selectedZones.join(', ')}</span>
                  </div>
                </div>
              </div>

              <div className={styles.inputGroup} style={{ marginTop: '20px' }}>
                <label className={styles.label}>Breeder Review Notes</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Provide additional botanical descriptors or notes regarding adaptation and pedigree traits..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
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
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={Check}
                >
                  Create Variety
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
