import type {
  ZoneUtilization,
  StockMovement,
  WarehouseAlert,
  MonthlyTrendPoint,
  CategoryBreakdown,
} from '@/types/warehouse';

export type DashboardKpiIcon = 'Target' | 'PackageCheck' | 'Warehouse' | 'Boxes';

export interface DashboardKpi {
  label: string;
  value: string;
  iconName: DashboardKpiIcon;
  trend: { direction: 'up' | 'down'; percentage: string; isPositive: boolean };
  comparison: string;
}

export const dashboardKpis: DashboardKpi[] = [
  {
    label: 'Inventory accuracy',
    value: '98.7%',
    iconName: 'Target',
    trend: { direction: 'up', percentage: '0.4%', isPositive: true },
    comparison: 'vs 98.3% last month',
  },
  {
    label: 'Order fulfillment rate',
    value: '96.2%',
    iconName: 'PackageCheck',
    trend: { direction: 'up', percentage: '2.1%', isPositive: true },
    comparison: 'vs 94.1% last month',
  },
  {
    label: 'Warehouse utilization',
    value: '78%',
    iconName: 'Warehouse',
    trend: { direction: 'up', percentage: '5.0%', isPositive: false },
    comparison: 'approaching capacity',
  },
  {
    label: 'Active SKUs',
    value: '1,243',
    iconName: 'Boxes',
    trend: { direction: 'up', percentage: '3.2%', isPositive: true },
    comparison: '38 new this month',
  },
];

export const zoneUtilizations: ZoneUtilization[] = [
  { zone: 'Cold Zone A',     warehouse: 'Telangana Main', utilizationPct: 92, capacity: 5000, used: 4600, type: 'cold',       temperature: 15.8, humidity: 55 },
  { zone: 'Cold Zone B',     warehouse: 'Telangana Main', utilizationPct: 78, capacity: 5000, used: 3900, type: 'cold',       temperature: 16.2, humidity: 58 },
  { zone: 'Cold Zone C',     warehouse: 'Telangana Main', utilizationPct: 64, capacity: 5000, used: 3200, type: 'cold',       temperature: 12.5, humidity: 50 },
  { zone: 'Ambient Zone 1',  warehouse: 'Telangana Main', utilizationPct: 85, capacity: 8000, used: 6800, type: 'ambient' },
  { zone: 'Ambient Zone 2',  warehouse: 'Telangana Main', utilizationPct: 71, capacity: 8000, used: 5680, type: 'ambient' },
  { zone: 'Ambient Zone 3',  warehouse: 'Telangana Main', utilizationPct: 56, capacity: 8000, used: 4480, type: 'ambient' },
  { zone: 'Controlled Zone', warehouse: 'Telangana Main', utilizationPct: 82, capacity: 3000, used: 2460, type: 'controlled', temperature: 22, humidity: 45 },
  { zone: 'Staging Area',    warehouse: 'Telangana Main', utilizationPct: 38, capacity: 4000, used: 1520, type: 'staging' },
  { zone: 'Quarantine',      warehouse: 'Telangana Main', utilizationPct: 25, capacity: 2000, used: 500,  type: 'staging' },
  { zone: 'Dispatch Bay',    warehouse: 'Telangana Main', utilizationPct: 60, capacity: 4000, used: 2400, type: 'staging' },
];

