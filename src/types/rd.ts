// ============= Germplasm =============
export type GermplasmType = 'Landrace' | 'Wild relative' | 'Cultivar' | 'Breeding line' | 'Hybrid' | 'Genetic stock';
export type GermplasmStatus = 'Active' | 'Archived' | 'Quarantine' | 'Restricted';

export interface GermplasmAccession {
  id: string;                       // GRM-2026-XXXXX
  accessionNumber: string;           // unique identifier (e.g., IC-562340)
  name: string;
  crop: string;                     // Cotton, Maize, Paddy, Sunflower, etc.
  type: GermplasmType;
  species: string;                   // Gossypium hirsutum, Zea mays, etc.
  origin: { country: string; state?: string; collectionSite?: string };
  collectionDate: string;
  donor?: string;
  custody: string;                   // institution holding it
  status: GermplasmStatus;
  passportData: { altitude?: number; latitude?: number; longitude?: number; biologicalStatus?: string };
  traits: GermplasmTrait[];
  hasGenomicData: boolean;
  parentMaleId?: string;             // for pedigree
  parentFemaleId?: string;
  photos: string[];
  documents: string[];
  notes?: string;
  registeredDate: string;
}

export interface GermplasmTrait {
  name: string;                      // 'Yield potential', 'Drought tolerance', 'Days to maturity'
  category: 'Agronomic' | 'Quality' | 'Stress tolerance' | 'Disease resistance' | 'Morphological';
  value: string | number;
  unit?: string;
  measuredDate?: string;
  measuredBy?: string;
}

// ============= Breeding Program =============
export type BreedingObjective = 'Yield improvement' | 'Disease resistance' | 'Stress tolerance' | 'Quality traits' | 'Hybrid development' | 'Variety release';
export type ProgramStatus = 'Planning' | 'Active' | 'On hold' | 'Completed' | 'Cancelled';
export type GenerationStage = 'P (parents)' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6+' | 'Pre-release' | 'Released';

export interface BreedingProgram {
  id: string;                       // BP-2026-XXX
  name: string;
  crop: string;
  objective: BreedingObjective;
  description: string;
  status: ProgramStatus;
  startDate: string;
  expectedEndDate: string;
  currentStage: GenerationStage;
  leadBreeder: string;
  teamMembers: string[];
  budget: number;
  spentToDate: number;
  parentMale?: { accessionId: string; accessionName: string };
  parentFemale?: { accessionId: string; accessionName: string };
  generations: Generation[];
  notes?: string;
}

export interface Generation {
  stage: GenerationStage;
  plantedSeason: string;             // 'Kharif 2025', 'Rabi 2025-26'
  populationSize: number;
  selectionsRetained: number;
  selectionCriteria: string[];
  observations: string;
  nurseryRef?: string;
  trialRefs?: string[];
}

// ============= Nursery =============
export type NurseryStatus = 'Planned' | 'Sown' | 'Growing' | 'Harvesting' | 'Completed';
export type NurseryType = 'Crossing block' | 'Selection nursery' | 'Multiplication' | 'Quarantine';

export interface Nursery {
  id: string;                       // NUR-2026-XXX
  name: string;
  type: NurseryType;
  programRefs: string[];             // linked breeding programs
  crop: string;
  location: { facility: string; block: string; rows: number; plants: number };
  season: string;
  status: NurseryStatus;
  sownDate?: string;
  harvestDate?: string;
  entriesPlanted: Array<{
    entryCode: string;
    parentMale: string;
    parentFemale: string;
    plotsAssigned: number;
    survived: number;
    notes?: string;
  }>;
  crossesMade: number;
  crossesSuccessful: number;
  responsibleStaff: string[];
  notes?: string;
}

// ============= Trial / MLT =============
export type TrialType = 'Single-location' | 'Multi-location' | 'On-farm' | 'Demonstration';
export type TrialDesign = 'RCBD' | 'CRD' | 'Alpha-lattice' | 'Augmented' | 'Split-plot';
export type TrialStatus = 'Planning' | 'Approved' | 'Sown' | 'In progress' | 'Harvested' | 'Analyzed' | 'Completed' | 'Cancelled';

