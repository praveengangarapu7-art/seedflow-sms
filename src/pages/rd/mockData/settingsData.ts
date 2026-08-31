export interface TrialTemplate {
  id: string;
  name: string;
  type: string;
  design: string;
  crop: string;
  replications: number;
  observationsScheduled: number;
  lastUsed: string;
}

export interface TraitDefinition {
  id: string;
  name: string;
  category: 'Agronomic' | 'Quality' | 'Stress tolerance' | 'Disease resistance' | 'Morphological';
  unit: string;
  protocol: string;
  standardRef: 'ICAR' | 'IBPGR' | 'Custom';
  applicableCrops: string[];
  active: boolean;
}

export interface CropConfig {
  id: string;
  name: string;
  scientificName: string;
  family: string;
  cultivarsCount: number;
  active: boolean;
}

export interface CultivarConfig {
  id: string;
  name: string;
  crop: string;
  type: 'Cultivar' | 'Check' | 'Reference';
  source: string;
  active: boolean;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerEvent: string;
  conditions: string;
  actionText: string;
  triggerCount: number;
  lastTriggered: string;
  active: boolean;
}

export interface RDUserPermission {
  id: string;
  name: string;
  email: string;
  role: 'Researcher' | 'Lead Breeder' | 'Field Staff' | 'Compliance Officer' | 'Module Admin' | 'Read-only';
  assignedPrograms: string[];
  lastActive: string;
  active: boolean;
}

export interface RDIntegration {
  id: string;
  name: string;
  description: string;
  status: 'Connected' | 'Disconnected' | 'Setup required';
  lastSync: string;
}

export interface RDAuditLog {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: 'Created' | 'Updated' | 'Deleted' | 'Approved' | 'Rejected' | 'Submitted';
  entityType: 'Trial' | 'Variety' | 'Registration' | 'Breeding program' | 'Observation' | 'Settings';
  entityId: string;
  details: string;
  ipAddress: string;
}

export const templates: TrialTemplate[] = [
  {
    id: 'TMP-001',
    name: 'Standard cotton MLT — 5 locations, RCBD, 3 reps',
    type: 'Multi-location',
    design: 'RCBD',
    crop: 'Cotton',
    replications: 3,
    observationsScheduled: 18,
    lastUsed: '2026-05-20'
  },
  {
    id: 'TMP-002',
    name: 'Maize hybrid evaluation — 4 locations, Alpha-lattice, 4 reps',
    type: 'Multi-location',
    design: 'Alpha-lattice',
    crop: 'Maize',
    replications: 4,
    observationsScheduled: 24,
    lastUsed: '2026-05-18'
  },
  {
    id: 'TMP-003',
    name: 'Paddy single-location trial — RCBD, 3 reps',
    type: 'Single-location',
    design: 'RCBD',
    crop: 'Paddy',
    replications: 3,
    observationsScheduled: 12,
    lastUsed: '2026-05-22'
  },
  {
    id: 'TMP-004',
    name: 'On-farm demo — 5 farmer plots, single rep',
    type: 'On-farm',
    design: 'Simple Random',
    crop: 'Crop-agnostic',
    replications: 1,
    observationsScheduled: 6,
    lastUsed: '2026-05-15'
  },
  {
    id: 'TMP-005',
    name: 'Drought tolerance screening — 3 locations, augmented design',
    type: 'Multi-location',
    design: 'Augmented',
    crop: 'Sorghum',
    replications: 2,
    observationsScheduled: 15,
    lastUsed: '2026-05-11'
  },
  {
    id: 'TMP-006',
    name: 'Disease resistance trial — RCBD with heavy blight pressure',
    type: 'Single-location',
    design: 'RCBD',
    crop: 'Tomato',
    replications: 3,
    observationsScheduled: 16,
    lastUsed: '2026-05-09'
  },
  {
    id: 'TMP-007',
    name: 'Seed multiplication block — 1 location, simple layout',
    type: 'Single-location',
    design: 'CRD',
    crop: 'Soybean',
    replications: 1,
    observationsScheduled: 4,
    lastUsed: '2026-04-30'
  },
  {
    id: 'TMP-008',
    name: 'Variety release pre-trial — 6 locations, RCBD, 4 reps',
    type: 'Multi-location',
    design: 'RCBD',
    crop: 'Crop-agnostic',
    replications: 4,
    observationsScheduled: 30,
    lastUsed: '2026-05-21'
  }
];

