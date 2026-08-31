import type { ReturnRecord } from '@/types/warehouse';

export type ReturnsKpiIcon = 'Undo2' | 'Timer' | 'TrendingDown' | 'IndianRupee';

export interface ReturnsKpi {
  label: string;
  value: string;
  iconName: ReturnsKpiIcon;
  trend: { direction: 'up' | 'down'; percentage: string; isPositive: boolean };
  comparison: string;
}

export const returnKpis: ReturnsKpi[] = [
  {
    label: 'Active returns',
    value: '14',
    iconName: 'Undo2',
    trend: { direction: 'up', percentage: '2', isPositive: false },
    comparison: '8 customer · 6 supplier',
  },
  {
    label: 'Avg resolution time',
    value: '4.2 days',
    iconName: 'Timer',
    trend: { direction: 'down', percentage: '0.8d', isPositive: true },
    comparison: 'vs 5.0 days last month',
  },
  {
    label: 'Return rate (this month)',
    value: '1.8%',
    iconName: 'TrendingDown',
    trend: { direction: 'down', percentage: '0.3%', isPositive: true },
    comparison: 'vs 2.1% last month',
  },
  {
    label: 'Pending refunds',
    value: '₹2,18,500',
    iconName: 'IndianRupee',
    trend: { direction: 'up', percentage: '6', isPositive: false },
    comparison: 'across 6 returns',
  },
];

