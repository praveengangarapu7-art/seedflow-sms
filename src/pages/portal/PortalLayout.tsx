import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Globe, Shield, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './PortalLayout.module.css';

interface PortalLayoutProps {
  title: string;
  roleLabel: string;
  children: ReactNode;
}

export function PortalLayout({ title, roleLabel, children }: PortalLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.root}>
      {/* Premium top header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoContainer}>
            <Globe className={styles.logoIcon} />
            <span className={styles.logoText}>SeedSphere</span>
            <span className={styles.portalTag}>Partner Portal</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.portalTitleBox}>
            <h1 className={styles.portalTitle}>{title}</h1>
            <span className={styles.roleBadge}>
              <Shield size={10} style={{ marginRight: 4 }} />
              {roleLabel}
            </span>
          </div>
        </div>

        <div className={styles.headerRight}>
          {user && (
            <div className={styles.userBox}>
              <div className={styles.userAvatar}>
                <User size={14} />
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userOrg}>{user.organizationName ?? 'SeedSphere Partner'}</span>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className={styles.logoutBtn} aria-label="Logout">
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* Main body content container */}
      <div className={styles.container}>
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
