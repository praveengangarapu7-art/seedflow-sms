import { 
  ReportDefinition, 
  ScheduledReport, 
  AIInsight 
} from '@/types/warehouse';

export const reportDefinitions: ReportDefinition[] = [
  // Inventory Reports
  {
    id: 'RPT-0001',
    title: 'Inventory valuation report',
    category: 'Inventory',
    description: 'Total stock value by category, warehouse, and valuation method (FIFO/LIFO/WA).',
    iconName: 'BarChart3',
    miniPreviewType: 'kpi',
    miniPreviewValue: '₹2.85 Cr',
    saved: true,
    hasFullDetailView: true
  },
  {
    id: 'RPT-0002',
    title: 'Stock aging analysis',
    category: 'Inventory',
    description: 'Items grouped by age buckets — 0-30d, 31-90d, 91-180d, 180+d.',
    iconName: 'Clock',
    miniPreviewType: 'bar',
    miniPreviewData: [45, 25, 15, 15],
    saved: false,
    hasFullDetailView: true
  },
  {
    id: 'RPT-0003',
    title: 'Slow-moving stock',
    category: 'Inventory',
    description: 'SKUs not moved in 90, 180, or 365 days.',
    iconName: 'TrendingDown',
    miniPreviewType: 'kpi',
    miniPreviewValue: '42 SKUs',
    saved: false,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0004',
    title: 'ABC analysis',
    category: 'Inventory',
    description: 'Pareto chart — items contributing to stock value (A=80%, B=15%, C=5%).',
    iconName: 'PieChart',
    miniPreviewType: 'donut',
    miniPreviewSegments: [
      { label: 'A', value: 80, color: '#40513B' },
      { label: 'B', value: 15, color: '#609966' },
      { label: 'C', value: 5, color: '#9DC08B' }
    ],
    saved: true,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0005',
    title: 'Expiry forecast',
    category: 'Inventory',
    description: 'Items expiring in 30/60/90 days, total value at risk.',
    iconName: 'CalendarClock',
    miniPreviewType: 'line',
    miniPreviewData: [10, 15, 8, 20, 25, 30],
    saved: false,
    hasFullDetailView: false
  },

  // Operational Reports
  {
    id: 'RPT-0006',
    title: 'Inbound efficiency',
    category: 'Operational',
    description: 'ASN to GRN time, GRN to putaway, dock-to-stock duration.',
    iconName: 'Truck',
    miniPreviewType: 'kpi',
    miniPreviewValue: '3.2 hrs avg',
    saved: false,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0007',
    title: 'Outbound efficiency',
    category: 'Operational',
    description: 'Pick-to-pack, dispatch SLA adherence, picking accuracy.',
    iconName: 'PackageCheck',
    miniPreviewType: 'kpi',
    miniPreviewValue: '94.8%',
    saved: true,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0008',
    title: 'Cycle count accuracy',
    category: 'Operational',
    description: 'Inventory accuracy trend, variance by zone.',
    iconName: 'Target',
    miniPreviewType: 'rings',
    miniPreviewData: [98.7],
    saved: true,
    hasFullDetailView: true
  },
  {
    id: 'RPT-0009',
    title: 'Putaway optimization',
    category: 'Operational',
    description: 'Suggested-vs-actual location adoption, walking distance.',
    iconName: 'MapPin',
    miniPreviewType: 'kpi',
    miniPreviewValue: '87% adoption',
    saved: false,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0010',
    title: 'Capacity utilization',
    category: 'Operational',
    description: 'Zone-by-zone fill % over time.',
    iconName: 'Warehouse',
    miniPreviewType: 'sparkline',
    miniPreviewData: [60, 65, 62, 68, 72, 70, 75],
    saved: false,
    hasFullDetailView: false
  },

  // Financial Reports
  {
    id: 'RPT-0011',
    title: 'Stock value movement',
    category: 'Financial',
    description: 'How total inventory ₹ shifted MoM — receipts, dispatches, adjustments.',
    iconName: 'LineChart',
    miniPreviewType: 'line',
    miniPreviewData: [2.1, 2.3, 2.2, 2.5, 2.8, 2.85],
    saved: false,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0012',
    title: 'Adjustment impact',
    category: 'Financial',
    description: 'Net financial impact by adjustment reason code.',
    iconName: 'Edit3',
    miniPreviewType: 'bar',
    miniPreviewData: [10, -5, 12, -2, 8],
    saved: false,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0013',
    title: 'Cost of holding',
    category: 'Financial',
    description: 'Storage cost per zone (energy + space + labor) per ₹100 of stock.',
    iconName: 'IndianRupee',
    miniPreviewType: 'kpi',
    miniPreviewValue: '₹2.30 / ₹100',
    saved: false,
    hasFullDetailView: false
  },

  // Compliance Reports
  {
    id: 'RPT-0014',
    title: 'FEFO compliance',
    category: 'Compliance',
    description: '% of dispatches following first-expiry-first-out sequence.',
    iconName: 'CheckCircle2',
    miniPreviewType: 'rings',
    miniPreviewData: [96.4],
    saved: true,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0015',
    title: 'Cold chain integrity',
    category: 'Compliance',
    description: 'Hours of temperature excursion per zone, per month.',
    iconName: 'Thermometer',
    miniPreviewType: 'kpi',
    miniPreviewValue: '8.2 hrs total',
    saved: true,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0016',
    title: 'Audit trail report',
    category: 'Compliance',
    description: 'Full chronological log of stock movements for selected SKU/batch.',
    iconName: 'FileText',
    miniPreviewType: 'kpi',
    miniPreviewValue: '2,847 events',
    saved: false,
    hasFullDetailView: false
  },

  // Quality Reports
  {
    id: 'RPT-0017',
    title: 'Quality rejection trends',
    category: 'Quality',
    description: '% of GRNs rejected, by supplier, by category, over time.',
    iconName: 'XCircle',
    miniPreviewType: 'line',
    miniPreviewData: [5, 4, 6, 3, 2, 2.5],
    saved: false,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0018',
    title: 'Germination decline summary',
    category: 'Quality',
    description: 'Average decline rates per category, batches at risk.',
    iconName: 'Sprout',
    miniPreviewType: 'kpi',
    miniPreviewValue: '12 at-risk batches',
    saved: false,
    hasFullDetailView: false
  },

  // AI Insights Reports
  {
    id: 'RPT-0019',
    title: 'Demand forecast (next 30 days)',
    category: 'AI insights',
    description: 'Predicted dispatch volume by SKU using historical patterns.',
    iconName: 'TrendingUp',
    miniPreviewType: 'line',
    miniPreviewData: [40, 42, 45, 48, 52, 60],
    saved: true,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0020',
    title: 'Anomaly detection',
    category: 'AI insights',
    description: 'Unusual stock movements, unusual variance patterns.',
    iconName: 'Sparkles',
    miniPreviewType: 'kpi',
    miniPreviewValue: '3 anomalies',
    saved: false,
    hasFullDetailView: false
  },
  {
    id: 'RPT-0021',
    title: 'Optimal reorder timing',
    category: 'AI insights',
    description: 'AI-suggested reorder points based on consumption patterns.',
    iconName: 'Bell',
    miniPreviewType: 'kpi',
    miniPreviewValue: '5 SKUs flagged',
    saved: false,
    hasFullDetailView: false
  }
];

