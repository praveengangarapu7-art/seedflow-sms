import type {
  StorageLocation,
  ZoneLayoutShape,
  SlottingRecommendation,
  CapacityTrendPoint,
} from '@/types/warehouse';

export type StorageKpiIcon = 'MapPin' | 'LayoutGrid' | 'PackagePlus' | 'Clock';

export interface StorageKpi {
  label: string;
  value: string;
  iconName: StorageKpiIcon;
  trend: { direction: 'up' | 'down'; percentage: string; isPositive: boolean };
  comparison: string;
}

export const storageKpis: StorageKpi[] = [
  {
    label: 'Total locations',
    value: '1,824',
    iconName: 'MapPin',
    trend: { direction: 'up', percentage: '12', isPositive: true },
    comparison: '+12 this month',
  },
  {
    label: 'Avg occupancy',
    value: '73%',
    iconName: 'LayoutGrid',
    trend: { direction: 'up', percentage: '5%', isPositive: false },
    comparison: 'utilization rising',
  },
  {
    label: 'Available bins',
    value: '492',
    iconName: 'PackagePlus',
    trend: { direction: 'up', percentage: '3%', isPositive: true },
    comparison: '27% of total capacity',
  },
  {
    label: 'FEFO compliance',
    value: '96.4%',
    iconName: 'Clock',
    trend: { direction: 'up', percentage: '1.2%', isPositive: true },
    comparison: 'expiring stock prioritized',
  },
];

