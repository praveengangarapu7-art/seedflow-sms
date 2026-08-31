import type { StockAdjustment } from '@/types/warehouse';

export type AdjustmentsKpiIcon = 'Clock' | 'CheckCircle2' | 'TrendingDown' | 'Target';

export interface AdjustmentsKpi {
  label: string;
  value: string;
  iconName: AdjustmentsKpiIcon;
  trend: { direction: 'up' | 'down'; percentage: string; isPositive: boolean };
  comparison: string;
}

export const adjustmentKpis: AdjustmentsKpi[] = [
  {
    label: 'Pending approval',
    value: '12',
    iconName: 'Clock',
    trend: { direction: 'up', percentage: '3', isPositive: false },
    comparison: '₹84,500 total impact',
  },
  {
    label: 'Posted this month',
    value: '38',
    iconName: 'CheckCircle2',
    trend: { direction: 'up', percentage: '8%', isPositive: true },
    comparison: 'vs 35 last month',
  },
  {
    label: 'Net variance YTD',
    value: '−₹2,18,400',
    iconName: 'TrendingDown',
    trend: { direction: 'up', percentage: '0.9%', isPositive: false },
    comparison: '−0.9% of inventory',
  },
  {
    label: 'Inventory accuracy',
    value: '98.7%',
    iconName: 'Target',
    trend: { direction: 'up', percentage: '0.4%', isPositive: true },
    comparison: 'target: 98.0%',
  },
];

export interface VarianceByReason {
  reason: string;
  value: number;
}

export const varianceByReason: VarianceByReason[] = [
  { reason: 'Expired stock',           value: -92_400 },
  { reason: 'Cycle count variance',    value: -45_200 },
  { reason: 'Damaged goods',           value: -38_600 },
  { reason: 'Quality rejection',       value: -18_200 },
  { reason: 'Theft / shrinkage',       value: -12_500 },
  { reason: 'System correction',       value: 8_500  },
];

export interface TopItemVariance {
  sku: string;
  itemName: string;
  varianceQty: number;
  uom: string;
  varianceValue: number;
  latestAdjustmentId: string;
}

export const topItemsByVariance: TopItemVariance[] = [
  { sku: 'LB-KT-GERM',  itemName: 'Lab reagent kit — germination',         varianceQty: -12, uom: 'kits', varianceValue: -222_000, latestAdjustmentId: 'ADJ-2026-0118' },
  { sku: 'SD-CT-102-B', itemName: 'Cotton hybrid GH-BT-102 Quarantine',    varianceQty: -45, uom: 'bags', varianceValue: -94_500,  latestAdjustmentId: 'ADJ-2026-0107' },
  { sku: 'SD-MZ-204',   itemName: 'Maize hybrid GH-M-204',                 varianceQty: -28, uom: 'bags', varianceValue: -26_600,  latestAdjustmentId: 'ADJ-2026-0119' },
  { sku: 'CH-FG-010',   itemName: 'Fungicide concentrate 10 L',            varianceQty: -3,  uom: 'drums', varianceValue: -20_400, latestAdjustmentId: 'ADJ-2026-0114' },
  { sku: 'PK-PP-025',   itemName: 'PP packaging bags 25 kg',               varianceQty: -120, uom: 'pcs',  varianceValue: -2_160,   latestAdjustmentId: 'ADJ-2026-0120' },
];

export interface AdjustmentAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
}

export const adjustmentAlerts: AdjustmentAlert[] = [
  { id: 'AA-01', severity: 'warning',  title: '3 high-value adjustments pending over 24 hours',     description: 'Cumulative impact ₹64,500. Approve or reassign to keep posting cycle on track.' },
  { id: 'AA-02', severity: 'warning',  title: 'Cold Zone A flagged — 4 variances this month',       description: 'Investigate cooling, FEFO discipline, and putaway accuracy in this zone.' },
  { id: 'AA-03', severity: 'critical', title: 'Cotton GH-BT-102 cumulative variance >2% threshold', description: 'Trigger root-cause review per quality SOP. Trace to lots and shifts.' },
  { id: 'AA-04', severity: 'info',     title: 'Cycle count CC-2026-0042 awaiting variance posting', description: '8 variances queued from yesterday\'s Cold Zone A weekly count.' },
];



