export interface ReportDefinition {
  id: string;
  title: string;
  category: string;
  description: string;
  format: string;
  lastRunAt: string;
  saved: boolean;
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  reportTitle: string;
  frequency: string;
  timeOfDay: string;
  dayOfWeek?: string;
  dayOfMonth?: number;
  nextRun: string;
  lastRun: string;
  lastRunStatus: 'Success' | 'Failed';
  recipients: string[];
  format: string;
  active: boolean;
}

export interface RDInsight {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'opportunity';
  title: string;
  description: string;
  source: string;
  generatedAt: string;
  dismissed: boolean;
  saved: boolean;
}

export const reportDefinitions: ReportDefinition[] = [
  // Fully Detailed Reports
  {
    id: 'RPT-TRL-001',
    title: 'MLT trial performance summary — Kharif 2026',
    category: 'Trials',
    description: 'Multi-location yield analysis across all active MLT trials with entry rankings, location performance, and G×E interactions.',
    format: 'PDF / Web',
    lastRunAt: '2026-05-20',
    saved: true
  },
  {
    id: 'RPT-BRD-001',
    title: 'Breeding pipeline velocity report — 2026',
    category: 'Breeding',
    description: 'Cycle time analysis from cross to release, with stage-wise duration and breeding pipeline bottleneck identification.',
    format: 'PDF / Excel',
    lastRunAt: '2026-05-18',
    saved: true
  },
  {
    id: 'RPT-CMP-001',
    title: 'DUS testing compliance dashboard — Quarterly',
    category: 'Compliance',
    description: 'Variety registration progress, DUS test status across locations, and upcoming regulatory filing deadlines.',
    format: 'PDF / Web',
    lastRunAt: '2026-05-22',
    saved: false
  },
  
  // Placeholder Shells (18 items)
  // Breeding (3)
  {
    id: 'RPT-BRD-002',
    title: 'Generation advancement report',
    category: 'Breeding',
    description: 'Visual summary of advancement percentages from F1 to F6 segregating populations.',
    format: 'PDF',
    lastRunAt: '2026-04-12',
    saved: false
  },
  {
    id: 'RPT-BRD-003',
    title: 'Cross success rate analysis',
    category: 'Breeding',
    description: 'Breeding cross efficiency evaluation mapping hand-emasculation success rates per breeder team.',
    format: 'Excel',
    lastRunAt: '2026-04-28',
    saved: false
  },
  {
    id: 'RPT-BRD-004',
    title: 'Selection effectiveness study',
    category: 'Breeding',
    description: 'Tracks realized genetic gain vs projected models across selection cycles.',
    format: 'PDF',
    lastRunAt: '2026-05-01',
    saved: false
  },
  // Trials (3)
  {
    id: 'RPT-TRL-002',
    title: 'Single-location trial summary',
    category: 'Trials',
    description: 'Detailed raw observations, block layouts, and ANOVA calculations for single research farms.',
    format: 'Excel',
    lastRunAt: '2026-05-05',
    saved: false
  },
  {
    id: 'RPT-TRL-003',
    title: 'Environmental data correlation report',
    category: 'Trials',
    description: 'Correlates humidity levels, rainfall, and temperature profiles with trial observations.',
    format: 'Web',
    lastRunAt: '2026-05-11',
    saved: false
  },
  {
    id: 'RPT-TRL-004',
    title: 'Trial calendar and observation schedule',
    category: 'Trials',
    description: 'Timeline audit tracking scheduled recordings vs completed logs per trial site.',
    format: 'PDF',
    lastRunAt: '2026-05-15',
    saved: false
  },
  // Phenotyping (3)
  {
    id: 'RPT-PHE-001',
    title: 'AI-assisted phenotyping accuracy report',
    category: 'Phenotyping',
    description: 'Performance log evaluating ResNet leaf canopy height estimations against physical tape measurements.',
    format: 'PDF',
    lastRunAt: '2026-05-02',
    saved: false
  },
  {
    id: 'RPT-PHE-002',
    title: 'Field observation completeness audit',
    category: 'Phenotyping',
    description: 'Compliance report highlighting missing plot photos, untracked canopy counts, or unrecorded traits.',
    format: 'Excel',
    lastRunAt: '2026-05-10',
    saved: false
  },
  {
    id: 'RPT-PHE-003',
    title: 'Drone vs manual phenotyping comparison',
    category: 'Phenotyping',
    description: 'Spatial and accuracy assessments of NDVI maps compared to ground-level observations.',
    format: 'Web',
    lastRunAt: '2026-04-30',
    saved: false
  },
  // Varieties (3)
  {
    id: 'RPT-VAR-001',
    title: 'Variety lifecycle report',
    category: 'Varieties',
    description: 'Catalog audit mapping commercial active, pre-release candidate, and withdrawn seed stock counts.',
    format: 'PDF',
    lastRunAt: '2026-05-08',
    saved: false
  },
  {
    id: 'RPT-VAR-002',
    title: 'Pre-release readiness assessment',
    category: 'Varieties',
    description: 'Checklist compliance verifying candidate varieties against genetic and mechanical purity metrics.',
    format: 'Excel',
    lastRunAt: '2026-05-12',
    saved: false
  },
  {
    id: 'RPT-VAR-003',
    title: 'Variety performance vs market segment',
    category: 'Varieties',
    description: 'Compares R&D yield records with competitor check varieties currently leading regional market share.',
    format: 'PDF',
    lastRunAt: '2026-05-19',
    saved: false
  },
  // Compliance (3)
  {
    id: 'RPT-CMP-002',
    title: 'PPV&FRA filing tracker',
    category: 'Compliance',
    description: 'Tracks status indicators and expected hearing dates under Indian Protection of Plant Varieties authority.',
    format: 'Web',
    lastRunAt: '2026-05-04',
    saved: false
  },
  {
    id: 'RPT-CMP-003',
    title: 'IP protection coverage report',
    category: 'Compliance',
    description: 'Summary of active PVP certificates, pending patents, and trade secrets in the R&D vault.',
    format: 'PDF',
    lastRunAt: '2026-05-14',
    saved: false
  },
  {
    id: 'RPT-CMP-004',
    title: 'Regulatory timeline gantt',
    category: 'Compliance',
    description: 'Integrates all bio-safety clearance timelines and CSC notifications into a single Gantt dashboard.',
    format: 'PDF',
    lastRunAt: '2026-05-21',
    saved: false
  },
  // AI Insights (3)
  {
    id: 'RPT-AI-001',
    title: 'Genetic gain trend analysis',
    category: 'AI insights',
    description: 'Projected multi-year genetic trajectory computed using historical breeding cycles.',
    format: 'PDF',
    lastRunAt: '2026-05-10',
    saved: false
  },
  {
    id: 'RPT-AI-002',
    title: 'Optimal sowing window predictor',
    category: 'AI insights',
    description: 'Integrates multi-location soil humidity maps to calculate regional yield-maximizing sowing dates.',
    format: 'Web',
    lastRunAt: '2026-05-16',
    saved: false
  },
  {
    id: 'RPT-AI-003',
    title: 'Cross combination success predictor',
    category: 'AI insights',
    description: 'Generative models predicting seedling performance based on pedigree marker lineages.',
    format: 'Excel',
    lastRunAt: '2026-05-22',
    saved: false
  }
];