export const zonesLayout: ZoneLayoutShape[] = [
  {
    zone: 'Cold Zone A',
    zoneType: 'cold',
    warehouse: 'Telangana Main',
    x: 30,  y: 30, width: 180, height: 110,
    capacity: 5000, occupied: 4600, occupancyPct: 92,
    temperature: 15.8, humidity: 55,
    topItems: [
      { sku: 'SD-CT-102-A', itemName: 'Cotton hybrid GH-BT-102 Foundation', quantity: 1840, uom: 'bags', bin: 'CZA-R4-S2-B14' },
      { sku: 'SD-CT-102-D', itemName: 'Cotton hybrid GH-BT-102 Certified', quantity: 1200, uom: 'bags', bin: 'CZA-R5-S1-B08' },
      { sku: 'SD-PD-IR64-F', itemName: 'Paddy IR-64 Foundation', quantity: 950, uom: 'bags', bin: 'CZA-R6-S2-B05' },
      { sku: 'SD-MZ-204-F', itemName: 'Maize hybrid GH-M-204 Foundation', quantity: 410, uom: 'bags', bin: 'CZA-R7-S1-B11' },
      { sku: 'SD-SF-S88',   itemName: 'Sunflower S-88 hybrid',           quantity: 200, uom: 'bags', bin: 'CZA-R7-S2-B03' },
    ],
  },
  {
    zone: 'Cold Zone B',
    zoneType: 'cold',
    warehouse: 'Telangana Main',
    x: 220, y: 30, width: 180, height: 110,
    capacity: 5000, occupied: 3900, occupancyPct: 78,
    temperature: 16.2, humidity: 58,
    topItems: [
      { sku: 'SD-CT-102-B', itemName: 'Cotton hybrid GH-BT-102 Quarantine', quantity: 920, uom: 'bags', bin: 'CZB-R6-S1-B07' },
      { sku: 'SD-SF-S88',   itemName: 'Sunflower S-88 hybrid',              quantity: 460, uom: 'bags', bin: 'CZB-R3-S2-B11' },
      { sku: 'SD-PD-IR64-R',itemName: 'Paddy IR-64 reserved',               quantity: 600, uom: 'bags', bin: 'CZB-R4-S1-B02' },
    ],
  },
  {
    zone: 'Cold Zone C',
    zoneType: 'cold',
    warehouse: 'Telangana Main',
    x: 410, y: 30, width: 180, height: 110,
    capacity: 5000, occupied: 3200, occupancyPct: 64,
    temperature: 12.5, humidity: 50,
    topItems: [
      { sku: 'SD-PD-IR64-F', itemName: 'Paddy IR-64 Foundation', quantity: 1480, uom: 'bags', bin: 'CZC-R2-S3-B07' },
    ],
  },
  {
    zone: 'Ambient Zone 1',
    zoneType: 'ambient',
    warehouse: 'Telangana Main',
    x: 30,  y: 160, width: 140, height: 100,
    capacity: 8000, occupied: 6800, occupancyPct: 85,
    topItems: [
      { sku: 'SD-MZ-204', itemName: 'Maize hybrid GH-M-204', quantity: 2640, uom: 'bags', bin: 'AZ1-R12-S2-B05' },
    ],
  },
  {
    zone: 'Ambient Zone 2',
    zoneType: 'ambient',
    warehouse: 'Telangana Main',
    x: 180, y: 160, width: 140, height: 100,
    capacity: 8000, occupied: 5680, occupancyPct: 71,
    topItems: [
      { sku: 'RM-COCO-50', itemName: 'Coco peat substrate 50 kg', quantity: 580, uom: 'bags', bin: 'AZ2-R11-S1-B06' },
    ],
  },
  {
    zone: 'Ambient Zone 3',
    zoneType: 'ambient',
    warehouse: 'Telangana Main',
    x: 330, y: 160, width: 140, height: 100,
    capacity: 8000, occupied: 4480, occupancyPct: 56,
    topItems: [
      { sku: 'PK-PP-025',  itemName: 'PP packaging bags 25 kg',     quantity: 12500, uom: 'pcs', bin: 'AZ3-R8-S1-B02' },
      { sku: 'PK-LBL-025', itemName: 'Printed labels 25 kg packs',  quantity: 22000, uom: 'pcs', bin: 'AZ3-R9-S2-B01' },
    ],
  },
  {
    zone: 'Controlled Zone',
    zoneType: 'controlled',
    warehouse: 'Telangana Main',
    x: 600, y: 30, width: 130, height: 230,
    capacity: 3000, occupied: 2460, occupancyPct: 82,
    temperature: 22, humidity: 45,
    topItems: [
      { sku: 'CH-FG-010',  itemName: 'Fungicide concentrate 10 L',    quantity: 84, uom: 'drums', bin: 'CTZ-R2-S1-B03' },
      { sku: 'CH-IS-005',  itemName: 'Insecticide 5 L drums',         quantity: 142, uom: 'drums', bin: 'CTZ-R3-S1-B04' },
      { sku: 'CH-HB-020',  itemName: 'Herbicide 20 L drums',          quantity: 64, uom: 'drums', bin: 'CTZ-R4-S1-B02' },
      { sku: 'LB-KT-GERM', itemName: 'Lab reagent kit — germination', quantity: 8, uom: 'kits',  bin: 'CTZ-R1-S2-B05' },
    ],
  },
  {
    zone: 'Quarantine',
    zoneType: 'quarantine',
    warehouse: 'Telangana Main',
    x: 480, y: 280, width: 110, height: 90,
    capacity: 2000, occupied: 500, occupancyPct: 25,
    topItems: [
      { sku: 'SD-CT-102-C', itemName: 'Cotton hybrid GH-BT-102 (damaged)', quantity: 145, uom: 'bags', bin: 'QZ-R1-S1-B02' },
    ],
  },
  {
    zone: 'Staging Area',
    zoneType: 'staging',
    warehouse: 'Telangana Main',
    x: 30,  y: 280, width: 200, height: 90,
    capacity: 4000, occupied: 1520, occupancyPct: 38,
    topItems: [
      { sku: 'EQ-WB-250', itemName: 'Weighing balance 250 kg', quantity: 4, uom: 'units', bin: 'STG-R5-S1-B01' },
    ],
  },
  {
    zone: 'Dispatch Bay',
    zoneType: 'dispatch',
    warehouse: 'Telangana Main',
    x: 240, y: 280, width: 230, height: 90,
    capacity: 4000, occupied: 2400, occupancyPct: 60,
    topItems: [
      { sku: 'SD-PD-IR64-R', itemName: 'Paddy IR-64 reserved for dispatch', quantity: 600, uom: 'bags', bin: 'DSP-R2-S1-B01' },
    ],
  },
];

const zoneAbbrev = (zone: string): string => {
  if (zone === 'Cold Zone A') return 'CZA';
  if (zone === 'Cold Zone B') return 'CZB';
  if (zone === 'Cold Zone C') return 'CZC';
  if (zone === 'Ambient Zone 1') return 'AZ1';
  if (zone === 'Ambient Zone 2') return 'AZ2';
  if (zone === 'Ambient Zone 3') return 'AZ3';
  if (zone === 'Controlled Zone') return 'CTZ';
  if (zone === 'Quarantine') return 'QZ';
  if (zone === 'Staging Area') return 'STG';
  if (zone === 'Dispatch Bay') return 'DSP';
  return zone.slice(0, 3).toUpperCase();
};