export const scheduledReports: ScheduledReport[] = [
  {
    id: 'SCH-0001',
    reportId: 'RPT-0001',
    reportTitle: 'Inventory valuation report',
    frequency: 'Weekly',
    dayOfWeek: 1,
    timeOfDay: '09:00',
    recipients: ['Warehouse Manager', 'Finance Head', 'MD'],
    format: 'PDF',
    active: true,
    nextRun: '2026-05-05T09:00:00Z',
    createdBy: 'Nitin R.',
    createdAt: '2026-04-15T10:00:00Z'
  },
  {
    id: 'SCH-0002',
    reportId: 'RPT-0008',
    reportTitle: 'Cycle count accuracy',
    frequency: 'Monthly',
    dayOfMonth: 1,
    timeOfDay: '08:00',
    recipients: ['Warehouse Manager', 'Audit Team', 'Operations Lead', 'Zone Supervisor', 'MD'],
    format: 'Excel',
    active: true,
    nextRun: '2026-06-01T08:00:00Z',
    createdBy: 'Admin',
    createdAt: '2026-04-20T11:00:00Z'
  },
  {
    id: 'SCH-0003',
    reportId: 'RPT-0014',
    reportTitle: 'FEFO compliance',
    frequency: 'Weekly',
    dayOfWeek: 5,
    timeOfDay: '16:00',
    recipients: ['Quality Lead', 'Dispatch Manager'],
    format: 'PDF',
    active: true,
    nextRun: '2026-05-09T16:00:00Z',
    createdBy: 'Nitin R.',
    createdAt: '2026-04-22T09:30:00Z'
  },
  {
    id: 'SCH-0004',
    reportId: 'RPT-0019',
    reportTitle: 'Demand forecast',
    frequency: 'Daily',
    timeOfDay: '07:00',
    recipients: ['Procurement Manager'],
    format: 'Excel',
    active: true,
    nextRun: '2026-05-03T07:00:00Z',
    createdBy: 'System AI',
    createdAt: '2026-04-25T08:00:00Z'
  },
  {
    id: 'SCH-0005',
    reportId: 'RPT-0015',
    reportTitle: 'Cold chain integrity',
    frequency: 'Weekly',
    dayOfWeek: 1,
    timeOfDay: '09:00',
    recipients: ['Warehouse Manager', 'Quality Lead', 'Maintenance Head', 'MD'],
    format: 'PDF',
    active: true,
    nextRun: '2026-05-05T09:00:00Z',
    createdBy: 'Nitin R.',
    createdAt: '2026-04-28T14:00:00Z'
  }
];

