import type { BarcodeRecord, ScanLogEntry, PrintJob, ScanDeviceRecord } from '@/types/warehouse';

export type BarcodeKpiIcon = 'QrCode' | 'ScanBarcode' | 'Target' | 'Printer';

export interface BarcodeKpi {
  label: string;
  value: string;
  iconName: BarcodeKpiIcon;
  trend: { direction: 'up' | 'down'; percentage: string; isPositive: boolean };
  comparison: string;
}

export const barcodeKpis: BarcodeKpi[] = [
  {
    label: 'Active codes',
    value: '1,847',
    iconName: 'QrCode',
    trend: { direction: 'up', percentage: '12', isPositive: true },
    comparison: '+12 today',
  },
  {
    label: 'Scans today',
    value: '342',
    iconName: 'ScanBarcode',
    trend: { direction: 'up', percentage: '18%', isPositive: true },
    comparison: 'vs 290 yesterday',
  },
  {
    label: 'Scan accuracy',
    value: '99.8%',
    iconName: 'Target',
    trend: { direction: 'up', percentage: '0.1%', isPositive: true },
    comparison: '0.2% mismatches',
  },
  {
    label: 'Pending print jobs',
    value: '8',
    iconName: 'Printer',
    trend: { direction: 'up', percentage: '2', isPositive: false },
    comparison: '230 labels queued',
  },
];

