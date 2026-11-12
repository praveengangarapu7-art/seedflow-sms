import { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  ArrowRight,
  Cog,
  FlaskConical,
  LayoutGrid,
  Power,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  TestTube,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { adminNav } from '@/config/adminNav';
import { labNav } from '@/config/labNav';
import { qualityNav } from '@/config/qualityNav';
import { processingNav } from '@/config/processingNav';
import { procurementNav } from '@/config/procurementNav';
import { rdNav } from '@/config/rdNav';
import { warehouseNav } from '@/config/warehouseNav';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  ADMIN_ROLES,
  LAB_ROLES,
  QUALITY_ROLES,
  PROCESSING_ROLES,
  PROCUREMENT_ROLES,
  RD_ROLES,
  WAREHOUSE_ROLES,
  type UserRole,
} from '@/types';
import { PERMISSION_GROUPS } from '@/utils/permissions';
import { SEARCH_INDEX } from '@/data/searchIndex';
import { readAdminSettings, setModuleEnabled, type AdminSettings, type ModuleKey } from '@/services/adminSettings';
import styles from './Admin.module.css';

/**
 * The module registry: what this platform is actually made of.
 *
 * Every figure is counted from the real configuration rather than typed in —
 * nav items come from each module's own *Nav.ts, roles from src/types,
 * permissions from the permission table, searchable destinations from the
 * search index. If someone adds a page to the Warehouse module tomorrow, this
 * page's count changes with it.
 *
 * The availability switch hides a module from the module-selection grid. It
 * is a front-end preference stored in this browser (see
 * src/services/adminSettings.ts) — not a server-side kill switch — and the
 * page says so rather than implying otherwise. Administration itself cannot
 * be switched off, since that would remove the only way to switch anything
 * back on.
 */
interface ModuleDescriptor {
  key: ModuleKey;
  name: string;
  icon: LucideIcon;
  entryPath: string;
  navCount: number;
  roles: UserRole[];
  permissionModule: string;
  searchModule: string;
  backing: string;
}

const MODULES: ModuleDescriptor[] = [
  {
    key: 'procurement',
    name: 'Procurement',
    icon: ShoppingCart,
    entryPath: '/procurement/dashboard',
    navCount: procurementNav.length,
    roles: PROCUREMENT_ROLES,
    permissionModule: 'Procurement',
    searchModule: 'Procurement',
    backing: 'Mock store',
  },
  {
    key: 'warehouse',
    name: 'Warehouse',
    icon: Warehouse,
    entryPath: '/warehouse/dashboard',
    navCount: warehouseNav.length,
    roles: WAREHOUSE_ROLES,
    permissionModule: 'Warehouse',
    searchModule: 'Warehouse',
    backing: 'Mock store',
  },
  {
    key: 'rd',
    name: 'Research & Development',
    icon: FlaskConical,
    entryPath: '/rd/dashboard',
    navCount: rdNav.length,
    roles: RD_ROLES,
    permissionModule: 'R&D',
    searchModule: 'R&D',
    backing: 'Mock store',
  },
  {
    key: 'processing',
    name: 'Processing',
    icon: Cog,
    entryPath: '/processing/dashboard',
    navCount: processingNav.length,
    roles: PROCESSING_ROLES,
    permissionModule: 'Processing',
    searchModule: 'Processing',
    backing: 'Mock store',
  },
  {
    key: 'production',
    name: 'Production Planning',
    icon: Sprout,
    entryPath: '/production/dashboard',
    navCount: 0,
    roles: [],
    permissionModule: '',
    searchModule: 'Production',
    backing: 'Live backend',
  },
  {
    key: 'lab',
    name: 'Laboratory',
    icon: TestTube,
    entryPath: '/lab/dashboard',
    navCount: labNav.length,
    roles: LAB_ROLES,
    permissionModule: 'Laboratory',
    searchModule: 'Laboratory',
    backing: 'Live backend',
  },
  {
    key: 'quality',
    name: 'Quality',
    icon: ClipboardCheck,
    entryPath: '/quality/dashboard',
    navCount: qualityNav.length,
    roles: QUALITY_ROLES,
    permissionModule: 'Quality',
    searchModule: 'Quality',
    backing: 'Live backend',
  },
  {
    key: 'admin',
    name: 'Administration',
    icon: ShieldCheck,
    entryPath: '/admin/dashboard',
    navCount: adminNav.length,
    roles: ADMIN_ROLES,
    permissionModule: 'Administration',
    searchModule: 'Administration',
    backing: 'Live backend',
  },
];

