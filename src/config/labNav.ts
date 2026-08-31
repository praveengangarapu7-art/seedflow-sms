import type { Permission } from '@/utils/permissions';
import {
  LayoutDashboard,
  ClipboardList,
  FlaskConical,
  AlertTriangle,
  FileCheck2,
  BarChart3,
} from 'lucide-react';
import { NavItem } from '@/types';

export interface LabNavItem extends NavItem {
  permission: Permission;
}

export const labNav: LabNavItem[] = [
  {
    label: 'Dashboard',
    path: '/lab/dashboard',
    icon: LayoutDashboard,
    permission: 'view_lab_dashboard',
  },
  {
    label: 'Sample submissions',
    path: '/lab/submissions',
    icon: ClipboardList,
    permission: 'view_lab_submissions',
  },
  {
    label: 'Test results',
    path: '/lab/results',
    icon: FlaskConical,
    permission: 'view_lab_results',
  },
  {
    label: 'Quality flags',
    path: '/lab/quality-flags',
    icon: AlertTriangle,
    permission: 'view_lab_quality_flags',
  },
  {
    label: 'Certificates',
    path: '/lab/certificates',
    icon: FileCheck2,
    permission: 'view_lab_certificates',
  },
  {
    label: 'Lab performance',
    path: '/lab/performance',
    icon: BarChart3,
    permission: 'view_lab_performance',
  },
];
