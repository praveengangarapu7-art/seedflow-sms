import type { Permission } from '@/utils/permissions';
import { 
  LayoutDashboard, 
  Database, 
  Workflow, 
  Sprout, 
  FlaskConical, 
  Camera, 
  Award, 
  FileCheck2, 
  BarChart3, 
  Settings 
} from 'lucide-react';
import { NavItem } from '@/types';

export interface RDNavItem extends NavItem {
  permission: Permission;
}

export const rdNav: RDNavItem[] = [
  {
    label: 'Dashboard',
    path: '/rd/dashboard',
    icon: LayoutDashboard,
    permission: 'view_rd_dashboard',
  },
  {
    label: 'Germplasm',
    path: '/rd/germplasm',
    icon: Database,
    permission: 'view_germplasm',
  },
  {
    label: 'Breeding programs',
    path: '/rd/breeding',
    icon: Workflow,
    permission: 'view_breeding_programs',
  },
  {
    label: 'Nurseries',
    path: '/rd/nurseries',
    icon: Sprout,
    permission: 'view_nurseries',
  },
  {
    label: 'Trials & MLT',
    path: '/rd/trials',
    icon: FlaskConical,
    permission: 'view_trials',
  },
  {
    label: 'Phenotyping',
    path: '/rd/phenotyping',
    icon: Camera,
    permission: 'view_phenotyping',
  },
  {
    label: 'Varieties',
    path: '/rd/varieties',
    icon: Award,
    permission: 'view_varieties',
  },
  {
    label: 'Registrations',
    path: '/rd/registrations',
    icon: FileCheck2,
    permission: 'view_registrations',
  },
  {
    label: 'Reports',
    path: '/rd/reports',
    icon: BarChart3,
    permission: 'view_rd_reports',
  },
  {
    label: 'Settings',
    path: '/rd/settings',
    icon: Settings,
    permission: 'view_rd_settings',
  },
];
