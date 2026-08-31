import { ProductionSchedule } from '@/types/processing';

export const productionSchedule: ProductionSchedule[] = [
  {
    id: 'SCH-001',
    batchId: 'BT-2026-1142',
    plannedStartDate: '2026-06-10',
    plannedEndDate: '2026-06-13',
    plantId: 'PL-AUR',
    machineIds: ['MAC-AUR-CL-01', 'MAC-AUR-DR-01'],
    variety: 'Bt RCH-2 BG-II',
    qty: 8200,
    status: 'In Progress',
  },
  {
    id: 'SCH-002',
    batchId: 'BT-2026-1141',
    plannedStartDate: '2026-06-08',
    plannedEndDate: '2026-06-12',
    plantId: 'PL-AUR',
    machineIds: ['MAC-AUR-TR-01', 'MAC-AUR-PK-01'],
    variety: 'Bt RCH-2 BG-II',
    qty: 10300,
    status: 'In Progress',
  },
  {
    id: 'SCH-003',
    batchId: 'BT-2026-1140',
    plannedStartDate: '2026-06-05',
    plannedEndDate: '2026-06-11',
    plantId: 'PL-HYD',
    machineIds: ['MAC-HYD-CL-01', 'MAC-HYD-GR-01'],
    variety: 'Pusa Basmati 1121',
    qty: 10800,
    status: 'In Progress',
  },
  {
    id: 'SCH-004',
    batchId: 'BT-2026-1143',
    plannedStartDate: '2026-06-11',
    plannedEndDate: '2026-06-14',
    plantId: 'PL-HYD',
    machineIds: ['MAC-HYD-CL-01', 'MAC-HYD-GR-01'],
    variety: 'IR-64',
    qty: 12000,
    status: 'In Progress',
  },
  {
    id: 'SCH-005',
    batchId: 'BT-2026-1144',
    plannedStartDate: '2026-06-15',
    plannedEndDate: '2026-06-18',
    plantId: 'PL-AUR',
    machineIds: ['MAC-AUR-CL-01', 'MAC-AUR-GR-01'],
    variety: 'Suraj',
    qty: 5700,
    status: 'Planned',
  },
];

// Add schedules matching dynamically generated batches
for (let i = 1; i <= 20; i++) {
  productionSchedule.push({
    id: `SCH-GEN-${i}`,
    batchId: `BT-2026-10${i + 10}`,
    plannedStartDate: `2026-06-${String(15 + i).padStart(2, '0')}`,
    plannedEndDate: `2026-06-${String(17 + i).padStart(2, '0')}`,
    plantId: i % 2 === 0 ? 'PL-AUR' : 'PL-HYD',
    machineIds: i % 2 === 0 ? ['MAC-AUR-CL-01'] : ['MAC-HYD-CL-01'],
    variety: i % 2 === 0 ? 'IR-64' : 'PBW-725',
    qty: 5000,
    status: 'Planned',
  });
}
