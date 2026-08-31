import type { CycleCount, CountLine } from '@/types/warehouse';

export type CycleCountKpiIcon = 'ClipboardList' | 'Target' | 'BarChart3' | 'AlertTriangle';

export interface CycleCountKpi {
  label: string;
  value: string;
  iconName: CycleCountKpiIcon;
  trend: { direction: 'up' | 'down'; percentage: string; isPositive: boolean };
  comparison: string;
}

export const cycleCountKpis: CycleCountKpi[] = [
  {
    label: 'Active counts',
    value: '4',
    iconName: 'ClipboardList',
    trend: { direction: 'up', percentage: '2', isPositive: false },
    comparison: '2 due today',
  },
  {
    label: 'Inventory accuracy',
    value: '98.7%',
    iconName: 'Target',
    trend: { direction: 'up', percentage: '0.4%', isPositive: true },
    comparison: '+0.4% MoM',
  },
  {
    label: 'Avg variance per count',
    value: '0.8%',
    iconName: 'BarChart3',
    trend: { direction: 'down', percentage: '0.2%', isPositive: true },
    comparison: 'industry: ~2%',
  },
  {
    label: 'Counts overdue',
    value: '1',
    iconName: 'AlertTriangle',
    trend: { direction: 'up', percentage: '1', isPositive: false },
    comparison: 'Cold Zone B weekly',
  },
];

export interface RecurringSchedule {
  id: string;
  name: string;
  frequency: string;
  nextDate: string;
  lastAccuracyPct?: number;
}

export const recurringSchedule: RecurringSchedule[] = [
  { id: 'RS-01', name: 'Cold Zone A — weekly count',     frequency: 'Every Monday, 9 AM', nextDate: '05 May', lastAccuracyPct: 99.2 },
  { id: 'RS-02', name: 'Class A items — monthly cycle',  frequency: '1st of month',       nextDate: '01 May', lastAccuracyPct: 98.4 },
  { id: 'RS-03', name: 'Full physical inventory',         frequency: 'Quarterly',          nextDate: '30 Jun' },
  { id: 'RS-04', name: 'Lab supplies — weekly count',    frequency: 'Every Friday, 4 PM', nextDate: '02 May', lastAccuracyPct: 100   },
];

const cca42Lines: CountLine[] = [
  { id: 'CL-101', itemSku: 'SD-CT-102-A', itemName: 'Cotton hybrid GH-BT-102 Foundation', batch: 'BT-2025-A14', location: 'CZA-R4-S2-B14', systemQty: 1840, countedQty: 1832, varianceQty: -8,  countedBy: 'Anjali Reddy', countedAt: '08:42 AM, today', scanMethod: 'Barcode', recountRequested: false, status: 'Variance' },
  { id: 'CL-102', itemSku: 'SD-CT-102-D', itemName: 'Cotton hybrid GH-BT-102 Certified', batch: 'BT-2025-A18', location: 'CZA-R5-S1-B08', systemQty: 1200, countedQty: 1200, varianceQty: 0,  countedBy: 'Anjali Reddy', countedAt: '08:55 AM, today', scanMethod: 'Barcode', recountRequested: false, status: 'Counted' },
  { id: 'CL-103', itemSku: 'SD-PD-IR64-F', itemName: 'Paddy IR-64 Foundation',           batch: 'PD-2025-22',  location: 'CZA-R6-S2-B05', systemQty: 950,  countedQty: 950,  varianceQty: 0,  countedBy: 'Anjali Reddy', countedAt: '09:08 AM, today', scanMethod: 'Barcode', recountRequested: false, status: 'Counted' },
  { id: 'CL-104', itemSku: 'SD-MZ-204-F', itemName: 'Maize hybrid GH-M-204 Foundation', batch: 'MZ-2025-04',  location: 'CZA-R7-S1-B11', systemQty: 410,  countedQty: 412,  varianceQty: 2,  countedBy: 'Anjali Reddy', countedAt: '09:18 AM, today', scanMethod: 'Manual', recountRequested: false, status: 'Variance' },
  { id: 'CL-105', itemSku: 'SD-SF-S88',   itemName: 'Sunflower S-88 hybrid',             batch: 'SF-2025-04',  location: 'CZA-R7-S2-B03', systemQty: 200,  countedQty: 195,  varianceQty: -5, countedBy: 'Anjali Reddy', countedAt: '09:30 AM, today', scanMethod: 'Barcode', recountRequested: true, status: 'Recount needed' },
  { id: 'CL-106', itemSku: 'SD-CT-102-B', itemName: 'Cotton hybrid GH-BT-102 Quarantine', batch: 'BT-2025-A15', location: 'CZB-R6-S1-B07', systemQty: 920, countedQty: null, varianceQty: 0, recountRequested: false, status: 'Pending' },
  { id: 'CL-107', itemSku: 'SD-PD-IR64-R', itemName: 'Paddy IR-64 reserved',             batch: 'PD-2025-21',  location: 'CZB-R4-S1-B02', systemQty: 600, countedQty: null, varianceQty: 0, recountRequested: false, status: 'Pending' },
  { id: 'CL-108', itemSku: 'SD-SF-S88',   itemName: 'Sunflower S-88 hybrid',             batch: 'SF-2025-04',  location: 'CZB-R3-S2-B11', systemQty: 460, countedQty: null, varianceQty: 0, recountRequested: false, status: 'Pending' },
];