export const traits: TraitDefinition[] = [
  // Agronomic
  {
    id: 'TRT-AGR-001',
    name: 'Plant height',
    category: 'Agronomic',
    unit: 'cm',
    protocol: 'Measure from ground level to the tip of the main stem/panicle at physiological maturity.',
    standardRef: 'ICAR',
    applicableCrops: ['Maize', 'Paddy', 'Sorghum', 'Cotton', 'Pearl millet'],
    active: true
  },
  {
    id: 'TRT-AGR-002',
    name: 'Days to maturity',
    category: 'Agronomic',
    unit: 'days',
    protocol: 'Number of days from the date of sowing to when 90% of the plants show physiological maturity.',
    standardRef: 'ICAR',
    applicableCrops: ['All crops'],
    active: true
  },
  {
    id: 'TRT-AGR-003',
    name: 'Boll weight',
    category: 'Agronomic',
    unit: 'g',
    protocol: 'Average weight of 20 fully opened dry bolls harvested from the middle section of target plots.',
    standardRef: 'ICAR',
    applicableCrops: ['Cotton'],
    active: true
  },
  {
    id: 'TRT-AGR-004',
    name: 'Plant density',
    category: 'Agronomic',
    unit: 'plants/m²',
    protocol: 'Count total emerged plants within a designated 1x1 meter square quadrant.',
    standardRef: 'Custom',
    applicableCrops: ['Paddy', 'Wheat', 'Soybean'],
    active: true
  },
  {
    id: 'TRT-AGR-005',
    name: 'Tiller count',
    category: 'Agronomic',
    unit: 'count',
    protocol: 'Average number of productive tillers per plant sampled randomly from 10 points in the inner rows.',
    standardRef: 'IBPGR',
    applicableCrops: ['Paddy', 'Wheat', 'Sorghum', 'Pearl millet'],
    active: true
  },
  {
    id: 'TRT-AGR-006',
    name: 'Panicle length',
    category: 'Agronomic',
    unit: 'cm',
    protocol: 'Measure from the panicle base node to the top spikelet tip.',
    standardRef: 'IBPGR',
    applicableCrops: ['Paddy', 'Sorghum', 'Pearl millet'],
    active: true
  },
  {
    id: 'TRT-AGR-007',
    name: 'Grain weight',
    category: 'Agronomic',
    unit: 'g/1000 seeds',
    protocol: 'Count 1000 sound dry seeds at 12% moisture and record mass.',
    standardRef: 'ICAR',
    applicableCrops: ['Maize', 'Paddy', 'Wheat', 'Soybean', 'Sorghum'],
    active: true
  },
  // Quality
  {
    id: 'TRT-QLT-001',
    name: 'Fiber length',
    category: 'Quality',
    unit: 'mm',
    protocol: 'Upper half mean length measured using automated High Volume Instrument (HVI) fiber standards.',
    standardRef: 'ICAR',
    applicableCrops: ['Cotton'],
    active: true
  },
  {
    id: 'TRT-QLT-002',
    name: 'Grain length',
    category: 'Quality',
    unit: 'mm',
    protocol: 'Average length of 10 fully polished sound grains measured using digital optical micrometer gauges.',
    standardRef: 'IBPGR',
    applicableCrops: ['Paddy'],
    active: true
  },
  {
    id: 'TRT-QLT-003',
    name: 'Protein content',
    category: 'Quality',
    unit: '%',
    protocol: 'Analyze whole seed flour using Near-Infrared Spectroscopy (NIRS) calibrated to wet laboratory assays.',
    standardRef: 'Custom',
    applicableCrops: ['Soybean', 'Wheat', 'Pulses'],
    active: true
  },
  {
    id: 'TRT-QLT-004',
    name: 'Oil content',
    category: 'Quality',
    unit: '%',
    protocol: 'Non-destructive determination using nuclear magnetic resonance (NMR) spectrometer on dry seed.',
    standardRef: 'ICAR',
    applicableCrops: ['Sunflower', 'Groundnut', 'Soybean'],
    active: true
  },
  {
    id: 'TRT-QLT-005',
    name: 'Aroma score',
    category: 'Quality',
    unit: 'score (1-9)',
    protocol: 'Sensory evaluation of cooked polished grain by expert panel using ICAR Basmati standard protocols.',
    standardRef: 'ICAR',
    applicableCrops: ['Paddy'],
    active: true
  },
  // Stress tolerance
  {
    id: 'TRT-STR-001',
    name: 'Drought tolerance score',
    category: 'Stress tolerance',
    unit: 'index (1-9)',
    protocol: 'Visual scale rating leaf rolling, tip drying, and structural recovery under designated water stress.',
    standardRef: 'IBPGR',
    applicableCrops: ['All crops'],
    active: true
  },
  {
    id: 'TRT-STR-002',
    name: 'Heat tolerance score',
    category: 'Stress tolerance',
    unit: 'index (1-9)',
    protocol: 'Evaluates pollen viability percentage and canopy temperature depression during heat spikes.',
    standardRef: 'Custom',
    applicableCrops: ['Maize', 'Wheat', 'Tomato'],
    active: true
  },
  {
    id: 'TRT-STR-003',
    name: 'Salt tolerance score',
    category: 'Stress tolerance',
    unit: 'index (1-9)',
    protocol: 'Measures survival and chlorophyll retention ratios under salinity levels exceeding EC 8.0 dS/m.',
    standardRef: 'IBPGR',
    applicableCrops: ['Paddy', 'Sorghum', 'Wheat'],
    active: true
  },
  // Disease resistance
  {
    id: 'TRT-DIS-001',
    name: 'Bacterial blight score',
    category: 'Disease resistance',
    unit: 'scale (0-9)',
    protocol: 'Rate leaf area lesions 14 days post clip inoculation using blight pathogen isolates.',
    standardRef: 'ICAR',
    applicableCrops: ['Paddy', 'Cotton'],
    active: true
  },
  {
    id: 'TRT-DIS-002',
    name: 'Rust severity',
    category: 'Disease resistance',
    unit: '%',
    protocol: 'Percentage of leaf canopy covered by active sporulating rust pustules evaluated at flowering.',
    standardRef: 'ICAR',
    applicableCrops: ['Soybean', 'Wheat', 'Sunflower'],
    active: true
  },
  {
    id: 'TRT-DIS-003',
    name: 'Wilt incidence',
    category: 'Disease resistance',
    unit: '%',
    protocol: 'Percentage of wilted plants counted per total plot population in Fusarium nursery rows.',
    standardRef: 'ICAR',
    applicableCrops: ['Chilli', 'Tomato', 'Pulses'],
    active: true
  },
  // Morphological
  {
    id: 'TRT-MOR-001',
    name: 'Flower color',
    category: 'Morphological',
    unit: 'code',
    protocol: 'Standard visual descriptor rating matching established cultivar color swatch catalogs.',
    standardRef: 'IBPGR',
    applicableCrops: ['Cotton', 'Tomato', 'Chilli', 'Pulses'],
    active: true
  },
  {
    id: 'TRT-MOR-002',
    name: 'Seed color',
    category: 'Morphological',
    unit: 'code',
    protocol: 'Visual rating of dry clean harvested seeds under standard D65 daylight viewing cabinets.',
    standardRef: 'IBPGR',
    applicableCrops: ['All crops'],
    active: true
  }
];

