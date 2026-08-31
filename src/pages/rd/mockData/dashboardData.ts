import type {
  PipelineStage,
  DashboardTrialLocation,
  DashboardObservation,
  PendingTask,
  GeneticGainPoint,
} from '@/types/rd';

export const rdKpis = [
  { id: 'kpi-1', label: 'Active breeding programs', value: '24', icon: 'Workflow', trend: '+2 from last season', trendType: 'positive' },
  { id: 'kpi-2', label: 'Trials in progress', value: '18', subLabel: 'across 42 locations', icon: 'FlaskConical', trend: '+4 locations added', trendType: 'info' },
  { id: 'kpi-3', label: 'Varieties in pipeline', value: '12', subLabel: '4 pre-release', icon: 'Sprout', trend: 'On track', trendType: 'positive' },
  { id: 'kpi-4', label: 'Genetic gain (cycle avg)', value: '+8.4%', subLabel: 'Yield improvement', icon: 'TrendingUp', trend: 'Target: +7.5%', trendType: 'positive' },
];

export const pipelineStages: PipelineStage[] = [
  { id: 'stage-germplasm', label: 'Germplasm', count: 847, description: 'Total genetic resources in catalog' },
  { id: 'stage-f1', label: 'F1 crosses', count: 124, description: 'First-generation crosses underway' },
  { id: 'stage-f2-f4', label: 'F2-F4 selections', count: 68, description: 'Lines being selected through generations' },
  { id: 'stage-mlt', label: 'MLT trials', count: 18, description: 'Multi-location trials in progress' },
  { id: 'stage-pre-release', label: 'Pre-release', count: 4, description: 'Final validation stage' },
  { id: 'stage-released', label: 'Released this year', count: 2, description: 'Commercially released varieties' },
];