export const returnRecords: ReturnRecord[] = [
  {
    id: 'RTN-2026-0084', direction: 'Customer return', reference: 'SO-2026-1148',
    party: 'AgriDealer Hub Pvt Ltd', partyContact: { person: 'Rakesh Patil', phone: '+91 98220 11445', email: 'rakesh@agridealer.in' },
    initiatedDate: '02 May 2026', expectedReturnDate: '06 May 2026', status: 'Initiated',
    reason: 'Quality failure', reasonNotes: 'Customer reported low germination across 2 batches.',
    totalItems: 2, totalQuantity: 80, uom: 'bags', totalValue: 80_000,
    disposition: 'Pending decision', initiatedBy: 'Returns desk — Anjali Reddy',
    lineItems: [
      { sku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', originalQty: 200, returnedQty: 80, uom: 'bags', unitPrice: 950, conditionAssessment: 'Not assessed', itemDisposition: 'Pending decision' },
    ],
    photos: ['photo-1.jpg', 'photo-2.jpg'],
    resolutionTimeline: [{ stage: 'Initiated', timestamp: '02 May 2026', user: 'Anjali Reddy' }],
  },
  {
    id: 'RTN-2026-0083', direction: 'Customer return', reference: 'SO-2026-1142',
    party: 'GreenField Distributors',
    initiatedDate: '01 May 2026', expectedReturnDate: '04 May 2026', status: 'Initiated',
    reason: 'Damaged in transit', totalItems: 1, totalQuantity: 30, uom: 'bags', totalValue: 52_500,
    disposition: 'Pending decision', initiatedBy: 'Returns desk — Anjali Reddy',
    lineItems: [
      { sku: 'SD-SF-S88', itemName: 'Sunflower S-88 hybrid', batch: 'SF-2025-04', originalQty: 60, returnedQty: 30, uom: 'bags', unitPrice: 1750, conditionAssessment: 'Not assessed', itemDisposition: 'Pending decision' },
    ],
    photos: ['photo-1.jpg'],
    resolutionTimeline: [{ stage: 'Initiated', timestamp: '01 May 2026', user: 'Anjali Reddy' }],
  },
  {
    id: 'RTN-2026-0082', direction: 'Supplier return', reference: 'GRN-3486',
    party: 'Mahyco Seeds',
    initiatedDate: '01 May 2026', expectedReturnDate: '05 May 2026', status: 'Initiated',
    reason: 'Quality failure', reasonNotes: 'Failed germination test against contract spec.',
    totalItems: 1, totalQuantity: 50, uom: 'bags', totalValue: 1_05_000,
    disposition: 'Return to supplier', initiatedBy: 'Quality inspector — Priya Sharma',
    lineItems: [
      { sku: 'SD-CT-102-B', itemName: 'Cotton hybrid GH-BT-102 Certified', batch: 'BT-2025-A15', originalQty: 920, returnedQty: 50, uom: 'bags', unitPrice: 2100, conditionAssessment: 'Defective', itemDisposition: 'Return to supplier' },
    ],
    photos: ['photo-1.jpg', 'photo-2.jpg'],
    resolutionTimeline: [{ stage: 'Initiated', timestamp: '01 May 2026', user: 'Priya Sharma' }],
  },
  {
    id: 'RTN-2026-0081', direction: 'Customer return', reference: 'DO-2026-0405',
    party: 'Sahyadri Agri Stores',
    initiatedDate: '30 Apr 2026', expectedReturnDate: '03 May 2026', status: 'Initiated',
    reason: 'Wrong item shipped', totalItems: 1, totalQuantity: 40, uom: 'bags', totalValue: 38_000,
    disposition: 'Pending decision', initiatedBy: 'Returns desk — Anjali Reddy',
    lineItems: [
      { sku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', originalQty: 100, returnedQty: 40, uom: 'bags', unitPrice: 950, conditionAssessment: 'Not assessed', itemDisposition: 'Pending decision' },
    ],
    photos: [],
    resolutionTimeline: [{ stage: 'Initiated', timestamp: '30 Apr 2026', user: 'Anjali Reddy' }],
  },
  {
    id: 'RTN-2026-0080', direction: 'Supplier return', reference: 'GRN-3478',
    party: 'Bharat Seeds Pvt Ltd',
    initiatedDate: '30 Apr 2026', expectedReturnDate: '04 May 2026', status: 'Initiated',
    reason: 'Mislabeled', totalItems: 1, totalQuantity: 25, uom: 'bags', totalValue: 55_000,
    disposition: 'Return to supplier', initiatedBy: 'Quality inspector — Priya Sharma',
    lineItems: [
      { sku: 'SD-CT-102-A', itemName: 'Cotton hybrid GH-BT-102 Foundation', batch: 'BT-2025-A12', originalQty: 1840, returnedQty: 25, uom: 'bags', unitPrice: 2200, conditionAssessment: 'Damaged', itemDisposition: 'Return to supplier' },
    ],
    photos: ['photo-1.jpg'],
    resolutionTimeline: [{ stage: 'Initiated', timestamp: '30 Apr 2026', user: 'Priya Sharma' }],
  },

  {
    id: 'RTN-2026-0079', direction: 'Customer return', reference: 'DO-2026-0402',
    party: 'BharatKrishi Retail',
    initiatedDate: '29 Apr 2026', expectedReturnDate: '02 May 2026', status: 'In transit',
    reason: 'Customer cancellation', totalItems: 2, totalQuantity: 120, uom: 'bags', totalValue: 1_20_000,
    disposition: 'Restock', initiatedBy: 'Returns desk — Anjali Reddy',
    lineItems: [
      { sku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', originalQty: 80, returnedQty: 80, uom: 'bags', unitPrice: 950, conditionAssessment: 'Not assessed', itemDisposition: 'Restock' },
      { sku: 'SD-SF-S88', itemName: 'Sunflower S-88 hybrid', batch: 'SF-2025-04', originalQty: 40, returnedQty: 40, uom: 'bags', unitPrice: 1750, conditionAssessment: 'Not assessed', itemDisposition: 'Restock' },
    ],
    photos: [],
    resolutionTimeline: [
      { stage: 'Initiated',  timestamp: '28 Apr 2026', user: 'Anjali Reddy' },
      { stage: 'In transit', timestamp: '29 Apr 2026', user: 'Anjali Reddy' },
    ],
  },
  {
    id: 'RTN-2026-0078', direction: 'Customer return', reference: 'DO-2026-0398',
    party: 'KrishiSeva Cooperative',
    initiatedDate: '28 Apr 2026', expectedReturnDate: '01 May 2026', status: 'In transit',
    reason: 'Excess quantity', totalItems: 1, totalQuantity: 60, uom: 'bags', totalValue: 57_000,
    disposition: 'Restock', initiatedBy: 'Returns desk — Anjali Reddy',
    lineItems: [
      { sku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', originalQty: 240, returnedQty: 60, uom: 'bags', unitPrice: 950, conditionAssessment: 'Not assessed', itemDisposition: 'Restock' },
    ],
    photos: [],
    resolutionTimeline: [
      { stage: 'Initiated', timestamp: '27 Apr 2026', user: 'Anjali Reddy' },
      { stage: 'In transit', timestamp: '28 Apr 2026', user: 'Anjali Reddy' },
    ],
  },
  {
    id: 'RTN-2026-0077', direction: 'Supplier return', reference: 'GRN-3460',
    party: 'AgriChem Industries',
    initiatedDate: '27 Apr 2026', expectedReturnDate: '01 May 2026', status: 'In transit',
    reason: 'Damaged in transit', totalItems: 1, totalQuantity: 6, uom: 'drums', totalValue: 40_800,
    disposition: 'Return to supplier', initiatedBy: 'Quality inspector — Priya Sharma',
    lineItems: [
      { sku: 'CH-FG-010', itemName: 'Fungicide concentrate 10 L', batch: 'CH-2025-FG-04', originalQty: 84, returnedQty: 6, uom: 'drums', unitPrice: 6800, conditionAssessment: 'Damaged', itemDisposition: 'Return to supplier' },
    ],
    photos: ['photo-1.jpg', 'photo-2.jpg'],
    resolutionTimeline: [
      { stage: 'Initiated', timestamp: '26 Apr 2026', user: 'Priya Sharma' },
      { stage: 'In transit', timestamp: '27 Apr 2026', user: 'Priya Sharma' },
    ],
  },

  {
    id: 'RTN-2026-0076', direction: 'Customer return', reference: 'DO-2026-0395',
    party: 'AgriDealer Hub Pvt Ltd',
    initiatedDate: '25 Apr 2026', receivedDate: '28 Apr 2026', status: 'Received',
    reason: 'Performance complaint', totalItems: 1, totalQuantity: 50, uom: 'bags', totalValue: 47_500,
    disposition: 'Pending decision', initiatedBy: 'Returns desk — Anjali Reddy',
    lineItems: [
      { sku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', originalQty: 120, returnedQty: 50, uom: 'bags', unitPrice: 950, conditionAssessment: 'Not assessed', itemDisposition: 'Pending decision' },
    ],
    photos: ['photo-1.jpg'],
    resolutionTimeline: [
      { stage: 'Initiated', timestamp: '25 Apr 2026', user: 'Anjali Reddy' },
      { stage: 'In transit', timestamp: '26 Apr 2026', user: 'Anjali Reddy' },
      { stage: 'Received',   timestamp: '28 Apr 2026', user: 'Vikram Singh' },
    ],
  },
  {
    id: 'RTN-2026-0075', direction: 'Supplier return', reference: 'GRN-3450',
    party: 'Mahyco Seeds',
    initiatedDate: '24 Apr 2026', receivedDate: '27 Apr 2026', status: 'Received',
    reason: 'Quality failure', totalItems: 1, totalQuantity: 18, uom: 'bags', totalValue: 31_500,
    disposition: 'Return to supplier', initiatedBy: 'Quality inspector — Priya Sharma',
    lineItems: [
      { sku: 'SD-SF-S88', itemName: 'Sunflower S-88 hybrid', batch: 'SF-2025-04', originalQty: 460, returnedQty: 18, uom: 'bags', unitPrice: 1750, conditionAssessment: 'Defective', itemDisposition: 'Return to supplier' },
    ],
    photos: ['photo-1.jpg', 'photo-2.jpg', 'photo-3.jpg'],
    resolutionTimeline: [
      { stage: 'Initiated', timestamp: '24 Apr 2026', user: 'Priya Sharma' },
      { stage: 'In transit', timestamp: '25 Apr 2026', user: 'Priya Sharma' },
      { stage: 'Received',   timestamp: '27 Apr 2026', user: 'Vikram Singh' },
    ],
  },

  {
    id: 'RTN-2026-0074', direction: 'Customer return', reference: 'DO-2026-0388',
    party: 'GreenField Distributors',
    initiatedDate: '22 Apr 2026', receivedDate: '25 Apr 2026', status: 'Inspecting',
    reason: 'Damaged in transit', totalItems: 2, totalQuantity: 70, uom: 'bags', totalValue: 80_500,
    disposition: 'Pending decision', initiatedBy: 'Returns desk — Anjali Reddy',
    inspectedBy: 'Quality inspector — Priya Sharma',
    lineItems: [
      { sku: 'SD-PD-IR64-F', itemName: 'Paddy IR-64 Foundation', batch: 'PD-2025-22', originalQty: 100, returnedQty: 50, uom: 'bags', unitPrice: 1450, conditionAssessment: 'Damaged', itemDisposition: 'Quarantine', inspectionNotes: 'Bags torn during transit, contents partially mixed.' },
      { sku: 'SD-MZ-204',     itemName: 'Maize hybrid GH-M-204',  batch: 'MZ-2025-08', originalQty: 40,  returnedQty: 20, uom: 'bags', unitPrice: 950,  conditionAssessment: 'Not assessed', itemDisposition: 'Pending decision' },
    ],
    photos: ['photo-1.jpg', 'photo-2.jpg'],
    resolutionTimeline: [
      { stage: 'Initiated',  timestamp: '22 Apr 2026', user: 'Anjali Reddy' },
      { stage: 'In transit', timestamp: '23 Apr 2026', user: 'Anjali Reddy' },
      { stage: 'Received',   timestamp: '25 Apr 2026', user: 'Vikram Singh' },
      { stage: 'Inspecting', timestamp: '26 Apr 2026', user: 'Priya Sharma' },
    ],
  },
  {
    id: 'RTN-2026-0073', direction: 'Supplier return', reference: 'GRN-3445',
    party: 'AgriChem Industries',
    initiatedDate: '20 Apr 2026', receivedDate: '23 Apr 2026', status: 'Inspecting',
    reason: 'Mislabeled', totalItems: 1, totalQuantity: 4, uom: 'drums', totalValue: 13_800,
    disposition: 'Return to supplier', initiatedBy: 'Quality inspector — Priya Sharma',
    inspectedBy: 'Quality inspector — Priya Sharma',
    lineItems: [
      { sku: 'CH-IS-005', itemName: 'Insecticide 5 L drums', batch: 'CH-2025-IS-07', originalQty: 142, returnedQty: 4, uom: 'drums', unitPrice: 3450, conditionAssessment: 'Defective', itemDisposition: 'Return to supplier', inspectionNotes: 'Labels show wrong batch reference.' },
    ],
    photos: ['photo-1.jpg'],
    resolutionTimeline: [
      { stage: 'Initiated',  timestamp: '20 Apr 2026', user: 'Priya Sharma' },
      { stage: 'In transit', timestamp: '21 Apr 2026', user: 'Priya Sharma' },
      { stage: 'Received',   timestamp: '23 Apr 2026', user: 'Vikram Singh' },
      { stage: 'Inspecting', timestamp: '24 Apr 2026', user: 'Priya Sharma' },
    ],
  },

  {
    id: 'RTN-2026-0072', direction: 'Customer return', reference: 'DO-2026-0382',
    party: 'KrishiSeva Cooperative',
    initiatedDate: '18 Apr 2026', receivedDate: '20 Apr 2026', status: 'Disposition pending',
    reason: 'Customer cancellation', totalItems: 1, totalQuantity: 35, uom: 'bags', totalValue: 33_250,
    disposition: 'Pending decision', initiatedBy: 'Returns desk — Anjali Reddy',
    inspectedBy: 'Quality inspector — Priya Sharma',
    lineItems: [
      { sku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', originalQty: 60, returnedQty: 35, uom: 'bags', unitPrice: 950, conditionAssessment: 'Good', itemDisposition: 'Restock', inspectionNotes: 'All bags sealed, packaging intact.' },
    ],
    photos: [],
    resolutionTimeline: [
      { stage: 'Initiated', timestamp: '18 Apr 2026', user: 'Anjali Reddy' },
      { stage: 'In transit', timestamp: '19 Apr 2026', user: 'Anjali Reddy' },
      { stage: 'Received', timestamp: '20 Apr 2026', user: 'Vikram Singh' },
      { stage: 'Inspecting', timestamp: '21 Apr 2026', user: 'Priya Sharma' },
      { stage: 'Disposition pending', timestamp: '22 Apr 2026', user: 'Priya Sharma' },
    ],
  },

  {
    id: 'RTN-2026-0071', direction: 'Customer return', reference: 'DO-2026-0375',
    party: 'AgriDealer Hub Pvt Ltd',
    initiatedDate: '12 Apr 2026', receivedDate: '15 Apr 2026', status: 'Resolved',
    reason: 'Damaged in transit', totalItems: 1, totalQuantity: 25, uom: 'bags', totalValue: 23_750,
    disposition: 'Quarantine', initiatedBy: 'Returns desk — Anjali Reddy',
    inspectedBy: 'Quality inspector — Priya Sharma', resolvedBy: 'Returns desk — Anjali Reddy',
    refundProcessed: true, refundAmount: 23_750, creditNoteRef: 'CN-2026-0044',
    lineItems: [
      { sku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', originalQty: 50, returnedQty: 25, uom: 'bags', unitPrice: 950, conditionAssessment: 'Damaged', itemDisposition: 'Quarantine', inspectionNotes: 'Water-damaged, unfit for restocking.' },
    ],
    photos: ['photo-1.jpg', 'photo-2.jpg'],
    resolutionTimeline: [
      { stage: 'Initiated', timestamp: '12 Apr 2026', user: 'Anjali Reddy' },
      { stage: 'Received',  timestamp: '15 Apr 2026', user: 'Vikram Singh' },
      { stage: 'Inspecting', timestamp: '16 Apr 2026', user: 'Priya Sharma' },
      { stage: 'Resolved',  timestamp: '18 Apr 2026', user: 'Anjali Reddy', comment: 'Credit note issued, items moved to quarantine.' },
    ],
  },
  {
    id: 'RTN-2026-0070', direction: 'Supplier return', reference: 'GRN-3422',
    party: 'AgriChem Industries',
    initiatedDate: '08 Apr 2026', receivedDate: '11 Apr 2026', status: 'Resolved',
    reason: 'Quality failure', totalItems: 1, totalQuantity: 8, uom: 'drums', totalValue: 54_400,
    disposition: 'Return to supplier', initiatedBy: 'Quality inspector — Priya Sharma',
    inspectedBy: 'Quality inspector — Priya Sharma', resolvedBy: 'Operations head — Suresh Babu',
    debitNoteRef: 'DN-2026-0028',
    lineItems: [
      { sku: 'CH-FG-010', itemName: 'Fungicide concentrate 10 L', batch: 'CH-2025-FG-04', originalQty: 84, returnedQty: 8, uom: 'drums', unitPrice: 6800, conditionAssessment: 'Defective', itemDisposition: 'Return to supplier', inspectionNotes: 'Failed assay test against contract spec.' },
    ],
    photos: ['photo-1.jpg', 'photo-2.jpg'],
    resolutionTimeline: [
      { stage: 'Initiated', timestamp: '08 Apr 2026', user: 'Priya Sharma' },
      { stage: 'Received',  timestamp: '11 Apr 2026', user: 'Vikram Singh' },
      { stage: 'Resolved',  timestamp: '14 Apr 2026', user: 'Suresh Babu', comment: 'Debit note raised, replacement requested from supplier.' },
    ],
  },
  {
    id: 'RTN-2026-0069', direction: 'Customer return', reference: 'DO-2026-0368',
    party: 'BharatKrishi Retail',
    initiatedDate: '05 Apr 2026', receivedDate: '07 Apr 2026', status: 'Resolved',
    reason: 'Excess quantity', totalItems: 1, totalQuantity: 40, uom: 'bags', totalValue: 38_000,
    disposition: 'Restock', initiatedBy: 'Returns desk — Anjali Reddy',
    inspectedBy: 'Quality inspector — Priya Sharma', resolvedBy: 'Returns desk — Anjali Reddy',
    refundProcessed: true, refundAmount: 36_100, creditNoteRef: 'CN-2026-0042',
    lineItems: [
      { sku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', originalQty: 120, returnedQty: 40, uom: 'bags', unitPrice: 950, conditionAssessment: 'Good', itemDisposition: 'Restock', inspectionNotes: 'Perfect condition, restocking applied.' },
    ],
    photos: [],
    resolutionTimeline: [
      { stage: 'Initiated', timestamp: '05 Apr 2026', user: 'Anjali Reddy' },
      { stage: 'Received',  timestamp: '07 Apr 2026', user: 'Vikram Singh' },
      { stage: 'Resolved',  timestamp: '10 Apr 2026', user: 'Anjali Reddy', comment: 'Credit note issued with 5% restocking fee, items restocked.' },
    ],
  },
  {
    id: 'RTN-2026-0068', direction: 'Supplier return', reference: 'GRN-3415',
    party: 'AgriChem Industries',
    initiatedDate: '02 Apr 2026', receivedDate: '04 Apr 2026', status: 'Resolved',
    reason: 'Damaged in transit', totalItems: 1, totalQuantity: 4, uom: 'drums', totalValue: 13_800,
    disposition: 'Return to supplier', initiatedBy: 'Quality inspector — Priya Sharma',
    inspectedBy: 'Quality inspector — Priya Sharma', resolvedBy: 'Operations head — Suresh Babu',
    debitNoteRef: 'DN-2026-0024',
    lineItems: [
      { sku: 'CH-IS-005', itemName: 'Insecticide 5 L drums', batch: 'CH-2025-IS-07', originalQty: 142, returnedQty: 4, uom: 'drums', unitPrice: 3450, conditionAssessment: 'Damaged', itemDisposition: 'Return to supplier', inspectionNotes: 'Two drums leaked, photos attached.' },
    ],
    photos: ['photo-1.jpg', 'photo-2.jpg'],
    resolutionTimeline: [
      { stage: 'Initiated', timestamp: '02 Apr 2026', user: 'Priya Sharma' },
      { stage: 'Received',  timestamp: '04 Apr 2026', user: 'Vikram Singh' },
      { stage: 'Resolved',  timestamp: '07 Apr 2026', user: 'Suresh Babu', comment: 'Debit note issued, replacement received.' },
    ],
  },

  {
    id: 'RTN-2026-0067', direction: 'Customer return', reference: 'DO-2026-0359',
    party: 'Sahyadri Agri Stores',
    initiatedDate: '28 Mar 2026', status: 'Cancelled',
    reason: 'Other', reasonNotes: 'Customer withdrew return request — accepted product after reinspection.',
    totalItems: 1, totalQuantity: 15, uom: 'bags', totalValue: 14_250,
    disposition: 'Pending decision', initiatedBy: 'Returns desk — Anjali Reddy',
    lineItems: [
      { sku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', batch: 'MZ-2025-08', originalQty: 40, returnedQty: 15, uom: 'bags', unitPrice: 950, conditionAssessment: 'Not assessed', itemDisposition: 'Pending decision' },
    ],
    photos: [],
    resolutionTimeline: [
      { stage: 'Initiated', timestamp: '28 Mar 2026', user: 'Anjali Reddy' },
      { stage: 'Cancelled', timestamp: '30 Mar 2026', user: 'Anjali Reddy', comment: 'Customer withdrew return.' },
    ],
  },
];