export const crops: CropConfig[] = [
  { id: 'CRP-001', name: 'Cotton', scientificName: 'Gossypium hirsutum', family: 'Malvaceae', cultivarsCount: 8, active: true },
  { id: 'CRP-002', name: 'Maize', scientificName: 'Zea mays', family: 'Poaceae', cultivarsCount: 12, active: true },
  { id: 'CRP-003', name: 'Paddy', scientificName: 'Oryza sativa', family: 'Poaceae', cultivarsCount: 15, active: true },
  { id: 'CRP-004', name: 'Sorghum', scientificName: 'Sorghum bicolor', family: 'Poaceae', cultivarsCount: 6, active: true },
  { id: 'CRP-005', name: 'Pearl millet', scientificName: 'Pennisetum glaucum', family: 'Poaceae', cultivarsCount: 5, active: true },
  { id: 'CRP-006', name: 'Sunflower', scientificName: 'Helianthus annuus', family: 'Asteraceae', cultivarsCount: 4, active: true },
  { id: 'CRP-007', name: 'Soybean', scientificName: 'Glycine max', family: 'Fabaceae', cultivarsCount: 6, active: true },
  { id: 'CRP-008', name: 'Groundnut', scientificName: 'Arachis hypogaea', family: 'Fabaceae', cultivarsCount: 5, active: true },
  { id: 'CRP-009', name: 'Tomato', scientificName: 'Solanum lycopersicum', family: 'Solanaceae', cultivarsCount: 9, active: true },
  { id: 'CRP-010', name: 'Chilli', scientificName: 'Capsicum annuum', family: 'Solanaceae', cultivarsCount: 7, active: true },
  { id: 'CRP-011', name: 'Wheat', scientificName: 'Triticum aestivum', family: 'Poaceae', cultivarsCount: 10, active: true },
  { id: 'CRP-012', name: 'Pulses', scientificName: 'Cajanus cajan', family: 'Fabaceae', cultivarsCount: 4, active: true }
];

