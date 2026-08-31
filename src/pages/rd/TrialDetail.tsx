import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FlaskConical, ArrowLeft, MapPin, Layers, Activity, 
  CheckCircle2, Sparkles, Plus, Search, Download, 
  AlertCircle, Thermometer, Droplets, Wind, FileText, 
  FileSpreadsheet, FileDown, BrainCircuit, Star 
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { rdNav } from '@/config/rdNav';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { trials as initialTrials } from './mockData/trialsData';
import { enhancedObservations as initialObservations } from './mockData/phenotypingData';
import { usePermission } from '@/hooks/usePermission';

// Subcomponents
import { IndiaMap } from './components/IndiaMap/IndiaMap';
import { LocationStatusCard } from './components/LocationStatusCard/LocationStatusCard';
import { PlotDetailModal } from './components/PlotDetailModal/PlotDetailModal';
import { EntryRankingsTable } from './components/EntryRankingsTable/EntryRankingsTable';
import { GxEHeatmap } from './components/GxEHeatmap/GxEHeatmap';
import { OptimalConditionsCard } from './components/OptimalConditionsCard/OptimalConditionsCard';
import { RecordObservationModal } from './components/RecordObservationModal/RecordObservationModal';
import { ObservationDetailModal } from './components/ObservationDetailModal/ObservationDetailModal';

import styles from './TrialDetail.module.css';

