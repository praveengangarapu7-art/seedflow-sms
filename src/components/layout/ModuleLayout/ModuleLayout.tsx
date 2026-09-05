import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import type { NavItem } from '@/types';
import { TopHeader } from '@/components/layout/TopHeader/TopHeader';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';
import { useFilteredNav } from '@/hooks/useFilteredNav';
import type { ProcurementNavItem } from '@/config/procurementNav';
import styles from './ModuleLayout.module.css';

interface ModuleLayoutProps {
  moduleName: string;
  moduleIcon: LucideIcon;
  navItems: NavItem[];
  children: ReactNode;
}

export function ModuleLayout({ moduleName, moduleIcon, navItems, children }: ModuleLayoutProps) {
  const filteredNav = useFilteredNav(navItems as ProcurementNavItem[]);

  if (moduleName === 'Procurement' && filteredNav.length === 0) {
    return <Navigate to="/procurement/placeholder" replace />;
  }

  if (moduleName === 'Warehouse' && filteredNav.length === 0) {
    return <Navigate to="/warehouse/placeholder" replace />;
  }

  if ((moduleName === 'Research & Development' || moduleName === 'R&D') && filteredNav.length === 0) {
    return <Navigate to="/rd/placeholder" replace />;
  }

  if (moduleName === 'Processing' && filteredNav.length === 0) {
    return <Navigate to="/processing/placeholder" replace />;
  }

  if (moduleName === 'Laboratory' && filteredNav.length === 0) {
    return <Navigate to="/lab/placeholder" replace />;
  }

  if (moduleName === 'Administration' && filteredNav.length === 0) {
    return <Navigate to="/admin/placeholder" replace />;
  }

  return (
    <div className={styles.root}>
      <TopHeader moduleName={moduleName} />
      <div className={styles.body}>
        <Sidebar moduleName={moduleName} moduleIcon={moduleIcon} navItems={filteredNav} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