export const cultivars: CultivarConfig[] = [
  { id: 'CUL-001', name: 'Bt-102', crop: 'Cotton', type: 'Check', source: 'SeedSphere Standard Check', active: true },
  { id: 'CUL-002', name: 'Pusa Basmati 1121', crop: 'Paddy', type: 'Cultivar', source: 'IARI Delhi', active: true },
  { id: 'CUL-003', name: 'Pioneer 30K78', crop: 'Maize', type: 'Check', source: 'Pioneer seeds', active: true },
  { id: 'CUL-004', name: 'NRCC 17', crop: 'Soybean', type: 'Reference', source: 'ICAR-IISR Indore', active: true },
  { id: 'CUL-005', name: 'KBSH-44', crop: 'Sunflower', type: 'Check', source: 'UAS Bangalore', active: true },
  { id: 'CUL-006', name: 'Arka Kalyan', crop: 'Tomato', type: 'Cultivar', source: 'IIHR Bangalore', active: true },
  { id: 'CUL-007', name: 'G-209', crop: 'Groundnut', type: 'Check', source: 'SeedSphere R&D', active: true },
  { id: 'CUL-008', name: 'Jowar-18', crop: 'Sorghum', type: 'Check', source: 'SeedSphere R&D', active: true },
  { id: 'CUL-009', name: 'CO-51', crop: 'Paddy', type: 'Cultivar', source: 'TNAU Coimbatore', active: true },
  { id: 'CUL-010', name: 'PR-126', crop: 'Paddy', type: 'Check', source: 'PAU Ludhiana', active: true }
];

