import React, { useState, useMemo } from 'react';
import { ArrowRight, ArrowLeft, Check, Plus, Trash2, Calendar, MapPin, Grid, Layers } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { DatePicker } from '@/components/common/DatePicker/DatePicker';
import { useToast } from '@/components/common/Toast/ToastContext';
import { Trial, TrialType, TrialDesign, TrialEntry, TrialLocation, AgroClimaticZone } from '@/types/rd';
import { generatePlotMap, generateEnvData } from '../../mockData/trialsData';
import styles from './NewTrialModal.module.css';

interface NewTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrial: (trial: Trial) => void;
}

const CROPS = ['Cotton', 'Maize', 'Paddy', 'Sunflower', 'Sorghum', 'Soybean', 'Wheat'];
const DESIGNS: TrialDesign[] = ['RCBD', 'CRD', 'Alpha-lattice', 'Augmented', 'Split-plot'];
const TYPES: TrialType[] = ['Single-location', 'Multi-location', 'On-farm', 'Demonstration'];
const SEASONS = ['Kharif 2026', 'Rabi 2026-27', 'Summer 2026'];

const MOCK_LOCATIONS = [
  { id: 'TLOC-001', name: 'Hyderabad Research Farm', state: 'Telangana', agroClimaticZone: 'Southern peninsular' as AgroClimaticZone, lat: 17.3850, lng: 78.4867, alt: 536, soil: 'Black cotton soil', rain: 750 },
  { id: 'TLOC-002', name: 'Coimbatore Station', state: 'Tamil Nadu', agroClimaticZone: 'Southern peninsular' as AgroClimaticZone, lat: 11.0168, lng: 76.9558, alt: 411, soil: 'Red sandy loam', rain: 680 },
  { id: 'TLOC-003', name: 'Pune Center', state: 'Maharashtra', agroClimaticZone: 'Central plateau' as AgroClimaticZone, lat: 18.5204, lng: 73.8567, alt: 560, soil: 'Medium black soil', rain: 720 },
  { id: 'TLOC-004', name: 'Ludhiana Station', state: 'Punjab', agroClimaticZone: 'North-West plains' as AgroClimaticZone, lat: 30.9010, lng: 75.8573, alt: 244, soil: 'Alluvial soil', rain: 600 },
  { id: 'TLOC-005', name: 'Bhopal Center', state: 'Madhya Pradesh', agroClimaticZone: 'Central plateau' as AgroClimaticZone, lat: 23.2599, lng: 77.4126, alt: 500, soil: 'Clayey soil', rain: 950 },
  { id: 'TLOC-006', name: 'Dharwad Farm', state: 'Karnataka', agroClimaticZone: 'Southern peninsular' as AgroClimaticZone, lat: 15.4589, lng: 75.0078, alt: 678, soil: 'Black soil', rain: 800 },
  { id: 'TLOC-007', name: 'Karnal Station', state: 'Haryana', agroClimaticZone: 'North-West plains' as AgroClimaticZone, lat: 29.6857, lng: 76.9907, alt: 228, soil: 'Rich loam', rain: 620 },
];

