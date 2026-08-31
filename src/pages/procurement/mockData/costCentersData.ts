import type { CostCenter } from '@/types/procurement';

export const mockCostCenters: CostCenter[] = [
  { id: 'CC-001', costCenter: 'Cotton Seed Procurement', department: 'Procurement', allocated: 8000000, committed: 1200000, spent: 5200000, available: 1600000, utilization: 65, status: 'On Track', period: 'FY 2026' },
  { id: 'CC-002', costCenter: 'Lab Chemicals',           department: 'Laboratory',  allocated: 2000000, committed:  350000, spent: 1480000, available:  170000, utilization: 91.5, status: 'Warning', period: 'FY 2026' },
  { id: 'CC-003', costCenter: 'Fertilizer Procurement',  department: 'Processing',  allocated: 5000000, committed:  800000, spent: 3500000, available:  700000, utilization: 70, status: 'On Track', period: 'FY 2026' },
  { id: 'CC-004', costCenter: 'Packaging Materials',     department: 'Warehouse',   allocated: 3500000, committed:  500000, spent: 3450000, available: -450000, utilization: 102.9, status: 'Over Budget', period: 'FY 2026' },
  { id: 'CC-005', costCenter: 'Field Trials',            department: 'R&D',         allocated: 1500000, committed:   50000, spent:  525000, available:  925000, utilization: 35, status: 'Underutilized', period: 'FY 2026' },
  { id: 'CC-006', costCenter: 'Office Supplies',         department: 'Admin',       allocated:  300000, committed:    8000, spent:  315000, available:  -23000, utilization: 105, status: 'Over Budget', period: 'FY 2026' },
  { id: 'CC-007', costCenter: 'Equipment Maintenance',   department: 'Warehouse',   allocated: 1200000, committed:  150000, spent:  720000, available:  330000, utilization: 60, status: 'On Track', period: 'FY 2026' },
  { id: 'CC-008', costCenter: 'Travel & Logistics',      department: 'Procurement', allocated:  800000, committed:   50000, spent:  680000, available:   70000, utilization: 85, status: 'Warning', period: 'FY 2026' },
  { id: 'CC-009', costCenter: 'IT Infrastructure',       department: 'Admin',       allocated: 1000000, committed:   80000, spent:  450000, available:  470000, utilization: 45, status: 'Underutilized', period: 'FY 2026' },
  { id: 'CC-010', costCenter: 'Hybrid Seed R&D',         department: 'R&D',         allocated: 2500000, committed:  300000, spent: 2400000, available:  -200000, utilization: 96, status: 'Critical', period: 'FY 2026' },
  { id: 'CC-011', costCenter: 'Quality Testing Lab',     department: 'Laboratory',  allocated:  900000, committed:  100000, spent:  650000, available:  150000, utilization: 72, status: 'On Track', period: 'FY 2026' },
  { id: 'CC-012', costCenter: 'Marketing & Branding',    department: 'Admin',       allocated:  500000, committed:   30000, spent:  385000, available:   85000, utilization: 77, status: 'On Track', period: 'FY 2026' },
];

export const COST_CENTER_DEPT_OPTIONS = [
  { label: 'All departments', value: '' },
  { label: 'Procurement', value: 'Procurement' },
  { label: 'Laboratory',  value: 'Laboratory' },
  { label: 'R&D',         value: 'R&D' },
  { label: 'Processing',  value: 'Processing' },
  { label: 'Warehouse',   value: 'Warehouse' },
  { label: 'Admin',       value: 'Admin' },
];