export const barcodes: BarcodeRecord[] = [
  { id: 'BC-2026-0124', type: 'Item',     format: 'CODE128', code: 'ITM-CT-BT102-A-2026',  linkedTo: { kind: 'Item',     id: 'SD-CT-102-A',  label: 'Cotton hybrid GH-BT-102 Foundation' },     generatedAt: '08:14 AM, today',     generatedBy: 'Vikram Singh', printedCount: 1840, lastPrintedAt: '08:32 AM, today',     active: true },
  { id: 'BC-2026-0123', type: 'Item',     format: 'QR',      code: 'ITM-MZ-204-2026',       linkedTo: { kind: 'Item',     id: 'SD-MZ-204',    label: 'Maize hybrid GH-M-204' },                  generatedAt: 'yesterday',           generatedBy: 'Anjali Reddy', printedCount: 2640, lastPrintedAt: 'yesterday',                active: true },
  { id: 'BC-2026-0122', type: 'Item',     format: 'CODE128', code: 'ITM-PD-IR64-F-2026',    linkedTo: { kind: 'Item',     id: 'SD-PD-IR64-F', label: 'Paddy IR-64 Foundation' },                 generatedAt: '2 days ago',          generatedBy: 'Anjali Reddy', printedCount: 1480, lastPrintedAt: '2 days ago',               active: true },
  { id: 'BC-2026-0121', type: 'Item',     format: 'CODE128', code: 'ITM-SF-S88-2026',       linkedTo: { kind: 'Item',     id: 'SD-SF-S88',    label: 'Sunflower S-88 hybrid' },                  generatedAt: '3 days ago',          generatedBy: 'Anjali Reddy', printedCount: 460,  lastPrintedAt: '3 days ago',               active: true },
  { id: 'BC-2026-0120', type: 'Item',     format: 'QR',      code: 'ITM-FG-010-2026',       linkedTo: { kind: 'Item',     id: 'CH-FG-010',    label: 'Fungicide concentrate 10 L' },             generatedAt: '4 days ago',          generatedBy: 'Priya Sharma', printedCount: 84,   lastPrintedAt: '4 days ago',               active: true },
  { id: 'BC-2026-0119', type: 'Item',     format: 'CODE128', code: 'ITM-IS-005-2026',       linkedTo: { kind: 'Item',     id: 'CH-IS-005',    label: 'Insecticide 5 L drums' },                  generatedAt: '5 days ago',          generatedBy: 'Priya Sharma', printedCount: 142,  lastPrintedAt: '5 days ago',               active: true },
  { id: 'BC-2026-0118', type: 'Item',     format: 'CODE128', code: 'ITM-PP-025-2026',       linkedTo: { kind: 'Item',     id: 'PK-PP-025',    label: 'PP packaging bags 25 kg' },                generatedAt: '6 days ago',          generatedBy: 'Vikram Singh', printedCount: 12500, lastPrintedAt: '6 days ago',              active: true },
  { id: 'BC-2026-0117', type: 'Item',     format: 'EAN13',   code: '8901234567892',         linkedTo: { kind: 'Item',     id: 'PK-LBL-025',   label: 'Printed labels 25 kg packs' },             generatedAt: '7 days ago',          generatedBy: 'Vikram Singh', printedCount: 22000, lastPrintedAt: '7 days ago',              active: true },
  { id: 'BC-2026-0116', type: 'Item',     format: 'QR',      code: 'ITM-LB-KT-GERM-2026',   linkedTo: { kind: 'Item',     id: 'LB-KT-GERM',   label: 'Lab reagent kit — germination' },          generatedAt: '8 days ago',          generatedBy: 'Priya Sharma', printedCount: 8,    lastPrintedAt: '8 days ago',               active: true },
  { id: 'BC-2026-0115', type: 'Item',     format: 'CODE128', code: 'ITM-COCO-50-2026',      linkedTo: { kind: 'Item',     id: 'RM-COCO-50',   label: 'Coco peat substrate 50 kg' },              generatedAt: '10 days ago',         generatedBy: 'Anjali Reddy', printedCount: 580,  lastPrintedAt: '10 days ago',              active: true },
  { id: 'BC-2026-0114', type: 'Bin',      format: 'CODE128', code: 'BIN-CZA-R4-S2-B14',     linkedTo: { kind: 'Bin',      id: 'B-001',        label: 'CZA-R4-S2-B14' },                          generatedAt: '12 days ago',         generatedBy: 'Vikram Singh', printedCount: 1,    lastPrintedAt: '12 days ago',              active: true },
  { id: 'BC-2026-0113', type: 'Bin',      format: 'CODE128', code: 'BIN-CZB-R6-S1-B07',     linkedTo: { kind: 'Bin',      id: 'B-006',        label: 'CZB-R6-S1-B07' },                          generatedAt: '12 days ago',         generatedBy: 'Vikram Singh', printedCount: 1,    lastPrintedAt: '12 days ago',              active: true },
  { id: 'BC-2026-0112', type: 'Bin',      format: 'CODE128', code: 'BIN-AZ1-R12-S2-B05',    linkedTo: { kind: 'Bin',      id: 'B-011',        label: 'AZ1-R12-S2-B05' },                         generatedAt: '12 days ago',         generatedBy: 'Vikram Singh', printedCount: 1,    lastPrintedAt: '12 days ago',              active: true },
  { id: 'BC-2026-0111', type: 'Bin',      format: 'QR',      code: 'BIN-CTZ-R2-S1-B03',     linkedTo: { kind: 'Bin',      id: 'B-020',        label: 'CTZ-R2-S1-B03' },                          generatedAt: '12 days ago',         generatedBy: 'Vikram Singh', printedCount: 1,    lastPrintedAt: '12 days ago',              active: true },
  { id: 'BC-2026-0110', type: 'Bin',      format: 'CODE128', code: 'BIN-AZ3-R8-S1-B02',     linkedTo: { kind: 'Bin',      id: 'B-017',        label: 'AZ3-R8-S1-B02' },                          generatedAt: '12 days ago',         generatedBy: 'Vikram Singh', printedCount: 1,    lastPrintedAt: '12 days ago',              active: true },
  { id: 'BC-2026-0109', type: 'Location', format: 'QR',      code: 'LOC-DOCK-2',            linkedTo: { kind: 'Location', id: 'DOCK-2',       label: 'Receiving Dock 2' },                       generatedAt: '14 days ago',         generatedBy: 'Vikram Singh', printedCount: 2,    lastPrintedAt: '14 days ago',              active: true },
  { id: 'BC-2026-0108', type: 'Location', format: 'QR',      code: 'LOC-DISP-1',            linkedTo: { kind: 'Location', id: 'DISP-1',       label: 'Dispatch Bay 1' },                         generatedAt: '14 days ago',         generatedBy: 'Vikram Singh', printedCount: 2,    lastPrintedAt: '14 days ago',              active: true },
  { id: 'BC-2026-0107', type: 'Location', format: 'QR',      code: 'LOC-QA-LAB',            linkedTo: { kind: 'Location', id: 'QA-LAB',       label: 'Quality lab' },                            generatedAt: '14 days ago',         generatedBy: 'Vikram Singh', printedCount: 1,    lastPrintedAt: '14 days ago',              active: true },
  { id: 'BC-2026-0106', type: 'Pallet',   format: 'CODE128', code: 'PLT-2026-0001',         linkedTo: { kind: 'Pallet',   id: 'PLT-001',      label: 'Pallet 001 — Cotton bulk' },               generatedAt: '15 days ago',         generatedBy: 'Ramesh Kumar', printedCount: 1,    lastPrintedAt: '15 days ago',              active: true },
  { id: 'BC-2026-0105', type: 'Pallet',   format: 'CODE128', code: 'PLT-2026-0002',         linkedTo: { kind: 'Pallet',   id: 'PLT-002',      label: 'Pallet 002 — Maize bulk' },                generatedAt: '15 days ago',         generatedBy: 'Ramesh Kumar', printedCount: 1,    lastPrintedAt: '15 days ago',              active: true },
  { id: 'BC-2026-0104', type: 'Pallet',   format: 'CODE128', code: 'PLT-2026-0003',         linkedTo: { kind: 'Pallet',   id: 'PLT-003',      label: 'Pallet 003 — Reserved Paddy' },            generatedAt: '15 days ago',         generatedBy: 'Ramesh Kumar', printedCount: 1,    lastPrintedAt: '15 days ago',              active: true },
  { id: 'BC-2026-0103', type: 'Shipment', format: 'QR',      code: 'SHP-DO-2026-0411',      linkedTo: { kind: 'Shipment', id: 'DO-2026-0411', label: 'Dispatch DO-2026-0411' },                  generatedAt: '08:48 AM, today',     generatedBy: 'Mohammed Khan', printedCount: 1,   lastPrintedAt: '08:48 AM, today',          active: true },
  { id: 'BC-2026-0102', type: 'Shipment', format: 'QR',      code: 'SHP-DO-2026-0408',      linkedTo: { kind: 'Shipment', id: 'DO-2026-0408', label: 'Dispatch DO-2026-0408' },                  generatedAt: 'yesterday',           generatedBy: 'Mohammed Khan', printedCount: 1,   lastPrintedAt: 'yesterday',                active: true },
  { id: 'BC-2026-0101', type: 'Item',     format: 'CODE39',  code: 'ITM-HB-020-2026',       linkedTo: { kind: 'Item',     id: 'CH-HB-020',    label: 'Herbicide 20 L drums' },                   generatedAt: '20 days ago',         generatedBy: 'Priya Sharma', printedCount: 64,   lastPrintedAt: '20 days ago',              active: false },
];