export interface Trial {
  id: string;                       // TRL-2026-XXX
  name: string;
  type: TrialType;
  design: TrialDesign;
  programRef?: string;
  crop: string;
  season: string;
  status: TrialStatus;
  startDate: string;
  expectedHarvest: string;
  actualHarvest?: string;
  leadResearcher: string;
  objectives: string[];
  entries: TrialEntry[];             // candidate lines + check varieties
  locations: TrialLocation[];        // for MLT, multiple locations
  replications: number;
  totalPlots: number;
  notes?: string;
  finalAnalysis?: TrialAnalysis;
}

export interface TrialEntry {
  code: string;                      // E01, E02, ...
  name: string;                      // 'Candidate Line CL-2024-15' or 'Check: Bt-102'
  type: 'Candidate' | 'Check' | 'Control';
  germplasmRef?: string;             // links to GermplasmAccession.id
  source: string;
  notes?: string;
}

export type AgroClimaticZone =
  | 'North-West plains' | 'Western dry' | 'Central plateau' | 'Eastern plateau'
  | 'Southern peninsular' | 'Hill region' | 'Coastal' | 'North-East';

export interface TrialLocation {
  id: string;                       // TLOC-XXX
  name: string;                      // 'Hyderabad research farm', 'Coimbatore station'
  state: string;                     // 'Telangana', 'Tamil Nadu'
  agroClimaticZone: AgroClimaticZone;
  coordinates: { latitude: number; longitude: number; altitude: number };
  soilType: string;                  // 'Black cotton soil', 'Red sandy loam'
  rainfall: number;                  // mm/year, historical avg
  fieldStaff: string;
  contactPhone?: string;
  status: 'Planned' | 'Sown' | 'In progress' | 'Harvested' | 'Cancelled';
  sownDate?: string;
  observations: number;              // count of observations recorded so far
  pendingObservations: number;
  lastUpdateAt?: string;
  plotMap: PlotCell[];               // layout of plots
  environmentalData: EnvironmentalReading[];
}

export interface PlotCell {
  plotNumber: string;                // 'P-001'
  row: number;
  col: number;
  entryCode: string;
  replication: number;
  area: number;                      // sqm
  status: 'Planned' | 'Sown' | 'Growing' | 'Harvested' | 'Failed';
}

export interface EnvironmentalReading {
  date: string;
  temperatureMin: number;
  temperatureMax: number;
  rainfall: number;
  humidity: number;
  soilMoisture?: number;
  source: 'Manual' | 'IoT sensor' | 'Weather API';
}

export interface TrialAnalysis {
  generatedAt: string;
  method: 'ANOVA' | 'BLUP' | 'Combined';
  entryRankings: Array<{
    entryCode: string;
    entryName: string;
    meanYield: number;
    stdError: number;
    rank: number;
    lsdLetters: string;             // statistical grouping letters: 'a', 'ab', 'b', etc.
  }>;
  locationBreakdown: Array<{
    locationId: string;
    locationName: string;
    bestEntry: string;
    yieldRange: { min: number; max: number };
    cv: number;                      // coefficient of variation
  }>;
  gxeInteractions: Array<{
    entryCode: string;
    stability: 'High' | 'Medium' | 'Low';
    adaptedZones: AgroClimaticZone[];
  }>;
  aiInsights: string[];
}

// ============= Phenotyping =============
export type ObservationMethod = 'Manual field walk' | 'AI image analysis' | 'Drone imagery' | 'IoT sensor' | 'Lab analysis';

export interface PhenotypeObservation {
  id: string;                       // OBS-XXXXX
  trialId: string;
  locationId: string;
  plotNumber: string;
  entryCode: string;
  date: string;
  growthStage: string;               // 'Vegetative', 'Flowering', 'Maturity'
  observedBy: string;
  method: ObservationMethod;
  measurements: PhenotypeMeasurement[];
  photos: string[];
  notes?: string;
}