const cca41Lines: CountLine[] = [
  { id: 'CL-201', itemSku: 'CH-FG-010', itemName: 'Fungicide concentrate 10 L', batch: 'CH-2025-FG-04', location: 'CTZ-R2-S1-B03', systemQty: 87, countedQty: 84, varianceQty: -3, countedBy: 'Priya Sharma', countedAt: 'yesterday', scanMethod: 'Barcode', recountRequested: false, status: 'Variance' },
  { id: 'CL-202', itemSku: 'CH-IS-005', itemName: 'Insecticide 5 L drums',      batch: 'CH-2025-IS-07', location: 'CTZ-R3-S1-B04', systemQty: 144, countedQty: 142, varianceQty: -2, countedBy: 'Priya Sharma', countedAt: 'yesterday', scanMethod: 'Barcode', recountRequested: false, status: 'Variance' },
  { id: 'CL-203', itemSku: 'CH-HB-020', itemName: 'Herbicide 20 L drums',       batch: 'CH-2025-HB-05', location: 'CTZ-R4-S1-B02', systemQty: 67, countedQty: 67, varianceQty: 0, countedBy: 'Priya Sharma', countedAt: 'yesterday', scanMethod: 'Barcode', recountRequested: false, status: 'Counted' },
  { id: 'CL-204', itemSku: 'LB-KT-GERM', itemName: 'Lab reagent kit — germination', batch: 'LB-2025-KT-03', location: 'CTZ-R1-S2-B05', systemQty: 10, countedQty: 8, varianceQty: -2, countedBy: 'Priya Sharma', countedAt: 'yesterday', scanMethod: 'Manual', recountRequested: false, status: 'Variance' },
];

const cca43Lines: CountLine[] = [
  { id: 'CL-301', itemSku: 'PK-PP-025',  itemName: 'PP packaging bags 25 kg',    batch: 'PK-2025-PP-09', location: 'AZ3-R8-S1-B02', systemQty: 12620, countedQty: 12500, varianceQty: -120, countedBy: 'Sunita Rao', countedAt: 'today', scanMethod: 'Barcode', recountRequested: false, status: 'Variance' },
  { id: 'CL-302', itemSku: 'PK-LBL-025', itemName: 'Printed labels 25 kg packs', batch: 'PK-2025-LBL-02', location: 'AZ3-R9-S2-B01', systemQty: 22050, countedQty: 22000, varianceQty: -50, countedBy: 'Sunita Rao', countedAt: 'today', scanMethod: 'Barcode', recountRequested: false, status: 'Variance' },
  { id: 'CL-303', itemSku: 'RM-COCO-50', itemName: 'Coco peat substrate 50 kg',  batch: 'RM-2025-CP-12', location: 'AZ2-R11-S1-B06', systemQty: 580, countedQty: 580, varianceQty: 0, countedBy: 'Sunita Rao', countedAt: 'today', scanMethod: 'Barcode', recountRequested: false, status: 'Counted' },
];