export const printJobs: PrintJob[] = [
  { id: 'PJ-2026-0048', type: 'Item',     codeCount: 50, initiatedBy: 'Vikram Singh',     initiatedAt: '09:14 AM, today',  printer: 'Zebra ZD420 — Receiving',  status: 'Queued',    format: 'CODE128' },
  { id: 'PJ-2026-0047', type: 'Bin',      codeCount: 28, initiatedBy: 'Anjali Reddy',     initiatedAt: '09:02 AM, today',  printer: 'Zebra ZD420 — Receiving',  status: 'Printing',  format: 'CODE128' },
  { id: 'PJ-2026-0046', type: 'Item',     codeCount: 100,initiatedBy: 'Priya Sharma',     initiatedAt: '08:48 AM, today',  printer: 'Brother QL-820 — Quality', status: 'Completed', format: 'QR' },
  { id: 'PJ-2026-0045', type: 'Shipment', codeCount: 6,  initiatedBy: 'Mohammed Khan',    initiatedAt: '08:32 AM, today',  printer: 'Brother QL-820 — Quality', status: 'Completed', format: 'QR' },
  { id: 'PJ-2026-0044', type: 'Pallet',   codeCount: 12, initiatedBy: 'Ramesh Kumar',     initiatedAt: 'yesterday',         printer: 'Zebra ZD420 — Dispatch',  status: 'Completed', format: 'CODE128' },
  { id: 'PJ-2026-0043', type: 'Item',     codeCount: 75, initiatedBy: 'Vikram Singh',     initiatedAt: 'yesterday',         printer: 'Zebra ZD420 — Receiving', status: 'Failed',    format: 'CODE128' },
  { id: 'PJ-2026-0042', type: 'Bin',      codeCount: 40, initiatedBy: 'Vikram Singh',     initiatedAt: '2 days ago',        printer: 'Zebra ZD420 — Receiving', status: 'Completed', format: 'CODE128' },
  { id: 'PJ-2026-0041', type: 'Item',     codeCount: 200,initiatedBy: 'Anjali Reddy',     initiatedAt: '2 days ago',        printer: 'Brother QL-820 — Quality', status: 'Completed', format: 'EAN13' },
  { id: 'PJ-2026-0040', type: 'Item',     codeCount: 18, initiatedBy: 'Sunita Rao',       initiatedAt: '3 days ago',        printer: 'Brother QL-820 — Quality', status: 'Completed', format: 'CODE128' },
  { id: 'PJ-2026-0039', type: 'Pallet',   codeCount: 6,  initiatedBy: 'Ramesh Kumar',     initiatedAt: '4 days ago',        printer: 'Zebra ZD420 — Dispatch',  status: 'Completed', format: 'CODE128' },
  { id: 'PJ-2026-0038', type: 'Location', codeCount: 8,  initiatedBy: 'Vikram Singh',     initiatedAt: '14 days ago',       printer: 'Zebra ZD420 — Receiving', status: 'Completed', format: 'QR' },
  { id: 'PJ-2026-0049', type: 'Item',     codeCount: 32, initiatedBy: 'Priya Sharma',     initiatedAt: '09:30 AM, today',  printer: 'Brother QL-820 — Quality', status: 'Queued',    format: 'CODE128' },
];

