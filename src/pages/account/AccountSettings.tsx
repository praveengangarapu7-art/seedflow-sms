import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { AccountNav } from '@/components/layout/AccountNav/AccountNav';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import styles from './Account.module.css';

const NOTIFICATION_PREFS_KEY = 'seedflow_notification_prefs';

interface NotificationPrefs {
  email: boolean;
  inApp: boolean;
  weeklyDigest: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = { email: true, inApp: true, weeklyDigest: false };

function loadPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!stored) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(stored) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

const MODULE_SETTINGS_LINKS = [
  { label: 'Procurement Settings', path: '/procurement/settings' },
  { label: 'Warehouse Settings', path: '/warehouse/settings' },
  { label: 'R&D Settings', path: '/rd/settings' },
  { label: 'Processing Settings', path: '/processing/settings' },
];

export default function AccountSettings() {
  const { logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadPrefs);

  const canViewProcurementSettings = usePermission('view_procurement_settings');
  const canViewWarehouseSettings = usePermission('view_warehouse_settings');
  const canViewRdSettings = usePermission('view_rd_settings');
  const canViewProcessingSettings = usePermission('view_processing_settings');
  const moduleAccess = [
    canViewProcurementSettings,
    canViewWarehouseSettings,
    canViewRdSettings,
    canViewProcessingSettings,
  ];
  const visibleModuleLinks = MODULE_SETTINGS_LINKS.filter((_, i) => moduleAccess[i]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  function togglePref(key: keyof NotificationPrefs) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      addToast('Notification preferences updated', 'success');
      return next;
    });
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Notification preferences and account-level controls.</p>
      </div>

      <AccountNav />

      <div className={styles.sectionStack}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Notifications</h2>

          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <span className={styles.toggleLabel}>Email notifications</span>
              <span className={styles.toggleDesc}>Order approvals, quality flags and certificate issuance.</span>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={prefs.email} onChange={() => togglePref('email')} />
              <span className={styles.slider} />
            </label>
          </div>

          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <span className={styles.toggleLabel}>In-app notifications</span>
              <span className={styles.toggleDesc}>Toast alerts while you're working in SeedSphere.</span>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={prefs.inApp} onChange={() => togglePref('inApp')} />
              <span className={styles.slider} />
            </label>
          </div>

          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <span className={styles.toggleLabel}>Weekly summary digest</span>
              <span className={styles.toggleDesc}>A Monday recap of activity across your modules.</span>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={prefs.weeklyDigest} onChange={() => togglePref('weeklyDigest')} />
              <span className={styles.slider} />
            </label>
          </div>
        </div>

        {visibleModuleLinks.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Module settings</h2>
            <div className={styles.linkGrid}>
              {visibleModuleLinks.map((link) => (
                <Link key={link.path} to={link.path} className={styles.linkCard}>
                  <SettingsIcon size={16} />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Session</h2>
          <div className={styles.dangerRow}>
            <p className={styles.emptyNote}>Sign out of SeedSphere on this device.</p>
            <Button variant="danger" leftIcon={LogOut} onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
