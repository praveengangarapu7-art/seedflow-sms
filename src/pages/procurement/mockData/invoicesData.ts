import type { Invoice } from '@/types/procurement';

export const mockInvoices: Invoice[] = [
  {
    id: 'INV-AGC-2026-3421', supplier: 'AgriChem Industries',
    poReference: 'PO-2026-0142', grnReference: 'GRN-2026-0089',
    invoiceDate: '19 Apr 2026',
    amount: 360169, taxAmount: 64831, total: 425000,
    matchStatus: 'matched', dueDate: '19 May 2026',
    paymentStatus: 'Paid', paidDate: '18 May 2026',
  },
  {
    id: 'INV-BSL-2026-1102', supplier: 'Bharat Seeds Pvt Ltd',
    poReference: 'PO-2026-0131', grnReference: 'GRN-2026-0075',
    invoiceDate: '28 Mar 2026',
    amount: 2714286, taxAmount: 135714, total: 2850000,
    matchStatus: 'matched', dueDate: '12 May 2026',
    paymentStatus: 'Paid', paidDate: '15 Apr 2026',
  },
  {
    id: 'INV-CCS-2026-0667', supplier: 'CropCare Solutions',
    poReference: 'PO-2026-0137', grnReference: 'GRN-2026-0091',
    invoiceDate: '24 Apr 2026',
    amount: 838095, taxAmount: 41905, total: 880000,
    matchStatus: 'mismatch', dueDate: '24 May 2026',
    paymentStatus: 'Disputed',
    variances: [
      { field: 'Quantity (DAP fertilizer)', poValue: 500, grnValue: 295, invoiceValue: 500, variance: -205 },
      { field: 'Total amount', poValue: 890000, grnValue: 524800, invoiceValue: 880000, variance: 355200 },
    ],
  },
  {
    id: 'INV-PPC-2026-0891', supplier: 'Pioneer Packaging Co',
    poReference: 'PO-2026-0133', grnReference: 'GRN-2026-0082',
    invoiceDate: '05 Apr 2026',
    amount: 830508, taxAmount: 149492, total: 980000,
    matchStatus: 'matched', dueDate: '05 May 2026',
    paymentStatus: 'Paid', paidDate: '02 May 2026',
  },
  {
    id: 'INV-GSC-2026-0234', supplier: 'GreenShield Crop Care',
    poReference: 'PO-2026-0132', grnReference: 'GRN-2026-0083',
    invoiceDate: '14 Apr 2026',
    amount: 54237, taxAmount: 9763, total: 64000,
    matchStatus: 'mismatch', dueDate: '14 May 2026',
    paymentStatus: 'Pending',
    variances: [
      { field: 'Damaged units (Safety gloves)', poValue: 50, grnValue: 48, invoiceValue: 50, variance: 2 },
    ],
  },
  {
    id: 'INV-AGC-2026-3410', supplier: 'AgriChem Industries',
    poReference: 'PO-2026-0134', grnReference: 'GRN-2026-0090',
    invoiceDate: '18 Apr 2026',
    amount: 58051, taxAmount: 10449, total: 68500,
    matchStatus: 'matched', dueDate: '18 May 2026',
    paymentStatus: 'Approved',
  },
  {
    id: 'INV-GSC-2026-0228', supplier: 'GreenShield Crop Care',
    poReference: 'PO-2026-0127', grnReference: 'GRN-2026-0086',
    invoiceDate: '14 Apr 2026',
    amount: 66102, taxAmount: 11898, total: 78000,
    matchStatus: 'matched', dueDate: '14 May 2026',
    paymentStatus: 'Pending',
  },
  {
    id: 'INV-AGC-2026-2891', supplier: 'AgriChem Industries',
    poReference: 'PO-2026-0130', grnReference: 'GRN-2026-0070',
    invoiceDate: '20 Mar 2026',
    amount: 1208051, taxAmount: 216949, total: 1425000,
    matchStatus: 'matched', dueDate: '19 Apr 2026',
    paymentStatus: 'Paid', paidDate: '15 Apr 2026',
  },
  {
    id: 'INV-SM-2026-0412', supplier: 'Stationery Mart',
    poReference: 'PO-2026-0139', grnReference: 'GRN-2026-0087',
    invoiceDate: '22 Apr 2026',
    amount: 16518, taxAmount: 1982, total: 18500,
    matchStatus: 'matched', dueDate: '22 May 2026',
    paymentStatus: 'Paid', paidDate: '22 Apr 2026',
  },
  {
    id: 'INV-NSL-2026-1256', supplier: 'Nuziveedu Seeds Ltd',
    poReference: 'PO-2026-0145', grnReference: 'GRN-2026-0095',
    invoiceDate: '08 Apr 2026',
    amount: 1428571, taxAmount: 71429, total: 1500000,
    matchStatus: 'pending', dueDate: '08 May 2026',
    paymentStatus: 'Pending',
  },
  {
    id: 'INV-SYN-2026-0789', supplier: 'Syngenta India',
    poReference: 'PO-2026-0140', grnReference: 'GRN-2026-0093',
    invoiceDate: '02 Apr 2026',
    amount: 950000, taxAmount: 171000, total: 1121000,
    matchStatus: 'matched', dueDate: '02 Mar 2026',
    paymentStatus: 'Overdue',
  },
  {
    id: 'INV-MAH-2026-0445', supplier: 'Mahyco Seeds Ltd',
    poReference: 'PO-2026-0148', grnReference: 'GRN-2026-0098',
    invoiceDate: '12 Apr 2026',
    amount: 1809524, taxAmount: 90476, total: 1900000,
    matchStatus: 'mismatch', dueDate: '12 May 2026',
    paymentStatus: 'Disputed',
    variances: [
      { field: 'Unit price (Maize hybrid)', poValue: 720, grnValue: 720, invoiceValue: 760, variance: 40 },
    ],
  },
  {
    id: 'INV-BAY-2026-1023', supplier: 'Bayer CropScience',
    poReference: 'PO-2026-0146', grnReference: 'GRN-2026-0096',
    invoiceDate: '15 Apr 2026',
    amount: 423729, taxAmount: 76271, total: 500000,
    matchStatus: 'matched', dueDate: '15 May 2026',
    paymentStatus: 'Approved',
  },
  {
    id: 'INV-RAL-2026-0334', supplier: 'Rallis India',
    poReference: 'PO-2026-0147', grnReference: 'GRN-2026-0097',
    invoiceDate: '20 Mar 2026',
    amount: 254237, taxAmount: 45763, total: 300000,
    matchStatus: 'matched', dueDate: '20 Apr 2026',
    paymentStatus: 'Overdue',
  },
  {
    id: 'INV-UPL-2026-0876', supplier: 'UPL Limited',
    poReference: 'PO-2026-0144', grnReference: 'GRN-2026-0094',
    invoiceDate: '18 Apr 2026',
    amount: 540000, taxAmount: 97200, total: 637200,
    matchStatus: 'pending', dueDate: '18 May 2026',
    paymentStatus: 'Pending',
  },
  {
    id: 'INV-PPC-2026-1102', supplier: 'Pioneer Packaging Co',
    poReference: 'PO-2026-0138', grnReference: 'GRN-2026-0099',
    invoiceDate: '24 Apr 2026',
    amount: 546610, taxAmount: 98390, total: 645000,
    matchStatus: 'pending', dueDate: '24 May 2026',
    paymentStatus: 'Pending',
  },
];

export const INVOICE_TAB_COUNTS = {
  all:      mockInvoices.length,
  pending:  mockInvoices.filter((i) => i.matchStatus !== 'matched').length,
  approved: mockInvoices.filter((i) => i.paymentStatus === 'Approved').length,
  paid:     mockInvoices.filter((i) => i.paymentStatus === 'Paid').length,
  disputed: mockInvoices.filter((i) => i.paymentStatus === 'Disputed').length,
};

export const INVOICE_SUPPLIER_OPTIONS = [
  { label: 'All suppliers', value: '' },
  ...Array.from(new Set(mockInvoices.map((i) => i.supplier))).sort().map((s) => ({ label: s, value: s })),
];

export const INVOICE_STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Pending',  value: 'Pending' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Paid',     value: 'Paid' },
  { label: 'Overdue',  value: 'Overdue' },
  { label: 'Disputed', value: 'Disputed' },
];