export const aiInsights: AIInsight[] = [
  {
    id: 'AI-0001',
    category: 'Demand',
    severity: 'critical',
    title: 'Cotton GH-BT-102 demand projected to spike 40% next month',
    description: 'Historical patterns indicate a sharp increase in demand for this SKU during the pre-monsoon season. Current stock levels may be insufficient.',
    generatedAt: new Date().toISOString(),
    supportingDataType: 'line',
    supportingData: [30, 32, 35, 45, 58, 62],
    affectedEntities: [
      { type: 'sku', label: 'GH-BT-102' },
      { type: 'zone', label: 'Cold Zone A' }
    ],
    recommendedActions: [
      { label: 'Generate PR for these SKUs' },
      { label: 'View demand history' }
    ]
  },
  {
    id: 'AI-0002',
    category: 'Anomaly',
    severity: 'warning',
    title: 'Cold Zone A energy consumption 12% above similar zones',
    description: 'Energy usage in Cold Zone A has deviated from the established baseline, suggesting likely compressor inefficiency or insulation leakage.',
    generatedAt: new Date().toISOString(),
    supportingDataType: 'bar',
    supportingData: [100, 105, 112, 125],
    affectedEntities: [
      { type: 'zone', label: 'Cold Zone A' }
    ],
    recommendedActions: [
      { label: 'Schedule maintenance' },
      { label: 'Inspect compressor' }
    ]
  },
  {
    id: 'AI-0003',
    category: 'Risk',
    severity: 'warning',
    title: 'Slow-moving stock value increased ₹3.2L this quarter',
    description: 'Inventory aging beyond 180 days is accumulating. This ties up capital and increases risk of quality degradation.',
    generatedAt: new Date().toISOString(),
    supportingDataType: 'kpi',
    supportingData: '₹14.5 L total',
    recommendedActions: [
      { label: 'Review for promotional dispatch' },
      { label: 'View aging report' }
    ]
  },
  {
    id: 'AI-0004',
    category: 'Compliance',
    severity: 'warning',
    title: 'FEFO compliance dropped to 91% (target: 95%)',
    description: 'Several dispatches in the last 7 days bypassed items with earlier expiry dates. This increases risk of stock obsolescence.',
    generatedAt: new Date().toISOString(),
    supportingDataType: 'rings',
    supportingData: [91],
    recommendedActions: [
      { label: 'Review picking algorithm' },
      { label: 'Staff training' }
    ]
  },
  {
    id: 'AI-0005',
    category: 'Risk',
    severity: 'critical',
    title: 'Germination decline accelerating in 4 batches',
    description: 'Recent lab tests show faster-than-average germination loss for high-value batches stored in Cold Zone B.',
    generatedAt: new Date().toISOString(),
    supportingDataType: 'bar',
    supportingData: [2, 3.5, 4.2, 5.1],
    affectedEntities: [
      { type: 'batch', label: 'BAT-2024-001' },
      { type: 'batch', label: 'BAT-2024-002' }
    ],
    recommendedActions: [
      { label: 'Prioritize for Q2 dispatch' },
      { label: 'Retest immediately' }
    ]
  },
  {
    id: 'AI-0006',
    category: 'Optimization',
    severity: 'opportunity',
    title: '5 SKUs are below reorder point with no incoming POs',
    description: 'Automated monitoring detected critical stock levels for essential packaging materials and lab supplies.',
    generatedAt: new Date().toISOString(),
    supportingDataType: 'kpi',
    supportingData: '5 SKUs',
    recommendedActions: [
      { label: 'Generate purchase requisitions' },
      { label: 'View low stock' }
    ]
  },
  {
    id: 'AI-0007',
    category: 'Anomaly',
    severity: 'info',
    title: 'Cycle count variance pattern detected in Cold Zone B',
    description: 'Unusual consistency in small negative variances suggests a systematic error in unit-of-measure conversion or standard weight assumptions.',
    generatedAt: new Date().toISOString(),
    supportingDataType: 'sparkline',
    supportingData: [1, -2, -1, -3, -2, -4, -3],
    affectedEntities: [
      { type: 'zone', label: 'Cold Zone B' }
    ],
    recommendedActions: [
      { label: 'Investigate before next count' }
    ]
  },
  {
    id: 'AI-0008',
    category: 'Optimization',
    severity: 'opportunity',
    title: 'Optimal restocking time for high-velocity items: Tuesdays 10 AM',
    description: 'Analysis of warehouse traffic patterns shows this window has the lowest dispatch volume, minimizing congestion during putaway.',
    generatedAt: new Date().toISOString(),
    supportingDataType: 'kpi',
    supportingData: 'Tue 10 AM',
    recommendedActions: [
      { label: 'Update schedule' }
    ]
  }
];
