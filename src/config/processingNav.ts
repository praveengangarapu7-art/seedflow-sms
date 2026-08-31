import {
  LayoutDashboard,
  Truck,
  Factory,
  Calendar,
  Layers,
  FlaskConical,
  TrendingUp,
  Package,
  BadgeCheck,
  Search,
  BarChart3,
  Settings,
} from 'lucide-react';
import type { Permission } from '@/utils/permissions';
import type { NavItem } from '@/types';

export interface ProcessingNavItem extends NavItem {
  permission: Permission;
}

export const processingNav: ProcessingNavItem[] = [
  {
    label: 'Dashboard',
    path: '/processing/dashboard',
    icon: LayoutDashboard,
    permission: 'view_processing_dashboard',
  },
  {
    label: 'Raw Intake',
    path: '/processing/intake',
    icon: Truck,
    permission: 'view_raw_intake',
  },
  {
    label: 'Processing Batches',
    path: '/processing/batches',
    icon: Factory,
    permission: 'view_processing_batches',
  },
  {
    label: 'Production Planning',
    path: '/processing/planning',
    icon: Calendar,
    permission: 'view_production_planning',
  },
  {
    label: 'Plants & Machines',
    path: '/processing/plants',
    icon: Layers,
    permission: 'view_plants_machines',
  },
  {
    label: 'Treatments & Recipes',
    path: '/processing/recipes',
    icon: FlaskConical,
    permission: 'view_recipes',
  },
  {
    label: 'Yield & Loss',
    path: '/processing/yield',
    icon: TrendingUp,
    permission: 'view_yield_loss',
  },
  {
    label: 'Packaging & Labeling',
    path: '/processing/packaging',
    icon: Package,
    permission: 'view_packaging',
  },
  {
    label: 'Certification',
    path: '/processing/certification',
    icon: BadgeCheck,
    permission: 'view_certification',
  },
  {
    label: 'Traceability',
    path: '/processing/traceability',
    icon: Search,
    permission: 'view_traceability',
  },
  {
    label: 'Reports & Analytics',
    path: '/processing/reports',
    icon: BarChart3,
    permission: 'view_processing_reports',
  },
  {
    label: 'Settings',
    path: '/processing/settings',
    icon: Settings,
    permission: 'view_processing_settings',
  },
];