export const scanLog: ScanLogEntry[] = [
  { id: 'SL-001', timestamp: '10:42 AM, today',  user: 'Mohammed Khan', device: 'Handheld scanner',  context: 'Picking',     barcodeScanned: 'ITM-CT-BT102-A-2026', resolvedTo: 'Cotton hybrid GH-BT-102 · BT-2025-A14', result: 'Success',  contextRef: 'DO-2026-0408' },
  { id: 'SL-002', timestamp: '10:41 AM, today',  user: 'Mohammed Khan', device: 'Handheld scanner',  context: 'Picking',     barcodeScanned: 'BIN-CZA-R4-S2-B14',   resolvedTo: 'Bin CZA-R4-S2-B14',                       result: 'Success',  contextRef: 'DO-2026-0408' },
  { id: 'SL-003', timestamp: '10:38 AM, today',  user: 'Anjali Reddy',  device: 'Handheld scanner',  context: 'Cycle count', barcodeScanned: 'ITM-MZ-204-2026',     resolvedTo: 'Maize hybrid GH-M-204 · MZ-2025-08',     result: 'Success',  contextRef: 'CC-2026-0042' },
  { id: 'SL-004', timestamp: '10:35 AM, today',  user: 'Anjali Reddy',  device: 'Handheld scanner',  context: 'Cycle count', barcodeScanned: 'BIN-AZ1-R12-S2-B05',  resolvedTo: 'Bin AZ1-R12-S2-B05',                      result: 'Success',  contextRef: 'CC-2026-0042' },
  { id: 'SL-005', timestamp: '10:30 AM, today',  user: 'Sunita Rao',    device: 'Mobile phone',      context: 'Putaway',     barcodeScanned: 'ITM-PP-025-2026',     resolvedTo: 'PP packaging bags 25 kg',                 result: 'Success',  contextRef: 'PUT-902' },
  { id: 'SL-006', timestamp: '10:24 AM, today',  user: 'Vikram Singh',  device: 'Handheld scanner',  context: 'Receiving',   barcodeScanned: 'PLT-2026-0001',       resolvedTo: 'Pallet 001 — Cotton bulk',                result: 'Success',  contextRef: 'GRN-3491' },
  { id: 'SL-007', timestamp: '10:18 AM, today',  user: 'Vikram Singh',  device: 'Handheld scanner',  context: 'Receiving',   barcodeScanned: 'ITM-OBSOLETE-X1',     resolvedTo: '—',                                       result: 'Not found' },
  { id: 'SL-008', timestamp: '10:14 AM, today',  user: 'Mohammed Khan', device: 'Handheld scanner',  context: 'Picking',     barcodeScanned: 'ITM-PD-IR64-F-2026',  resolvedTo: 'Paddy IR-64 Foundation · PD-2025-22',     result: 'Success',  contextRef: 'DO-2026-0408' },
  { id: 'SL-009', timestamp: '10:08 AM, today',  user: 'Priya Sharma',  device: 'Mobile phone',      context: 'Cycle count', barcodeScanned: 'ITM-SF-S88-2026',     resolvedTo: 'Sunflower S-88 hybrid · SF-2025-04',     result: 'Mismatch', contextRef: 'CC-2026-0042' },
  { id: 'SL-010', timestamp: '10:02 AM, today',  user: 'Mohammed Khan', device: 'Handheld scanner',  context: 'Packing',     barcodeScanned: 'ITM-MZ-204-2026',     resolvedTo: 'Maize hybrid GH-M-204',                   result: 'Success',  contextRef: 'DO-2026-0405' },
  { id: 'SL-011', timestamp: '09:58 AM, today',  user: 'Mohammed Khan', device: 'Handheld scanner',  context: 'Packing',     barcodeScanned: 'ITM-PD-IR64-F-2026',  resolvedTo: 'Paddy IR-64 Foundation',                  result: 'Success',  contextRef: 'DO-2026-0405' },
  { id: 'SL-012', timestamp: '09:54 AM, today',  user: 'Sunita Rao',    device: 'Mobile phone',      context: 'Putaway',     barcodeScanned: 'BIN-AZ3-R8-S1-B02',   resolvedTo: 'Bin AZ3-R8-S1-B02',                       result: 'Success',  contextRef: 'PUT-904' },
  { id: 'SL-013', timestamp: '09:48 AM, today',  user: 'Vikram Singh',  device: 'Fixed RFID reader', context: 'Dispatch',    barcodeScanned: 'SHP-DO-2026-0411',    resolvedTo: 'Dispatch DO-2026-0411',                   result: 'Success',  contextRef: 'DO-2026-0411' },
  { id: 'SL-014', timestamp: '09:42 AM, today',  user: 'Vikram Singh',  device: 'Fixed RFID reader', context: 'Dispatch',    barcodeScanned: 'PLT-2026-0002',       resolvedTo: 'Pallet 002 — Maize bulk',                 result: 'Success',  contextRef: 'DO-2026-0411' },
  { id: 'SL-015', timestamp: '09:38 AM, today',  user: 'Anjali Reddy',  device: 'Handheld scanner',  context: 'Cycle count', barcodeScanned: 'ITM-CT-BT102-A-2026', resolvedTo: 'Cotton hybrid GH-BT-102 Foundation',     result: 'Success',  contextRef: 'CC-2026-0042' },
  { id: 'SL-016', timestamp: '09:32 AM, today',  user: 'Mohammed Khan', device: 'Handheld scanner',  context: 'Picking',     barcodeScanned: 'BIN-CZB-R3-S2-B11',   resolvedTo: 'Bin CZB-R3-S2-B11',                       result: 'Success',  contextRef: 'DO-2026-0408' },
  { id: 'SL-017', timestamp: '09:24 AM, today',  user: 'Vikram Singh',  device: 'Handheld scanner',  context: 'Receiving',   barcodeScanned: 'PLT-2026-0001',       resolvedTo: 'Pallet 001 — Cotton bulk',                result: 'Duplicate', contextRef: 'GRN-3491' },
  { id: 'SL-018', timestamp: '09:18 AM, today',  user: 'Sunita Rao',    device: 'Mobile phone',      context: 'Movement',    barcodeScanned: 'ITM-COCO-50-2026',    resolvedTo: 'Coco peat substrate 50 kg',               result: 'Success',  contextRef: 'MV-2026-0235' },
  { id: 'SL-019', timestamp: '09:14 AM, today',  user: 'Priya Sharma',  device: 'Mobile phone',      context: 'Cycle count', barcodeScanned: 'ITM-LB-KT-GERM-2026', resolvedTo: 'Lab reagent kit — germination',           result: 'Success',  contextRef: 'CC-2026-0041' },
  { id: 'SL-020', timestamp: '09:08 AM, today',  user: 'Vikram Singh',  device: 'Fixed RFID reader', context: 'Receiving',   barcodeScanned: 'BARCODE-UNKNOWN-Z1',  resolvedTo: '—',                                       result: 'Not found', contextRef: 'GRN-3492' },
  { id: 'SL-021', timestamp: '09:02 AM, today',  user: 'Anjali Reddy',  device: 'Handheld scanner',  context: 'Cycle count', barcodeScanned: 'BIN-CZA-R5-S1-B08',   resolvedTo: 'Bin CZA-R5-S1-B08',                       result: 'Success',  contextRef: 'CC-2026-0042' },
  { id: 'SL-022', timestamp: '08:54 AM, today',  user: 'Vikram Singh',  device: 'Handheld scanner',  context: 'Receiving',   barcodeScanned: 'ITM-CT-BT102-A-2026', resolvedTo: 'Cotton hybrid GH-BT-102 Foundation',     result: 'Success',  contextRef: 'GRN-3491' },
  { id: 'SL-023', timestamp: '08:48 AM, today',  user: 'Mohammed Khan', device: 'Handheld scanner',  context: 'Packing',     barcodeScanned: 'BIN-AZ1-R12-S2-B05',  resolvedTo: 'Bin AZ1-R12-S2-B05',                      result: 'Success',  contextRef: 'DO-2026-0405' },
  { id: 'SL-024', timestamp: '08:42 AM, today',  user: 'Vikram Singh',  device: 'Fixed RFID reader', context: 'Receiving',   barcodeScanned: 'PLT-2026-NEW-X9',     resolvedTo: '—',                                       result: 'Not found' },
  { id: 'SL-025', timestamp: '08:32 AM, today',  user: 'Vikram Singh',  device: 'Handheld scanner',  context: 'Receiving',   barcodeScanned: 'ITM-CT-BT102-A-2026', resolvedTo: 'Cotton hybrid GH-BT-102 Foundation',     result: 'Success',  contextRef: 'GRN-3491' },
  { id: 'SL-026', timestamp: '08:24 AM, today',  user: 'Anjali Reddy',  device: 'Handheld scanner',  context: 'Cycle count', barcodeScanned: 'BIN-CZA-R7-S2-B03',   resolvedTo: 'Bin CZA-R7-S2-B03',                       result: 'Success',  contextRef: 'CC-2026-0042' },
  { id: 'SL-027', timestamp: '08:18 AM, today',  user: 'Mohammed Khan', device: 'Handheld scanner',  context: 'Picking',     barcodeScanned: 'ITM-MZ-204-2026',     resolvedTo: 'Maize hybrid GH-M-204',                   result: 'Mismatch', contextRef: 'DO-2026-0408' },
  { id: 'SL-028', timestamp: '08:12 AM, today',  user: 'Vikram Singh',  device: 'Fixed RFID reader', context: 'Dispatch',    barcodeScanned: 'SHP-DO-2026-0408',    resolvedTo: 'Dispatch DO-2026-0408',                   result: 'Success',  contextRef: 'DO-2026-0408' },
  { id: 'SL-029', timestamp: '08:02 AM, today',  user: 'Sunita Rao',    device: 'Mobile phone',      context: 'Putaway',     barcodeScanned: 'BIN-AZ3-R9-S2-B01',   resolvedTo: 'Bin AZ3-R9-S2-B01',                       result: 'Success',  contextRef: 'PUT-907' },
  { id: 'SL-030', timestamp: '07:54 AM, today',  user: 'Anjali Reddy',  device: 'Handheld scanner',  context: 'Cycle count', barcodeScanned: 'ITM-PD-IR64-F-2026',  resolvedTo: 'Paddy IR-64 Foundation · PD-2025-22',     result: 'Success',  contextRef: 'CC-2026-0042' },
  { id: 'SL-031', timestamp: '08:42 PM, yesterday', user: 'Mohammed Khan', device: 'Handheld scanner', context: 'Packing',  barcodeScanned: 'ITM-PP-025-2026',     resolvedTo: 'PP packaging bags 25 kg',                  result: 'Success',  contextRef: 'DO-2026-0405' },
  { id: 'SL-032', timestamp: '07:30 PM, yesterday', user: 'Priya Sharma',  device: 'Mobile phone',     context: 'Cycle count', barcodeScanned: 'ITM-FG-010-2026',  resolvedTo: 'Fungicide concentrate 10 L',              result: 'Success',  contextRef: 'CC-2026-0041' },
  { id: 'SL-033', timestamp: '06:48 PM, yesterday', user: 'Anjali Reddy',  device: 'Handheld scanner', context: 'Cycle count', barcodeScanned: 'ITM-IS-005-2026',  resolvedTo: 'Insecticide 5 L drums',                   result: 'Success',  contextRef: 'CC-2026-0041' },
  { id: 'SL-034', timestamp: '06:24 PM, yesterday', user: 'Vikram Singh',  device: 'Handheld scanner', context: 'Movement',    barcodeScanned: 'BIN-CTZ-R2-S1-B03', resolvedTo: 'Bin CTZ-R2-S1-B03',                       result: 'Success',  contextRef: 'MV-2026-0231' },
  { id: 'SL-035', timestamp: '05:58 PM, yesterday', user: 'Mohammed Khan', device: 'Mobile phone',     context: 'Dispatch',    barcodeScanned: 'PLT-2026-0003',     resolvedTo: 'Pallet 003 — Reserved Paddy',             result: 'Success',  contextRef: 'DO-2026-0407' },
];

