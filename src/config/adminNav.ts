import type { Permission } from '@/utils/permissions';
import {
  Activity,
  Bell,
  Building2,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  ScrollText,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { NavItem } from '@/types';

export interface AdminNavItem extends NavItem {
  permission: Permission;
}

/**
 * Administration is the one module that is not a business domain. Its nav is
 * the list of concerns every OTHER module shares, grouped by who cares about
 * them:
 *
 *   Access       — users, roles, organizations
 *   Oversight    — audit trail, system health, data governance, privacy
 *   Platform     — cross-module workflows, alerts, module registry, settings
 *
 * Each entry is permission-gated separately (see permissions.ts) so a
 * read-only Compliance Auditor sees the oversight half of this list and none
 * of the access-management half.
 */
export const adminNav: AdminNavItem[] = [
  {
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: LayoutDashboard,
    permission: 'view_admin_dashboard',
  },
  {
    label: 'Users',
    path: '/admin/users',
    icon: Users,
    permission: 'view_admin_users',
  },
  {
    label: 'Roles & permissions',
    path: '/admin/roles',
    icon: KeyRound,
    permission: 'view_admin_roles',
  },
  {
    label: 'Organizations',
    path: '/admin/organizations',
    icon: Building2,
    permission: 'view_admin_organizations',
  },
  {
    label: 'Audit logs',
    path: '/admin/audit-logs',
    icon: ScrollText,
    permission: 'view_admin_audit_logs',
  },
  {
    label: 'System health',
    path: '/admin/system-health',
    icon: Activity,
    permission: 'view_admin_system_health',
  },
  {
    label: 'Data governance',
    path: '/admin/data-governance',
    icon: ShieldAlert,
    permission: 'view_admin_data_governance',
  },
  {
    label: 'Data privacy',
    path: '/admin/data-privacy',
    icon: Lock,
    permission: 'view_admin_data_privacy',
  },
  {
    label: 'Approval workflows',
    path: '/admin/workflows',
    icon: GitBranch,
    permission: 'view_admin_workflows',
  },
  {
    label: 'Alerts & notifications',
    path: '/admin/notifications',
    icon: Bell,
    permission: 'view_admin_notifications',
  },
  {
    label: 'Module registry',
    path: '/admin/modules',
    icon: LayoutGrid,
    permission: 'view_admin_modules',
  },
  {
    label: 'Admin settings',
    path: '/admin/settings',
    icon: Settings,
    permission: 'view_admin_settings',
  },
];
