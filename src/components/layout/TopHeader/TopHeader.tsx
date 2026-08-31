import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LayoutGrid, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { BackButton } from '@/components/common/BackButton/BackButton';
import styles from './TopHeader.module.css';

interface TopHeaderProps {
  moduleName?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TopHeader({ moduleName }: TopHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {/* Renders nothing on /modules and the auth pages — see
            shouldShowBackButton. Placed before the logo so the leftmost
            control is always "go back". */}
        <BackButton variant="inline" />

        <Link to="/modules" className={styles.logo}>
          <img src="/logo.png" alt="SeedSphere" className={styles.logoImage} />
        </Link>

        {moduleName && (
          <>
            <div className={styles.divider} />
            <span className={styles.moduleName}>{moduleName}</span>
            <Link to="/modules" className={styles.backLink}>
              <LayoutGrid size={14} />
              All modules
            </Link>
          </>
        )}
      </div>

      {/* Product-wide search — same index the public site searches. */}
      <div className={styles.center}>
        <GlobalSearch variant="header" placeholder="Search pages, records, modules…" />
      </div>

      <div className={styles.right}>
        <button className={styles.iconBtn} aria-label="Notifications">
          <Bell size={18} />
        </button>

        <div className={styles.userArea} ref={dropdownRef}>
          <button
            className={styles.userBtn}
            onClick={() => setDropdownOpen((v) => !v)}
            aria-label="User menu"
          >
            <div className={styles.avatar}>
              {user ? getInitials(user.name) : 'U'}
            </div>
            <span className={styles.userName}>{user?.name ?? 'User'}</span>
            <ChevronDown
              size={14}
              className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className={styles.dropdown}>
              <button className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                <User size={15} />
                Profile
              </button>
              <button className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                <Settings size={15} />
                Settings
              </button>
              <div className={styles.dropdownDivider} />
              <button
                className={`${styles.dropdownItem} ${styles.dropdownLogout}`}
                onClick={handleLogout}
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
