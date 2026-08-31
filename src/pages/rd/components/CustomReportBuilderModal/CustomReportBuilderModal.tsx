import React, { useState } from 'react';
import { 
  Database, 
  Filter, 
  BarChart, 
  Save, 
  FileText, 
  Check 
} from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { DatePicker } from '@/components/common/DatePicker/DatePicker';
import { useToast } from '@/components/common/Toast/ToastContext';
import styles from './CustomReportBuilderModal.module.css';

interface CustomReportBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddReport?: (reportTitle: string) => void;
}

const DATA_SOURCES = [
  { key: 'trials', label: 'Trials & Field Experiments Data' },
  { key: 'phenotyping', label: 'Phenotyping & Crop Observations' },
  { key: 'breeding', label: 'Breeding Programs & Cross Success' },
  { key: 'varieties', label: 'Varieties Portfolio Catalog' },
  { key: 'registrations', label: 'Registrations, DUS & Compliance' },
  { key: 'environmental', label: 'IoT Environmental & Weather Telemetry' },
  { key: 'germplasm', label: 'Germplasm Accession Catalog' }
];

const SEASONS = ['Kharif', 'Rabi', 'Zaid'];
const CROPS = ['Cotton', 'Maize', 'Paddy', 'Sorghum', 'Sunflower', 'Soybean', 'Groundnut', 'Tomato', 'Chilli', 'Wheat', 'Pulses'];

