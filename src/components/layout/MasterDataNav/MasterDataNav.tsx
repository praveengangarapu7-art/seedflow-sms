import { NavLink } from 'react-router-dom';
import styles from './MasterDataNav.module.css';

const items = [
  { label: 'Varieties', path: '/varieties' },
  { label: 'Crops', path: '/crops' },
  { label: 'Organizations', path: '/organizations' },
  { label: 'Farmers', path: '/farmers' },
  { label: 'Labs', path: '/labs' },
  { label: 'Seed Lots', path: '/seed-lots' },
  { label: 'Reconcile', path: '/master-data/reconcile' },
];

/**
 * Lightweight cross-links between the Master Data pages (Varieties, Crops, Organizations,
 * Farmers, Labs, Seed Lots). These pages don't sit behind a module Sidebar like Procurement/
 * Warehouse/R&D/Processing do, so this is the "Master Data nav" — otherwise each page is only
 * reachable by typing its URL directly.
 */
export function MasterDataNav() {
  return (
    <nav className={styles.nav} aria-label="Master Data">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => [styles.link, isActive ? styles.linkActive : ''].filter(Boolean).join(' ')}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
