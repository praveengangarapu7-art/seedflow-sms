/**
 * Platform-level administration settings.
 *
 * These are the settings the Administration module owns that have no server
 * table behind them. They are stored in localStorage under one key and are
 * therefore per-browser, not per-platform — every page that reads them says
 * so, and the Admin settings page labels it plainly rather than implying a
 * server round trip that isn't happening.
 *
 * Kept deliberately small: a setting belongs here only if it changes how the
 * front end behaves. Anything that must hold for every user regardless of
 * browser (retention windows, role grants, alert thresholds) already lives on
 * the server and is edited on the page that owns it — Data privacy for
 * retention, Roles & permissions for grants — not here.
 */

const STORAGE_KEY = 'seedsphere_admin_settings_v1';

/** Module keys match the `path` prefix each module's routes live under. */
export const MODULE_KEYS = [
  'procurement',
  'warehouse',
  'rd',
  'processing',
  'production',
  'lab',
  'quality',
  'admin',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export interface AdminSettings {
  /** Modules hidden from the module-selection grid. Admin can never be hidden. */
  disabledModules: ModuleKey[];
  /** Show the "Demo data" badge when the backend is unreachable. */
  showDemoBadge: boolean;
  /** Warn on the Alerts page when a lot is within this many days of expiry. */
  expiryWarningDays: number;
  /** Flag an approval stage as overdue after this many days waiting. */
  workflowOverdueDays: number;
  /** Require a reason string on destructive admin actions. */
  requireReasonOnDestructive: boolean;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  disabledModules: [],
  showDemoBadge: true,
  expiryWarningDays: 30,
  workflowOverdueDays: 7,
  requireReasonOnDestructive: true,
};

export function readAdminSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ADMIN_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AdminSettings>;
    return {
      ...DEFAULT_ADMIN_SETTINGS,
      ...parsed,
      // Never trust a stored array's contents — an old build could have
      // written a module key that no longer exists.
      disabledModules: (parsed.disabledModules ?? []).filter(
        (key): key is ModuleKey => (MODULE_KEYS as readonly string[]).includes(key) && key !== 'admin',
      ),
    };
  } catch {
    return { ...DEFAULT_ADMIN_SETTINGS };
  }
}

export function writeAdminSettings(settings: AdminSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable (private mode) — settings simply fall back to defaults */
  }
}

export function isModuleEnabled(key: ModuleKey, settings: AdminSettings = readAdminSettings()): boolean {
  // Administration itself is never hideable: turning it off would remove the
  // only way to turn anything back on.
  if (key === 'admin') return true;
  return !settings.disabledModules.includes(key);
}

export function setModuleEnabled(key: ModuleKey, enabled: boolean): AdminSettings {
  const settings = readAdminSettings();
  if (key === 'admin') return settings;
  const disabled = new Set(settings.disabledModules);
  if (enabled) disabled.delete(key);
  else disabled.add(key);
  const next = { ...settings, disabledModules: Array.from(disabled) };
  writeAdminSettings(next);
  return next;
}