export const workflowRules: WorkflowRule[] = [
  {
    id: 'WFR-001',
    name: 'Notify breeder when trial observation overdue',
    description: 'Triggers when a scheduled observation date passes without any recorded observations.',
    trigger: 'Observation Schedule',
    triggerEvent: 'Observation Overdue (+48 hrs)',
    conditions: 'Trial status === "Active" AND observations.recorded === false',
    actionText: 'Send email notification to Dr. Anita Desai & field operations team',
    triggerCount: 14,
    lastTriggered: '2026-05-24',
    active: true
  },
  {
    id: 'WFR-002',
    name: 'Auto-archive completed trials',
    description: 'Automatically archives full trial datasets 60 days after trial status changes to completed.',
    trigger: 'Trial Status Update',
    triggerEvent: 'Status Changed to "Completed"',
    conditions: 'Trial duration days > 90 AND final_report_attached === true',
    actionText: 'Update database trial active status to "Archived" & clear active field markers',
    triggerCount: 4,
    lastTriggered: '2026-05-10',
    active: true
  },
  {
    id: 'WFR-003',
    name: 'Alert on DUS Year 2 deadline',
    description: 'Fires warnings 30 days before DUS Year 2 testing window closes to prompt test uploading.',
    trigger: 'Registration Tracker',
    triggerEvent: '30 Days Before Season End',
    conditions: 'Registration status === "Under review" AND DUS_Year_2 === "In progress"',
    actionText: 'Flag compliance dashboard & send urgent SMS alert to Dr. Vijay Kumar',
    triggerCount: 2,
    lastTriggered: '2026-05-22',
    active: true
  },
  {
    id: 'WFR-004',
    name: 'Pre-release readiness check',
    description: 'Runs dynamic parameter evaluation checklists when a breeding variety reaches F6+ generation.',
    trigger: 'Breeding Generation Increment',
    triggerEvent: 'Generation advanced to "F6"',
    conditions: 'Genetic_purity >= 98% AND yield_potential_vs_check >= 10%',
    actionText: 'Auto-promote to "Candidate" status & notify Breeding Committee leads',
    triggerCount: 7,
    lastTriggered: '2026-05-18',
    active: true
  },
  {
    id: 'WFR-005',
    name: 'Cross-program seed availability alert',
    description: 'Alerts active breeding programs when germplasm stocks requested by other regions fall below 5kg.',
    trigger: 'Nursery Stock Change',
    triggerEvent: 'Available weight < 5.0 kg',
    conditions: 'Germplasm active_requests > 0',
    actionText: 'Create priority inventory task "Replicate Germplasm Stock" at Coimbatore farm',
    triggerCount: 1,
    lastTriggered: '2026-05-01',
    active: false
  },
  {
    id: 'WFR-006',
    name: 'Flag yield outliers',
    description: 'Automatically flags plot observations where measured yield deviates by more than 40% from the trial average.',
    trigger: 'Observation Recorded',
    triggerEvent: 'Data Entry Finalized',
    conditions: 'measured_yield_potential < 0.6 * trial_average OR measured_yield_potential > 1.4 * trial_average',
    actionText: 'Apply warning flag "Yield Outlier" to plot row & notify lead researcher',
    triggerCount: 22,
    lastTriggered: '2026-05-23',
    active: true
  }
];