export const trialLocations: DashboardTrialLocation[] = [
  {
    id: 'loc-hyd',
    name: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.385,
    longitude: 78.486,
    activeTrials: 5,
    crops: ['Cotton', 'Maize', 'Sorghum'],
    trials: [
      { id: 'TRL-2026-101', crop: 'Cotton', focus: 'Yield potential under drip irrigation', coordinator: 'Dr. Priya Sharma', status: 'Active' },
      { id: 'TRL-2026-102', crop: 'Maize', focus: 'Heat tolerance screening', coordinator: 'Sunita Rao', status: 'Active' },
      { id: 'TRL-2026-103', crop: 'Sorghum', focus: 'Grain quality & starch content', coordinator: 'Dr. Priya Sharma', status: 'Active' },
      { id: 'TRL-2026-104', crop: 'Cotton', focus: 'Bollworm resistance screening', coordinator: 'Sunita Rao', status: 'Active' },
      { id: 'TRL-2026-105', crop: 'Maize', focus: 'Nitrogen use efficiency', coordinator: 'Dr. Priya Sharma', status: 'Active' }
    ],
    environmental: {
      avgTemp: '32°C',
      rainfall: '780 mm/year',
      soilType: 'Black cotton soil',
      lastObservation: '2 hours ago'
    }
  },
  {
    id: 'loc-cbe',
    name: 'Coimbatore',
    state: 'Tamil Nadu',
    latitude: 11.016,
    longitude: 76.955,
    activeTrials: 4,
    crops: ['Cotton', 'Sunflower'],
    trials: [
      { id: 'TRL-2026-106', crop: 'Cotton', focus: 'Fiber strength and staple length', coordinator: 'Dr. Priya Sharma', status: 'Active' },
      { id: 'TRL-2026-107', crop: 'Sunflower', focus: 'High oleic acid breeding lines', coordinator: 'Ramesh Kumar', status: 'Active' },
      { id: 'TRL-2026-108', crop: 'Cotton', focus: 'Jassid resistance validation', coordinator: 'Dr. Priya Sharma', status: 'Active' },
      { id: 'TRL-2026-109', crop: 'Sunflower', focus: 'Drought tolerance and root architecture', coordinator: 'Ramesh Kumar', status: 'Active' }
    ],
    environmental: {
      avgTemp: '28°C',
      rainfall: '920 mm/year',
      soilType: 'Red sandy loam',
      lastObservation: '12 min ago'
    }
  },
  {
    id: 'loc-ldh',
    name: 'Ludhiana',
    state: 'Punjab',
    latitude: 30.901,
    longitude: 75.857,
    activeTrials: 6,
    crops: ['Maize', 'Wheat'],
    trials: [
      { id: 'TRL-2026-110', crop: 'Maize', focus: 'Late-season lodging resistance', coordinator: 'Ramesh Kumar', status: 'Active' },
      { id: 'TRL-2026-111', crop: 'Wheat', focus: 'Rust resistance (Ug99 screening)', coordinator: 'Dr. Priya Sharma', status: 'Active' },
      { id: 'TRL-2026-112', crop: 'Maize', focus: 'Water logging tolerance', coordinator: 'Ramesh Kumar', status: 'Active' },
      { id: 'TRL-2026-113', crop: 'Wheat', focus: 'Early heat stress adaptation', coordinator: 'Dr. Priya Sharma', status: 'Active' },
      { id: 'TRL-2026-114', crop: 'Maize', focus: 'Cold tolerance in baby corn', coordinator: 'Ramesh Kumar', status: 'Active' },
      { id: 'TRL-2026-115', crop: 'Wheat', focus: 'Zinc enrichment validation', coordinator: 'Dr. Priya Sharma', status: 'Active' }
    ],
    environmental: {
      avgTemp: '24°C',
      rainfall: '680 mm/year',
      soilType: 'Alluvial sandy clay loam',
      lastObservation: '38 min ago'
    }
  },
  {
    id: 'loc-pune',
    name: 'Pune',
    state: 'Maharashtra',
    latitude: 18.520,
    longitude: 73.856,
    activeTrials: 4,
    crops: ['Sorghum', 'Pulses'],
    trials: [
      { id: 'TRL-2026-116', crop: 'Sorghum', focus: 'Post-rainy drought tolerance', coordinator: 'Sunita Rao', status: 'Active' },
      { id: 'TRL-2026-117', crop: 'Pulses', focus: 'Fusarium wilt resistance in chickpea', coordinator: 'Vikram Singh', status: 'Active' },
      { id: 'TRL-2026-118', crop: 'Sorghum', focus: 'Shoot fly resistance screening', coordinator: 'Sunita Rao', status: 'Active' },
      { id: 'TRL-2026-119', crop: 'Pulses', focus: 'Pigeon pea sterility mosaic virus screening', coordinator: 'Vikram Singh', status: 'Active' }
    ],
    environmental: {
      avgTemp: '26°C',
      rainfall: '720 mm/year',
      soilType: 'Medium black clay soil',
      lastObservation: '2 hours ago'
    }
  },
  {
    id: 'loc-bhopal',
    name: 'Bhopal',
    state: 'Madhya Pradesh',
    latitude: 23.259,
    longitude: 77.412,
    activeTrials: 3,
    crops: ['Soybean', 'Maize'],
    trials: [
      { id: 'TRL-2026-120', crop: 'Soybean', focus: 'Yellow mosaic virus screening', coordinator: 'Vikram Singh', status: 'Active' },
      { id: 'TRL-2026-121', crop: 'Maize', focus: 'Intercropping efficiency validation', coordinator: 'Ramesh Kumar', status: 'Active' },
      { id: 'TRL-2026-122', crop: 'Soybean', focus: 'Early maturity selection', coordinator: 'Vikram Singh', status: 'Active' }
    ],
    environmental: {
      avgTemp: '30°C',
      rainfall: '1050 mm/year',
      soilType: 'Deep black soil (Vertisols)',
      lastObservation: '4 hours ago'
    }
  },
  {
    id: 'loc-jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.912,
    longitude: 75.787,
    activeTrials: 3,
    crops: ['Pearl millet', 'Pulses'],
    trials: [
      { id: 'TRL-2026-123', crop: 'Pearl millet', focus: 'Extreme drought & heat resilience', coordinator: 'Arjun Patel', status: 'Active' },
      { id: 'TRL-2026-124', crop: 'Pulses', focus: 'Salinity tolerance in moth bean', coordinator: 'Arjun Patel', status: 'Active' },
      { id: 'TRL-2026-125', crop: 'Pearl millet', focus: 'Downy mildew screening', coordinator: 'Arjun Patel', status: 'Active' }
    ],
    environmental: {
      avgTemp: '34°C',
      rainfall: '450 mm/year',
      soilType: 'Sodic/Sandy desert soil',
      lastObservation: '10 hours ago'
    }
  },
  {
    id: 'loc-lko',
    name: 'Lucknow',
    state: 'Uttar Pradesh',
    latitude: 26.846,
    longitude: 80.946,
    activeTrials: 4,
    crops: ['Paddy', 'Wheat'],
    trials: [
      { id: 'TRL-2026-126', crop: 'Paddy', focus: 'Direct seeded rice yield adaptation', coordinator: 'Dr. Priya Sharma', status: 'Active' },
      { id: 'TRL-2026-127', crop: 'Wheat', focus: 'Terminal heat stress tolerance', coordinator: 'Dr. Priya Sharma', status: 'Active' },
      { id: 'TRL-2026-128', crop: 'Paddy', focus: 'Bacterial leaf blight screening', coordinator: 'Dr. Priya Sharma', status: 'Active' },
      { id: 'TRL-2026-129', crop: 'Wheat', focus: 'Sodic soil tolerance trials', coordinator: 'Dr. Priya Sharma', status: 'Active' }
    ],
    environmental: {
      avgTemp: '27°C',
      rainfall: '940 mm/year',
      soilType: 'Loamy alluvial soil',
      lastObservation: '5 hours ago'
    }
  },
  {
    id: 'loc-blr',
    name: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.971,
    longitude: 77.594,
    activeTrials: 3,
    crops: ['Tomato', 'Chilli'],
    trials: [
      { id: 'TRL-2026-130', crop: 'Tomato', focus: 'Bacterial wilt resistance trials', coordinator: 'Priyanka Reddy', status: 'Active' },
      { id: 'TRL-2026-131', crop: 'Chilli', focus: 'Thrips and mites tolerance', coordinator: 'Priyanka Reddy', status: 'Active' },
      { id: 'TRL-2026-132', crop: 'Tomato', focus: 'Fruit firmness & shelf-life evaluation', coordinator: 'Priyanka Reddy', status: 'Active' }
    ],
    environmental: {
      avgTemp: '23°C',
      rainfall: '890 mm/year',
      soilType: 'Red gravelly clay loam',
      lastObservation: '8 hours ago'
    }
  },
  {
    id: 'loc-bbsr',
    name: 'Bhubaneswar',
    state: 'Odisha',
    latitude: 20.296,
    longitude: 85.824,
    activeTrials: 3,
    crops: ['Paddy', 'Pulses'],
    trials: [
      { id: 'TRL-2026-133', crop: 'Paddy', focus: 'Submergence tolerance (Sub1 gene validation)', coordinator: 'Vikram Singh', status: 'Active' },
      { id: 'TRL-2026-134', crop: 'Pulses', focus: 'Moisture stress in green gram', coordinator: 'Vikram Singh', status: 'Active' },
      { id: 'TRL-2026-135', crop: 'Paddy', focus: 'Coastal salinity trial adaptation', coordinator: 'Vikram Singh', status: 'Active' }
    ],
    environmental: {
      avgTemp: '29°C',
      rainfall: '1450 mm/year',
      soilType: 'Laterite and alluvial soil',
      lastObservation: '3 hours ago'
    }
  },
  {
    id: 'loc-ghy',
    name: 'Guwahati',
    state: 'Assam',
    latitude: 26.144,
    longitude: 91.736,
    activeTrials: 2,
    crops: ['Paddy'],
    trials: [
      { id: 'TRL-2026-136', crop: 'Paddy', focus: 'Submergence adaptation in local landraces', coordinator: 'Vikram Singh', status: 'Active' },
      { id: 'TRL-2026-137', crop: 'Paddy', focus: 'Blast disease screening nursery', coordinator: 'Vikram Singh', status: 'Active' }
    ],
    environmental: {
      avgTemp: '25°C',
      rainfall: '1720 mm/year',
      soilType: 'Heavy alluvial acid soil',
      lastObservation: '1 day ago'
    }
  },
  {
    id: 'loc-trichy',
    name: 'Trichy',
    state: 'Tamil Nadu',
    latitude: 10.790,
    longitude: 78.704,
    activeTrials: 3,
    crops: ['Paddy', 'Sugarcane'],
    trials: [
      { id: 'TRL-2026-138', crop: 'Paddy', focus: 'Alkaline soil tolerance screening', coordinator: 'Dr. Priya Sharma', status: 'Active' },
      { id: 'TRL-2026-139', crop: 'Sugarcane', focus: 'Early sugar accumulation selections', coordinator: 'Rao G.', status: 'Active' },
      { id: 'TRL-2026-140', crop: 'Paddy', focus: 'Drought tolerance during reproductive stage', coordinator: 'Dr. Priya Sharma', status: 'Active' }
    ],
    environmental: {
      avgTemp: '31°C',
      rainfall: '810 mm/year',
      soilType: 'Sodic/Alkaline clay soil',
      lastObservation: '12 hours ago'
    }
  },
  {
    id: 'loc-jabalpur',
    name: 'Jabalpur',
    state: 'Madhya Pradesh',
    latitude: 23.181,
    longitude: 79.986,
    activeTrials: 2,
    crops: ['Soybean'],
    trials: [
      { id: 'TRL-2026-141', crop: 'Soybean', focus: 'Pod shattering resistance screening', coordinator: 'Vikram Singh', status: 'Active' },
      { id: 'TRL-2026-142', crop: 'Soybean', focus: 'Girdle beetle tolerance screening', coordinator: 'Vikram Singh', status: 'Active' }
    ],
    environmental: {
      avgTemp: '28°C',
      rainfall: '980 mm/year',
      soilType: 'Deep alluvial clay loam',
      lastObservation: '6 hours ago'
    }
  }
];