export const NewTrialModal: React.FC<NewTrialModalProps> = ({ isOpen, onClose, onAddTrial }) => {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // --- Step 1: Basics ---
  const [name, setName] = useState('');
  const [crop, setCrop] = useState(CROPS[0]);
  const [type, setType] = useState<TrialType>('Multi-location');
  const [design, setDesign] = useState<TrialDesign>('RCBD');
  const [season, setSeason] = useState(SEASONS[0]);
  const [replications, setReplications] = useState(3);
  const [leadResearcher, setLeadResearcher] = useState('');
  const [objectiveInput, setObjectiveInput] = useState('');
  const [objectives, setObjectives] = useState<string[]>(['Evaluate yield under dryland conditions']);

  // --- Step 2: Entries ---
  const [entryName, setEntryName] = useState('');
  const [entryType, setEntryType] = useState<'Candidate' | 'Check' | 'Control'>('Candidate');
  const [entrySource, setEntrySource] = useState('In-house breeding');
  const [entries, setEntries] = useState<TrialEntry[]>([
    { code: 'E01', name: 'Candidate CL-2025-08', type: 'Candidate', source: 'In-house breeding' },
    { code: 'E02', name: 'Candidate CL-2025-12', type: 'Candidate', source: 'In-house breeding' },
    { code: 'E03', name: 'Check Variety Bt-102', type: 'Check', source: 'Standard Check' },
  ]);

  // --- Step 3: Locations ---
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(['TLOC-001', 'TLOC-002', 'TLOC-003']);

  // --- Step 4: Plot Design ---
  const [randomizationSeed, setRandomizationSeed] = useState(1);
  const totalPlotsCount = useMemo(() => {
    return entries.length * replications * selectedLocationIds.length;
  }, [entries.length, replications, selectedLocationIds.length]);

  // Randomize layouts preview grid
  const previewPlots = useMemo(() => {
    const arr: string[] = [];
    selectedLocationIds.forEach((locId) => {
      const loc = MOCK_LOCATIONS.find((l) => l.id === locId);
      if (!loc) return;
      for (let r = 1; r <= replications; r++) {
        entries.forEach((e) => {
          arr.push(`${loc.name.split(' ')[0]} - Rep ${r} - ${e.code}`);
        });
      }
    });
    // Deterministic shuffle using seed state
    return [...arr].sort(() => 0.5 - (Math.sin(randomizationSeed) * 0.5));
  }, [entries, selectedLocationIds, replications, randomizationSeed]);

  // --- Step 5: Schedule & Review ---
  const [startDate, setStartDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [expectedHarvest, setExpectedHarvest] = useState<string | null>('');
  const [notes, setNotes] = useState('');

  const steps = [
    { key: 'basics', label: 'Basics' },
    { key: 'entries', label: 'Entries' },
    { key: 'locations', label: 'Locations' },
    { key: 'design', label: 'Plot Design' },
    { key: 'review', label: 'Schedule & Review' },
  ];

  const handleAddObjective = () => {
    if (objectiveInput.trim()) {
      setObjectives([...objectives, objectiveInput.trim()]);
      setObjectiveInput('');
    }
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleAddEntry = () => {
    if (!entryName.trim()) {
      addToast('Entry name is required', 'warning');
      return;
    }
    const nextCode = `E${String(entries.length + 1).padStart(2, '0')}`;
    const newEntry: TrialEntry = {
      code: nextCode,
      name: entryName.trim(),
      type: entryType,
      source: entrySource.trim() || 'Internal Program',
    };
    setEntries([...entries, newEntry]);
    setEntryName('');
    setEntrySource('In-house breeding');
  };

  const handleRemoveEntry = (code: string) => {
    const filtered = entries.filter((e) => e.code !== code);
    // Reindex codes
    const reindexed = filtered.map((e, idx) => ({
      ...e,
      code: `E${String(idx + 1).padStart(2, '0')}`,
    }));
    setEntries(reindexed);
  };

  const handleToggleLocation = (id: string) => {
    if (type === 'Single-location' || type === 'On-farm' || type === 'Demonstration') {
      setSelectedLocationIds([id]);
    } else {
      if (selectedLocationIds.includes(id)) {
        setSelectedLocationIds(selectedLocationIds.filter((item) => item !== id));
      } else {
        setSelectedLocationIds([...selectedLocationIds, id]);
      }
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!name.trim()) {
        addToast('Trial name is required', 'warning');
        return;
      }
      if (!leadResearcher.trim()) {
        addToast('Lead researcher is required', 'warning');
        return;
      }
      if (replications < 1 || replications > 6) {
        addToast('Replications must be between 1 and 6', 'warning');
        return;
      }
    }

    if (currentStep === 1) {
      if (entries.length < 3) {
        addToast('A minimum of 3 trial entries is required', 'warning');
        return;
      }
    }

    if (currentStep === 2) {
      if (selectedLocationIds.length === 0) {
        addToast('Please select at least one location', 'warning');
        return;
      }
      if (type === 'Multi-location' && selectedLocationIds.length < 3) {
        addToast('Multi-location trials require at least 3 locations', 'warning');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleRandomizeLayout = () => {
    setRandomizationSeed((s) => s + 1);
    addToast('Randomized entry replication layout blocks', 'info');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !startDate || !leadResearcher.trim()) {
      addToast('Please fill in all required fields', 'warning');
      return;
    }

    const calculatedHarvest = expectedHarvest || new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 5)).toISOString().split('T')[0];

    const trialLocations: TrialLocation[] = selectedLocationIds.map((locId) => {
      const loc = MOCK_LOCATIONS.find((l) => l.id === locId)!;
      return {
        id: loc.id,
        name: loc.name,
        state: loc.state,
        agroClimaticZone: loc.agroClimaticZone,
        coordinates: { latitude: loc.lat, longitude: loc.lng, altitude: loc.alt },
        soilType: loc.soil,
        rainfall: loc.rain,
        fieldStaff: 'District Agronomist',
        status: 'Planned',
        observations: 0,
        pendingObservations: entries.length * replications * 2, // e.g. Height, Yield
        plotMap: generatePlotMap(entries, replications, 'Planned'),
        environmentalData: generateEnvData(startDate, 120),
      };
    });

    const newTrial: Trial = {
      id: `TRL-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      name,
      crop,
      type,
      design,
      season,
      startDate,
      expectedHarvest: calculatedHarvest,
      leadResearcher,
      objectives,
      entries,
      locations: trialLocations,
      replications,
      totalPlots: totalPlotsCount,
      status: 'Planning',
      notes,
    };

    onAddTrial(newTrial);
    addToast(`Trial ${newTrial.id} created in Planning stage`, 'success');
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCurrentStep(0);
    setName('');
    setCrop(CROPS[0]);
    setType('Multi-location');
    setDesign('RCBD');
    setSeason(SEASONS[0]);
    setReplications(3);
    setLeadResearcher('');
    setObjectives(['Evaluate yield under dryland conditions']);
    setEntries([
      { code: 'E01', name: 'Candidate CL-2025-08', type: 'Candidate', source: 'In-house breeding' },
      { code: 'E02', name: 'Candidate CL-2025-12', type: 'Candidate', source: 'In-house breeding' },
      { code: 'E03', name: 'Check Variety Bt-102', type: 'Check', source: 'Standard Check' },
    ]);
    setSelectedLocationIds(['TLOC-001', 'TLOC-002', 'TLOC-003']);
    setStartDate(new Date().toISOString().split('T')[0]);
    setExpectedHarvest('');
    setNotes('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Create Research & MLT Trial"
      size="xl"
    >
      <div className={styles.container}>
        <div className={styles.stepperWrap}>
          <Stepper steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* STEP 1: BASICS */}
          {currentStep === 0 && (
            <div className={styles.stepContent}>
              <div className={styles.sectionHeader}>
                <Layers size={18} className={styles.sectionIcon} />
                <h3>Trial Specifications & Design</h3>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Trial Experiment Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Kharif Cotton National Multi-Location Trial (MLT-1)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.row}>
                <div className={styles.col}>
                  <label className={styles.label}>Target Crop</label>
                  <select className={styles.select} value={crop} onChange={(e) => setCrop(e.target.value)}>
                    {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className={styles.col}>
                  <label className={styles.label}>Trial Type</label>
                  <select className={styles.select} value={type} onChange={(e) => {
                    const t = e.target.value as TrialType;
                    setType(t);
                    if (t !== 'Multi-location') {
                      setSelectedLocationIds([MOCK_LOCATIONS[0].id]);
                    }
                  }}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.col}>
                  <label className={styles.label}>Experimental Design</label>
                  <select className={styles.select} value={design} onChange={(e) => setDesign(e.target.value as TrialDesign)}>
                    {DESIGNS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className={styles.col}>
                  <label className={styles.label}>Season</label>
                  <select className={styles.select} value={season} onChange={(e) => setSeason(e.target.value)}>
                    {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.col}>
                  <label className={styles.label}>Replications *</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    className={styles.input}
                    value={replications}
                    onChange={(e) => setReplications(parseInt(e.target.value) || 3)}
                    required
                  />
                  <span className={styles.helperText}>Number of replicated entry blocks (typically 3)</span>
                </div>
                <div className={styles.col}>
                  <label className={styles.label}>Lead Researcher *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Dr. Anita Desai"
                    value={leadResearcher}
                    onChange={(e) => setLeadResearcher(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Experimental Objectives</label>
                <div className={styles.addInputRow}>
                  <input
                    type="text"
                    placeholder="Add objective statement..."
                    className={styles.input}
                    value={objectiveInput}
                    onChange={(e) => setObjectiveInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddObjective(); } }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddObjective}>
                    <Plus size={16} />
                  </Button>
                </div>
                <ul className={styles.objList}>
                  {objectives.map((obj, idx) => (
                    <li key={idx} className={styles.objItem}>
                      <span>{obj}</span>
                      <button type="button" onClick={() => handleRemoveObjective(idx)} className={styles.deleteBtn}>
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: ENTRIES */}
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.sectionHeader}>
                <Layers size={18} className={styles.sectionIcon} />
                <h3>Trial Entries (Candidate & Checks)</h3>
              </div>
              <p className={styles.stepIntro}>
                Select the candidate germplasm lines and standard check varieties to include in the experiment.
              </p>

              <div className={styles.entryFormRow}>
                <div className={styles.col} style={{ flex: 2 }}>
                  <label className={styles.label}>Entry Germplasm Name</label>
                  <input
                    type="text"
                    placeholder="e.g. CL-2025-45 or Cotton Check-89"
                    className={styles.input}
                    value={entryName}
                    onChange={(e) => setEntryName(e.target.value)}
                  />
                </div>
                <div className={styles.col}>
                  <label className={styles.label}>Entry Type</label>
                  <select className={styles.select} value={entryType} onChange={(e) => setEntryType(e.target.value as any)}>
                    <option value="Candidate">Candidate Line</option>
                    <option value="Check">Check Variety</option>
                    <option value="Control">Control Variety</option>
                  </select>
                </div>
                <div className={styles.col}>
                  <label className={styles.label}>Source / Program</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={entrySource}
                    onChange={(e) => setEntrySource(e.target.value)}
                  />
                </div>
                <Button type="button" variant="primary" onClick={handleAddEntry} className={styles.addEntryBtn}>
                  Add Entry
                </Button>
              </div>

              <div className={styles.entriesTableWrap}>
                <table className={styles.entriesTable}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Entry Name</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th style={{ width: 60 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((ent) => (
                      <tr key={ent.code}>
                        <td className={styles.mono}>{ent.code}</td>
                        <td className={styles.entryNameText}>{ent.name}</td>
                        <td>
                          <span className={`${styles.typeChip} ${styles[ent.type.toLowerCase()]}`}>
                            {ent.type}
                          </span>
                        </td>
                        <td>{ent.source}</td>
                        <td>
                          <button type="button" onClick={() => handleRemoveEntry(ent.code)} className={styles.deleteBtn}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: LOCATIONS */}
          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.sectionHeader}>
                <MapPin size={18} className={styles.sectionIcon} />
                <h3>Trial Sites & Research Farms</h3>
              </div>
              <p className={styles.stepIntro}>
                {type === 'Multi-location' 
                  ? 'Select the research farms where this multi-location trial will be planted (minimum 3 required).'
                  : 'Select the research farm or station for this experiment.'}
              </p>

              <div className={styles.locationsList}>
                {MOCK_LOCATIONS.map((loc) => {
                  const isChecked = selectedLocationIds.includes(loc.id);
                  return (
                    <label key={loc.id} className={`${styles.locCard} ${isChecked ? styles.selectedLocCard : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleLocation(loc.id)}
                        className={styles.locCheckbox}
                      />
                      <div className={styles.locInfo}>
                        <strong className={styles.locName}>{loc.name}</strong>
                        <span className={styles.locSub}>{loc.state} · Zone: {loc.agroClimaticZone}</span>
                        <div className={styles.locStats}>
                          <span>Soil: {loc.soil}</span>
                          <span>Rain: {loc.rain}mm</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: PLOT DESIGN */}
          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <div className={styles.sectionHeader}>
                <Grid size={18} className={styles.sectionIcon} />
                <h3>Layout & Randomization Preview</h3>
              </div>

              <div className={styles.designSummaryCard}>
                <div className={styles.summaryStat}>
                  <span>Total Entries</span>
                  <strong>{entries.length}</strong>
                </div>
                <div className={styles.summaryStat}>
                  <span>Replications</span>
                  <strong>{replications}</strong>
                </div>
                <div className={styles.summaryStat}>
                  <span>Trial Locations</span>
                  <strong>{selectedLocationIds.length}</strong>
                </div>
                <div className={styles.summaryStat}>
                  <span>Total Plot Cells</span>
                  <strong className={styles.highlight}>{totalPlotsCount}</strong>
                </div>
              </div>

              <div className={styles.actionRow}>
                <p className={styles.designTip}>
                  Plots will be laid out as blocks based on your selected design. You can re-randomize layout.
                </p>
                <Button type="button" variant="secondary" onClick={handleRandomizeLayout}>
                  🎲 Randomize Layout
                </Button>
              </div>

              <div className={styles.gridPreviewWrap}>
                <div className={styles.gridPreviewTitle}>Plot Allocation Matrix Mock-up</div>
                <div className={styles.gridPreview}>
                  {previewPlots.slice(0, 18).map((plot, idx) => (
                    <div key={idx} className={styles.previewCell}>
                      <span className={styles.previewCellNum}>P-{String(idx + 1).padStart(3, '0')}</span>
                      <span className={styles.previewCellLabel}>{plot}</span>
                    </div>
                  ))}
                  {previewPlots.length > 18 && (
                    <div className={styles.previewCellMore}>
                      + {previewPlots.length - 18} more plot cells
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SCHEDULE & REVIEW */}
          {currentStep === 4 && (
            <div className={styles.stepContent}>
              <div className={styles.sectionHeader}>
                <Calendar size={18} className={styles.sectionIcon} />
                <h3>Timeline & Final Review</h3>
              </div>

              <div className={styles.row}>
                <div className={styles.col}>
                  <DatePicker
                    label="Estimated Sowing Date *"
                    value={startDate}
                    onChange={setStartDate}
                    required
                  />
                </div>
                <div className={styles.col}>
                  <DatePicker
                    label="Expected Harvest Date"
                    value={expectedHarvest}
                    onChange={setExpectedHarvest}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Notes & Special Instructions</label>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  placeholder="Record crop fertilizer, field preparations or irrigation requirements here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className={styles.finalReviewCard}>
                <h4 className={styles.reviewTitle}>Experiment summary</h4>
                <div className={styles.reviewGrid}>
                  <div><strong>Name:</strong> {name}</div>
                  <div><strong>Crop:</strong> {crop}</div>
                  <div><strong>Type:</strong> {type}</div>
                  <div><strong>Design:</strong> {design} ({replications} reps)</div>
                  <div><strong>Season:</strong> {season}</div>
                  <div><strong>Timeline:</strong> {startDate} to {expectedHarvest || 'Expected +5 months'}</div>
                  <div><strong>Lead Researcher:</strong> {leadResearcher}</div>
                  <div><strong>Locations count:</strong> {selectedLocationIds.length} stations</div>
                  <div><strong>Total entries:</strong> {entries.length} (including checks)</div>
                  <div><strong>Total experimental plots:</strong> {totalPlotsCount} plots</div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className={styles.actions}>
            {currentStep > 0 && (
              <Button variant="secondary" type="button" onClick={handleBack} leftIcon={ArrowLeft}>
                Back
              </Button>
            )}

            <div className={styles.rightActions}>
              <Button variant="secondary" type="button" onClick={() => { handleReset(); onClose(); }}>
                Cancel
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button variant="primary" type="button" onClick={handleNext} rightIcon={ArrowRight}>
                  Next
                </Button>
              ) : (
                <Button variant="primary" type="submit" leftIcon={Check}>
                  Create Trial
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