export const CustomReportBuilderModal: React.FC<CustomReportBuilderModalProps> = ({
  isOpen,
  onClose,
  onAddReport
}) => {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Sources
  const [selectedSources, setSelectedSources] = useState<string[]>(['trials', 'phenotyping']);

  // Step 2: Filters
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-05-24');
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(['Kharif']);
  const [selectedCrops, setSelectedCrops] = useState<string[]>(['Cotton', 'Maize']);
  const [locations, setLocations] = useState('Hyderabad, Coimbatore, Ludhiana');

  // Step 3: Outputs
  const [includeCharts, setIncludeCharts] = useState<string[]>(['bar', 'line']);
  const [includeTables, setIncludeTables] = useState<string[]>(['summary', 'detailed']);
  const [includeAI, setIncludeAI] = useState(true);
  const [format, setFormat] = useState('PDF');

  // Step 4: Preview
  const [reportTitle, setReportTitle] = useState('Custom Multi-Location Yield Summary — 2026');

  const steps = [
    { key: 'sources', label: 'Data Sources' },
    { key: 'filters', label: 'Scope Filters' },
    { key: 'output', label: 'Output Config' },
    { key: 'preview', label: 'Preview & Save' }
  ];

  const handleSourceToggle = (key: string) => {
    setSelectedSources(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSeasonToggle = (season: string) => {
    setSelectedSeasons(prev => 
      prev.includes(season) ? prev.filter(s => s !== season) : [...prev, season]
    );
  };

  const handleCropToggle = (crop: string) => {
    setSelectedCrops(prev => 
      prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]
    );
  };

  const handleChartToggle = (chart: string) => {
    setIncludeCharts(prev => 
      prev.includes(chart) ? prev.filter(c => c !== chart) : [...prev, chart]
    );
  };

  const handleTableToggle = (table: string) => {
    setIncludeTables(prev => 
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
  };

  const handleNext = () => {
    if (currentStep === 0 && selectedSources.length === 0) {
      addToast({ type: 'warning', message: 'Please select at least one core data source.' });
      return;
    }
    if (currentStep === 1 && selectedCrops.length === 0) {
      addToast({ type: 'warning', message: 'Please select at least one crop.' });
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSave = (isDraft: boolean) => {
    if (!reportTitle.trim()) {
      addToast({ type: 'warning', message: 'Please specify a report title.' });
      return;
    }

    if (onAddReport) {
      onAddReport(reportTitle);
    }

    addToast({ 
      type: 'success', 
      message: isDraft 
        ? `Draft configuration "${reportTitle}" saved successfully` 
        : `Custom report "${reportTitle}" compiled and added to Saved Reports!` 
    });
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className={styles.stepPane}>
            <div className={styles.paneHeader}>
              <Database size={18} className={styles.paneIcon} />
              <h4>Select Core Data Source Connectors</h4>
            </div>
            <p className={styles.paneDesc}>Choose the R&D database aggregates to compile into this reporting template.</p>
            
            <div className={styles.checkboxList}>
              {DATA_SOURCES.map((source) => {
                const checked = selectedSources.includes(source.key);
                return (
                  <div 
                    key={source.key} 
                    className={`${styles.checkboxRow} ${checked ? styles.checkedRow : ''}`}
                    onClick={() => handleSourceToggle(source.key)}
                  >
                    <div className={`${styles.box} ${checked ? styles.boxChecked : ''}`}>
                      {checked && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span>{source.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 1:
        return (
          <div className={styles.stepPane}>
            <div className={styles.paneHeader}>
              <Filter size={18} className={styles.paneIcon} />
              <h4>Configure Scope & Sowing Filters</h4>
            </div>
            <p className={styles.paneDesc}>Limit observations and calculations to specific regional parameters.</p>

            <div className={styles.filterForm}>
              {/* Sowing Windows (DatePickers) */}
              <div className={styles.fieldRow}>
                <div className={styles.fieldCol}>
                  <label className={styles.fieldLabel}>Start Sowing Window</label>
                  <DatePicker 
                    value={startDate} 
                    onChange={(date) => setStartDate(date)} 
                  />
                </div>
                <div className={styles.fieldCol}>
                  <label className={styles.fieldLabel}>End Sowing Window</label>
                  <DatePicker 
                    value={endDate} 
                    onChange={(date) => setEndDate(date)} 
                  />
                </div>
              </div>

              {/* Seasons Chips */}
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Agro-Climatic Seasons</label>
                <div className={styles.chipGroup}>
                  {SEASONS.map((season) => {
                    const active = selectedSeasons.includes(season);
                    return (
                      <button
                        type="button"
                        key={season}
                        className={`${styles.filterChip} ${active ? styles.activeChip : ''}`}
                        onClick={() => handleSeasonToggle(season)}
                      >
                        {season}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Crops Chips */}
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Research Crops</label>
                <div className={styles.chipGroup}>
                  {CROPS.map((crop) => {
                    const active = selectedCrops.includes(crop);
                    return (
                      <button
                        type="button"
                        key={crop}
                        className={`${styles.filterChip} ${active ? styles.activeChip : ''}`}
                        onClick={() => handleCropToggle(crop)}
                      >
                        {crop}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Locations Input */}
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Trial Locations (Comma-separated)</label>
                <input 
                  type="text" 
                  value={locations}
                  onChange={(e) => setLocations(e.target.value)}
                  className={styles.inputText}
                  placeholder="e.g. Coimbatore, Dharwad, Patna"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles.stepPane}>
            <div className={styles.paneHeader}>
              <BarChart size={18} className={styles.paneIcon} />
              <h4>Output Component Configuration</h4>
            </div>
            <p className={styles.paneDesc}>Design the sections, visual graphics, and export properties.</p>

            <div className={styles.configForm}>
              {/* Graphical Visualizations */}
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Include Visualization Graphics</label>
                <div className={styles.checkboxGrid}>
                  {[
                    { key: 'bar', label: 'Mean Yield Bar Charts' },
                    { key: 'line', label: 'Generation Advancement Lines' },
                    { key: 'pie', label: 'DUS Schedule Pie Charts' },
                    { key: 'heatmap', label: 'GxE Performance Heatmaps' }
                  ].map((chart) => {
                    const checked = includeCharts.includes(chart.key);
                    return (
                      <div 
                        key={chart.key} 
                        className={`${styles.checkboxRow} ${checked ? styles.checkedRow : ''}`}
                        onClick={() => handleChartToggle(chart.key)}
                      >
                        <div className={`${styles.box} ${checked ? styles.boxChecked : ''}`}>
                          {checked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span>{chart.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tables */}
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Include Tabular Data</label>
                <div className={styles.checkboxGrid}>
                  {[
                    { key: 'summary', label: 'Executive Trial Summaries' },
                    { key: 'detailed', label: 'Plot-level Observation Tables' },
                    { key: 'variance', label: 'ANOVA Variance Leaderboards' }
                  ].map((table) => {
                    const checked = includeTables.includes(table.key);
                    return (
                      <div 
                        key={table.key} 
                        className={`${styles.checkboxRow} ${checked ? styles.checkedRow : ''}`}
                        onClick={() => handleTableToggle(table.key)}
                      >
                        <div className={`${styles.box} ${checked ? styles.boxChecked : ''}`}>
                          {checked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span>{table.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Insights Toggle */}
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <span className={styles.toggleTitle}>Include Generative AI Insights</span>
                  <span className={styles.toggleDesc}>Compute automated recommendations and flag spatial outliers.</span>
                </div>
                <div 
                  className={`${styles.toggleSwitch} ${includeAI ? styles.activeSwitch : ''}`}
                  onClick={() => setIncludeAI(!includeAI)}
                >
                  <div className={styles.toggleHandle} />
                </div>
              </div>

              {/* Format selection */}
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Primary Layout Format</label>
                <div className={styles.radioGrid}>
                  {['PDF File', 'Excel Spreadsheet', 'Web Dashboard Portal'].map((f) => (
                    <label 
                      key={f} 
                      className={`${styles.radioLabel} ${format === f ? styles.activeRadio : ''}`}
                    >
                      <input 
                        type="radio" 
                        name="format" 
                        value={f}
                        checked={format === f} 
                        onChange={() => setFormat(f)} 
                        className={styles.hiddenInput}
                      />
                      <span>{f}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className={styles.stepPane}>
            <div className={styles.paneHeader}>
              <Save size={18} className={styles.paneIcon} />
              <h4>Compile & Finalize Report</h4>
            </div>
            <p className={styles.paneDesc}>Input metadata parameters and preview your custom reporting template.</p>

            <div className={styles.previewForm}>
              <Input 
                label="Custom Report Title"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="e.g. Yield Summary Kharif..."
                required
              />

              <div className={styles.previewCard}>
                <div className={styles.thumbnail}>
                  <FileText size={40} className={styles.thumbIcon} />
                  <div className={styles.thumbGridLines}>
                    <div className={styles.thumbLine} style={{ width: '80%' }} />
                    <div className={styles.thumbLine} style={{ width: '60%' }} />
                    <div className={styles.thumbLine} style={{ width: '70%' }} />
                  </div>
                </div>
                <div className={styles.previewMeta}>
                  <h5>Configured Specifications Summary</h5>
                  <ul>
                    <li>Sources: {selectedSources.map(s => DATA_SOURCES.find(d => d.key === s)?.label).filter(Boolean).join(', ')}</li>
                    <li>Crops: {selectedCrops.join(', ')}</li>
                    <li>Timing: {startDate ? new Date(startDate).toLocaleDateString() : '—'} to {endDate ? new Date(endDate).toLocaleDateString() : '—'}</li>
                    <li>Visualizations: {includeCharts.length} SVG charts selected</li>
                    <li>Tabulars: {includeTables.length} standard tables selected</li>
                    <li>AI Insights: {includeAI ? 'Enabled' : 'Disabled'}</li>
                    <li>Primary Format: {format}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Custom R&D Report Builder"
    >
      <div className={styles.wizardContainer}>
        {/* Stepper Wizard Header */}
        <div className={styles.stepperWrapper}>
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Wizard Main Pane */}
        <div className={styles.wizardContent}>
          {renderStepContent()}
        </div>

        {/* Wizard Footer Controls */}
        <div className={styles.footer}>
          {currentStep > 0 ? (
            <Button variant="secondary" onClick={handlePrev} type="button">
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className={styles.rightActions}>
            {currentStep < steps.length - 1 ? (
              <Button variant="primary" onClick={handleNext} type="button">
                Next Step
              </Button>
            ) : (
              <>
                <Button 
                  variant="secondary" 
                  onClick={() => handleSave(true)} 
                  type="button"
                >
                  Save as Draft
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => handleSave(false)} 
                  type="button"
                >
                  Compile & Generate
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