export const recentObservations: DashboardObservation[] = [
  { id: 'obs-1', observerName: 'Dr. Priya Sharma', observerInitials: 'PS', trialRef: 'TRL-2026-014', trialName: 'Cotton hybrid MLT', locationName: 'Coimbatore', plotEntry: 'Plot 8 · E03', summary: 'Recorded plant height (142 cm) and flowering date for 8 plots', method: 'manual', timestamp: '12 min ago' },
  { id: 'obs-2', observerName: 'Ramesh Kumar', observerInitials: 'RK', trialRef: 'TRL-2026-012', trialName: 'Maize drought trial', locationName: 'Ludhiana', plotEntry: 'Plot 14 · E07', summary: 'AI image analysis: leaf area index across 24 plots', method: 'ai', timestamp: '38 min ago' },
  { id: 'obs-3', observerName: 'Anand Murthy', observerInitials: 'AM', trialRef: 'TRL-2026-009', trialName: 'Sunflower yield trial', locationName: 'Hyderabad', plotEntry: 'Plot 22 · E11', summary: 'Drone imagery captured for biomass estimation', method: 'drone', timestamp: '1h ago' },
  { id: 'obs-4', observerName: 'Sunita Rao', observerInitials: 'SR', trialRef: 'TRL-2026-014', trialName: 'Cotton hybrid MLT', locationName: 'Pune', plotEntry: 'Plot 5 · E02', summary: 'Disease score recorded — bacterial blight resistance', method: 'manual', timestamp: '2h ago' },
  { id: 'obs-5', observerName: 'Vikram Singh', observerInitials: 'VS', trialRef: 'TRL-2026-018', trialName: 'Paddy salt tolerance', locationName: 'Bhubaneswar', plotEntry: 'Plot 11 · E08', summary: 'Soil moisture and EC readings from 6 sensors', method: 'sensor', timestamp: '3h ago' },
  { id: 'obs-6', observerName: 'Dr. Mohammed Khan', observerInitials: 'MK', trialRef: 'TRL-2026-007', trialName: 'Sorghum nursery', locationName: 'Hyderabad', plotEntry: 'Plot 3 · E01', summary: 'Tillering count and panicle initiation across 12 entries', method: 'manual', timestamp: '5h ago' },
  { id: 'obs-7', observerName: 'Priyanka Reddy', observerInitials: 'PR', trialRef: 'TRL-2026-015', trialName: 'Tomato hybrid trial', locationName: 'Bangalore', plotEntry: 'Plot 9 · E04', summary: 'AI quality grading on 36 fruit samples', method: 'ai', timestamp: '8h ago' },
  { id: 'obs-8', observerName: 'Arjun Patel', observerInitials: 'AP', trialRef: 'TRL-2026-011', trialName: 'Pearl millet MLT', locationName: 'Jaipur', plotEntry: 'Plot 17 · E09', summary: 'Drought stress visual scoring on 18 plots', method: 'manual', timestamp: '10h ago' },
];