export const scheduledReports: ScheduledReport[] = [
  {
    id: 'SCH-001',
    reportId: 'RPT-TRL-001',
    reportTitle: 'MLT trial performance summary — Kharif 2026',
    frequency: 'Weekly',
    timeOfDay: '08:00',
    dayOfWeek: 'Monday',
    nextRun: '2026-05-25T08:00:00Z',
    lastRun: '2026-05-18T08:01:12Z',
    lastRunStatus: 'Success',
    recipients: ['Dr. Anita Desai', 'Vijay Kumar', 'S. Raghavan'],
    format: 'PDF',
    active: true
  },
  {
    id: 'SCH-002',
    reportId: 'RPT-CMP-001',
    reportTitle: 'DUS testing compliance dashboard — Quarterly',
    frequency: 'Monthly',
    timeOfDay: '09:00',
    dayOfMonth: 1,
    nextRun: '2026-06-01T09:00:00Z',
    lastRun: '2026-05-01T09:02:44Z',
    lastRunStatus: 'Success',
    recipients: ['Dr. Anita Desai', 'Compliance Office Team'],
    format: 'PDF',
    active: true
  },
  {
    id: 'SCH-003',
    reportId: 'RPT-BRD-001',
    reportTitle: 'Breeding pipeline velocity report — 2026',
    frequency: 'Monthly',
    timeOfDay: '17:00',
    dayOfMonth: 28,
    nextRun: '2026-05-28T17:00:00Z',
    lastRun: '2026-04-28T17:00:15Z',
    lastRunStatus: 'Success',
    recipients: ['Vijay Kumar', 'Crop Lead Breeders'],
    format: 'Excel',
    active: true
  },
  {
    id: 'SCH-004',
    reportId: 'RPT-TRL-004',
    reportTitle: 'Trial calendar and observation schedule',
    frequency: 'Weekly',
    timeOfDay: '07:30',
    dayOfWeek: 'Monday',
    nextRun: '2026-05-25T07:30:00Z',
    lastRun: '2026-05-18T07:30:42Z',
    lastRunStatus: 'Success',
    recipients: ['Field operations team', 'S. Raghavan'],
    format: 'PDF',
    active: true
  },
  {
    id: 'SCH-005',
    reportId: 'RPT-AI-002',
    reportTitle: 'Optimal sowing window predictor',
    frequency: 'Weekly',
    timeOfDay: '06:00',
    dayOfWeek: 'Friday',
    nextRun: '2026-05-29T06:00:00Z',
    lastRun: '2026-05-22T06:00:05Z',
    lastRunStatus: 'Success',
    recipients: ['Vijay Kumar', 'Agronomy Extension Team'],
    format: 'Web Link',
    active: false
  }
];

