import type { Permission } from '@/utils/permissions';
import {
  AlertOctagon,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Lock,
  Scale,
  MessageSquareWarning,
  Wrench,
} from 'lucide-react';
import { NavItem } from '@/types';

export interface QualityNavItem extends NavItem {
  permission: Permission;
}

/**
 * The quality spine, in the order a problem travels through it:
 *
 *   SOP register        — the defined process people are held to
 *   Non-conformances    — where the process was not followed / product failed
 *   CAPA                — the corrective and preventive actions that fix it
 *   Complaints          — the same pipeline, entered from the customer side
 *   Lot holds           — containment: stop-sale until the cause is closed
 *   Compliance          — the regulatory requirements the whole spine answers to
 */
export const qualityNav: QualityNavItem[] = [
  {
    label: 'Dashboard',
    path: '/quality/dashboard',
    icon: LayoutDashboard,
    permission: 'view_quality_dashboard',
  },
  {
    label: 'SOP register',
    path: '/quality/sops',
    icon: FileText,
    permission: 'view_sop_register',
  },
  {
    label: 'Non-conformances',
    path: '/quality/ncrs',
    icon: AlertOctagon,
    permission: 'view_ncrs',
  },
  {
    label: 'CAPA',
    path: '/quality/capas',
    icon: Wrench,
    permission: 'view_capas',
  },
  {
    label: 'Complaints',
    path: '/quality/complaints',
    icon: MessageSquareWarning,
    permission: 'view_complaints',
  },
  {
    label: 'Lot holds',
    path: '/quality/holds',
    icon: Lock,
    permission: 'view_lot_holds',
  },
  {
    label: 'Compliance',
    path: '/quality/compliance',
    icon: Scale,
    permission: 'view_compliance',
  },
];

export const QUALITY_MODULE_ICON = ClipboardCheck;