export const buildBinCode = (zone: string, rack: string, shelf: string, bin: string) =>
  `${zoneAbbrev(zone)}-${rack}-${shelf}-${bin}`;

export const bins: StorageLocation[] = [
  { id: 'B-001', warehouse: 'Telangana Main', zone: 'Cold Zone A',     zoneType: 'cold',       rack: 'R-04', shelf: 'S-2', bin: 'B14', capacity: 200, occupied: 184, occupancyPct: 92, status: 'Full',      currentSku: 'SD-CT-102-A',  currentItem: 'Cotton hybrid GH-BT-102 Foundation', currentBatch: 'BT-2025-A14', expiryDate: '24 Jan 2027', lastMovement: '08:42 AM, today',     temperature: 15.8, humidity: 55, abcZone: 'A' },
  { id: 'B-002', warehouse: 'Telangana Main', zone: 'Cold Zone A',     zoneType: 'cold',       rack: 'R-05', shelf: 'S-1', bin: 'B08', capacity: 200, occupied: 120, occupancyPct: 60, status: 'Available', currentSku: 'SD-CT-102-D',  currentItem: 'Cotton hybrid GH-BT-102 Certified',  currentBatch: 'BT-2025-A18', expiryDate: '02 Mar 2027', lastMovement: '06:21 AM, today',     temperature: 15.8, humidity: 55, abcZone: 'A' },
  { id: 'B-003', warehouse: 'Telangana Main', zone: 'Cold Zone A',     zoneType: 'cold',       rack: 'R-06', shelf: 'S-2', bin: 'B05', capacity: 200, occupied: 95,  occupancyPct: 48, status: 'Available', currentSku: 'SD-PD-IR64-F', currentItem: 'Paddy IR-64 Foundation',             currentBatch: 'PD-2025-22',  expiryDate: '30 Apr 2027', lastMovement: 'yesterday',           temperature: 15.8, humidity: 55, abcZone: 'A' },
  { id: 'B-004', warehouse: 'Telangana Main', zone: 'Cold Zone A',     zoneType: 'cold',       rack: 'R-07', shelf: 'S-1', bin: 'B11', capacity: 200, occupied: 200, occupancyPct: 100, status: 'Full',     currentSku: 'SD-MZ-204-F',  currentItem: 'Maize hybrid GH-M-204 Foundation',   currentBatch: 'MZ-2025-04',  expiryDate: '15 May 2026', lastMovement: '2 days ago',          temperature: 15.8, humidity: 55, abcZone: 'A' },
  { id: 'B-005', warehouse: 'Telangana Main', zone: 'Cold Zone A',     zoneType: 'cold',       rack: 'R-08', shelf: 'S-2', bin: 'B02', capacity: 200, occupied: 0,   occupancyPct: 0,  status: 'Available', lastMovement: '5 days ago',                                                                                                                                       temperature: 15.8, humidity: 55, abcZone: 'A' },
  { id: 'B-006', warehouse: 'Telangana Main', zone: 'Cold Zone B',     zoneType: 'cold',       rack: 'R-06', shelf: 'S-1', bin: 'B07', capacity: 200, occupied: 184, occupancyPct: 92, status: 'Reserved',  currentSku: 'SD-CT-102-B',  currentItem: 'Cotton hybrid GH-BT-102 Quarantine', currentBatch: 'BT-2025-A15', expiryDate: '12 Feb 2027', lastMovement: '10:14 AM, today',     temperature: 16.2, humidity: 58, abcZone: 'A' },
  { id: 'B-007', warehouse: 'Telangana Main', zone: 'Cold Zone B',     zoneType: 'cold',       rack: 'R-03', shelf: 'S-2', bin: 'B11', capacity: 200, occupied: 92,  occupancyPct: 46, status: 'Available', currentSku: 'SD-SF-S88',    currentItem: 'Sunflower S-88 hybrid',              currentBatch: 'SF-2025-04',  expiryDate: '15 May 2026', lastMovement: 'yesterday',           temperature: 16.2, humidity: 58, abcZone: 'B' },
  { id: 'B-008', warehouse: 'Telangana Main', zone: 'Cold Zone B',     zoneType: 'cold',       rack: 'R-04', shelf: 'S-1', bin: 'B02', capacity: 200, occupied: 120, occupancyPct: 60, status: 'Reserved',  currentSku: 'SD-PD-IR64-R', currentItem: 'Paddy IR-64 reserved',               currentBatch: 'PD-2025-21',  expiryDate: '15 Apr 2027', lastMovement: '3 days ago',          temperature: 16.2, humidity: 58, abcZone: 'A' },
  { id: 'B-009', warehouse: 'Telangana Main', zone: 'Cold Zone C',     zoneType: 'cold',       rack: 'R-02', shelf: 'S-3', bin: 'B07', capacity: 200, occupied: 148, occupancyPct: 74, status: 'Available', currentSku: 'SD-PD-IR64-F', currentItem: 'Paddy IR-64 Foundation',             currentBatch: 'PD-2025-22',  expiryDate: '30 Apr 2027', lastMovement: '08:14 PM, yesterday', temperature: 12.5, humidity: 50, abcZone: 'A' },
  { id: 'B-010', warehouse: 'Telangana Main', zone: 'Cold Zone C',     zoneType: 'cold',       rack: 'R-03', shelf: 'S-1', bin: 'B04', capacity: 200, occupied: 0,   occupancyPct: 0,  status: 'Available', lastMovement: '4 days ago',                                                                                                                                       temperature: 12.5, humidity: 50, abcZone: 'B' },
  { id: 'B-011', warehouse: 'Telangana Main', zone: 'Ambient Zone 1',  zoneType: 'ambient',    rack: 'R-12', shelf: 'S-2', bin: 'B05', capacity: 300, occupied: 264, occupancyPct: 88, status: 'Full',      currentSku: 'SD-MZ-204',    currentItem: 'Maize hybrid GH-M-204',              currentBatch: 'MZ-2025-08',  expiryDate: '18 Mar 2027', lastMovement: '08:21 AM, today',                                                                          abcZone: 'A' },
  { id: 'B-012', warehouse: 'Telangana Main', zone: 'Ambient Zone 1',  zoneType: 'ambient',    rack: 'R-13', shelf: 'S-1', bin: 'B03', capacity: 300, occupied: 180, occupancyPct: 60, status: 'Available',                                                                                                                                                                                                                       abcZone: 'B' },
  { id: 'B-013', warehouse: 'Telangana Main', zone: 'Ambient Zone 1',  zoneType: 'ambient',    rack: 'R-14', shelf: 'S-2', bin: 'B09', capacity: 300, occupied: 285, occupancyPct: 95, status: 'Full',                                                                                                                                                                                                                            abcZone: 'A' },
  { id: 'B-014', warehouse: 'Telangana Main', zone: 'Ambient Zone 2',  zoneType: 'ambient',    rack: 'R-11', shelf: 'S-1', bin: 'B06', capacity: 300, occupied: 174, occupancyPct: 58, status: 'Available', currentSku: 'RM-COCO-50',   currentItem: 'Coco peat substrate 50 kg',          currentBatch: 'RM-2025-CP-12', expiryDate: '31 Mar 2028',                                                                            abcZone: 'B' },
  { id: 'B-015', warehouse: 'Telangana Main', zone: 'Ambient Zone 2',  zoneType: 'ambient',    rack: 'R-09', shelf: 'S-1', bin: 'B08', capacity: 300, occupied: 0,   occupancyPct: 0,  status: 'Available',                                                                                                                                                                                                                       abcZone: 'C' },
  { id: 'B-016', warehouse: 'Telangana Main', zone: 'Ambient Zone 2',  zoneType: 'ambient',    rack: 'R-10', shelf: 'S-2', bin: 'B04', capacity: 300, occupied: 240, occupancyPct: 80, status: 'Available',                                                                                                                                                                                                                       abcZone: 'B' },
  { id: 'B-017', warehouse: 'Telangana Main', zone: 'Ambient Zone 3',  zoneType: 'ambient',    rack: 'R-08', shelf: 'S-1', bin: 'B02', capacity: 800, occupied: 625, occupancyPct: 78, status: 'Available', currentSku: 'PK-PP-025',    currentItem: 'PP packaging bags 25 kg',            currentBatch: 'PK-2025-PP-09', expiryDate: '31 Dec 2028', lastMovement: '07:30 AM, today',                                       abcZone: 'C' },
  { id: 'B-018', warehouse: 'Telangana Main', zone: 'Ambient Zone 3',  zoneType: 'ambient',    rack: 'R-09', shelf: 'S-2', bin: 'B01', capacity: 800, occupied: 220, occupancyPct: 28, status: 'Available', currentSku: 'PK-LBL-025',   currentItem: 'Printed labels 25 kg packs',         currentBatch: 'PK-2025-LBL-02', expiryDate: '31 Dec 2028',                                                                          abcZone: 'C' },
  { id: 'B-019', warehouse: 'Telangana Main', zone: 'Ambient Zone 3',  zoneType: 'ambient',    rack: 'R-10', shelf: 'S-1', bin: 'B05', capacity: 800, occupied: 0,   occupancyPct: 0,  status: 'Available',                                                                                                                                                                                                                       abcZone: 'C' },
  { id: 'B-020', warehouse: 'Telangana Main', zone: 'Controlled Zone', zoneType: 'controlled', rack: 'R-02', shelf: 'S-1', bin: 'B03', capacity: 100, occupied: 84,  occupancyPct: 84, status: 'Full',      currentSku: 'CH-FG-010',    currentItem: 'Fungicide concentrate 10 L',         currentBatch: 'CH-2025-FG-04', expiryDate: '20 Sep 2027',                                  temperature: 22, humidity: 45, abcZone: 'B' },
  { id: 'B-021', warehouse: 'Telangana Main', zone: 'Controlled Zone', zoneType: 'controlled', rack: 'R-03', shelf: 'S-1', bin: 'B04', capacity: 150, occupied: 142, occupancyPct: 95, status: 'Full',      currentSku: 'CH-IS-005',    currentItem: 'Insecticide 5 L drums',              currentBatch: 'CH-2025-IS-07', expiryDate: '12 Aug 2027',                                  temperature: 22, humidity: 45, abcZone: 'B' },
  { id: 'B-022', warehouse: 'Telangana Main', zone: 'Controlled Zone', zoneType: 'controlled', rack: 'R-04', shelf: 'S-1', bin: 'B02', capacity: 80,  occupied: 64,  occupancyPct: 80, status: 'Available', currentSku: 'CH-HB-020',    currentItem: 'Herbicide 20 L drums',               currentBatch: 'CH-2025-HB-05', expiryDate: '14 Oct 2027',                                  temperature: 22, humidity: 45, abcZone: 'B' },
  { id: 'B-023', warehouse: 'Telangana Main', zone: 'Controlled Zone', zoneType: 'controlled', rack: 'R-01', shelf: 'S-2', bin: 'B05', capacity: 30,  occupied: 8,   occupancyPct: 27, status: 'Available', currentSku: 'LB-KT-GERM',   currentItem: 'Lab reagent kit — germination',      currentBatch: 'LB-2025-KT-03', expiryDate: '28 Jul 2026', lastMovement: '11:12 PM, yesterday', temperature: 22, humidity: 45, abcZone: 'B' },
  { id: 'B-024', warehouse: 'Telangana Main', zone: 'Controlled Zone', zoneType: 'controlled', rack: 'R-05', shelf: 'S-1', bin: 'B01', capacity: 80,  occupied: 0,   occupancyPct: 0,  status: 'Blocked',                                                                                                                                                                                temperature: 22, humidity: 45, abcZone: 'C' },
  { id: 'B-025', warehouse: 'Telangana Main', zone: 'Quarantine',      zoneType: 'quarantine', rack: 'R-01', shelf: 'S-1', bin: 'B02', capacity: 200, occupied: 145, occupancyPct: 73, status: 'Reserved',  currentSku: 'SD-CT-102-C',  currentItem: 'Cotton hybrid GH-BT-102 (damaged)',  currentBatch: 'BT-2025-A12', expiryDate: '02 Jan 2027',                                                                                            abcZone: 'A' },
  { id: 'B-026', warehouse: 'Telangana Main', zone: 'Quarantine',      zoneType: 'quarantine', rack: 'R-01', shelf: 'S-2', bin: 'B04', capacity: 200, occupied: 0,   occupancyPct: 0,  status: 'Available',                                                                                                                                                                                                                       abcZone: 'C' },
  { id: 'B-027', warehouse: 'Telangana Main', zone: 'Staging Area',    zoneType: 'staging',    rack: 'R-05', shelf: 'S-1', bin: 'B01', capacity: 100, occupied: 4,   occupancyPct: 4,  status: 'Available', currentSku: 'EQ-WB-250',    currentItem: 'Weighing balance 250 kg',            currentBatch: 'EQ-2025-WB-01',                                                                                                          abcZone: 'C' },
  { id: 'B-028', warehouse: 'Telangana Main', zone: 'Staging Area',    zoneType: 'staging',    rack: 'R-06', shelf: 'S-1', bin: 'B03', capacity: 200, occupied: 80,  occupancyPct: 40, status: 'Available',                                                                                                                                                                                                                       abcZone: 'C' },
  { id: 'B-029', warehouse: 'Telangana Main', zone: 'Staging Area',    zoneType: 'staging',    rack: 'R-07', shelf: 'S-2', bin: 'B05', capacity: 200, occupied: 0,   occupancyPct: 0,  status: 'Available',                                                                                                                                                                                                                       abcZone: 'C' },
  { id: 'B-030', warehouse: 'Telangana Main', zone: 'Dispatch Bay',    zoneType: 'dispatch',   rack: 'R-02', shelf: 'S-1', bin: 'B01', capacity: 400, occupied: 240, occupancyPct: 60, status: 'Reserved',  currentSku: 'SD-PD-IR64-R', currentItem: 'Paddy IR-64 reserved for dispatch',  currentBatch: 'PD-2025-21',  lastMovement: '06:48 AM, today',                                                                                          abcZone: 'A' },
  { id: 'B-031', warehouse: 'Telangana Main', zone: 'Dispatch Bay',    zoneType: 'dispatch',   rack: 'R-03', shelf: 'S-1', bin: 'B02', capacity: 400, occupied: 0,   occupancyPct: 0,  status: 'Available',                                                                                                                                                                                                                       abcZone: 'A' },
  { id: 'B-032', warehouse: 'Telangana Main', zone: 'Dispatch Bay',    zoneType: 'dispatch',   rack: 'R-04', shelf: 'S-1', bin: 'B03', capacity: 400, occupied: 320, occupancyPct: 80, status: 'Reserved',                                                                                                                                                                                                                         abcZone: 'A' },
  { id: 'B-033', warehouse: 'Telangana Main', zone: 'Cold Zone A',     zoneType: 'cold',       rack: 'R-04', shelf: 'S-3', bin: 'B07', capacity: 200, occupied: 60,  occupancyPct: 30, status: 'Available',                                                                                                                                                                              temperature: 15.8, humidity: 55, abcZone: 'B' },
  { id: 'B-034', warehouse: 'Telangana Main', zone: 'Cold Zone A',     zoneType: 'cold',       rack: 'R-05', shelf: 'S-3', bin: 'B12', capacity: 200, occupied: 0,   occupancyPct: 0,  status: 'Blocked',                                                                                                                                                                                temperature: 15.8, humidity: 55, abcZone: 'C' },
  { id: 'B-035', warehouse: 'Telangana Main', zone: 'Cold Zone B',     zoneType: 'cold',       rack: 'R-06', shelf: 'S-3', bin: 'B14', capacity: 200, occupied: 168, occupancyPct: 84, status: 'Full',                                                                                                                                                                                  temperature: 16.2, humidity: 58, abcZone: 'A' },
  { id: 'B-036', warehouse: 'Telangana Main', zone: 'Ambient Zone 1',  zoneType: 'ambient',    rack: 'R-15', shelf: 'S-1', bin: 'B03', capacity: 300, occupied: 0,   occupancyPct: 0,  status: 'Available',                                                                                                                                                                                                                       abcZone: 'C' },
  { id: 'B-037', warehouse: 'Telangana Main', zone: 'Ambient Zone 2',  zoneType: 'ambient',    rack: 'R-12', shelf: 'S-1', bin: 'B07', capacity: 300, occupied: 156, occupancyPct: 52, status: 'Available',                                                                                                                                                                                                                       abcZone: 'B' },
  { id: 'B-038', warehouse: 'Telangana Main', zone: 'Controlled Zone', zoneType: 'controlled', rack: 'R-06', shelf: 'S-2', bin: 'B08', capacity: 100, occupied: 92,  occupancyPct: 92, status: 'Full',                                                                                                                                                                                  temperature: 22, humidity: 45, abcZone: 'A' },
  { id: 'B-039', warehouse: 'Telangana Main', zone: 'Dispatch Bay',    zoneType: 'dispatch',   rack: 'R-05', shelf: 'S-1', bin: 'B05', capacity: 400, occupied: 100, occupancyPct: 25, status: 'Available',                                                                                                                                                                                                                       abcZone: 'A' },
  { id: 'B-040', warehouse: 'Telangana Main', zone: 'Quarantine',      zoneType: 'quarantine', rack: 'R-02', shelf: 'S-1', bin: 'B01', capacity: 200, occupied: 0,   occupancyPct: 0,  status: 'Blocked',                                                                                                                                                                                                                          abcZone: 'C' },
];