export const users: RDUserPermission[] = [
  { id: 'USR-001', name: 'Dr. Anita Desai', email: 'anita.desai@seedsphere.in', role: 'Lead Breeder', assignedPrograms: ['BP-Cotton-2026', 'BP-Sorghum-2025'], lastActive: '2026-05-24 18:30', active: true },
  { id: 'USR-002', name: 'Dr. Vijay Kumar', email: 'vijay.kumar@seedsphere.in', role: 'Compliance Officer', assignedPrograms: ['All programs'], lastActive: '2026-05-24 17:15', active: true },
  { id: 'USR-003', name: 'S. Raghavan', email: 's.raghavan@seedsphere.in', role: 'Researcher', assignedPrograms: ['BP-Maize-2026', 'BP-Paddy-2026'], lastActive: '2026-05-24 16:45', active: true },
  { id: 'USR-004', name: 'M. Verma', email: 'm.verma@seedsphere.in', role: 'Researcher', assignedPrograms: ['BP-Sunflower-2025'], lastActive: '2026-05-23 15:30', active: true },
  { id: 'USR-005', name: 'R. K. Swamy', email: 'rk.swamy@seedsphere.in', role: 'Field Staff', assignedPrograms: ['BP-Cotton-2026 (Coimbatore)'], lastActive: '2026-05-24 12:00', active: true },
  { id: 'USR-006', name: 'Priya Sen', email: 'priya.sen@seedsphere.in', role: 'Field Staff', assignedPrograms: ['BP-Maize-2026 (Ludhiana)'], lastActive: '2026-05-24 14:22', active: true },
  { id: 'USR-007', name: 'Naveen Reddy', email: 'naveen.reddy@seedsphere.in', role: 'Field Staff', assignedPrograms: ['BP-Paddy-2026 (Hyderabad)'], lastActive: '2026-05-22 09:30', active: true },
  { id: 'USR-008', name: 'Ankita Joshi', email: 'ankita.joshi@seedsphere.in', role: 'Module Admin', assignedPrograms: ['All programs'], lastActive: '2026-05-24 19:12', active: true },
  { id: 'USR-009', name: 'Rajesh Mishra', email: 'rajesh.mishra@seedsphere.in', role: 'Read-only', assignedPrograms: ['BP-Cotton-2026', 'BP-Maize-2026'], lastActive: '2026-05-20 16:40', active: true },
  { id: 'USR-010', name: 'K. Parthasarathy', email: 'k.partha@seedsphere.in', role: 'Researcher', assignedPrograms: ['BP-Soybean-2026'], lastActive: '2026-05-24 11:15', active: true }
];

export const integrations: RDIntegration[] = [
  { id: 'INT-001', name: 'ICAR-IIVR Cultivar database sync', description: 'Pulls reference crop and standard check profiles directly from ICAR-IIVR national portal catalogs.', status: 'Connected', lastSync: '2026-05-24 02:00' },
  { id: 'INT-002', name: 'NBPGR national germplasm registry', description: 'Provides bidirectional syncing with the National Bureau of Plant Genetic Resources seed accessions catalog.', status: 'Connected', lastSync: '2026-05-23 23:00' },
  { id: 'INT-003', name: 'IMD live weather API feeds', description: 'Pulls daily meteorological measurements, temperatures, and micro-climatic humidity profiles per active trial coordinate.', status: 'Connected', lastSync: '2026-05-24 18:00' },
  { id: 'INT-004', name: 'Drone orthomosaic spectral mapping', description: 'Auto-ingestion portal capturing multi-spectral drone imagery files to process canopy index and plant counts.', status: 'Setup required', lastSync: '—' },
  { id: 'INT-005', name: 'IoT field sensor networks', description: 'Links real-time soil moisture tensiometer sensor records directly to plot observation logs.', status: 'Connected', lastSync: '2026-05-24 18:25' },
  { id: 'INT-006', name: 'PPV&FRA portal filing sync', description: 'Validates PVP application statuses, hearing schedules, and DUS testing allocations.', status: 'Disconnected', lastSync: '2026-05-15 10:00' },
  { id: 'INT-007', name: 'Direct R / SAS scripting export', description: 'Pushes standardized data files and plot maps directly to regional statistics models.', status: 'Setup required', lastSync: '—' },
  { id: 'INT-008', name: 'Offline mobile field scanner sync', description: 'Offline synchronization protocol loading leaf photos and canopy heights collected via field staff app.', status: 'Connected', lastSync: '2026-05-24 16:30' }
];

