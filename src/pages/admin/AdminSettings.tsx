import { useState } from 'react';
import { ExternalLink, RotateCcw, Save, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { adminNav } from '@/config/adminNav';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/types';
import {
  DEFAULT_ADMIN_SETTINGS,
  readAdminSettings,
  writeAdminSettings,
  type AdminSettings as AdminSettingsShape,
} from '@/services/adminSettings';
import { useAdminSession } from './useAdminSession';
import styles from './Admin.module.css';

/**
 * Administration settings.
 *
 * Two deliberate decisions here.
 *
 * First, this page holds only settings that change how the FRONT END behaves.
 * Anything that must hold for everyone regardless of browser already lives on
 * the server and is edited where it is owned: retention windows on Data
 * privacy, role grants in code (Roles & permissions explains why), alert
 * thresholds per storage location in the Production module. Duplicating those
 * here would create two places to change one thing.
 *
 * Second, it says out loud that these preferences are stored in this browser.
 * There is no platform_settings table on the server, and pretending there is
 * would be the kind of half-truth that costs someone a debugging afternoon.
 *
 * The per-module settings links at the bottom are the same pattern the
 * account Settings page uses — Administration is the natural hub for them,
 * so they are gathered here as well as there.
 */
const MODULE_SETTINGS_LINKS = [
  { label: 'Procurement settings', path: '/procurement/settings', permission: 'view_procurement_settings' as const },
  { label: 'Warehouse settings', path: '/warehouse/settings', permission: 'view_warehouse_settings' as const },
  { label: 'R&D settings', path: '/rd/settings', permission: 'view_rd_settings' as const },
  { label: 'Processing settings', path: '/processing/settings', permission: 'view_processing_settings' as const },
];

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { backendRole, canAdminister } = useAdminSession();
  const canManage = usePermission('manage_admin_settings');

  const [settings, setSettings] = useState<AdminSettingsShape>(() => readAdminSettings());
  const [dirty, setDirty] = useState(false);

  const canProcurement = usePermission('view_procurement_settings');
  const canWarehouse = usePermission('view_warehouse_settings');
  const canRd = usePermission('view_rd_settings');
  const canProcessing = usePermission('view_processing_settings');
  const linkPermissions: Record<string, boolean> = {
    view_procurement_settings: canProcurement,
    view_warehouse_settings: canWarehouse,
    view_rd_settings: canRd,
    view_processing_settings: canProcessing,
  };
  const visibleLinks = MODULE_SETTINGS_LINKS.filter((link) => linkPermissions[link.permission]);

  function update<K extends keyof AdminSettingsShape>(key: K, value: AdminSettingsShape[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    writeAdminSettings(settings);
    setDirty(false);
    addToast('Administration settings saved in this browser.', 'success');
  }

  function handleReset() {
    const defaults = { ...DEFAULT_ADMIN_SETTINGS, disabledModules: settings.disabledModules };
    setSettings(defaults);
    writeAdminSettings(defaults);
    setDirty(false);
    addToast('Settings restored to defaults. Module visibility was left as it is.', 'success');
  }

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin settings</h1>
            <p className={styles.subtitle}>
              Front-end behaviour this module controls, plus a way into every other module's own settings page.
            </p>
          </div>
          <div className={styles.controls}>
            {canManage && (
              <>
                <Button variant="secondary" leftIcon={RotateCcw} onClick={handleReset}>
                  Reset to defaults
                </Button>
                <Button leftIcon={Save} disabled={!dirty} onClick={handleSave}>
                  Save
                </Button>
              </>
            )}
          </div>
        </div>

        <div className={styles.readOnlyNotice}>
          <SettingsIcon size={16} />
          These preferences are stored in this browser only — there is no platform settings table on the server, so
          they do not follow you to another machine or apply to other users.
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Session</h2>
          <p className={styles.sectionSubtitle}>Who you are signed in as, on both of the app's auth layers.</p>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Signed in as</span>
              <span>{user?.name ?? '—'}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Module role</span>
              <span>{user ? ROLE_LABELS[user.role] : '—'}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Backend role</span>
              <span>{backendRole ?? '—'}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Write access</span>
              <span>{canAdminister ? 'Full administration' : 'Read-only oversight'}</span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Platform behaviour</h2>
          <p className={styles.sectionSubtitle}>How the app presents itself and when it starts warning people.</p>

          <div className={styles.toggleRow}>
            <div className={styles.toggleCopy}>
              <span className={styles.toggleTitle}>Show the demo-data badge</span>
              <span className={styles.toggleDesc}>
                When the backend is unreachable the app keeps working from cached and fixture data. The badge is the
                honest signal that what is on screen is not live — turning it off hides that.
              </span>
            </div>
            <button
              type="button"
              aria-label="Toggle the demo-data badge"
              disabled={!canManage}
              className={`${styles.switch} ${settings.showDemoBadge ? styles.switchOn : ''}`}
              onClick={() => update('showDemoBadge', !settings.showDemoBadge)}
            >
              <span className={styles.switchKnob} />
            </button>
          </div>

          <div className={styles.toggleRow}>
            <div className={styles.toggleCopy}>
              <span className={styles.toggleTitle}>Require a reason on destructive actions</span>
              <span className={styles.toggleDesc}>
                Archiving a lot, correcting a quantity and anonymising a farmer all prompt for a reason, which is
                written into the audit trail. Leave this on unless you have a good reason not to.
              </span>
            </div>
            <button
              type="button"
              aria-label="Toggle the reason prompt on destructive actions"
              disabled={!canManage}
              className={`${styles.switch} ${settings.requireReasonOnDestructive ? styles.switchOn : ''}`}
              onClick={() => update('requireReasonOnDestructive', !settings.requireReasonOnDestructive)}
            >
              <span className={styles.switchKnob} />
            </button>
          </div>

          <div className={styles.inlineForm} style={{ marginTop: '1rem' }}>
            <div className={styles.field}>
              <label className={styles.label}>Expiry warning (days)</label>
              <input
                className={styles.textInput}
                type="number"
                min={1}
                max={365}
                disabled={!canManage}
                value={settings.expiryWarningDays}
                onChange={(e) => update('expiryWarningDays', Number(e.target.value))}
              />
              <span className={styles.toggleDesc}>
                Stock within this many days of expiry is flagged on the Alerts page.
              </span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Workflow overdue after (days)</label>
              <input
                className={styles.textInput}
                type="number"
                min={1}
                max={90}
                disabled={!canManage}
                value={settings.workflowOverdueDays}
                onChange={(e) => update('workflowOverdueDays', Number(e.target.value))}
              />
              <span className={styles.toggleDesc}>
                An approval stage waiting longer than this is marked past due.
              </span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Settings owned elsewhere</h2>
          <p className={styles.sectionSubtitle}>
            These are edited where the data lives, so there is only ever one place to change each one.
          </p>
          <div className={styles.actionRow}>
            <Button variant="secondary" leftIcon={ExternalLink} onClick={() => navigate('/admin/data-privacy')}>
              Retention policies
            </Button>
            <Button variant="secondary" leftIcon={ExternalLink} onClick={() => navigate('/admin/roles')}>
              Role grants
            </Button>
            <Button variant="secondary" leftIcon={ExternalLink} onClick={() => navigate('/admin/modules')}>
              Module visibility
            </Button>
            <Button variant="secondary" leftIcon={ExternalLink} onClick={() => navigate('/settings')}>
              My account settings
            </Button>
          </div>
        </div>

        {visibleLinks.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Module settings</h2>
            <p className={styles.sectionSubtitle}>
              Each business module keeps its own configuration page. Only the ones your role can open are listed.
            </p>
            <div className={styles.actionRow}>
              {visibleLinks.map((link) => (
                <Button
                  key={link.path}
                  variant="secondary"
                  leftIcon={SettingsIcon}
                  onClick={() => navigate(link.path)}
                >
                  {link.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
