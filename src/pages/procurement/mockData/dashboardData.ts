import { Clock, Wallet, Users, Percent } from 'lucide-react';
import type {
  KpiData,
  SpendCategory,
  PoStatus,
  RecentPO,
  PendingApproval,
  TopSupplier,
  Alert,
} from '@/types/procurement';

export const kpiData: KpiData[] = [
  {
    label: 'Procurement cycle time',
    value: '12 days',
    icon: Clock,
    trend: { direction: 'down', percentage: '14.3%', isPositive: true },
    comparison: 'vs 14 days last month',
  },
  {
    label: 'Cost savings this month',
    value: '₹3.2 L',
    icon: Wallet,
    trend: { direction: 'up', percentage: '22.4%', isPositive: true },
    comparison: 'vs ₹2.6 L last month',
  },
  {
    label: 'Active suppliers',
    value: '47',
    icon: Users,
    trend: { direction: 'up', percentage: '4.4%', isPositive: true },
    comparison: '2 onboarded this month',
  },
  {
    label: 'Purchase price variance',
    value: '2.4%',
    icon: Percent,
    trend: { direction: 'down', percentage: '0.8%', isPositive: true },
    comparison: 'Within target range',
  },
];

export const spendByCategory: SpendCategory[] = [
  { category: 'Raw seeds', amount: 4_250_000, percentage: 100 },
  { category: 'Packaging', amount: 1_850_000, percentage: 44 },
  { category: 'Chemicals', amount: 1_200_000, percentage: 28 },
  { category: 'Fertilizers', amount: 980_000, percentage: 23 },
  { category: 'Lab supplies', amount: 540_000, percentage: 13 },
  { category: 'Office supplies', amount: 180_000, percentage: 4 },
];

export const poStatusData: PoStatus[] = [
  { status: 'Draft', count: 8, percentage: 9 },
  { status: 'Sent', count: 24, percentage: 27 },
  { status: 'Acknowledged', count: 18, percentage: 20 },
  { status: 'Received', count: 22, percentage: 24 },
  { status: 'Closed', count: 18, percentage: 20 },
];

export const recentPOs: RecentPO[] = [
  { poNumber: 'PO-2026-0142', supplier: 'AgriChem Industries', amount: 425_000, status: 'Received', date: '24 Apr 2026' },
  { poNumber: 'PO-2026-0141', supplier: 'Bharat Seeds Pvt Ltd', amount: 1_250_000, status: 'Sent', date: '23 Apr 2026' },
  { poNumber: 'PO-2026-0140', supplier: 'GreenShield Crop Care', amount: 280_000, status: 'Acknowledged', date: '22 Apr 2026' },
  { poNumber: 'PO-2026-0139', supplier: 'Stationery Mart', amount: 18_500, status: 'Closed', date: '20 Apr 2026' },
  { poNumber: 'PO-2026-0138', supplier: 'Pioneer Packaging Co', amount: 645_000, status: 'Draft', date: '19 Apr 2026' },
];

export const pendingApprovals: PendingApproval[] = [
  { id: 1, type: 'PR', title: 'Lab reagents — Q2 testing batch', submittedBy: 'Priya Sharma', timeAgo: '2 hours ago', amount: 45_000 },
  { id: 2, type: 'PO', title: 'Cotton seed bulk procurement', submittedBy: 'Anil Kumar', timeAgo: '4 hours ago', amount: 1_250_000 },
  { id: 3, type: 'Invoice', title: 'AgriChem Industries — March billing', submittedBy: 'Finance Team', timeAgo: '6 hours ago', amount: 312_000 },
  { id: 4, type: 'PR', title: 'Packaging material restock', submittedBy: 'Warehouse Team', timeAgo: '1 day ago', amount: 88_000 },
  { id: 5, type: 'PO', title: 'Fertilizer supply — May delivery', submittedBy: 'Rajesh Patel', timeAgo: '1 day ago', amount: 670_000 },
];

export const topSuppliers: TopSupplier[] = [
  { rank: 1, name: 'Bharat Seeds Pvt Ltd', score: 4.8, poCount: 12, totalSpend: 2_850_000 },
  { rank: 2, name: 'AgriChem Industries', score: 4.6, poCount: 8, totalSpend: 1_425_000 },
  { rank: 3, name: 'Pioneer Packaging Co', score: 4.5, poCount: 6, totalSpend: 980_000 },
  { rank: 4, name: 'GreenShield Crop Care', score: 4.3, poCount: 5, totalSpend: 720_000 },
  { rank: 5, name: 'CropCare Solutions', score: 4.2, poCount: 4, totalSpend: 540_000 },
];

export const activeAlerts: Alert[] = [
  { id: 1, severity: 'critical', title: 'Budget exceeded — Office supplies', description: 'Cost center is 7.5% over budget', timeAgo: '1h ago' },
  { id: 2, severity: 'warning', title: 'Lab Chemicals at 91% utilization', description: 'Approaching budget threshold', timeAgo: '3h ago' },
  { id: 3, severity: 'warning', title: 'Late delivery — PO-2026-0135', description: 'CropCare Solutions delayed by 4 days', timeAgo: '5h ago' },
  { id: 4, severity: 'info', title: '2 RFQs awaiting your award decision', description: 'Bid submission deadline passed', timeAgo: '1d ago' },
];