export const slottingRecommendations: SlottingRecommendation[] = [
  {
    id: 'SR-01',
    title: 'Move Cotton hybrid GH-BT-102 closer to Dispatch Bay',
    itemName: 'Cotton hybrid GH-BT-102 Foundation',
    sku: 'SD-CT-102-A',
    currentLocation: 'CZA-R4-S2-B14',
    suggestedLocation: 'DSP-R3-S1-B02',
    reasoning: 'High velocity item (24 outbound moves/month). Currently 65 m from dispatch — suggested bin reduces pick path by ~40%.',
    impactMetric: '−40% pick time',
    type: 'velocity',
  },
  {
    id: 'SR-02',
    title: 'Reslot Sunflower S-88 to FEFO front',
    itemName: 'Sunflower S-88 hybrid',
    sku: 'SD-SF-S88',
    currentLocation: 'CZB-R3-S2-B11',
    suggestedLocation: 'CZB-R1-S1-B01',
    reasoning: 'Expires 15 May 2026 (15 days). Forward-bin slotting prioritizes FEFO and prevents stale-stock dispatch.',
    impactMetric: '+22% FEFO compliance',
    type: 'expiry',
  },
  {
    id: 'SR-03',
    title: 'Consolidate maize Foundation lots in Cold Zone A',
    itemName: 'Maize hybrid GH-M-204 Foundation',
    sku: 'SD-MZ-204-F',
    currentLocation: 'CZA-R7-S1-B11',
    suggestedLocation: 'CZA-R4-S1-B05',
    reasoning: 'Two foundation lots scattered across Cold Zone A. Consolidating frees a full rack and improves cycle-count efficiency.',
    impactMetric: '+1 free rack',
    type: 'consolidation',
  },
  {
    id: 'SR-04',
    title: 'Move heavy weighing balance off staging shelf',
    itemName: 'Weighing balance 250 kg',
    sku: 'EQ-WB-250',
    currentLocation: 'STG-R5-S1-B01',
    suggestedLocation: 'AZ2-R10-S1-B04',
    reasoning: 'Heavy unit (250 kg) on shared staging shelf. Move to ground-level ambient bin to reduce manual handling risk.',
    impactMetric: 'Safer handling',
    type: 'weight',
  },
  {
    id: 'SR-05',
    title: 'Relocate fungicide drums to lower shelf',
    itemName: 'Fungicide concentrate 10 L',
    sku: 'CH-FG-010',
    currentLocation: 'CTZ-R2-S1-B03',
    suggestedLocation: 'CTZ-R2-S1-B01',
    reasoning: 'Hazardous liquids best stored at floor level for spill containment per controlled-zone protocol.',
    impactMetric: 'Compliance',
    type: 'temperature',
  },
];