export const pendingTasks: PendingTask[] = [
  { id: 'task-1', category: 'observation_due', title: 'Trial TRL-2026-014 — overdue observations at 3 locations', dueDate: 'Overdue by 1 day', severity: 'critical', contextRef: 'TRL-2026-014', actionLabel: 'Open trial' },
  { id: 'task-2', category: 'observation_due', title: 'Trial TRL-2026-007 — flowering observations due', dueDate: 'Due tomorrow', severity: 'warning', contextRef: 'TRL-2026-007', actionLabel: 'Record now' },
  { id: 'task-3', category: 'approval_pending', title: 'Breeding program BP-2026-008 — budget revision', dueDate: 'Due in 3 days', severity: 'warning', contextRef: 'BP-2026-008', actionLabel: 'Review' },
  { id: 'task-4', category: 'approval_pending', title: 'New trial TRL-2026-022 — locations & design', dueDate: 'Due in 5 days', severity: 'info', contextRef: 'TRL-2026-022', actionLabel: 'Approve' },
  { id: 'task-5', category: 'data_review', title: 'Trial TRL-2026-012 — Q4 data ready for analysis', dueDate: 'Due in 2 days', severity: 'warning', contextRef: 'TRL-2026-012', actionLabel: 'Run analysis' },
  { id: 'task-6', category: 'registration_milestone', title: 'PVP filing deadline for VAR-2026-004', dueDate: 'Due in 12 days', severity: 'info', contextRef: 'VAR-2026-004', actionLabel: 'Open filing' },
  { id: 'task-7', category: 'registration_milestone', title: 'DUS Year 2 testing results for VAR-2025-018', dueDate: 'Due in 8 days', severity: 'info', contextRef: 'VAR-2025-018', actionLabel: 'Upload results' },
];

export const geneticGainData: GeneticGainPoint[] = [
  { cycleLabel: 'Cycle 1 (2021)', actualGainPct: 3.2, targetGainPct: 5.0 },
  { cycleLabel: 'Cycle 2 (2022)', actualGainPct: 5.4, targetGainPct: 5.5 },
  { cycleLabel: 'Cycle 3 (2023)', actualGainPct: 6.8, targetGainPct: 6.0 },
  { cycleLabel: 'Cycle 4 (2024)', actualGainPct: 7.5, targetGainPct: 6.5 },
  { cycleLabel: 'Cycle 5 (2025)', actualGainPct: 8.1, targetGainPct: 7.0 },
  { cycleLabel: 'Cycle 6 (2026)', actualGainPct: 8.4, targetGainPct: 7.5 },
];
