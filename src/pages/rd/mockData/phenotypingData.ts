import { PhenotypeObservation } from '@/types/rd';

export const phenotypeKpis = [
  { title: 'Observations this season', value: '2,847', subValue: 'Across all active trials' },
  { title: 'AI-assisted', value: '1,124', subValue: '39% of total', icon: 'Sparkles' },
  { title: 'Avg per trial', value: '158', subValue: 'Per active trial' },
  { title: 'Pending review', value: '34', subValue: 'Need supervisor sign-off', status: 'warning' },
];

export const observations: PhenotypeObservation[] = [
  {
    id: 'OBS-00001',
    trialId: 'TRL-2026-001',
    locationId: 'TLOC-001',
    plotNumber: 'P-001',
    entryCode: 'E01',
    date: '2026-07-15',
    growthStage: 'Vegetative',
    observedBy: 'S. Kulkarni',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Plant height', value: 45, unit: 'cm', protocol: 'Standard height rule 1.0' },
      { trait: 'Leaf count', value: 8, protocol: 'Visual leaf index' },
    ],
    photos: [],
    notes: 'Primary nodes establishing nicely. No insect pressure observed.',
  },
  {
    id: 'OBS-00002',
    trialId: 'TRL-2026-001',
    locationId: 'TLOC-001',
    plotNumber: 'P-001',
    entryCode: 'E01',
    date: '2026-07-20',
    growthStage: 'Vegetative',
    observedBy: 'AI Analyzer',
    method: 'AI image analysis',
    measurements: [
      { trait: 'Plant height', value: 52, unit: 'cm', aiConfidence: 94, protocol: 'Camera projection mapping' },
      { trait: 'Leaf area index', value: 1.2, aiConfidence: 88, protocol: 'Green canopy pixel index' },
    ],
    photos: ['/assets/plots/cotton_veg_p001.jpg'],
    notes: 'Processed using SeedFlow AI Mobile Scanner V2.',
  },
  {
    id: 'OBS-00003',
    trialId: 'TRL-2026-001',
    locationId: 'TLOC-002',
    plotNumber: 'P-004',
    entryCode: 'E02',
    date: '2026-07-22',
    growthStage: 'Vegetative',
    observedBy: 'M. Verma',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Plant height', value: 48, unit: 'cm' },
      { trait: 'Leaf count', value: 9 },
    ],
    photos: [],
  },
  {
    id: 'OBS-00004',
    trialId: 'TRL-2026-001',
    locationId: 'TLOC-003',
    plotNumber: 'P-010',
    entryCode: 'E01',
    date: '2026-07-24',
    growthStage: 'Vegetative',
    observedBy: 'R. Prasad',
    method: 'Drone imagery',
    measurements: [
      { trait: 'NDVI Biomass Index', value: 0.72, aiConfidence: 91, protocol: 'Sentera Multispectral Drone V3' },
      { trait: 'Canopy coverage', value: '62%', aiConfidence: 95 }
    ],
    photos: ['/assets/plots/drone_cbe_block2.jpg'],
    notes: 'Multi-spectral orthomosaic generated over Pune plots at 15m altitude.'
  },
  {
    id: 'OBS-00005',
    trialId: 'TRL-2026-001',
    locationId: 'TLOC-001',
    plotNumber: 'P-002',
    entryCode: 'E02',
    date: '2026-07-28',
    growthStage: 'Flowering',
    observedBy: 'S. Kulkarni',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Days to flowering', value: 53, unit: 'days' },
      { trait: 'Bolls count', value: 3 }
    ],
    photos: [],
  },
  {
    id: 'OBS-00006',
    trialId: 'TRL-2026-001',
    locationId: 'TLOC-001',
    plotNumber: 'P-003',
    entryCode: 'E03',
    date: '2026-07-30',
    growthStage: 'Flowering',
    observedBy: 'AI Analyzer',
    method: 'AI image analysis',
    measurements: [
      { trait: 'Boll count', value: 4, aiConfidence: 92 },
      { trait: 'Canopy temperature', value: 31.4, unit: '°C', aiConfidence: 96 }
    ],
    photos: ['/assets/plots/cotton_boll_p003.jpg'],
    notes: 'Infrared overlay reveals zero moisture stress.'
  },
  {
    id: 'OBS-00007',
    trialId: 'TRL-2026-002',
    locationId: 'TLOC-004',
    plotNumber: 'P-001',
    entryCode: 'MZ-E01',
    date: '2026-06-15',
    growthStage: 'Vegetative',
    observedBy: 'M. P. Singh',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Stem diameter', value: 2.4, unit: 'cm' },
      { trait: 'Plant height', value: 92, unit: 'cm' }
    ],
    photos: [],
  },
  {
    id: 'OBS-00008',
    trialId: 'TRL-2026-002',
    locationId: 'TLOC-005',
    plotNumber: 'P-005',
    entryCode: 'MZ-E02',
    date: '2026-06-18',
    growthStage: 'Vegetative',
    observedBy: 'Rajesh Sharma',
    method: 'IoT sensor',
    measurements: [
      { trait: 'Soil NPK nitrogen', value: 65, unit: 'ppm', protocol: 'CropX Soil Node telemetry' },
      { trait: 'Transpiration rate', value: 4.8, unit: 'mmol/m²/s' }
    ],
    photos: [],
    notes: 'Sensor node SN-MZ-005 calibrated successfully.'
  },
  {
    id: 'OBS-00009',
    trialId: 'TRL-2026-002',
    locationId: 'TLOC-006',
    plotNumber: 'P-009',
    entryCode: 'MZ-E03',
    date: '2026-07-02',
    growthStage: 'Flowering',
    observedBy: 'Sunita Rao',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Tassel length', value: 34, unit: 'cm' },
      { trait: 'Days to silking', value: 48, unit: 'days' }
    ],
    photos: [],
  },
  {
    id: 'OBS-00010',
    trialId: 'TRL-2026-002',
    locationId: 'TLOC-004',
    plotNumber: 'P-002',
    entryCode: 'MZ-E02',
    date: '2026-07-05',
    growthStage: 'Flowering',
    observedBy: 'AI Analyzer',
    method: 'AI image analysis',
    measurements: [
      { trait: 'Silk count', value: 1, aiConfidence: 95 },
      { trait: 'Tassel coloration index', value: 4.2, aiConfidence: 89 }
    ],
    photos: ['/assets/plots/maize_silk_p002.jpg'],
  },
  {
    id: 'OBS-00011',
    trialId: 'TRL-2026-003',
    locationId: 'TLOC-007',
    plotNumber: 'P-001',
    entryCode: 'PD-E01',
    date: '2026-07-10',
    growthStage: 'Vegetative',
    observedBy: 'B. Patnaik',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Tillering count', value: 14, unit: 'tillers' }
    ],
    photos: [],
  },
  {
    id: 'OBS-00012',
    trialId: 'TRL-2026-003',
    locationId: 'TLOC-008',
    plotNumber: 'P-006',
    entryCode: 'PD-E02',
    date: '2026-07-12',
    growthStage: 'Vegetative',
    observedBy: 'M. Gogoi',
    method: 'Drone imagery',
    measurements: [
      { trait: 'Canopy recovery area', value: '45%', aiConfidence: 94 },
      { trait: 'Chlorophyll SPAD estimate', value: 38, aiConfidence: 90 }
    ],
    photos: ['/assets/plots/drone_paddy_flooded.jpg'],
    notes: 'Sown direct, flooded area has high recovery index.'
  },
  {
    id: 'OBS-00013',
    trialId: 'TRL-2026-003',
    locationId: 'TLOC-009',
    plotNumber: 'P-011',
    entryCode: 'PD-E03',
    date: '2026-07-14',
    growthStage: 'Vegetative',
    observedBy: 'K. Swaminathan',
    method: 'IoT sensor',
    measurements: [
      { trait: 'Soil salinity EC', value: 4.8, unit: 'dS/m', protocol: 'Decagon 5TE sensor' }
    ],
    photos: [],
  },
  {
    id: 'OBS-00014',
    trialId: 'TRL-2026-005',
    locationId: 'TLOC-001',
    plotNumber: 'P-001',
    entryCode: 'E01',
    date: '2026-07-01',
    growthStage: 'Vegetative',
    observedBy: 'S. Kulkarni',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Node count', value: 6 }
    ],
    photos: [],
  },
  {
    id: 'OBS-00015',
    trialId: 'TRL-2026-006',
    locationId: 'TLOC-004',
    plotNumber: 'P-002',
    entryCode: 'W-E02',
    date: '2026-02-15',
    growthStage: 'Maturity',
    observedBy: 'Dr. Vijay Kumar',
    method: 'Lab analysis',
    measurements: [
      { trait: 'Gluten percentage', value: '11.8%', protocol: 'Perten Glutomatic 2200' },
      { trait: 'Grain protein content', value: '13.2%', unit: '%' }
    ],
    photos: [],
    notes: 'Linked to Lab sample LAB-WHT-2026-042.'
  },
  {
    id: 'OBS-00016',
    trialId: 'TRL-2026-006',
    locationId: 'TLOC-004',
    plotNumber: 'P-003',
    entryCode: 'W-E03',
    date: '2026-02-20',
    growthStage: 'Maturity',
    observedBy: 'Dr. Vijay Kumar',
    method: 'Lab analysis',
    measurements: [
      { trait: 'Gluten percentage', value: '10.5%' },
      { trait: 'Grain protein content', value: '12.1%', unit: '%' }
    ],
    photos: [],
  },
  {
    id: 'OBS-00017',
    trialId: 'TRL-2026-001',
    locationId: 'TLOC-001',
    plotNumber: 'P-004',
    entryCode: 'E04',
    date: '2026-08-05',
    growthStage: 'Harvest',
    observedBy: 'S. Kulkarni',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Plot yield', value: 2.8, unit: 'kg' },
      { trait: 'Staple length', value: 31.2, unit: 'mm' }
    ],
    photos: [],
  },
  {
    id: 'OBS-00018',
    trialId: 'TRL-2026-001',
    locationId: 'TLOC-001',
    plotNumber: 'P-005',
    entryCode: 'E01',
    date: '2026-08-06',
    growthStage: 'Harvest',
    observedBy: 'S. Kulkarni',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Plot yield', value: 3.4, unit: 'kg' },
      { trait: 'Staple length', value: 32.8, unit: 'mm' }
    ],
    photos: [],
  },
  {
    id: 'OBS-00019',
    trialId: 'TRL-2026-007',
    locationId: 'TLOC-020',
    plotNumber: 'P-001',
    entryCode: 'SF402',
    date: '2026-07-20',
    growthStage: 'Vegetative',
    observedBy: 'R. Patel',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Plant height', value: 50, unit: 'cm' }
    ],
    photos: [],
  },
  {
    id: 'OBS-00020',
    trialId: 'TRL-2026-010',
    locationId: 'TLOC-005',
    plotNumber: 'P-001',
    entryCode: 'SOY-101',
    date: '2026-07-15',
    growthStage: 'Vegetative',
    observedBy: 'Rajesh Sharma',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Nodule count per plant', value: 18 }
    ],
    photos: [],
  },
  // Pending review observations (reviewed: false or observedBy without supervisor signoff)
  {
    id: 'OBS-00021',
    trialId: 'TRL-2026-001',
    locationId: 'TLOC-001',
    plotNumber: 'P-008',
    entryCode: 'E04',
    date: '2026-08-10',
    growthStage: 'Flowering',
    observedBy: 'Priya Sharma',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Flower count', value: 12 }
    ],
    photos: [],
    notes: 'Needs confirmation by lead researcher on flower abortion rates.',
  },
  {
    id: 'OBS-00022',
    trialId: 'TRL-2026-001',
    locationId: 'TLOC-002',
    plotNumber: 'P-005',
    entryCode: 'E01',
    date: '2026-08-11',
    growthStage: 'Flowering',
    observedBy: 'M. Verma',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Pest score aphids', value: 'Level 2 (Mild)', protocol: 'IPM standard score' }
    ],
    photos: [],
  },
  {
    id: 'OBS-00023',
    trialId: 'TRL-2026-003',
    locationId: 'TLOC-007',
    plotNumber: 'P-003',
    entryCode: 'PD-E03',
    date: '2026-07-20',
    growthStage: 'Vegetative',
    observedBy: 'B. Patnaik',
    method: 'AI image analysis',
    measurements: [
      { trait: 'Leaf nitrogen index', value: 4.1, aiConfidence: 72 }
    ],
    photos: ['/assets/plots/paddy_leaf_nitrogen.jpg'],
    notes: 'Low confidence score due to glare on leaves. Under review.',
  },
  {
    id: 'OBS-00024',
    trialId: 'TRL-2026-001',
    locationId: 'TLOC-003',
    plotNumber: 'P-005',
    entryCode: 'E01',
    date: '2026-08-02',
    growthStage: 'Flowering',
    observedBy: 'R. Prasad',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Flower height index', value: 110, unit: 'cm' }
    ],
    photos: [],
  },
  {
    id: 'OBS-00025',
    trialId: 'TRL-2026-002',
    locationId: 'TLOC-004',
    plotNumber: 'P-004',
    entryCode: 'MZ-E04',
    date: '2026-07-12',
    growthStage: 'Flowering',
    observedBy: 'M. P. Singh',
    method: 'Manual field walk',
    measurements: [
      { trait: 'Silking days', value: 50, unit: 'days' }
    ],
    photos: [],
  }
];

// Add the extra properties we want to observations (like reviewed: boolean)
// Let's programmatically mark the last few as reviewed: false (pending review)
export const enhancedObservations = observations.map((obs, idx) => ({
  ...obs,
  reviewed: idx < 20, // First 20 are reviewed, last 5 (from index 20 onwards) are pending review
}));