export const devices: ScanDeviceRecord[] = [
  { id: 'DEV-001', name: 'Handheld scanner — HW-001', type: 'Handheld scanner',  status: 'Connected', lastSeen: 'Just now',     assignedTo: 'Vikram Singh',  defaultZone: 'Receiving Dock 2', scansToday: 84, battery: 87 },
  { id: 'DEV-002', name: 'Handheld scanner — HW-002', type: 'Handheld scanner',  status: 'Connected', lastSeen: '2 min ago',    assignedTo: 'Anjali Reddy',  defaultZone: 'Cold Zone A',     scansToday: 62, battery: 64 },
  { id: 'DEV-003', name: 'Handheld scanner — HW-003', type: 'Handheld scanner',  status: 'Connected', lastSeen: '5 min ago',    assignedTo: 'Mohammed Khan', defaultZone: 'Dispatch Bay',    scansToday: 71, battery: 41 },
  { id: 'DEV-004', name: 'Handheld scanner — HW-004', type: 'Handheld scanner',  status: 'Idle',      lastSeen: '24 min ago',   assignedTo: 'Sunita Rao',    defaultZone: 'Ambient Zone 3',  scansToday: 38, battery: 22 },
  { id: 'DEV-005', name: 'Mobile — Warehouse iPad 1', type: 'Mobile phone',      status: 'Connected', lastSeen: '3 min ago',    assignedTo: 'Priya Sharma',  defaultZone: 'Quality lab',     scansToday: 42, battery: 73 },
  { id: 'DEV-006', name: 'Mobile — Warehouse iPad 2', type: 'Mobile phone',      status: 'Offline',   lastSeen: '3 hr ago',     assignedTo: 'Ramesh Kumar',  defaultZone: 'Cold Zone A',     scansToday: 12, battery: 8 },
  { id: 'DEV-007', name: 'Fixed RFID — Gate-In',      type: 'Fixed RFID reader', status: 'Connected', lastSeen: 'Live',          assignedTo: 'System',        defaultZone: 'Gate / Receiving', scansToday: 18 },
  { id: 'DEV-008', name: 'Fixed RFID — Dispatch',     type: 'Fixed RFID reader', status: 'Connected', lastSeen: 'Live',          assignedTo: 'System',        defaultZone: 'Dispatch Bay',    scansToday: 15 },
];