const ccc44Lines: CountLine[] = [
  { id: 'CL-401', itemSku: 'SD-MZ-204',   itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', location: 'AZ1-R12-S2-B05', systemQty: 2660, countedQty: null, varianceQty: 0, recountRequested: false, status: 'Pending' },
  { id: 'CL-402', itemSku: 'SD-PD-IR64-F', itemName: 'Paddy IR-64 Foundation', batch: 'PD-2025-22', location: 'CZC-R2-S3-B07', systemQty: 1480, countedQty: null, varianceQty: 0, recountRequested: false, status: 'Pending' },
  { id: 'CL-403', itemSku: 'SD-CT-102-A', itemName: 'Cotton hybrid GH-BT-102 Foundation', batch: 'BT-2025-A14', location: 'CZA-R4-S2-B14', systemQty: 1840, countedQty: null, varianceQty: 0, recountRequested: false, status: 'Pending' },
];

const blankLines = (count: number, prefix: string): CountLine[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    itemSku: 'SKU-PLACEHOLDER',
    itemName: 'Inventory line item',
    batch: `BCH-${i + 1}`,
    location: 'AZ1-R12-S2-B05',
    systemQty: 100,
    countedQty: null,
    varianceQty: 0,
    recountRequested: false,
    status: 'Pending' as const,
  }));