export const auditLogEntries: RDAuditLog[] = [
  { id: 'AUD-001', timestamp: '2026-05-24 18:22', user: 'Dr. Anita Desai', userRole: 'Lead Breeder', action: 'Created', entityType: 'Trial', entityId: 'TRL-2026-018', details: 'Initialized standard RCBD multi-location yield trial for cotton candidates across Hyderabad and Guntur locations.', ipAddress: '192.168.1.42 · Web' },
  { id: 'AUD-002', timestamp: '2026-05-24 16:40', user: 'Ankita Joshi', userRole: 'Module Admin', action: 'Updated', entityType: 'Settings', entityId: 'WFR-001', details: 'Modified workflow rule settings "Notify breeder when trial observation overdue" to decrease delay margin from 72 to 48 hours.', ipAddress: '192.168.1.15 · Web' },
  { id: 'AUD-003', timestamp: '2026-05-24 15:10', user: 'Dr. Vijay Kumar', userRole: 'Compliance Officer', action: 'Submitted', entityType: 'Registration', entityId: 'REG-2026-008', details: 'Filing package, fee receipts, and distinctness trial summary data finalized and uploaded to PPV&FRA compliance portal.', ipAddress: '192.168.1.99 · Web' },
  { id: 'AUD-004', timestamp: '2026-05-24 12:35', user: 'R. K. Swamy', userRole: 'Field Staff', action: 'Created', entityType: 'Observation', entityId: 'OBS-CT-904', details: 'Recorded 24 plant height and boll weight observations for plot row block A at Coimbatore station.', ipAddress: '172.16.82.4 · Mobile' },
  { id: 'AUD-005', timestamp: '2026-05-23 17:05', user: 'Dr. Anita Desai', userRole: 'Lead Breeder', action: 'Updated', entityType: 'Variety', entityId: 'VAR-2026-015', details: 'Advanced variety status from Pre-release candidate to released commercial category, registering standard code designation.', ipAddress: '192.168.1.42 · Web' },
  { id: 'AUD-006', timestamp: '2026-05-23 11:30', user: 'Ankita Joshi', userRole: 'Module Admin', action: 'Created', entityType: 'Settings', entityId: 'USR-010', details: 'Authorized user access profile for K. Parthasarathy under researcher permissions assigned to Soybean program.', ipAddress: '192.168.1.15 · Web' },
  { id: 'AUD-007', timestamp: '2026-05-22 14:00', user: 'S. Raghavan', userRole: 'Researcher', action: 'Created', entityType: 'Breeding program', entityId: 'BP-Paddy-2026', details: 'Created breeding target program focusing on short-duration aromatic Basmati introgressed lines for hill regions.', ipAddress: '192.168.1.58 · Web' },
  { id: 'AUD-008', timestamp: '2026-05-22 10:15', user: 'Dr. Vijay Kumar', userRole: 'Compliance Officer', action: 'Rejected', entityType: 'Registration', entityId: 'REG-2026-015', details: 'Withdrew registration application for VAR-2026-017 due to early blight susceptibility recorded in standard check trials.', ipAddress: '192.168.1.99 · Web' },
  { id: 'AUD-009', timestamp: '2026-05-21 16:30', user: 'Ankita Joshi', userRole: 'Module Admin', action: 'Updated', entityType: 'Settings', entityId: 'INT-005', details: 'Reconfigured soil telemetry sensor connection tokens, resolving synchronization timeouts at Ludhiana plots.', ipAddress: '192.168.1.15 · Web' },
  { id: 'AUD-010', timestamp: '2026-05-21 09:40', user: 'Priya Sen', userRole: 'Field Staff', action: 'Updated', entityType: 'Observation', entityId: 'OBS-MZ-402', details: 'Corrected seedling emergence counts from 45 to 85, rectifying mobile scanner input threshold error.', ipAddress: '172.16.82.11 · Mobile' }
];