export const recentMovements: StockMovement[] = [
  { id: 'M-2401', type: 'Inbound',    itemName: 'Cotton hybrid GH-BT-102',     sku: 'SD-CT-102',  quantity: 1200, uom: 'bags',  toLocation: 'Cold Zone A / R-04 / S-2 / B14',     reference: 'GRN-3491',  user: 'Ramesh Kumar',  timestamp: '08:42 AM, today' },
  { id: 'M-2400', type: 'Outbound',   itemName: 'Maize GH-M-204',              sku: 'SD-MZ-204',  quantity: 480,  uom: 'bags',  fromLocation: 'Ambient Zone 1 / R-12',             reference: 'DO-1188',   user: 'Mohammed Khan', timestamp: '08:21 AM, today' },
  { id: 'M-2399', type: 'Transfer',   itemName: 'Fungicide concentrate 10L',   sku: 'CH-FG-010',  quantity: 24,   uom: 'drums', fromLocation: 'Staging Area',                       toLocation: 'Controlled Zone / R-02', reference: 'TR-562', user: 'Sunita Rao', timestamp: '07:55 AM, today' },
  { id: 'M-2398', type: 'Inbound',    itemName: 'PP packaging bags 25 kg',     sku: 'PK-PP-025',  quantity: 5000, uom: 'pcs',   toLocation: 'Ambient Zone 3 / R-08 / S-1 / B02',  reference: 'GRN-3490',  user: 'Vikram Singh',  timestamp: '07:30 AM, today' },
  { id: 'M-2397', type: 'Outbound',   itemName: 'Cotton hybrid MCU-5',         sku: 'SD-CT-MCU5', quantity: 320,  uom: 'bags',  fromLocation: 'Cold Zone B / R-06',                reference: 'DO-1187',   user: 'Mohammed Khan', timestamp: '06:48 AM, today' },
  { id: 'M-2396', type: 'Adjustment', itemName: 'Lab reagent kit germination', sku: 'LB-KT-GERM', quantity: -3,   uom: 'kits',  fromLocation: 'Controlled Zone / R-01',            reference: 'ADJ-094',   user: 'Priya Sharma',  timestamp: '11:12 PM, yesterday' },
  { id: 'M-2395', type: 'Inbound',    itemName: 'Paddy IR-64 Foundation',      sku: 'SD-PD-IR64', quantity: 800,  uom: 'bags',  toLocation: 'Cold Zone C / R-02 / S-3 / B07',     reference: 'GRN-3489',  user: 'Ramesh Kumar',  timestamp: '08:14 PM, yesterday' },
  { id: 'M-2394', type: 'Transfer',   itemName: 'Maize GH-M-204',              sku: 'SD-MZ-204',  quantity: 240,  uom: 'bags',  fromLocation: 'Ambient Zone 2',                    toLocation: 'Dispatch Bay',           reference: 'TR-561', user: 'Sunita Rao', timestamp: '04:36 PM, yesterday' },
];

export const dashboardAlerts: WarehouseAlert[] = [
  { id: 'A-001', severity: 'critical', category: 'Temperature', title: 'Cold Zone A temperature spike',       description: 'Reading 18.2 °C exceeds 18 °C threshold for foundation seed storage. Backup compressor activated.', location: 'Cold Zone A',     timeAgo: '12 min ago' },
  { id: 'A-002', severity: 'critical', category: 'Capacity',    title: 'Cold Zone A nearing full capacity',   description: 'Zone at 92% utilization (4,600 of 5,000 bags). Two GRNs scheduled today may breach capacity.',        location: 'Cold Zone A',     timeAgo: '34 min ago' },
  { id: 'A-003', severity: 'warning',  category: 'Expiry',      title: 'Three batches expiring within 30 days', description: 'Sunflower S-88 (15 days), maize seed (22 days), insecticide 5 L (28 days). Prioritize dispatch.',  location: 'Multiple zones',   timeAgo: '2 hr ago' },
  { id: 'A-004', severity: 'warning',  category: 'Stock',       title: 'Lab reagent kit below reorder point', description: 'Germination kit at 8 kits, reorder point 12. Auto-PR draft created in procurement.',                location: 'Controlled Zone',  timeAgo: '5 hr ago' },
  { id: 'A-005', severity: 'info',     category: 'Quality',     title: 'Seven GRNs awaiting inspection',      description: 'Quality team queue includes two foundation seed lots from Bharat Seeds and Pioneer Hybrid.',          location: 'Quality lab',     timeAgo: '6 hr ago' },
  { id: 'A-006', severity: 'warning',  category: 'Stock',       title: 'Slow-moving stock detected',          description: 'Four SKUs have not moved in 90+ days totalling ₹4.2 L. Consider reclassification or promotion.',     location: 'Ambient Zone 3',  timeAgo: '1 day ago' },
];

export const monthlyStockTrend: MonthlyTrendPoint[] = [
  { month: 'Nov', value: 18_500_000 },
  { month: 'Dec', value: 21_200_000 },
  { month: 'Jan', value: 19_800_000 },
  { month: 'Feb', value: 23_500_000 },
  { month: 'Mar', value: 26_800_000 },
  { month: 'Apr', value: 28_400_000 },
];

export const stockByCategory: CategoryBreakdown[] = [
  { category: 'Finished Seeds', value: 16_800_000, percentage: 59 },
  { category: 'Raw Material',   value: 5_700_000,  percentage: 20 },
  { category: 'Chemicals',      value: 3_100_000,  percentage: 11 },
  { category: 'Packaging',      value: 1_700_000,  percentage: 6  },
  { category: 'Lab Supplies',   value: 580_000,    percentage: 2  },
  { category: 'Equipment',      value: 520_000,    percentage: 2  },
];