export const cycleCounts: CycleCount[] = [
  {
    id: 'CC-2026-0042', name: 'Cold Zone A — weekly count, week 18',
    strategy: 'Zone-based', frequency: 'Weekly',
    scheduledDate: '01 May 2026', startedAt: '07:30 AM, today',
    status: 'In progress', warehouse: 'Telangana Main', zonesScope: ['Cold Zone A', 'Cold Zone B'],
    assignedCounters: ['Anjali Reddy', 'Mohammed Khan'],
    totalLines: 8, countedLines: 5, variancesFound: 3, totalVarianceValue: -36_400,
    notes: 'Foundation seed cycle.', lines: cca42Lines,
  },
  {
    id: 'CC-2026-0041', name: 'Controlled zone — weekly count',
    strategy: 'Zone-based', frequency: 'Weekly',
    scheduledDate: '30 Apr 2026', startedAt: 'yesterday',
    status: 'Variance approval', warehouse: 'Telangana Main', zonesScope: ['Controlled Zone'],
    assignedCounters: ['Priya Sharma'],
    totalLines: 4, countedLines: 4, variancesFound: 3, totalVarianceValue: -64_700,
    lines: cca41Lines,
  },
  {
    id: 'CC-2026-0043', name: 'Packaging — random sample',
    strategy: 'Random', frequency: 'Ad-hoc',
    scheduledDate: '01 May 2026', startedAt: '10:00 AM, today',
    status: 'Pending review', warehouse: 'Telangana Main', zonesScope: ['Ambient Zone 3'],
    assignedCounters: ['Sunita Rao'],
    totalLines: 3, countedLines: 3, variancesFound: 2, totalVarianceValue: -2_360,
    lines: cca43Lines,
  },
  {
    id: 'CC-2026-0044', name: 'Class A items — monthly cycle',
    strategy: 'ABC-based', frequency: 'Monthly',
    scheduledDate: '01 May 2026', startedAt: '11:00 AM, today',
    status: 'In progress', warehouse: 'Telangana Main', zonesScope: ['Cold Zone A', 'Cold Zone C', 'Ambient Zone 1'],
    abcScope: ['A'],
    assignedCounters: ['Vikram Singh', 'Ramesh Kumar'],
    totalLines: 12, countedLines: 4, variancesFound: 1, totalVarianceValue: 0,
    lines: [...ccc44Lines, ...blankLines(9, 'CL-44')],
  },
  {
    id: 'CC-2026-0045', name: 'Cold Zone B — overdue weekly count',
    strategy: 'Zone-based', frequency: 'Weekly',
    scheduledDate: '28 Apr 2026',
    status: 'Scheduled', warehouse: 'Telangana Main', zonesScope: ['Cold Zone B'],
    assignedCounters: ['Mohammed Khan'],
    totalLines: 6, countedLines: 0, variancesFound: 0, totalVarianceValue: 0,
    notes: 'Overdue — escalate if not started today.', lines: blankLines(6, 'CL-45'),
  },
  {
    id: 'CC-2026-0040', name: 'Sunflower lots — quality recount',
    strategy: 'Specific items', frequency: 'Ad-hoc',
    scheduledDate: '28 Apr 2026', startedAt: '3 days ago', completedAt: '3 days ago',
    status: 'Completed', warehouse: 'Telangana Main', zonesScope: ['Cold Zone B'],
    assignedCounters: ['Priya Sharma'],
    totalLines: 5, countedLines: 5, variancesFound: 1, totalVarianceValue: -35_000, accuracyPct: 99.6,
    lines: blankLines(5, 'CL-40').map((l, i) => ({ ...l, status: i === 0 ? 'Posted' : 'Posted' })),
  },
  {
    id: 'CC-2026-0039', name: 'Packaging — week 17',
    strategy: 'Zone-based', frequency: 'Weekly',
    scheduledDate: '21 Apr 2026', startedAt: '10 days ago', completedAt: '10 days ago',
    status: 'Completed', warehouse: 'Telangana Main', zonesScope: ['Ambient Zone 3'],
    assignedCounters: ['Sunita Rao'],
    totalLines: 8, countedLines: 8, variancesFound: 1, totalVarianceValue: -200, accuracyPct: 99.0,
    lines: blankLines(8, 'CL-39'),
  },
  {
    id: 'CC-2026-0037', name: 'Maize cycle — week 17',
    strategy: 'ABC-based', frequency: 'Weekly',
    scheduledDate: '20 Apr 2026', startedAt: '11 days ago', completedAt: '11 days ago',
    status: 'Completed', warehouse: 'Telangana Main', zonesScope: ['Ambient Zone 1'],
    abcScope: ['A'],
    assignedCounters: ['Anjali Reddy'],
    totalLines: 5, countedLines: 5, variancesFound: 1, totalVarianceValue: -26_600, accuracyPct: 98.8,
    lines: blankLines(5, 'CL-37'),
  },
  {
    id: 'CC-2026-0036', name: 'Cold Zone A — week 16',
    strategy: 'Zone-based', frequency: 'Weekly',
    scheduledDate: '14 Apr 2026', startedAt: '17 days ago', completedAt: '17 days ago',
    status: 'Completed', warehouse: 'Telangana Main', zonesScope: ['Cold Zone A'],
    assignedCounters: ['Anjali Reddy'],
    totalLines: 7, countedLines: 7, variancesFound: 1, totalVarianceValue: -22_000, accuracyPct: 98.6,
    lines: blankLines(7, 'CL-36'),
  },
  {
    id: 'CC-2026-0035', name: 'Class A monthly cycle — April',
    strategy: 'ABC-based', frequency: 'Monthly',
    scheduledDate: '01 Apr 2026', startedAt: '30 days ago', completedAt: '30 days ago',
    status: 'Completed', warehouse: 'Telangana Main', zonesScope: ['Cold Zone C'],
    abcScope: ['A'],
    assignedCounters: ['Vikram Singh', 'Ramesh Kumar'],
    totalLines: 14, countedLines: 14, variancesFound: 1, totalVarianceValue: -21_750, accuracyPct: 99.3,
    lines: blankLines(14, 'CL-35'),
  },
  {
    id: 'CC-2026-0033', name: 'Maize quick recount',
    strategy: 'Specific items', frequency: 'Ad-hoc',
    scheduledDate: '17 Apr 2026', startedAt: '14 days ago', completedAt: '14 days ago',
    status: 'Completed', warehouse: 'Telangana Main', zonesScope: ['Ambient Zone 1'],
    assignedCounters: ['Anjali Reddy'],
    totalLines: 3, countedLines: 3, variancesFound: 1, totalVarianceValue: -19_000, accuracyPct: 99.2,
    lines: blankLines(3, 'CL-33'),
  },
  {
    id: 'CC-2026-0030', name: 'Packaging week 14',
    strategy: 'Zone-based', frequency: 'Weekly',
    scheduledDate: '07 Apr 2026', startedAt: '24 days ago', completedAt: '24 days ago',
    status: 'Completed', warehouse: 'Telangana Main', zonesScope: ['Ambient Zone 3'],
    assignedCounters: ['Sunita Rao'],
    totalLines: 6, countedLines: 6, variancesFound: 1, totalVarianceValue: -360, accuracyPct: 99.5,
    lines: blankLines(6, 'CL-30'),
  },
  {
    id: 'CC-2026-0028', name: 'Cold Zone A — week 15',
    strategy: 'Zone-based', frequency: 'Weekly',
    scheduledDate: '03 Apr 2026', startedAt: '28 days ago', completedAt: '28 days ago',
    status: 'Completed', warehouse: 'Telangana Main', zonesScope: ['Cold Zone A'],
    assignedCounters: ['Anjali Reddy'],
    totalLines: 7, countedLines: 7, variancesFound: 1, totalVarianceValue: -22_000, accuracyPct: 98.5,
    lines: blankLines(7, 'CL-28'),
  },
  {
    id: 'CC-2026-0024', name: 'Reserved paddy recount',
    strategy: 'Specific items', frequency: 'Ad-hoc',
    scheduledDate: '01 Apr 2026', startedAt: '30 days ago', completedAt: '30 days ago',
    status: 'Completed', warehouse: 'Telangana Main', zonesScope: ['Cold Zone B'],
    assignedCounters: ['Priya Sharma'],
    totalLines: 4, countedLines: 4, variancesFound: 1, totalVarianceValue: -21_750, accuracyPct: 99.0,
    lines: blankLines(4, 'CL-24'),
  },
  {
    id: 'CC-2026-0046', name: 'Q2 full physical inventory',
    strategy: 'Full physical', frequency: 'Quarterly',
    scheduledDate: '30 Jun 2026',
    status: 'Scheduled', warehouse: 'Telangana Main', zonesScope: ['All'],
    assignedCounters: ['Vikram Singh', 'Anjali Reddy', 'Mohammed Khan', 'Sunita Rao', 'Priya Sharma'],
    totalLines: 30, countedLines: 0, variancesFound: 0, totalVarianceValue: 0,
    notes: 'Plan freezer logistics with cold storage team 1 week prior.',
    lines: blankLines(30, 'CL-46'),
  },
  {
    id: 'CC-2026-0034', name: 'Cancelled — duplicate request',
    strategy: 'Random', frequency: 'Ad-hoc',
    scheduledDate: '15 Apr 2026',
    status: 'Cancelled', warehouse: 'Telangana Main', zonesScope: ['Ambient Zone 2'],
    assignedCounters: ['Sunita Rao'],
    totalLines: 0, countedLines: 0, variancesFound: 0, totalVarianceValue: 0,
    notes: 'Cancelled — covered by CC-2026-0035.',
    lines: [],
  },
];