export const aiInsights: RDInsight[] = [
  {
    id: 'INS-001',
    severity: 'critical',
    title: 'Soil moisture deficits flagged at Coimbatore MLT site',
    description: '3 cotton trials at Coimbatore show consistent yield suppression and early leaf wilt. Soil humidity telemetry logs indicate critical deficits. Review irrigation scheduling immediately.',
    source: 'Soil Moisture Telemetry & Canopy Drone Analysis',
    generatedAt: '2026-05-24T10:15:00Z',
    dismissed: false,
    saved: false
  },
  {
    id: 'INS-002',
    severity: 'critical',
    title: 'Filing Deadline Warning: PPV&FRA Cotton Bt-102',
    description: 'Application number APP/CT/2024/042 requires Year 2 DUS trial report submission within 14 days. Failure to upload botanical descriptors will result in default forfeiture.',
    source: 'PPV&FRA Compliance Portal Monitor',
    generatedAt: '2026-05-24T08:00:00Z',
    dismissed: false,
    saved: true
  },
  {
    id: 'INS-003',
    severity: 'warning',
    title: 'Breeding cycle stall detected: Program BP-2026-008',
    description: 'Breeding program BP-2026-008 (Cotton) has been stalled at F4 generation advancement for 22 months. The historical average for this stage is 14 months. Check nursery seed replication availability.',
    source: 'Pipeline Velocity Tracker',
    generatedAt: '2026-05-23T14:30:00Z',
    dismissed: false,
    saved: false
  },
  {
    id: 'INS-004',
    severity: 'warning',
    title: 'Supplementary trials required for Pre-release variety VAR-2025-018',
    description: 'Maize variety candidate VAR-2025-018 lacks sufficient trial records in the Northern plains zone. Submit supplementary on-farm demo locations before the Rabi filing deadline.',
    source: 'Registration Readiness Evaluator',
    generatedAt: '2026-05-23T11:00:00Z',
    dismissed: false,
    saved: false
  },
  {
    id: 'INS-005',
    severity: 'info',
    title: 'Cotton genetic gains exceed seasonal target limits',
    description: 'Regional cotton germplasm lines show a +9.1% genetic yield gain per cycle over standard regional checks, exceeding the designated benchmark by 1.6% points. High performance highlighted in South zones.',
    source: 'Genetic Trend Analyzer',
    generatedAt: '2026-05-22T09:12:00Z',
    dismissed: false,
    saved: false
  },
  {
    id: 'INS-006',
    severity: 'info',
    title: 'Clay-loam performance advantage for Maize ML-2025-04',
    description: 'Maize candidate ML-2025-04 recorded a 38% yield advantage in clay-loam locations compared to sandy loam sites across central regions. Soil texture correlations are statistically significant (p < 0.01).',
    source: 'Multi-Location Correlation Engine',
    generatedAt: '2026-05-22T07:45:00Z',
    dismissed: false,
    saved: false
  },
  {
    id: 'INS-007',
    severity: 'opportunity',
    title: 'Ancestral drought tolerance trait identified in Cotton candidates',
    description: 'Top-performing drought candidates share a common historical landrace ancestor (Wagad-18). It is highly recommended to flag the Wagad-18 genomic sequence in the core trait registry for target markers.',
    source: 'Pedigree & Genomic Association Engine',
    generatedAt: '2026-05-21T16:20:00Z',
    dismissed: false,
    saved: true
  },
  {
    id: 'INS-008',
    severity: 'opportunity',
    title: 'Predicted high-potential breeding parent combination',
    description: 'Pedigree and trait analysis predicts a cross between GRM-2026-019 (High oil) and GRM-2026-045 (Drought resistant) will produce superior F1 hybrids exceeding local standard checks by +15%.',
    source: 'Generative Breeding Pair Predictor',
    generatedAt: '2026-05-21T13:10:00Z',
    dismissed: false,
    saved: false
  },
  {
    id: 'INS-009',
    severity: 'opportunity',
    title: 'Low CV locations flagged for high-precision trial selection',
    description: 'Nursery trial site TRL-2026-014 recorded an exceptionally low Coefficient of Variation (CV: 5.8%) and zero missing observations. Recommend prioritizing this plot station for high-value parent crossing trials.',
    source: 'Statistical Precision Auditor',
    generatedAt: '2026-05-20T11:15:00Z',
    dismissed: false,
    saved: false
  },
  {
    id: 'INS-010',
    severity: 'info',
    title: 'Phenotyping image recognition model accuracy improves',
    description: 'CAN-ResNet-101 drone height prediction margins have narrowed to ±3.2cm compared to hand tape metrics, reflecting a 12% improvement in accuracy due to increased image training datasets.',
    source: 'Computer Vision Performance Log',
    generatedAt: '2026-05-19T09:00:00Z',
    dismissed: false,
    saved: false
  }
];
