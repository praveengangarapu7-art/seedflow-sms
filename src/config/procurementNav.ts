import type { Permission } from '@/utils/permissions';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Users,
  FileQuestion,
  PackageCheck,
  ClipboardCheck,
  Receipt,
  Wallet,
  CheckSquare,
  BarChart3,
  Settings,
} from 'lucide-react';

export interface ProcurementNavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}

export const procurementNav: ProcurementNavItem[] = [
  { label: 'Dashboard', path: '/procurement/dashboard', icon: LayoutDashboard, permission: 'view_procurement_dashboard' },
  { label: 'Purchase Requisitions', path: '/procurement/requisitions', icon: FileText, permission: 'view_requisitions' },
  { label: 'Purchase Orders', path: '/procurement/orders', icon: ShoppingCart, permission: 'view_orders' },
  { label: 'Suppliers', path: '/procurement/suppliers', icon: Users, permission: 'view_suppliers' },
  { label: 'RFQ / Quotations', path: '/procurement/rfq', icon: FileQuestion, permission: 'view_rfq' },
  { label: 'Goods Receipt (GRN)', path: '/procurement/grn', icon: PackageCheck, permission: 'view_grn' },
  { label: 'Inspection & Quality', path: '/procurement/inspection', icon: ClipboardCheck, permission: 'view_inspection' },
  { label: 'Invoices & Payments', path: '/procurement/invoices', icon: Receipt, permission: 'view_invoices' },
  { label: 'Budget & Cost Control', path: '/procurement/budget', icon: Wallet, permission: 'view_budget' },
  { label: 'Approvals', path: '/procurement/approvals', icon: CheckSquare, permission: 'view_approvals' },
  { label: 'Reports & Analytics', path: '/procurement/reports', icon: BarChart3, permission: 'view_procurement_reports' },
  { label: 'Settings', path: '/procurement/settings', icon: Settings, permission: 'view_procurement_settings' },
];