export default function ModuleRegistry() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const canToggle = usePermission('toggle_module_availability');
  const [settings, setSettings] = useState<AdminSettings>(() => readAdminSettings());

  const permissionCounts = useMemo(
    () =>
      Object.fromEntries(PERMISSION_GROUPS.map((group) => [group.module, group.permissions.length])) as Record<
        string,
        number
      >,
    [],
  );

  const searchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SEARCH_INDEX.forEach((entry) => {
      counts[entry.module] = (counts[entry.module] ?? 0) + 1;
    });
    return counts;
  }, []);

  const enabledCount = MODULES.filter((m) => !settings.disabledModules.includes(m.key)).length;
  const totalRoles = MODULES.reduce((sum, m) => sum + m.roles.length, 0);
  const totalPages = MODULES.reduce((sum, m) => sum + (searchCounts[m.searchModule] ?? 0), 0);

  function handleToggle(module: ModuleDescriptor) {
    const currentlyEnabled = !settings.disabledModules.includes(module.key);
    const next = setModuleEnabled(module.key, !currentlyEnabled);
    setSettings(next);
    addToast(
      `${module.name} ${currentlyEnabled ? 'hidden from' : 'restored to'} the module grid in this browser.`,
      'success',
    );
  }

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Module registry</h1>
            <p className={styles.subtitle}>
              What the platform is made of, counted from the live configuration: pages, roles, permissions and whether
              each module reads the real backend or the mock store.
            </p>
          </div>
        </div>

        <div className={styles.kpiGrid}>
          <KpiCard title="Modules" value={String(MODULES.length)} subValue={`${enabledCount} visible`} icon={LayoutGrid} />
          <KpiCard title="Roles" value={String(totalRoles)} icon={ShieldCheck} />
          <KpiCard
            title="Permissions"
            value={String(Object.values(permissionCounts).reduce((a, b) => a + b, 0))}
            icon={ShieldCheck}
          />
          <KpiCard title="Searchable destinations" value={String(totalPages)} icon={LayoutGrid} />
        </div>

        <div className={styles.readOnlyNotice}>
          <Power size={16} />
          Visibility is a front-end preference stored in this browser, not a server-side kill switch — a module hidden
          here is still reachable by its URL, and other browsers are unaffected.
        </div>

        <div className={styles.moduleGrid}>
          {MODULES.map((module) => {
            const Icon = module.icon;
            const enabled = !settings.disabledModules.includes(module.key);
            const pageCount = searchCounts[module.searchModule] ?? 0;
            const permissionCount = module.permissionModule ? (permissionCounts[module.permissionModule] ?? 0) : 0;
            return (
              <div key={module.key} className={styles.moduleTile}>
                <div className={styles.moduleTileHead}>
                  <Icon size={18} />
                  {module.name}
                  <span className={styles.spacer} />
                  <span className={`${styles.badge} ${enabled ? styles.badgeActive : styles.badgeInactive}`}>
                    {enabled ? 'Visible' : 'Hidden'}
                  </span>
                </div>
                <div className={styles.moduleTileMeta}>
                  {module.navCount > 0 ? `${module.navCount} sidebar pages · ` : ''}
                  {pageCount} searchable {pageCount === 1 ? 'destination' : 'destinations'}
                </div>
                <div className={styles.moduleTileMeta}>
                  {module.roles.length > 0 ? `${module.roles.length} roles` : 'No dedicated roles'}
                  {permissionCount > 0 ? ` · ${permissionCount} permissions` : ''}
                </div>
                <div className={styles.moduleTileMeta}>
                  Data source:{' '}
                  <span className={module.backing === 'Live backend' ? styles.successText : styles.muted}>
                    {module.backing}
                  </span>
                </div>
                <div className={styles.actionRow} style={{ marginTop: 'auto' }}>
                  <Button size="sm" variant="secondary" rightIcon={ArrowRight} onClick={() => navigate(module.entryPath)}>
                    Open
                  </Button>
                  {canToggle && module.key !== 'admin' && (
                    <Button
                      size="sm"
                      variant={enabled ? 'ghost' : 'secondary'}
                      leftIcon={Power}
                      onClick={() => handleToggle(module)}
                    >
                      {enabled ? 'Hide' : 'Show'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModuleLayout>
  );
}
