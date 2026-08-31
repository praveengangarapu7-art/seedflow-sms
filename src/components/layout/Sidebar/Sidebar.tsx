import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import type { NavItem } from '@/types';
import styles from './Sidebar.module.css';

interface SidebarProps {
  moduleName: string;
  moduleIcon: LucideIcon;
  navItems: NavItem[];
}

export function Sidebar({ moduleName, moduleIcon: ModuleIcon, navItems }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <ModuleIcon size={18} className={styles.sidebarHeaderIcon} />
        <span className={styles.sidebarHeaderTitle}>{moduleName}</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')
              }
            >
              <Icon size={17} className={styles.navIcon} />
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
