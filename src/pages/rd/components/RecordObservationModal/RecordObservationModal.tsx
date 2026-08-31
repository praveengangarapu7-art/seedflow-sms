import React, { useState, useEffect } from 'react';
import { Sparkles, Cpu, Play, Check, CloudLightning, ArrowRight, ArrowLeft } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { DatePicker } from '@/components/common/DatePicker/DatePicker';
import { PhotoUpload } from '@/components/common/PhotoUpload/PhotoUpload';
import { FileUpload } from '@/components/common/FileUpload/FileUpload';
import { useToast } from '@/components/common/Toast/ToastContext';
import { PhenotypeObservation, ObservationMethod, Trial } from '@/types/rd';
import styles from './RecordObservationModal.module.css';

interface RecordObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecord: (obs: any) => void;
  prefilledTrialId?: string;
  prefilledLocationId?: string;
  prefilledPlotNumber?: string;
  prefilledEntryCode?: string;
  trialsList?: Trial[];
}

const METHODS: ObservationMethod[] = [
  'Manual field walk',
  'AI image analysis',
  'Drone imagery',
  'IoT sensor',
  'Lab analysis'
];

const STAGES = ['Vegetative', 'Flowering', 'Maturity', 'Harvest'];

export const RecordObservationModal: React.FC<RecordObservationModalProps> = ({
  isOpen,
  onClose,
  onRecord,
  prefilledTrialId = '',
  prefilledLocationId = '',
  prefilledPlotNumber = '',
  prefilledEntryCode = '',
  trialsList = []
}) => {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // --- Step 1 States ---
  const [trialId, setTrialId] = useState(prefilledTrialId);
  const [locationId, setLocationId] = useState(prefilledLocationId);
  const [plotNumber, setPlotNumber] = useState(prefilledPlotNumber);
  const [entryCode, setEntryCode] = useState(prefilledEntryCode);
  const [growthStage, setGrowthStage] = useState(STAGES[0]);
  const [observedBy, setObservedBy] = useState('Dr. Anita Desai');
  const [method, setMethod] = useState<ObservationMethod>('Manual field walk');
  const [date, setDate] = useState<string | null>(new Date().toISOString().split('T')[0]);

  // --- Step 2 States (Dynamic based on Method) ---
  // Manual
  const [manualHeight, setManualHeight] = useState('45');
  const [manualLeafCount, setManualLeafCount] = useState('8');
  const [manualDiseaseScore, setManualDiseaseScore] = useState('1'); // 1-5 scale

  // AI Image
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ id: string; url: string; caption?: string }>>([]);
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiExtractedData, setAiExtractedData] = useState<{ height: number; lai: number; heightConf: number; laiConf: number } | null>(null);

  // Drone
  const [droneFiles, setDroneFiles] = useState<Array<{ name: string; size: number; preview?: string }>>([]);

  // IoT Sensor
  const [iotSyncing, setIotSyncing] = useState(false);
  const [iotSyncedData, setIotSyncedData] = useState<{ temp: number; humidity: number; soilMoist: number } | null>(null);

  // Lab
  const [labSampleId, setLabSampleId] = useState('');
  const [labBrixValue, setLabBrixValue] = useState('');

  const [notes, setNotes] = useState('');

  // Sync pre-filled props when they change
  useEffect(() => {
    if (isOpen) {
      setTrialId(prefilledTrialId);
      setLocationId(prefilledLocationId);
      setPlotNumber(prefilledPlotNumber);
      setEntryCode(prefilledEntryCode);
      setCurrentStep(0);
      setAiExtractedData(null);
      setUploadedPhotos([]);
      setDroneFiles([]);
      setIotSyncedData(null);
      setNotes('');
    }
  }, [isOpen, prefilledTrialId, prefilledLocationId, prefilledPlotNumber, prefilledEntryCode]);

  // Derived current Trial options
  const selectedTrial = trialsList.find(t => t.id === trialId);
  const locationsOptions = selectedTrial ? selectedTrial.locations : [];
  const plotCellsOptions = selectedTrial && locationId 
    ? selectedTrial.locations.find(l => l.id === locationId)?.plotMap || [] 
    : [];

  const handleNext = () => {
    if (currentStep === 0) {
      if (!trialId || !locationId || !plotNumber) {
        addToast('Please specify Trial, Location and Plot details', 'warning');
        return;
      }
      setCurrentStep(1);
    }
  };

  // Trigger simulated AI photo analysis
  const handleAddPhoto = (files: File[]) => {
    const newPhotos = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      caption: file.name
    }));
    setUploadedPhotos([...uploadedPhotos, ...newPhotos]);

    if (method === 'AI image analysis') {
      setAiExtracting(true);
      setTimeout(() => {
        setAiExtracting(false);
        setAiExtractedData({
          height: Number((48 + Math.random() * 15).toFixed(1)),
          lai: Number((1.1 + Math.random() * 0.8).toFixed(2)),
          heightConf: Math.floor(88 + Math.random() * 10),
          laiConf: Math.floor(85 + Math.random() * 12)
        });
        addToast('AI analysis completed! Extracted traits from images.', 'success');
      }, 2000);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setUploadedPhotos(uploadedPhotos.filter(p => p.id !== id));
  };

  const handleAddDroneFile = (files: File[]) => {
    const newFiles = files.map(file => ({
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file)
    }));
    setDroneFiles([...droneFiles, ...newFiles]);
    addToast(`Drone orthomosaic file loaded (${newFiles.length} file)`, 'success');
  };

  const handleSyncIot = () => {
    setIotSyncing(true);
    setTimeout(() => {
      setIotSyncing(false);
      setIotSyncedData({
        temp: Number((28 + Math.random() * 5).toFixed(1)),
        humidity: Math.floor(65 + Math.random() * 15),
        soilMoist: Math.floor(30 + Math.random() * 10)
      });
      addToast('Successfully pulled latest IoT telemetry readings!', 'success');
    }, 1500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Map measurements depending on method
    let measurements: any[] = [];
    if (method === 'Manual field walk') {
      measurements = [
        { trait: 'Plant height', value: parseFloat(manualHeight), unit: 'cm', protocol: 'Manual visual stick' },
        { trait: 'Leaf count', value: parseInt(manualLeafCount), protocol: 'Direct node leaf count' },
        { trait: 'Disease score (1-5)', value: parseInt(manualDiseaseScore), protocol: 'Standard rust index' }
      ];
    } else if (method === 'AI image analysis') {
      if (!aiExtractedData) {
        addToast('Please upload an image to run AI extraction first', 'warning');
        return;
      }
      measurements = [
        { trait: 'Plant height', value: aiExtractedData.height, unit: 'cm', aiConfidence: aiExtractedData.heightConf, protocol: 'SeedFlow AI Mobile V2' },
        { trait: 'Leaf area index', value: aiExtractedData.lai, aiConfidence: aiExtractedData.laiConf, protocol: 'Green canopy pixel index' }
      ];
    } else if (method === 'Drone imagery') {
      if (droneFiles.length === 0) {
        addToast('Please upload a drone orthomosaic image', 'warning');
        return;
      }
      measurements = [
        { trait: 'NDVI vegetation index', value: 0.72, protocol: 'Drone near-infra multispectral' },
        { trait: 'Stand count estimate', value: 24, protocol: 'Drone plant counting algorithm' }
      ];
    } else if (method === 'IoT sensor') {
      if (!iotSyncedData) {
        addToast('Please sync IoT sensors first', 'warning');
        return;
      }
      measurements = [
        { trait: 'Soil moisture', value: iotSyncedData.soilMoist, unit: '%', protocol: 'Soil capacitance sensor' },
        { trait: 'Air temperature', value: iotSyncedData.temp, unit: '°C', protocol: 'Field microclimate telemetry' },
        { trait: 'Relative humidity', value: iotSyncedData.humidity, unit: '%', protocol: 'Field microclimate telemetry' }
      ];
    } else if (method === 'Lab analysis') {
      if (!labSampleId || !labBrixValue) {
        addToast('Please provide Lab Sample ID and Brix value', 'warning');
        return;
      }
      measurements = [
        { trait: 'Brix value', value: parseFloat(labBrixValue), unit: '°Bx', protocol: 'Refractometer standard' },
        { trait: 'Sugar content', value: `${labBrixValue}%`, protocol: 'Lab sucrose verification' }
      ];
    }

    const nextObs: PhenotypeObservation = {
      id: `OBS-${String(Math.floor(Math.random() * 90000) + 10000)}`,
      trialId,
      locationId,
      plotNumber,
      entryCode: entryCode || plotCellsOptions.find(p => p.plotNumber === plotNumber)?.entryCode || 'E01',
      date: date || new Date().toISOString().split('T')[0],
      growthStage,
      observedBy,
      method,
      measurements,
      photos: uploadedPhotos.map(p => p.url),
      notes: notes || undefined
    };

    onRecord(nextObs);
    addToast(`Recorded ${method} observation for Plot ${plotNumber}`, 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Phenotyping Observation"
      size="lg"
    >
      <div className={styles.modalBody}>
        {/* Simple Progress Bar */}
        <div className={styles.progress}>
          <div className={`${styles.progressStep} ${currentStep >= 0 ? styles.progressActive : ''}`}>1. Metadata</div>
          <div className={styles.progressDivider} />
          <div className={`${styles.progressStep} ${currentStep >= 1 ? styles.progressActive : ''}`}>2. Traits & Measurements</div>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          {/* STEP 1: METADATA */}
          {currentStep === 0 && (
            <div className={styles.stepContent}>
              <div className={styles.row}>
                <div className={styles.col}>
                  <label className={styles.label}>Trial Experiment</label>
                  {prefilledTrialId ? (
                    <input type="text" className={styles.input} value={prefilledTrialId} disabled />
                  ) : (
                    <select 
                      className={styles.select} 
                      value={trialId} 
                      onChange={e => {
                        setTrialId(e.target.value);
                        setLocationId('');
                        setPlotNumber('');
                      }}
                    >
                      <option value="">-- Select Trial --</option>
                      {trialsList.map(t => <option key={t.id} value={t.id}>{t.id} - {t.crop} ({t.name.substring(0, 20)}...)</option>)}
                    </select>
                  )}
                </div>

                <div className={styles.col}>
                  <label className={styles.label}>Station Location</label>
                  {prefilledLocationId ? (
                    <input type="text" className={styles.input} value={prefilledLocationId} disabled />
                  ) : (
                    <select 
                      className={styles.select} 
                      value={locationId} 
                      onChange={e => {
                        setLocationId(e.target.value);
                        setPlotNumber('');
                      }}
                      disabled={!trialId}
                    >
                      <option value="">-- Select Location --</option>
                      {locationsOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.col}>
                  <label className={styles.label}>Plot Number</label>
                  {prefilledPlotNumber ? (
                    <input type="text" className={styles.input} value={`${prefilledPlotNumber} (${prefilledEntryCode})`} disabled />
                  ) : (
                    <select 
                      className={styles.select} 
                      value={plotNumber} 
                      onChange={e => {
                        const cellVal = e.target.value;
                        setPlotNumber(cellVal);
                        const matched = plotCellsOptions.find(p => p.plotNumber === cellVal);
                        setEntryCode(matched?.entryCode || '');
                      }}
                      disabled={!locationId}
                    >
                      <option value="">-- Select Plot Cell --</option>
                      {plotCellsOptions.map(p => <option key={p.plotNumber} value={p.plotNumber}>{p.plotNumber} (Entry: {p.entryCode} - Rep {p.replication})</option>)}
                    </select>
                  )}
                </div>

                <div className={styles.col}>
                  <label className={styles.label}>Growth Stage</label>
                  <select className={styles.select} value={growthStage} onChange={e => setGrowthStage(e.target.value)}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.col}>
                  <DatePicker label="Observation Date" value={date} onChange={setDate} required />
                </div>
                <div className={styles.col}>
                  <label className={styles.label}>Method of Capture</label>
                  <select className={styles.select} value={method} onChange={e => setMethod(e.target.value as ObservationMethod)}>
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Observer Name</label>
                <input type="text" className={styles.input} value={observedBy} onChange={e => setObservedBy(e.target.value)} required />
              </div>
            </div>
          )}

          {/* STEP 2: MEASUREMENTS */}
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.methodHeader}>
                <div className={styles.methodTitle}>
                  {method === 'AI image analysis' && <Sparkles className={styles.methodIcon} />}
                  {method === 'IoT sensor' && <Cpu className={styles.methodIcon} />}
                  <h4>Capture Mode: {method}</h4>
                </div>
                <span className={styles.plotMetaTag}>Plot: {plotNumber} · Entry: {entryCode}</span>
              </div>

              {/* DYNAMIC FIELD RENDERING */}
              
              {/* 1. MANUAL FIELD WALK */}
              {method === 'Manual field walk' && (
                <div className={styles.measurementFields}>
                  <div className={styles.row}>
                    <div className={styles.col}>
                      <label className={styles.label}>Plant Height (cm)</label>
                      <input 
                        type="number" 
                        className={styles.input} 
                        value={manualHeight} 
                        onChange={e => setManualHeight(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className={styles.col}>
                      <label className={styles.label}>Leaf Count</label>
                      <input 
                        type="number" 
                        className={styles.input} 
                        value={manualLeafCount} 
                        onChange={e => setManualLeafCount(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>

                  <div className={styles.col}>
                    <label className={styles.label}>Rust Disease Severity Score (1 - 5)</label>
                    <div className={styles.chipsRow}>
                      {[1, 2, 3, 4, 5].map(score => (
                        <button
                          key={score}
                          type="button"
                          className={`${styles.scoreChip} ${manualDiseaseScore === String(score) ? styles.activeScoreChip : ''}`}
                          onClick={() => setManualDiseaseScore(String(score))}
                        >
                          {score} {score === 1 ? '(Healthy)' : score === 5 ? '(Severe)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. AI IMAGE ANALYSIS */}
              {method === 'AI image analysis' && (
                <div className={styles.measurementFields}>
                  <p className={styles.methodDesc}>
                    Upload a high-res plot leaf canopy photo. Our SeedFlow AI vision model will automatically compute height and Leaf Area Index (LAI) traits.
                  </p>

                  <PhotoUpload 
                    photos={uploadedPhotos} 
                    onAdd={handleAddPhoto} 
                    onRemove={handleRemovePhoto} 
                    label="Canopy / Foliage Photos" 
                    maxPhotos={2} 
                    helpText="Simulate AI computer vision trait extraction on upload"
                  />

                  {aiExtracting && (
                    <div className={styles.aiAnalyzingLoader}>
                      <div className={styles.spinner} />
                      <span>Extracting biological traits from image pixels using SeedFlow AI models...</span>
                    </div>
                  )}

                  {aiExtractedData && !aiExtracting && (
                    <div className={styles.aiResultCard}>
                      <div className={styles.aiResultTitle}>
                        <Sparkles size={14} />
                        <span>AI Extracted Traits</span>
                      </div>
                      <div className={styles.aiResultGrid}>
                        <div className={styles.aiStat}>
                          <span className={styles.aiLabel}>Extracted Height</span>
                          <strong className={styles.aiVal}>{aiExtractedData.height} cm</strong>
                          <span className={styles.aiConfidence}>Confidence: {aiExtractedData.heightConf}%</span>
                          {/* Slider for manual override */}
                          <div className={styles.overrideSlider}>
                            <label>Manual Override:</label>
                            <input 
                              type="range" 
                              min="10" 
                              max="120" 
                              value={aiExtractedData.height} 
                              onChange={e => setAiExtractedData({ ...aiExtractedData, height: Number(e.target.value) })} 
                            />
                          </div>
                        </div>

                        <div className={styles.aiStat}>
                          <span className={styles.aiLabel}>Leaf Area Index (LAI)</span>
                          <strong className={styles.aiVal}>{aiExtractedData.lai}</strong>
                          <span className={styles.aiConfidence}>Confidence: {aiExtractedData.laiConf}%</span>
                          {/* Slider for manual override */}
                          <div className={styles.overrideSlider}>
                            <label>Manual Override:</label>
                            <input 
                              type="range" 
                              min="0.1" 
                              max="4.0" 
                              step="0.05"
                              value={aiExtractedData.lai} 
                              onChange={e => setAiExtractedData({ ...aiExtractedData, lai: Number(e.target.value) })} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. DRONE IMAGERY */}
              {method === 'Drone imagery' && (
                <div className={styles.measurementFields}>
                  <p className={styles.methodDesc}>
                    Drag and drop drone-captured orthomosaic GeoTIFF blocks to compute stand count estimates and NDVI crop stress indexes.
                  </p>
                  <FileUpload 
                    label="Drone Orthomosaic Files" 
                    accept="image/*,.tiff,.geotiff" 
                    onFilesAdded={handleAddDroneFile} 
                  />
                  {droneFiles.length > 0 && (
                    <div className={styles.fileSuccessCard}>
                      <Check size={16} />
                      <span>{droneFiles.length} file loaded. Auto-calculation will yield average NDVI = 0.72 upon saving.</span>
                    </div>
                  )}
                </div>
              )}

              {/* 4. IOT SENSORS */}
              {method === 'IoT sensor' && (
                <div className={styles.measurementFields}>
                  <p className={styles.methodDesc}>
                    Pull real-time field telemetry readings from the wireless capacitance moisture probe nodes installed in Block {locationId}.
                  </p>

                  <div className={styles.syncRow}>
                    <Button type="button" variant="secondary" onClick={handleSyncIot} disabled={iotSyncing} leftIcon={Play}>
                      {iotSyncing ? 'Syncing wireless probe...' : 'Fetch node telemetry'}
                    </Button>
                  </div>

                  {iotSyncing && (
                    <div className={styles.iotSyncLoader}>
                      <CloudLightning className={styles.boltIcon} />
                      <span>Opening cellular connection to LoRaWAN gateway node...</span>
                    </div>
                  )}

                  {iotSyncedData && !iotSyncing && (
                    <div className={styles.telemetryGrid}>
                      <div className={styles.telCard}>
                        <span>Soil Moisture</span>
                        <strong>{iotSyncedData.soilMoist}%</strong>
                      </div>
                      <div className={styles.telCard}>
                        <span>Air Temp</span>
                        <strong>{iotSyncedData.temp} °C</strong>
                      </div>
                      <div className={styles.telCard}>
                        <span>Humidity</span>
                        <strong>{iotSyncedData.humidity}%</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. LAB ANALYSIS */}
              {method === 'Lab analysis' && (
                <div className={styles.measurementFields}>
                  <div className={styles.row}>
                    <div className={styles.col}>
                      <label className={styles.label}>Lab Sample ID *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. LAB-SUN-9901" 
                        className={styles.input} 
                        value={labSampleId} 
                        onChange={e => setLabSampleId(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className={styles.col}>
                      <label className={styles.label}>Brix Sugar Value (°Bx) *</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 14.5" 
                        step="0.1"
                        className={styles.input} 
                        value={labBrixValue} 
                        onChange={e => setLabBrixValue(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.inputGroup} style={{ marginTop: 20 }}>
                <label className={styles.label}>Special Observer Notes</label>
                <textarea 
                  className={styles.textarea} 
                  rows={2} 
                  placeholder="Record lodging, visual anomalies, insect pressure, or soil crusting..." 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className={styles.footer}>
            {currentStep === 1 && (
              <Button type="button" variant="secondary" onClick={() => setCurrentStep(0)} leftIcon={ArrowLeft}>
                Back
              </Button>
            )}

            <div className={styles.rightActions}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>

              {currentStep === 0 ? (
                <Button type="button" variant="primary" onClick={handleNext} rightIcon={ArrowRight}>
                  Next
                </Button>
              ) : (
                <Button type="submit" variant="primary" leftIcon={Check}>
                  Save Observation
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