export const adjustments: StockAdjustment[] = [
  {
    id: 'ADJ-2026-0125', itemSku: 'SD-CT-102-A', itemName: 'Cotton hybrid GH-BT-102 Foundation', batch: 'BT-2025-A14', location: 'CZA-R4-S2-B14', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 1840, actualQty: 1832, varianceQty: -8, uom: 'bags', unitCost: 2200, varianceValue: -17_600,
    reason: 'Damaged goods', reasonNotes: 'Eight bags water-damaged from staging-area roof leak. Photos uploaded.',
    photos: ['photo-01.jpg', 'photo-02.jpg', 'photo-03.jpg'],
    initiatedBy: 'Quality inspector — Priya Sharma', initiatedAt: '10:48 AM, today', status: 'Pending approval',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'pending' }],
    source: 'Damage report',
  },
  {
    id: 'ADJ-2026-0124', itemSku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', location: 'AZ1-R12-S2-B05', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 2652, actualQty: 2640, varianceQty: -12, uom: 'bags', unitCost: 950, varianceValue: -11_400,
    reason: 'Cycle count variance', reasonNotes: 'System showed 2,652 bags; physical count was 2,640. Within tolerance.',
    photos: [], initiatedBy: 'Cycle count team — Anjali Reddy', initiatedAt: '09:18 AM, today', status: 'Pending approval',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'pending' }],
    source: 'Cycle count', cycleCountRef: 'CC-2026-0042',
  },
  {
    id: 'ADJ-2026-0123', itemSku: 'PK-PP-025', itemName: 'PP packaging bags 25 kg', batch: 'PK-2025-PP-09', location: 'AZ3-R8-S1-B02', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 12620, actualQty: 12500, varianceQty: -120, uom: 'pcs', unitCost: 18, varianceValue: -2_160,
    reason: 'Theft / shrinkage', reasonNotes: 'Discrepancy noted during night shift handover. Investigation initiated.',
    photos: [], initiatedBy: 'Warehouse manager — Vikram Singh', initiatedAt: 'yesterday', status: 'Pending approval',
    approvalChain: [{ approver: 'Suresh Babu', role: 'Operations head', status: 'pending' }],
    source: 'Manual',
  },
  {
    id: 'ADJ-2026-0122', itemSku: 'LB-KT-GERM', itemName: 'Lab reagent kit — germination', batch: 'LB-2025-KT-03', location: 'CTZ-R1-S2-B05', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 10, actualQty: 8, varianceQty: -2, uom: 'kits', unitCost: 18_500, varianceValue: -37_000,
    reason: 'Expired stock', reasonNotes: 'Two kits past expiry on routine sweep.',
    photos: ['photo-expired-01.jpg'], initiatedBy: 'Quality inspector — Priya Sharma', initiatedAt: 'yesterday', status: 'Pending approval',
    approvalChain: [
      { approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '04:36 PM, yesterday' },
      { approver: 'Suresh Babu', role: 'Operations head', status: 'pending' },
    ],
    source: 'Quality rejection',
  },
  {
    id: 'ADJ-2026-0121', itemSku: 'SD-PD-IR64-F', itemName: 'Paddy IR-64 Foundation', batch: 'PD-2025-22', location: 'CZC-R2-S3-B07', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 1500, actualQty: 1480, varianceQty: -20, uom: 'bags', unitCost: 1450, varianceValue: -29_000,
    reason: 'Cycle count variance', reasonNotes: 'Recount confirmed 20-bag shortfall.',
    photos: [], initiatedBy: 'Cycle count team — Anjali Reddy', initiatedAt: 'yesterday', status: 'Pending approval',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'pending' }],
    source: 'Cycle count', cycleCountRef: 'CC-2026-0041',
  },
  {
    id: 'ADJ-2026-0120', itemSku: 'CH-IS-005', itemName: 'Insecticide 5 L drums', batch: 'CH-2025-IS-07', location: 'CTZ-R3-S1-B04', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 144, actualQty: 142, varianceQty: -2, uom: 'drums', unitCost: 3450, varianceValue: -6_900,
    reason: 'Damaged goods', reasonNotes: 'Two drums leaked in transit between zones.',
    photos: ['photo-leak-01.jpg', 'photo-leak-02.jpg'], initiatedBy: 'Quality inspector — Priya Sharma', initiatedAt: '2 days ago', status: 'Pending approval',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'pending' }],
    source: 'Damage report',
  },
  {
    id: 'ADJ-2026-0119', itemSku: 'SD-CT-102-B', itemName: 'Cotton hybrid GH-BT-102 Quarantine', batch: 'BT-2025-A15', location: 'CZB-R6-S1-B07', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 965, actualQty: 920, varianceQty: -45, uom: 'bags', unitCost: 2100, varianceValue: -94_500,
    reason: 'Quality rejection', reasonNotes: 'Failed germination test. Reverse-GRN raised against supplier.',
    photos: ['photo-qa-01.jpg', 'photo-qa-02.jpg'], initiatedBy: 'Quality inspector — Priya Sharma', initiatedAt: '2 days ago', status: 'Pending approval',
    approvalChain: [
      { approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '11:20 AM, 2 days ago' },
      { approver: 'Suresh Babu', role: 'Operations head', status: 'pending' },
    ],
    source: 'Quality rejection',
  },
  {
    id: 'ADJ-2026-0118', itemSku: 'SD-SF-S88', itemName: 'Sunflower S-88 hybrid', batch: 'SF-2025-04', location: 'CZB-R3-S2-B11', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 480, actualQty: 460, varianceQty: -20, uom: 'bags', unitCost: 1750, varianceValue: -35_000,
    reason: 'Cycle count variance', reasonNotes: 'Variance flagged during ABC monthly cycle.',
    photos: [], initiatedBy: 'Cycle count team — Anjali Reddy', initiatedAt: '3 days ago', status: 'Pending approval',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'pending' }],
    source: 'Cycle count', cycleCountRef: 'CC-2026-0040',
  },
  {
    id: 'ADJ-2026-0117', itemSku: 'CH-FG-010', itemName: 'Fungicide concentrate 10 L', batch: 'CH-2025-FG-04', location: 'CTZ-R2-S1-B03', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 87, actualQty: 84, varianceQty: -3, uom: 'drums', unitCost: 6800, varianceValue: -20_400,
    reason: 'Damaged goods', reasonNotes: 'Spillage during weekly inspection.',
    photos: ['photo-spill-01.jpg'], initiatedBy: 'Quality inspector — Priya Sharma', initiatedAt: '3 days ago', status: 'Pending approval',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'pending' }],
    source: 'Damage report',
  },
  {
    id: 'ADJ-2026-0116', itemSku: 'RM-COCO-50', itemName: 'Coco peat substrate 50 kg', batch: 'RM-2025-CP-12', location: 'AZ2-R11-S1-B06', warehouse: 'Telangana Main',
    direction: 'Increase', systemQty: 574, actualQty: 580, varianceQty: 6, uom: 'bags', unitCost: 320, varianceValue: 1_920,
    reason: 'System correction', reasonNotes: 'Duplicate adjustment from prior migration; restoring physical count.',
    photos: [], initiatedBy: 'Warehouse manager — Vikram Singh', initiatedAt: '4 days ago', status: 'Pending approval',
    approvalChain: [{ approver: 'Suresh Babu', role: 'Operations head', status: 'pending' }],
    source: 'System reconciliation',
  },
  {
    id: 'ADJ-2026-0115', itemSku: 'PK-LBL-025', itemName: 'Printed labels 25 kg packs', batch: 'PK-2025-LBL-02', location: 'AZ3-R9-S2-B01', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 22050, actualQty: 22000, varianceQty: -50, uom: 'pcs', unitCost: 4, varianceValue: -200,
    reason: 'Cycle count variance', reasonNotes: 'Minor variance from random cycle count.',
    photos: [], initiatedBy: 'Cycle count team — Anjali Reddy', initiatedAt: '4 days ago', status: 'Pending approval',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'pending' }],
    source: 'Cycle count', cycleCountRef: 'CC-2026-0039',
  },
  {
    id: 'ADJ-2026-0114', itemSku: 'CH-HB-020', itemName: 'Herbicide 20 L drums', batch: 'CH-2025-HB-05', location: 'CTZ-R4-S1-B02', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 67, actualQty: 64, varianceQty: -3, uom: 'drums', unitCost: 7200, varianceValue: -21_600,
    reason: 'Theft / shrinkage', reasonNotes: 'Three drums missing after gate audit. Reported to security.',
    photos: ['photo-gate-01.jpg'], initiatedBy: 'Operations head — Suresh Babu', initiatedAt: '5 days ago', status: 'Pending approval',
    approvalChain: [{ approver: 'Suresh Babu', role: 'Operations head', status: 'pending' }],
    source: 'Manual',
  },
  {
    id: 'ADJ-2026-0113', itemSku: 'EQ-WB-250', itemName: 'Weighing balance 250 kg', batch: 'EQ-2025-WB-01', location: 'STG-R5-S1-B01', warehouse: 'Telangana Main',
    direction: 'Replace', systemQty: 5, actualQty: 4, varianceQty: -1, uom: 'units', unitCost: 24500, varianceValue: -24_500,
    reason: 'Damaged goods', reasonNotes: 'One unit beyond economic repair after loading dock fall.',
    photos: ['photo-balance-01.jpg', 'photo-balance-02.jpg'], initiatedBy: 'Warehouse manager — Vikram Singh', initiatedAt: '6 days ago', status: 'Approved',
    approvalChain: [
      { approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '5 days ago' },
      { approver: 'Suresh Babu', role: 'Operations head', status: 'approved', timestamp: '5 days ago', comment: 'Approved. File insurance claim.' },
    ],
    source: 'Damage report',
  },
  {
    id: 'ADJ-2026-0112', itemSku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', location: 'AZ1-R12-S2-B05', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 2680, actualQty: 2652, varianceQty: -28, uom: 'bags', unitCost: 950, varianceValue: -26_600,
    reason: 'Cycle count variance', reasonNotes: 'Recount confirmed 28-bag delta.',
    photos: [], initiatedBy: 'Cycle count team — Anjali Reddy', initiatedAt: '6 days ago', status: 'Approved',
    approvalChain: [
      { approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '5 days ago' },
      { approver: 'Suresh Babu', role: 'Operations head', status: 'approved', timestamp: '5 days ago' },
    ],
    source: 'Cycle count', cycleCountRef: 'CC-2026-0037',
  },
  {
    id: 'ADJ-2026-0111', itemSku: 'SD-CT-102-A', itemName: 'Cotton hybrid GH-BT-102 Foundation', batch: 'BT-2025-A14', location: 'CZA-R4-S2-B14', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 1850, actualQty: 1840, varianceQty: -10, uom: 'bags', unitCost: 2200, varianceValue: -22_000,
    reason: 'Cycle count variance', reasonNotes: 'Count team flagged 10-bag delta on weekly cycle.',
    photos: [], initiatedBy: 'Cycle count team — Anjali Reddy', initiatedAt: '7 days ago', status: 'Approved',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '6 days ago' }],
    source: 'Cycle count', cycleCountRef: 'CC-2026-0036',
  },
  {
    id: 'ADJ-2026-0110', itemSku: 'PK-PP-025', itemName: 'PP packaging bags 25 kg', batch: 'PK-2025-PP-09', location: 'AZ3-R8-S1-B02', warehouse: 'Telangana Main',
    direction: 'Increase', systemQty: 12480, actualQty: 12500, varianceQty: 20, uom: 'pcs', unitCost: 18, varianceValue: 360,
    reason: 'System correction', reasonNotes: 'Inbound GRN-3490 was under-recorded by 20 pcs. Restoring count.',
    photos: [], initiatedBy: 'Procurement exec — Anjali Reddy', initiatedAt: '7 days ago', status: 'Approved',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '6 days ago' }],
    source: 'System reconciliation',
  },
  {
    id: 'ADJ-2026-0109', itemSku: 'SD-PD-IR64-F', itemName: 'Paddy IR-64 Foundation', batch: 'PD-2025-22', location: 'CZC-R2-S3-B07', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 1495, actualQty: 1480, varianceQty: -15, uom: 'bags', unitCost: 1450, varianceValue: -21_750,
    reason: 'Cycle count variance', reasonNotes: 'Variance from monthly Class A cycle count.',
    photos: [], initiatedBy: 'Cycle count team — Anjali Reddy', initiatedAt: '8 days ago', status: 'Approved',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '7 days ago' }],
    source: 'Cycle count', cycleCountRef: 'CC-2026-0035',
  },
  {
    id: 'ADJ-2026-0108', itemSku: 'CH-IS-005', itemName: 'Insecticide 5 L drums', batch: 'CH-2025-IS-07', location: 'CTZ-R3-S1-B04', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 145, actualQty: 142, varianceQty: -3, uom: 'drums', unitCost: 3450, varianceValue: -10_350,
    reason: 'Damaged goods', reasonNotes: 'Three drums damaged in transit between zones.',
    photos: ['photo-trans-01.jpg'], initiatedBy: 'Quality inspector — Priya Sharma', initiatedAt: '9 days ago', status: 'Approved',
    approvalChain: [
      { approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '8 days ago' },
      { approver: 'Suresh Babu', role: 'Operations head', status: 'approved', timestamp: '8 days ago' },
    ],
    source: 'Damage report',
  },
  {
    id: 'ADJ-2026-0107', itemSku: 'SD-CT-102-B', itemName: 'Cotton hybrid GH-BT-102 Quarantine', batch: 'BT-2025-A15', location: 'CZB-R6-S1-B07', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 965, actualQty: 920, varianceQty: -45, uom: 'bags', unitCost: 2100, varianceValue: -94_500,
    reason: 'Quality rejection', reasonNotes: 'Failed germination test. Returned to supplier.',
    photos: ['photo-prev-01.jpg'], initiatedBy: 'Quality inspector — Priya Sharma', initiatedAt: '12 days ago', status: 'Approved',
    approvalChain: [
      { approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '11 days ago' },
      { approver: 'Suresh Babu', role: 'Operations head', status: 'approved', timestamp: '11 days ago', comment: 'Reverse-GRN logged.' },
    ],
    source: 'Quality rejection',
  },
  {
    id: 'ADJ-2026-0106', itemSku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', location: 'AZ1-R12-S2-B05', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 2700, actualQty: 2680, varianceQty: -20, uom: 'bags', unitCost: 950, varianceValue: -19_000,
    reason: 'Cycle count variance', reasonNotes: 'Posted from CC-2026-0033.',
    photos: [], initiatedBy: 'Cycle count team — Anjali Reddy', initiatedAt: '14 days ago', status: 'Posted',
    approvalChain: [
      { approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '13 days ago' },
    ],
    source: 'Cycle count', cycleCountRef: 'CC-2026-0033', postedAt: '13 days ago',
  },
  {
    id: 'ADJ-2026-0105', itemSku: 'LB-KT-GERM', itemName: 'Lab reagent kit — germination', batch: 'LB-2025-KT-03', location: 'CTZ-R1-S2-B05', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 12, actualQty: 10, varianceQty: -2, uom: 'kits', unitCost: 18_500, varianceValue: -37_000,
    reason: 'Expired stock', reasonNotes: 'Two kits past expiry. Disposed per SOP.',
    photos: ['photo-disposal.jpg'], initiatedBy: 'Quality inspector — Priya Sharma', initiatedAt: '15 days ago', status: 'Posted',
    approvalChain: [
      { approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '15 days ago' },
      { approver: 'Suresh Babu', role: 'Operations head', status: 'approved', timestamp: '15 days ago' },
    ],
    source: 'Quality rejection', postedAt: '14 days ago',
  },
  {
    id: 'ADJ-2026-0104', itemSku: 'CH-FG-010', itemName: 'Fungicide concentrate 10 L', batch: 'CH-2025-FG-04', location: 'CTZ-R2-S1-B03', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 90, actualQty: 87, varianceQty: -3, uom: 'drums', unitCost: 6800, varianceValue: -20_400,
    reason: 'Damaged goods', reasonNotes: 'Three drums damaged during reslotting.',
    photos: ['photo-reslot-01.jpg'], initiatedBy: 'Warehouse manager — Vikram Singh', initiatedAt: '16 days ago', status: 'Posted',
    approvalChain: [
      { approver: 'Suresh Babu', role: 'Operations head', status: 'approved', timestamp: '15 days ago' },
    ],
    source: 'Damage report', postedAt: '15 days ago',
  },
  {
    id: 'ADJ-2026-0103', itemSku: 'SD-SF-S88', itemName: 'Sunflower S-88 hybrid', batch: 'SF-2025-04', location: 'CZB-R3-S2-B11', warehouse: 'Telangana Main',
    direction: 'Increase', systemQty: 458, actualQty: 460, varianceQty: 2, uom: 'bags', unitCost: 1750, varianceValue: 3_500,
    reason: 'System correction', reasonNotes: 'Decimal-rounding error from import. Restoring 2 bags.',
    photos: [], initiatedBy: 'Procurement exec — Anjali Reddy', initiatedAt: '17 days ago', status: 'Posted',
    approvalChain: [
      { approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '16 days ago' },
    ],
    source: 'System reconciliation', postedAt: '16 days ago',
  },
  {
    id: 'ADJ-2026-0102', itemSku: 'PK-PP-025', itemName: 'PP packaging bags 25 kg', batch: 'PK-2025-PP-09', location: 'AZ3-R8-S1-B02', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 12640, actualQty: 12620, varianceQty: -20, uom: 'pcs', unitCost: 18, varianceValue: -360,
    reason: 'Cycle count variance', reasonNotes: 'Minor count variance from packaging cycle.',
    photos: [], initiatedBy: 'Cycle count team — Anjali Reddy', initiatedAt: '18 days ago', status: 'Posted',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '17 days ago' }],
    source: 'Cycle count', cycleCountRef: 'CC-2026-0030', postedAt: '17 days ago',
  },
  {
    id: 'ADJ-2026-0101', itemSku: 'SD-CT-102-A', itemName: 'Cotton hybrid GH-BT-102 Foundation', batch: 'BT-2025-A14', location: 'CZA-R4-S2-B14', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 1860, actualQty: 1850, varianceQty: -10, uom: 'bags', unitCost: 2200, varianceValue: -22_000,
    reason: 'Cycle count variance', reasonNotes: 'Variance posted from week-15 cycle count.',
    photos: [], initiatedBy: 'Cycle count team — Anjali Reddy', initiatedAt: '21 days ago', status: 'Posted',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '20 days ago' }],
    source: 'Cycle count', cycleCountRef: 'CC-2026-0028', postedAt: '20 days ago',
  },
  {
    id: 'ADJ-2026-0098', itemSku: 'SD-PD-IR64-R', itemName: 'Paddy IR-64 reserved', batch: 'PD-2025-21', location: 'CZB-R4-S1-B02', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 615, actualQty: 600, varianceQty: -15, uom: 'bags', unitCost: 1450, varianceValue: -21_750,
    reason: 'Cycle count variance', reasonNotes: 'Posted with overall accuracy 98.2% for the week.',
    photos: [], initiatedBy: 'Cycle count team — Anjali Reddy', initiatedAt: '24 days ago', status: 'Posted',
    approvalChain: [{ approver: 'Vikram Singh', role: 'Warehouse manager', status: 'approved', timestamp: '23 days ago' }],
    source: 'Cycle count', cycleCountRef: 'CC-2026-0024', postedAt: '23 days ago',
  },
  {
    id: 'ADJ-2026-0099', itemSku: 'CH-HB-020', itemName: 'Herbicide 20 L drums', batch: 'CH-2025-HB-05', location: 'CTZ-R4-S1-B02', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 70, actualQty: 70, varianceQty: 0, uom: 'drums', unitCost: 7200, varianceValue: 0,
    reason: 'Other', reasonNotes: 'Submitted in error — count was correct after recount.',
    photos: [], initiatedBy: 'Warehouse manager — Vikram Singh', initiatedAt: '20 days ago', status: 'Rejected',
    approvalChain: [
      { approver: 'Suresh Babu', role: 'Operations head', status: 'rejected', timestamp: '19 days ago', comment: 'No variance — close as duplicate.' },
    ],
    source: 'Manual',
  },
  {
    id: 'ADJ-2026-0100', itemSku: 'EQ-WB-250', itemName: 'Weighing balance 250 kg', batch: 'EQ-2025-WB-01', location: 'STG-R5-S1-B01', warehouse: 'Telangana Main',
    direction: 'Decrease', systemQty: 5, actualQty: 5, varianceQty: 0, uom: 'units', unitCost: 24500, varianceValue: 0,
    reason: 'Other', reasonNotes: 'Initial system reconciliation request — superseded by ADJ-2026-0113.',
    photos: [], initiatedBy: 'Warehouse manager — Vikram Singh', initiatedAt: '21 days ago', status: 'Rejected',
    approvalChain: [
      { approver: 'Suresh Babu', role: 'Operations head', status: 'rejected', timestamp: '20 days ago', comment: 'Closed in favour of damage adjustment ADJ-2026-0113.' },
    ],
    source: 'System reconciliation',
  },
];
