import { NavLink } from 'react-router-dom';
import styles from './AccountNav.module.css';

const items = [
  { label: 'Profile', path: '/profile' },
  { label: 'Settings', path: '/settings' },
];

/**
 * Cross-links between the two account pages (Profile, Settings). Neither page sits
 * inside ModuleLayout — the account area isn't scoped to any one module — so this is
 * the "Account nav", mirroring MasterDataNav for the same reason: without it, each
 * page would only be reachable by typing its URL directly.
 */
export function AccountNav() {
  return (
    <nav className={styles.nav} aria-label="Account">
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