const trendZones = ['Cold Zone A', 'Cold Zone B', 'Cold Zone C', 'Ambient Zone 1', 'Ambient Zone 2', 'Ambient Zone 3', 'Controlled Zone', 'Staging Area', 'Quarantine', 'Dispatch Bay'];

export const capacityTrendData: CapacityTrendPoint[] = [
  { weekLabel: 'W1',  values: { 'Cold Zone A': 78, 'Cold Zone B': 62, 'Cold Zone C': 50, 'Ambient Zone 1': 70, 'Ambient Zone 2': 60, 'Ambient Zone 3': 48, 'Controlled Zone': 70, 'Staging Area': 30, 'Quarantine': 15, 'Dispatch Bay': 50 } },
  { weekLabel: 'W2',  values: { 'Cold Zone A': 80, 'Cold Zone B': 65, 'Cold Zone C': 52, 'Ambient Zone 1': 72, 'Ambient Zone 2': 62, 'Ambient Zone 3': 49, 'Controlled Zone': 72, 'Staging Area': 28, 'Quarantine': 18, 'Dispatch Bay': 52 } },
  { weekLabel: 'W3',  values: { 'Cold Zone A': 82, 'Cold Zone B': 68, 'Cold Zone C': 55, 'Ambient Zone 1': 74, 'Ambient Zone 2': 64, 'Ambient Zone 3': 50, 'Controlled Zone': 74, 'Staging Area': 32, 'Quarantine': 20, 'Dispatch Bay': 54 } },
  { weekLabel: 'W4',  values: { 'Cold Zone A': 84, 'Cold Zone B': 70, 'Cold Zone C': 58, 'Ambient Zone 1': 76, 'Ambient Zone 2': 66, 'Ambient Zone 3': 51, 'Controlled Zone': 75, 'Staging Area': 34, 'Quarantine': 22, 'Dispatch Bay': 55 } },
  { weekLabel: 'W5',  values: { 'Cold Zone A': 86, 'Cold Zone B': 72, 'Cold Zone C': 60, 'Ambient Zone 1': 78, 'Ambient Zone 2': 68, 'Ambient Zone 3': 52, 'Controlled Zone': 76, 'Staging Area': 36, 'Quarantine': 22, 'Dispatch Bay': 56 } },
  { weekLabel: 'W6',  values: { 'Cold Zone A': 87, 'Cold Zone B': 73, 'Cold Zone C': 61, 'Ambient Zone 1': 79, 'Ambient Zone 2': 69, 'Ambient Zone 3': 53, 'Controlled Zone': 77, 'Staging Area': 35, 'Quarantine': 23, 'Dispatch Bay': 57 } },
  { weekLabel: 'W7',  values: { 'Cold Zone A': 88, 'Cold Zone B': 74, 'Cold Zone C': 62, 'Ambient Zone 1': 80, 'Ambient Zone 2': 70, 'Ambient Zone 3': 54, 'Controlled Zone': 78, 'Staging Area': 37, 'Quarantine': 24, 'Dispatch Bay': 58 } },
  { weekLabel: 'W8',  values: { 'Cold Zone A': 89, 'Cold Zone B': 75, 'Cold Zone C': 63, 'Ambient Zone 1': 81, 'Ambient Zone 2': 70, 'Ambient Zone 3': 55, 'Controlled Zone': 79, 'Staging Area': 36, 'Quarantine': 24, 'Dispatch Bay': 59 } },
  { weekLabel: 'W9',  values: { 'Cold Zone A': 90, 'Cold Zone B': 76, 'Cold Zone C': 63, 'Ambient Zone 1': 82, 'Ambient Zone 2': 70, 'Ambient Zone 3': 55, 'Controlled Zone': 80, 'Staging Area': 38, 'Quarantine': 25, 'Dispatch Bay': 59 } },
  { weekLabel: 'W10', values: { 'Cold Zone A': 91, 'Cold Zone B': 77, 'Cold Zone C': 64, 'Ambient Zone 1': 83, 'Ambient Zone 2': 71, 'Ambient Zone 3': 56, 'Controlled Zone': 81, 'Staging Area': 38, 'Quarantine': 25, 'Dispatch Bay': 60 } },
  { weekLabel: 'W11', values: { 'Cold Zone A': 91, 'Cold Zone B': 77, 'Cold Zone C': 64, 'Ambient Zone 1': 84, 'Ambient Zone 2': 71, 'Ambient Zone 3': 56, 'Controlled Zone': 81, 'Staging Area': 38, 'Quarantine': 25, 'Dispatch Bay': 60 } },
  { weekLabel: 'W12', values: { 'Cold Zone A': 92, 'Cold Zone B': 78, 'Cold Zone C': 64, 'Ambient Zone 1': 85, 'Ambient Zone 2': 71, 'Ambient Zone 3': 56, 'Controlled Zone': 82, 'Staging Area': 38, 'Quarantine': 25, 'Dispatch Bay': 60 } },
];

export const trackedZones = trendZones;