export interface PhenotypeMeasurement {
  trait: string;                     // 'Plant height', 'Days to flowering', 'Disease score'
  value: number | string;
  unit?: string;
  protocol?: string;                 // 'IBPGR descriptor 2.1', etc.
  aiConfidence?: number;             // 0-100, if method=AI
}

// ============= Variety =============
export type VarietyStatus = 'Candidate' | 'Pre-release' | 'Released' | 'Withdrawn';
export type IPProtection = 'None' | 'PVP (Plant variety protection)' | 'Patent' | 'Trade secret';

export interface Variety {
  id: string;                       // VAR-2026-XXX
  name: string;                      // 'GH-BT-102'
  crop: string;
  category: 'Hybrid' | 'Open-pollinated' | 'Composite' | 'Synthetic';
  status: VarietyStatus;
  parentMale: string;
  parentFemale: string;
  programRef?: string;
  releaseYear?: number;
  registrationNumber?: string;
  ipProtection: IPProtection;
  recommendedZones: AgroClimaticZone[];
  recommendedSeasons: string[];
  targetMarkets: string[];           // 'Telangana', 'AP', 'Karnataka cotton belt'
  parentLines: { male: string; female: string };
  agronomicSpecs: {
    daysToMaturity: number;
    plantHeight: number;             // cm
    yieldPotential: number;           // quintals/hectare
    seedRate: number;                 // kg/hectare
  };
  qualitySpecs: {
    germinationMin: number;          // %
    physicalPurityMin: number;
    geneticPurityMin: number;
    moistureMax: number;
  };
  keyTraits: string[];
  multiLocationTrialRefs: string[];
  releaseDocuments: string[];
  notes?: string;
}

// ============= Registration =============
export type RegStatus = 'Draft' | 'Submitted' | 'Under review' | 'Approved' | 'Granted' | 'Rejected' | 'Expired';
export type DUSTestStatus = 'Not started' | 'In progress' | 'Passed' | 'Failed' | 'Re-test required';

export interface VarietyRegistration {
  id: string;                       // REG-2026-XXX
  varietyRef: string;                // links to Variety.id
  varietyName: string;
  applicationType: 'PPV&FRA' | 'CSC' | 'UPOV' | 'Patent' | 'GMO biosafety';
  applicationNumber?: string;
  status: RegStatus;
  filedDate?: string;
  decisionDate?: string;
  validityYears?: number;
  dusStatus: DUSTestStatus;
  dusLocations?: string[];
  dusYears?: string[];                // 'Year 1', 'Year 2'
  applicant: string;
  submittedBy: string;
  documents: Array<{ name: string; uploadedAt: string; type: string }>;
  fees: { applicationFee?: number; testingFee?: number; renewalFee?: number };
  notes?: string;
  timeline: Array<{ stage: string; date: string; user: string; comment?: string }>;
}

// ============= Dashboard =============
export interface PipelineStage {
  id: string;
  label: string;
  count: number;
  description?: string;
}

export interface DashboardTrialLocation {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  activeTrials: number;
  crops: string[];
  trials?: Array<{
    id: string;
    crop: string;
    focus: string;
    coordinator: string;
    status: string;
  }>;
  environmental?: {
    avgTemp: string;
    rainfall: string;
    soilType: string;
    lastObservation: string;
  };
}

export interface DashboardObservation {
  id: string;
  observerName: string;
  observerInitials: string;
  trialRef: string;
  trialName: string;
  locationName: string;
  plotEntry: string;
  summary: string;
  method: 'manual' | 'ai' | 'drone' | 'sensor';
  timestamp: string;
}

export type TaskCategory =
  | 'observation_due'
  | 'approval_pending'
  | 'data_review'
  | 'registration_milestone';

export interface PendingTask {
  id: string;
  category: TaskCategory;
  title: string;
  dueDate: string;
  severity: 'critical' | 'warning' | 'info';
  contextRef?: string;
  actionLabel: string;
  actionHref?: string;
}

export interface GeneticGainPoint {
  cycleLabel: string;
  actualGainPct: number;
  targetGainPct: number;
}

export type TraitCategory =
  | 'Agronomic'
  | 'Quality'
  | 'Stress tolerance'
  | 'Disease resistance'
  | 'Morphological';