export default function TrialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const canViewAnalysis = usePermission('view_trial_analysis_tab');
  const canRecord = usePermission('record_phenotyping');
  const canVerify = usePermission('verify_field_observations');
  const canFlag = usePermission('flag_data_accuracy_issues');
  const canAnalyze = usePermission('analyze_trial_data');
  const canExecute = usePermission('execute_trial');

  const visibleTabs = useMemo(() => [
    { key: 'overview', label: 'Overview' },
    { key: 'locations', label: 'Locations & MLT Sites' },
    { key: 'plots', label: 'Plot Maps & Replications' },
    { key: 'observations', label: 'Phenotyping Logs' },
    { key: 'environmental', label: 'Environmental Metrics' },
    ...(canViewAnalysis ? [{ key: 'analysis', label: 'Marquee Analysis & AI Insights' }] : []),
    { key: 'reports', label: 'Reports & Documents' },
  ], [canViewAnalysis]);

  // Stores
  const { items: trialsList, update: updateTrial } = useRealtimeMockStore(initialTrials);
  const { items: allObservations, add: addObservation, update: updateObservation } = useRealtimeMockStore(initialObservations);

  // Find target trial
  const trial = useMemo(() => {
    return trialsList.find(t => t.id === id);
  }, [trialsList, id]);

  // States
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [plotLocationId, setPlotLocationId] = useState<string>('');
  const [envLocationId, setEnvLocationId] = useState<string>('');
  const [analysisMethod, setAnalysisMethod] = useState<'ANOVA' | 'BLUP' | 'Combined'>('Combined');
  
  // Modals state
  const [selectedPlot, setSelectedPlot] = useState<any | null>(null);
  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedObs, setSelectedObs] = useState<any | null>(null);
  const [isObsModalOpen, setIsObsModalOpen] = useState(false);
  
  // Prefill contexts for record observation
  const [recordPrefill, setRecordPrefill] = useState<{
    plotNumber?: string;
    entryCode?: string;
    locationId?: string;
  }>({});

  // Observation Filter States
  const [obsSearch, setObsSearch] = useState('');
  const [obsMethodFilter, setObsMethodFilter] = useState('all');

  // Initialize helper states once trial is loaded
  useEffect(() => {
    if (trial && trial.locations.length > 0) {
      setActiveLocationId(trial.locations[0].id);
      setPlotLocationId(trial.locations[0].id);
      setEnvLocationId(trial.locations[0].id);
    }
  }, [trial]);

  if (!trial) {
    return (
      <ModuleLayout moduleName="Research & Development" moduleIcon={FlaskConical} navItems={rdNav}>
        <div className={styles.noData}>
          <AlertCircle size={48} style={{ color: 'var(--color-warning)', marginBottom: 16 }} />
          <h3>Trial Not Found</h3>
          <p>The trial experiment {id} does not exist or has been archived.</p>
          <Button variant="secondary" onClick={() => navigate('/rd/trials')} style={{ marginTop: 16 }}>
            Back to Trials List
          </Button>
        </div>
      </ModuleLayout>
    );
  }

  // Filter observations for this trial
  const trialObservations = useMemo(() => {
    return allObservations.filter(obs => obs.trialId === trial.id);
  }, [allObservations, trial.id]);

  // Filtered observations based on search & method filters
  const filteredObservations = useMemo(() => {
    return trialObservations.filter(obs => {
      const matchSearch = 
        obs.id.toLowerCase().includes(obsSearch.toLowerCase()) ||
        obs.plotNumber.toLowerCase().includes(obsSearch.toLowerCase()) ||
        obs.entryCode.toLowerCase().includes(obsSearch.toLowerCase()) ||
        obs.observedBy.toLowerCase().includes(obsSearch.toLowerCase());
      
      const matchMethod = obsMethodFilter === 'all' || obs.method === obsMethodFilter;
      
      return matchSearch && matchMethod;
    });
  }, [trialObservations, obsSearch, obsMethodFilter]);

  // Markers for geographical IndiaMap component
  const mapMarkers = useMemo(() => {
    return trial.locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      latitude: loc.coordinates.latitude,
      longitude: loc.coordinates.longitude,
      status: loc.status,
      observations: loc.observations,
    }));
  }, [trial.locations]);

  // Sowing / Harvest stage calculation
  const timelineStages = [
    { label: 'Planning', completed: true, active: false, date: trial.startDate },
    { label: 'Sown', completed: ['Sown', 'In progress', 'Harvested', 'Analyzed', 'Completed'].includes(trial.status), active: trial.status === 'Sown' },
    { label: 'Growing', completed: ['In progress', 'Harvested', 'Analyzed', 'Completed'].includes(trial.status), active: trial.status === 'In progress' },
    { label: 'Harvested', completed: ['Harvested', 'Analyzed', 'Completed'].includes(trial.status), active: trial.status === 'Harvested', date: trial.actualHarvest || trial.expectedHarvest },
    { label: 'Analyzed', completed: ['Analyzed', 'Completed'].includes(trial.status), active: trial.status === 'Analyzed' }
  ];

  // Colors mapping for genotype plot squares (so reps look identical)
  const getEntryColorClass = (code: string) => {
    const isCheck = trial.entries.find(e => e.code === code)?.type === 'Check';
    if (isCheck) return styles.plotCheck;
    
    // Pick based on code index
    const idx = trial.entries.findIndex(e => e.code === code) % 4;
    switch (idx) {
      case 0: return styles.plotEntry0;
      case 1: return styles.plotEntry1;
      case 2: return styles.plotEntry2;
      default: return styles.plotEntry3;
    }
  };

  const selectedPlotLocation = trial.locations.find(l => l.id === plotLocationId);
  const selectedEnvLocation = trial.locations.find(l => l.id === envLocationId);

  // Triggering the simulated AI analysis
  const handleTriggerAnalysis = () => {
    addToast('Initiating ANOVA & Mixed-model BLUP computations...', 'info');
    setTimeout(() => {
      // Create mock analysis object matching type
      const generatedAnalysis = {
        generatedAt: new Date().toISOString(),
        method: analysisMethod,
        entryRankings: trial.entries.map((entry, index) => ({
          entryCode: entry.code,
          entryName: entry.name,
          meanYield: Number((18 + (4 - index) * 2.2 + Math.random() * 1.5).toFixed(1)),
          stdError: Number((0.6 + Math.random() * 0.4).toFixed(2)),
          rank: index + 1,
          lsdLetters: index === 0 ? 'a' : index === 1 ? 'ab' : index === 2 ? 'bc' : 'c'
        })),
        locationBreakdown: trial.locations.map(loc => ({
          locationId: loc.id,
          locationName: loc.name,
          bestEntry: trial.entries[0]?.code || 'E01',
          yieldRange: { min: 16, max: 28 },
          cv: Number((6.5 + Math.random() * 4.5).toFixed(1))
        })),
        gxeInteractions: trial.entries.map((entry, index) => ({
          entryCode: entry.code,
          stability: index % 2 === 0 ? ('High' as const) : ('Medium' as const),
          adaptedZones: trial.locations.map(l => l.agroClimaticZone)
        })),
        aiInsights: [
          `Statistical models indicate genotype ${trial.entries[0]?.name} demonstrated high yield stability (broad adaptation) across all agro-climatic zones.`,
          `Combined spatial analysis corrected for column-row field layouts, reducing standard error by 14% compared to classical ANOVA.`,
          `Top-ranking lines show significant yield advances (+12.4%) over standard check checks.`
        ]
      };

      updateTrial(trial.id, {
        status: 'Analyzed',
        finalAnalysis: generatedAnalysis
      });
      addToast('Genotype × Environment Multi-location Trial analysis computed successfully!', 'success');
    }, 1800);
  };

  // Callback to add observation
  const handleRecordObservation = (newObs: any) => {
    addObservation(newObs);
  };

  // Helper for responsive SVG line points calculation
  const getSvgPoints = (data: any[], valueKey: string, height: number, width: number, minVal: number, maxVal: number) => {
    if (data.length === 0) return '';
    const sliceData = data.slice(0, 15); // Show last 15 days
    const range = maxVal - minVal || 1;
    
    return sliceData.map((d, i) => {
      const x = (i / (sliceData.length - 1)) * (width - 40) + 20;
      const val = d[valueKey] || 0;
      const y = height - (((val - minVal) / range) * (height - 30) + 15);
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <ModuleLayout moduleName="Research & Development" moduleIcon={FlaskConical} navItems={rdNav}>
      
      {/* 1. Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <a href="/rd/trials" className={styles.backLink}>
            <ArrowLeft size={14} /> Back to trials
          </a>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>{trial.name}</h1>
            <span className={styles.trialCodeBadge}>{trial.id}</span>
            <StatusBadge status={trial.status === 'In progress' ? 'Active' : trial.status} />
          </div>
          <div className={styles.subtitleRow}>
            <span className={styles.metaLabel}>Crop:</span> <strong className={styles.metaVal}>{trial.crop}</strong>
            <span className={styles.metaDivider}>·</span>
            <span className={styles.metaLabel}>Design:</span> <strong className={styles.metaVal}>{trial.design}</strong>
            <span className={styles.metaDivider}>·</span>
            <span className={styles.metaLabel}>Season:</span> <strong className={styles.metaVal}>{trial.season}</strong>
          </div>
        </div>

        <div className={styles.headerRight}>
          {canRecord && (
            <Button 
              variant="secondary" 
              size="sm" 
              leftIcon={Plus}
              onClick={() => {
                setRecordPrefill({
                  locationId: trial.locations[0]?.id,
                  plotNumber: trial.locations[0]?.plotMap[0]?.plotNumber,
                  entryCode: trial.locations[0]?.plotMap[0]?.entryCode,
                });
                setIsRecordModalOpen(true);
              }}
            >
              Record Observation
            </Button>
          )}
          {canExecute && (
            <>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  updateTrial(trial.id, { status: 'Sown' });
                  addToast('Sowing started', 'success');
                }}
              >
                Start sowing
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  updateTrial(trial.id, { status: 'Harvested' });
                  addToast('Marked stage complete', 'success');
                }}
              >
                Mark stage complete
              </Button>
            </>
          )}
          <Button 
            variant="primary" 
            size="sm" 
            leftIcon={Download}
            onClick={() => addToast('Exporting trial dataset to CSV...', 'info')}
          >
            Export Raw Data
          </Button>
        </div>
      </div>

      <div className={styles.divider} />

      {/* 2. Tabs Strip */}
      <div className={styles.stickyTabs}>
        <Tabs tabs={visibleTabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* 3. Tab Contents */}
      <div className={styles.content}>
        
        {/* ================= TAB: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            <div className={styles.mainCol}>
              
              {/* Objectives Panel */}
              <div className={styles.cardSection}>
                <h3 className={styles.sectionHeading}>Trial Research Objectives</h3>
                <ul className={styles.objList}>
                  {trial.objectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                  <li>Determine structural disease vulnerability scores per replication node.</li>
                  <li>Aggregate raw seed weight variables to model localized agro-ecological adapters.</li>
                </ul>
              </div>

              {/* Linked Entries Table */}
              <div className={styles.cardSection}>
                <h3 className={styles.sectionHeading}>Genotype Entries & Controls ({trial.entries.length})</h3>
                <div className={styles.tableWrapper}>
                  <table className={styles.overviewTable}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Genotype Name</th>
                        <th>Role Type</th>
                        <th>Origin Source</th>
                        <th>Germplasm Catalog ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trial.entries.map((entry) => (
                        <tr key={entry.code}>
                          <td className={styles.mono}>{entry.code}</td>
                          <td><strong>{entry.name}</strong></td>
                          <td>
                            <span className={entry.type === 'Check' ? styles.checkTag : styles.candidateTag}>
                              {entry.type}
                            </span>
                          </td>
                          <td>{entry.source}</td>
                          <td>
                            {entry.germplasmRef ? (
                              <a href={`/rd/germplasm?id=${entry.germplasmRef}`} className={styles.germplasmLink}>
                                {entry.germplasmRef}
                              </a>
                            ) : (
                              <span className={styles.muted}>N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className={styles.sideCol}>
              
              {/* Mini KPIs */}
              <div className={styles.statsRow}>
                <div className={styles.miniKpi}>
                  <MapPin size={20} />
                  <div>
                    <span className={styles.label}>MLT Sites</span>
                    <span className={styles.val}>{trial.locations.length} Stations</span>
                  </div>
                </div>
                <div className={styles.miniKpi}>
                  <Layers size={20} />
                  <div>
                    <span className={styles.label}>Total Plots</span>
                    <span className={styles.val}>{trial.totalPlots} cells</span>
                  </div>
                </div>
                <div className={styles.miniKpi}>
                  <Activity size={20} />
                  <div>
                    <span className={styles.label}>Replications</span>
                    <span className={styles.val}>{trial.replications} Blocks</span>
                  </div>
                </div>
              </div>

              {/* Research Lead Info */}
              <div className={styles.cardSection}>
                <h4 className={styles.sidebarTitle}>Lead Investigator</h4>
                <div className={styles.investigatorCard}>
                  <div className={styles.avatarLarge}>
                    {trial.leadResearcher.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <strong className={styles.leadName}>{trial.leadResearcher}</strong>
                    <span className={styles.leadRole}>Principal Breeding Scientist</span>
                    <span className={styles.leadMail}>a.desai@seedflow.in</span>
                  </div>
                </div>
              </div>

              {/* Milestones / Timeline Tracker */}
              <div className={styles.cardSection}>
                <h4 className={styles.sidebarTitle}>Trial Lifecyle Progress</h4>
                <div className={styles.timelineContainer}>
                  {timelineStages.map((stage, idx) => (
                    <div 
                      key={idx} 
                      className={`${styles.timelineNode} ${stage.completed ? styles.completedNode : ''} ${stage.active ? styles.activeNode : ''}`}
                    >
                      <div className={styles.nodeCircle}>
                        {stage.completed && <CheckCircle2 size={12} />}
                      </div>
                      <div className={styles.nodeDetails}>
                        <strong className={styles.nodeLabel}>{stage.label}</strong>
                        {stage.date && <span className={styles.nodeDate}>{stage.date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: LOCATIONS ================= */}
        {activeTab === 'locations' && (
          <div className={styles.overviewGrid}>
            <div className={styles.mainCol}>
              <IndiaMap 
                markers={mapMarkers} 
                activeMarkerId={activeLocationId}
                onMarkerClick={(m) => setActiveLocationId(m.id)}
                title="Geographical Distribution"
                subtitle="Location of breeding trials stations across India"
              />
            </div>
            
            <div className={styles.sideCol} style={{ maxHeight: '680px', overflowY: 'auto', paddingRight: '4px' }}>
              <h3 className={styles.sidebarTitle}>Active Stations ({trial.locations.length})</h3>
              <div className={styles.locationCardsList}>
                {trial.locations.map(loc => (
                  <div key={loc.id} onClick={() => setActiveLocationId(loc.id)}>
                    <LocationStatusCard
                      location={loc}
                      isActive={loc.id === activeLocationId}
                      onViewPlotMap={(locationId) => {
                        setPlotLocationId(locationId);
                        setActiveTab('plots');
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: PLOTS ================= */}
        {activeTab === 'plots' && (
          <div className={styles.cardSection}>
            <div className={styles.plotHeaderRow}>
              <div>
                <h3 className={styles.sectionHeading}>Replication Plot Grid Maps</h3>
                <p className={styles.sectionSubText}>
                  Interactive spatial display of randomized layout for field location {selectedPlotLocation?.name}
                </p>
              </div>
              <div className={styles.dropdownSelectorArea}>
                <label>Select Station Location:</label>
                <select 
                  className={styles.selectInput}
                  value={plotLocationId}
                  onChange={(e) => setPlotLocationId(e.target.value)}
                >
                  {trial.locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.state})</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPlotLocation ? (
              <div className={styles.plotGridContainer}>
                {/* Legend */}
                <div className={styles.plotLegend}>
                  <span className={styles.legendLabel}>Grid Legend:</span>
                  <div className={styles.legendFlex}>
                    <div className={styles.legendChipItem}>
                      <span className={`${styles.legendColorBox} ${styles.colorBoxCheck}`} />
                      <span>Check Variety (Bt-102 / Pioneer)</span>
                    </div>
                    {trial.entries.filter(e => e.type !== 'Check').map((entry, idx) => (
                      <div key={entry.code} className={styles.legendChipItem}>
                        <span className={`${styles.legendColorBox} ${styles[`colorBoxEntry${idx % 4}`]}`} />
                        <span>{entry.name} ({entry.code})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid */}
                <div className={styles.interactiveGrid}>
                  {selectedPlotLocation.plotMap.map((plot) => {
                    const linkedEntry = trial.entries.find(e => e.code === plot.entryCode);
                    const colorClass = getEntryColorClass(plot.entryCode);

                    return (
                      <div 
                        key={plot.plotNumber} 
                        className={`${styles.plotSquare} ${colorClass}`}
                        onClick={() => {
                          setSelectedPlot(plot);
                          setIsPlotModalOpen(true);
                        }}
                      >
                        <div className={styles.squareHeader}>
                          <span className={styles.plotNumText}>{plot.plotNumber}</span>
                          <span className={styles.repText}>Rep {plot.replication}</span>
                        </div>
                        <div className={styles.squareBody}>
                          <strong className={styles.squareEntryCode}>{plot.entryCode}</strong>
                          <span className={styles.squareStatus}>{plot.status}</span>
                        </div>
                        <div className={styles.squareTooltip}>
                          <strong>{linkedEntry?.name || 'Unknown genotype'}</strong>
                          <div>Replication: {plot.replication}</div>
                          <div>Status: {plot.status}</div>
                          <div>Area: {plot.area} sqm</div>
                          <span className={styles.clickNote}>Click to view history</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={styles.noData}>Select a location to render the layout.</div>
            )}
          </div>
        )}

        {/* ================= TAB: OBSERVATIONS ================= */}
        {activeTab === 'observations' && (
          <div className={styles.cardSection}>
            <div className={styles.obsHeaderRow}>
              <div className={styles.filterSection}>
                <div className={styles.searchWrapper}>
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search by Plot, Observer, Genotype Entry..."
                    value={obsSearch}
                    onChange={(e) => setObsSearch(e.target.value)}
                    className={styles.searchInputField}
                  />
                </div>
                
                <select
                  value={obsMethodFilter}
                  onChange={(e) => setObsMethodFilter(e.target.value)}
                  className={styles.selectInputFilters}
                >
                  <option value="all">All Methods</option>
                  <option value="Manual field walk">Manual field walk</option>
                  <option value="AI image analysis">AI image analysis</option>
                  <option value="Drone imagery">Drone imagery</option>
                  <option value="IoT sensor">IoT sensor</option>
                  <option value="Lab analysis">Lab analysis</option>
                </select>
              </div>

              {canRecord && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Plus}
                  onClick={() => {
                    setRecordPrefill({
                      locationId: trial.locations[0]?.id,
                      plotNumber: trial.locations[0]?.plotMap[0]?.plotNumber,
                      entryCode: trial.locations[0]?.plotMap[0]?.entryCode,
                    });
                    setIsRecordModalOpen(true);
                  }}
                >
                  Record Observation
                </Button>
              )}
              {canVerify && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => addToast('Verifying observations...', 'success')}
                >
                  Verify observations
                </Button>
              )}
              {canFlag && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => addToast('Data issue flagged', 'warning')}
                >
                  Flag data issue
                </Button>
              )}
            </div>

            <DataTable
              rowKey="id"
              data={filteredObservations}
              columns={[
                { key: 'id', label: 'Observation ID', render: (obs: any) => <strong className={styles.mono}>{obs.id}</strong> },
                { key: 'date', label: 'Date Captured' },
                { key: 'plotNumber', label: 'Plot No.', render: (obs: any) => <span>{obs.plotNumber}</span> },
                { key: 'entryCode', label: 'Entry Code', render: (obs: any) => <span className={styles.mono}>{obs.entryCode}</span> },
                { key: 'growthStage', label: 'Growth Stage' },
                { key: 'observedBy', label: 'Observer' },
                { key: 'method', label: 'Capture Method', render: (obs: any) => <span className={styles.captureMethodBadge}>{obs.method}</span> },
                {
                  key: 'reviewed',
                  label: 'Status',
                  render: (obs: any) => (
                    <span className={`${styles.reviewBadge} ${obs.reviewed ? styles.reviewedOk : styles.reviewedPending}`}>
                      {obs.reviewed ? 'Approved' : 'Pending Review'}
                    </span>
                  )
                },
                {
                  key: 'actions',
                  label: '',
                  render: (obs: any) => (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setSelectedObs(obs);
                        setIsObsModalOpen(true);
                      }}
                    >
                      View details
                    </Button>
                  )
                }
              ]}
            />
          </div>
        )}

        {/* ================= TAB: ENVIRONMENTAL ================= */}
        {activeTab === 'environmental' && (
          <div className={styles.cardSection}>
            <div className={styles.plotHeaderRow}>
              <div>
                <h3 className={styles.sectionHeading}>Sensor Telemetry & Atmospheric readings</h3>
                <p className={styles.sectionSubText}>
                  Microclimatic logging for experimental crop trial plots at {selectedEnvLocation?.name}
                </p>
              </div>
              <div className={styles.dropdownSelectorArea}>
                <label>Select Station Location:</label>
                <select 
                  className={styles.selectInput}
                  value={envLocationId}
                  onChange={(e) => setEnvLocationId(e.target.value)}
                >
                  {trial.locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedEnvLocation && selectedEnvLocation.environmentalData ? (
              <div className={styles.charts2x2}>
                
                {/* Chart 1: Temperature */}
                <div className={styles.chartBlock}>
                  <div className={styles.chartMetaRow}>
                    <div className={styles.chartTitleArea}>
                      <Thermometer className={styles.chartIcon} size={16} />
                      <strong>Diurnal Temperature (°C)</strong>
                    </div>
                    <span className={styles.chartLegendText}>Daily Max (Red) · Min (Blue)</span>
                  </div>
                  <div className={styles.svgWrapper}>
                    <svg viewBox="0 0 500 150" className={styles.chartSvg}>
                      {/* Grid Lines */}
                      <line x1="20" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="55" x2="480" y2="55" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="125" x2="480" y2="125" stroke="#f1f5f9" strokeWidth="1" />
                      
                      {/* Min Temperature Area */}
                      <polyline
                        fill="rgba(56, 189, 248, 0.15)"
                        stroke="#0284c7"
                        strokeWidth="2.5"
                        points={`20,135 ${getSvgPoints(selectedEnvLocation.environmentalData, 'temperatureMin', 150, 500, 10, 42)} 480,135`}
                      />

                      {/* Max Temperature Line */}
                      <polyline
                        fill="none"
                        stroke="#ea580c"
                        strokeWidth="2.5"
                        strokeDasharray="4, 2"
                        points={getSvgPoints(selectedEnvLocation.environmentalData, 'temperatureMax', 150, 500, 10, 42)}
                      />
                    </svg>
                  </div>
                  <div className={styles.chartAxes}>
                    <span>Sowing Date</span>
                    <span>Sweet Spot (20-30°C)</span>
                    <span>Latest</span>
                  </div>
                </div>

                {/* Chart 2: Soil Moisture */}
                <div className={styles.chartBlock}>
                  <div className={styles.chartMetaRow}>
                    <div className={styles.chartTitleArea}>
                      <Droplets className={styles.chartIcon} size={16} fill="var(--color-secondary)" />
                      <strong>Volumetric Soil Moisture (%)</strong>
                    </div>
                    <span className={styles.chartLegendText}>Optimal Range (30% - 65%)</span>
                  </div>
                  <div className={styles.svgWrapper}>
                    <svg viewBox="0 0 500 150" className={styles.chartSvg}>
                      <line x1="20" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="55" x2="480" y2="55" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="125" x2="480" y2="125" stroke="#f1f5f9" strokeWidth="1" />

                      {/* Optimal Bounds Line */}
                      <line x1="20" y1="40" x2="480" y2="40" stroke="#22c55e" strokeWidth="1" strokeDasharray="3,3" />
                      
                      {/* Soil Moisture Curve */}
                      <polyline
                        fill="none"
                        stroke="var(--color-secondary)"
                        strokeWidth="2.5"
                        points={getSvgPoints(selectedEnvLocation.environmentalData, 'soilMoisture', 150, 500, 15, 80)}
                      />
                    </svg>
                  </div>
                  <div className={styles.chartAxes}>
                    <span>Sowing Date</span>
                    <span>Target &gt; 35%</span>
                    <span>Latest ({selectedEnvLocation.environmentalData[0]?.soilMoisture?.toFixed(1) || 40}%)</span>
                  </div>
                </div>

                {/* Chart 3: Rainfall */}
                <div className={styles.chartBlock}>
                  <div className={styles.chartMetaRow}>
                    <div className={styles.chartTitleArea}>
                      <Droplets className={styles.chartIcon} size={16} />
                      <strong>Daily Precipitation Event (mm)</strong>
                    </div>
                    <span className={styles.chartLegendText}>Capacitance Rain Collector</span>
                  </div>
                  <div className={styles.svgWrapper}>
                    <svg viewBox="0 0 500 150" className={styles.chartSvg}>
                      <line x1="20" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="55" x2="480" y2="55" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="125" x2="480" y2="125" stroke="#f1f5f9" strokeWidth="1" />

                      {/* Render vertical bars for rain */}
                      {selectedEnvLocation.environmentalData.slice(0, 15).map((d, i) => {
                        const x = (i / 14) * (500 - 40) + 16;
                        const heightBar = Math.min(100, (d.rainfall / 30) * 110);
                        const y = 135 - heightBar;

                        return (
                          <rect
                            key={i}
                            x={x}
                            y={y}
                            width="8"
                            height={heightBar}
                            fill="#e6bc42"
                            rx="2"
                          >
                            <title>Rain: {d.rainfall.toFixed(1)} mm</title>
                          </rect>
                        );
                      })}
                    </svg>
                  </div>
                  <div className={styles.chartAxes}>
                    <span>Sowing Date</span>
                    <span>Seasonal rain: {selectedEnvLocation.rainfall} mm</span>
                    <span>Latest</span>
                  </div>
                </div>

                {/* Chart 4: Relative Humidity */}
                <div className={styles.chartBlock}>
                  <div className={styles.chartMetaRow}>
                    <div className={styles.chartTitleArea}>
                      <Wind className={styles.chartIcon} size={16} />
                      <strong>Relative Humidity (%)</strong>
                    </div>
                    <span className={styles.chartLegendText}>Daily Ambient Trend</span>
                  </div>
                  <div className={styles.svgWrapper}>
                    <svg viewBox="0 0 500 150" className={styles.chartSvg}>
                      <line x1="20" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="55" x2="480" y2="55" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="125" x2="480" y2="125" stroke="#f1f5f9" strokeWidth="1" />

                      <polyline
                        fill="rgba(168, 85, 247, 0.1)"
                        stroke="#a855f7"
                        strokeWidth="2.5"
                        points={getSvgPoints(selectedEnvLocation.environmentalData, 'humidity', 150, 500, 30, 100)}
                      />
                    </svg>
                  </div>
                  <div className={styles.chartAxes}>
                    <span>Sowing Date</span>
                    <span>Avg RH: 68%</span>
                    <span>Latest</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className={styles.noData}>No microclimatic logs compiled for this location.</div>
            )}
          </div>
        )}

        {/* ================= TAB: ANALYSIS & INSIGHTS ================= */}
        {activeTab === 'analysis' && (
          <div>
            {!trial.finalAnalysis ? (
              <div className={styles.awaitingAnalysisCard}>
                <div className={styles.awaitingTitleArea}>
                  <BrainCircuit className={styles.sparkleIcon} size={36} />
                  <h3>Awaiting Statistical Analysis</h3>
                  <p>
                    This trial is currently in progress. Harvest variables, plot replicates yields, and local 
                    weather metrics must be finalized before computing standard G×E stability ANOVA models.
                  </p>
                </div>
                
                <div className={styles.awaitingSettings}>
                  <label>Select Mixed-Model Method:</label>
                  <select 
                    value={analysisMethod}
                    onChange={(e) => setAnalysisMethod(e.target.value as any)}
                    className={styles.methodSelectorInput}
                  >
                    <option value="Combined">Combined Spatio-Temporal Mixed Model</option>
                    <option value="ANOVA">Standard Multi-Location ANOVA</option>
                    <option value="BLUP">Best Linear Unbiased Prediction (BLUP)</option>
                  </select>

                  {canAnalyze ? (
                    <Button 
                      variant="primary" 
                      leftIcon={Sparkles}
                      onClick={handleTriggerAnalysis}
                      style={{ marginTop: 8 }}
                    >
                      Execute Trial Analysis Pipeline
                    </Button>
                  ) : (
                    <p className={styles.muted} style={{ fontSize: '12px', marginTop: '8px' }}>
                      You do not have permission to execute the analysis pipeline.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.analysisGrid}>
                
                {/* Left side: Rankings & Stability grids */}
                <div className={styles.mainCol}>
                  
                  {/* Toggle Mode */}
                  <div className={styles.segmentedToggleSection}>
                    <span className={styles.toggleLabel}>Method:</span>
                    <div className={styles.toggleButtonGroup}>
                      {(['ANOVA', 'BLUP', 'Combined'] as const).map(m => (
                        <button
                          key={m}
                          className={`${styles.toggleButton} ${trial.finalAnalysis?.method === m ? styles.toggleActive : ''}`}
                          onClick={() => {
                            if (!canAnalyze) {
                              addToast('Permission denied', 'error');
                              return;
                            }
                            updateTrial(trial.id, {
                              finalAnalysis: {
                                ...trial.finalAnalysis!,
                                method: m
                              }
                            });
                            addToast(`Re-computing projections using ${m} models...`, 'info');
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rankings Table */}
                  <div className={styles.cardSection}>
                    <h3 className={styles.sectionHeading}>Genotype Yield Performance Rankings (Mean)</h3>
                    <EntryRankingsTable 
                      rankings={trial.finalAnalysis.entryRankings} 
                      entries={trial.entries} 
                    />
                  </div>

                  {/* GxE Interaction Heatmap */}
                  <div className={styles.cardSection}>
                    <h3 className={styles.sectionHeading}>Genotype × Environment (G×E) Matrix</h3>
                    <GxEHeatmap
                      rankings={trial.finalAnalysis.entryRankings}
                      locations={trial.locations.map(l => ({ locationId: l.id, locationName: l.name }))}
                      stabilityList={trial.finalAnalysis.gxeInteractions}
                    />
                  </div>

                  {/* Optimal Conditions sweets spots modeling */}
                  <OptimalConditionsCard crop={trial.crop} />

                </div>

                {/* Right side: AI insights recommendations */}
                <div className={styles.sideCol}>
                  <div className={styles.cardSection} style={{ backgroundColor: '#fbfdfa', borderLeft: '4px solid var(--color-primary)' }}>
                    <div className={styles.aiInsightsHeader}>
                      <BrainCircuit className={styles.zapIcon} size={22} style={{ color: 'var(--color-primary)' }} />
                      <h4 className={styles.sidebarTitle} style={{ margin: 0, color: 'var(--color-primary-dark)' }}>AI breeding advice</h4>
                    </div>
                    
                    <p className={styles.aiBriefNote}>
                      Mixed-model spatial recommendations computed automatically by SeedFlow ML models.
                    </p>

                    <div className={styles.aiInsights}>
                      {trial.finalAnalysis.aiInsights.map((insight, idx) => (
                        <div key={idx} className={styles.aiInsight}>
                          <Star size={14} className={styles.starIcon} />
                          <p>{insight}</p>
                        </div>
                      ))}
                    </div>

                    {canAnalyze && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={CheckCircle2}
                          onClick={() => addToast('Advancement recommendations pushed to breeding pipeline!', 'success')}
                          style={{ width: '100%', marginTop: 8 }}
                        >
                          Advance Top Lines
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => addToast('Exporting to R / SAS format...', 'success')}
                          style={{ width: '100%', marginTop: 8 }}
                        >
                          Export to R / SAS
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Location Coefficient of Variation (CV) */}
                  <div className={styles.cardSection}>
                    <h4 className={styles.sidebarTitle}>Coefficient of Variation (CV)</h4>
                    <p className={styles.subText}>Experimental error bounds per location node (target &lt; 12%)</p>
                    <div className={styles.cvChart} style={{ marginTop: 12 }}>
                      {trial.finalAnalysis.locationBreakdown.map((locBreak) => (
                        <div key={locBreak.locationId} className={styles.cvRow}>
                          <div className={styles.cvInfoRow}>
                            <span className={styles.locName}>{locBreak.locationName}</span>
                            <span className={styles.cvVal}>{locBreak.cv}%</span>
                          </div>
                          <div className={styles.cvBar}>
                            <div 
                              className={styles.cvFill} 
                              style={{ 
                                width: `${Math.min(100, (locBreak.cv / 15) * 100)}%`,
                                backgroundColor: locBreak.cv > 10 ? '#ca8a04' : '#16a34a'
                              }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ================= TAB: REPORTS ================= */}
        {activeTab === 'reports' && (
          <div className={styles.cardSection}>
            <h3 className={styles.sectionHeading}>Trial Research Documents & Exports</h3>
            <p className={styles.sectionSubText}>
              Download and view completed field notebooks, variance calculations, and final regulatory release files.
            </p>

            <div className={styles.reportsGrid}>
              
              {/* Document 1 */}
              <div className={styles.reportItem}>
                <FileText size={32} className={styles.docIcon} />
                <div className={styles.docInfo}>
                  <strong>Final Harvest Yield ANOVA Matrix (Combined)</strong>
                  <span>PDF Document · 2.4 MB · Generated: 4 days ago</span>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  leftIcon={FileDown}
                  onClick={() => addToast('Downloading Final Harvest Yield ANOVA PDF...', 'success')}
                >
                  Download PDF
                </Button>
              </div>

              {/* Document 2 */}
              <div className={styles.reportItem}>
                <FileSpreadsheet size={32} className={styles.docIconExcel} />
                <div className={styles.docInfo}>
                  <strong>Raw Plot Measurements & Spatial Microclimatic Logs</strong>
                  <span>Excel Workbook · 12.8 MB · Generated: 2 hours ago</span>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  leftIcon={FileDown}
                  onClick={() => addToast('Downloading Raw Plot Measurements Sheet...', 'success')}
                >
                  Download Excel
                </Button>
              </div>

              {/* Document 3 */}
              <div className={styles.reportItem}>
                <FileText size={32} className={styles.docIcon} />
                <div className={styles.docInfo}>
                  <strong>GxE Interactive Stability Biplots (AMMI Model)</strong>
                  <span>High-Res Plot Vector (SVG) · 1.1 MB · Generated: 1 day ago</span>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  leftIcon={FileDown}
                  onClick={() => addToast('Downloading GxE Stability Biplot Vector...', 'success')}
                >
                  Download SVG
                </Button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ================= SUB-MODALS ================= */}

      {/* Plot Details Modal */}
      {selectedPlot && (
        <PlotDetailModal
          isOpen={isPlotModalOpen}
          onClose={() => {
            setIsPlotModalOpen(false);
            setSelectedPlot(null);
          }}
          plot={selectedPlot}
          entry={trial.entries.find(e => e.code === selectedPlot.entryCode) || null}
          locationName={selectedPlotLocation?.name || 'Research Farm'}
          observations={trialObservations.filter(o => o.plotNumber === selectedPlot.plotNumber)}
          onRecordObservation={(ctx) => {
            setRecordPrefill({
              plotNumber: ctx.plotNumber,
              entryCode: ctx.entryCode,
              locationId: plotLocationId,
            });
            setIsRecordModalOpen(true);
          }}
        />
      )}

      {/* Record Observation Modal */}
      <RecordObservationModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onRecord={handleRecordObservation}
        prefilledTrialId={trial.id}
        prefilledLocationId={recordPrefill.locationId}
        prefilledPlotNumber={recordPrefill.plotNumber}
        prefilledEntryCode={recordPrefill.entryCode}
        trialsList={trialsList}
      />

      {/* Observation Details Modal */}
      {selectedObs && (
        <ObservationDetailModal
          isOpen={isObsModalOpen}
          onClose={() => {
            setIsObsModalOpen(false);
            setSelectedObs(null);
          }}
          observation={selectedObs}
          onApprove={canVerify ? (id) => {
            updateObservation(id, { reviewed: true });
            setSelectedObs((prev: any) => prev ? { ...prev, reviewed: true } : null);
            addToast(`Observation ${id} approved successfully!`, 'success');
          } : undefined}
        />
      )}

    </ModuleLayout>
  );
}
