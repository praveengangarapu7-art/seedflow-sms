import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Warehouse,
  FlaskConical,
  Cog,
  TestTube,
  Sprout,
  ShieldCheck,
  ClipboardCheck,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CalendarClock,
  PackageSearch,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBackendSession } from '@/hooks/useBackendSession';
import { fetchAiForecasts, fetchAiLabRisk } from '@/services/seedLotRealtimeClient';
import { TopHeader } from '@/components/layout/TopHeader/TopHeader';
import { Badge } from '@/components/common/Badge/Badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/common/Toast/ToastContext';
import { hasPermission } from '@/utils/permissions';
import { isModuleEnabled, readAdminSettings, type ModuleKey } from '@/services/adminSettings';
import type { ModuleCardData } from '@/types';
import styles from './ModuleSelection.module.css';

const modules: ModuleCardData[] = [
  {
    name: 'Procurement',
    description: 'Manage purchase requisitions, suppliers, POs, and invoices',
    icon: ShoppingCart,
    path: '/procurement/dashboard',
    status: 'active',
  },
  {
    name: 'Warehouse',
    description: 'Track inventory, locations, dispatches, and stock movements',
    icon: Warehouse,
    path: '/warehouse/dashboard',
    status: 'active',
  },
  {
    name: 'Research & Development',
    description: 'Breeding programs, field trials, and germplasm management',
    icon: FlaskConical,
    path: '/rd/dashboard',
    status: 'active',
  },
  {
    name: 'Processing',
    description: 'Cleaning, drying, grading, and packaging operations',
    icon: Cog,
    path: '/processing/dashboard',
    status: 'active',
  },
  {
    name: 'Production Planning',
    description: 'Farmer, farm, and crop plan allocation with executive dashboards',
    icon: Sprout,
    path: '/production/dashboard',
    status: 'active',
  },
  {
    name: 'Laboratory',
    description: 'Quality testing, certifications, and lab workflows',
    icon: TestTube,
    path: '/lab/dashboard',
    status: 'active',
  },
  {
    name: 'Quality',
    description: 'SOP register, non-conformances, CAPA, complaints and lot holds — the quality spine',
    icon: ClipboardCheck,
    path: '/quality/dashboard',
    status: 'active',
  },
  {
    name: 'Administration',
    description: 'Users, roles, audit trail, system health, governance and privacy across every module',
    icon: ShieldCheck,
    path: '/admin/dashboard',
    status: 'active',
  },
];

/** Maps a card to the registry key the Administration module toggles. */
const MODULE_KEY_BY_NAME: Record<string, ModuleKey> = {
  Procurement: 'procurement',
  Warehouse: 'warehouse',
  'Research & Development': 'rd',
  Processing: 'processing',
  'Production Planning': 'production',
  Laboratory: 'lab',
  Quality: 'quality',
  Administration: 'admin',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function ModuleSelection() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { token } = useBackendSession();
  const [pulse, setPulse] = useState<{ critical: number; high: number; expiring: number; short: number } | null>(null);

  // Live AI pulse for the hero: the same deterministic scores the AI Center
  // shows, so the numbers on the home page always match the drill-down.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([fetchAiLabRisk(token), fetchAiForecasts(token)])
      .then(([risk, forecast]) => {
        if (cancelled) return;
        setPulse({
          critical: risk.summary.critical,
          high: risk.summary.high,
          expiring: forecast.expiring.length,
          short: forecast.crops.filter((c) => c.status === 'shortage' || c.status === 'tight').length,
        });
      })
      .catch(() => {
        /* The hero simply omits the pulse if the AI endpoints fail. */
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Two filters, for two different reasons. Module visibility is an
  // administrator's choice (Administration → Module registry). The
  // Administration card itself is additionally hidden from anyone without an
  // admin role, since a Purchase Executive clicking it would only ever land
  // on the "no pages for this role" placeholder.
  const adminSettings = readAdminSettings();
  const visibleModules = modules.filter((mod) => {
    const key = MODULE_KEY_BY_NAME[mod.name];
    if (key && !isModuleEnabled(key, adminSettings)) return false;
    if (mod.name === 'Administration') {
      return Boolean(user && hasPermission(user.role, 'view_admin_dashboard'));
    }
    return true;
  });

  function handleCardClick(mod: ModuleCardData) {
    if (mod.status === 'active' && mod.path) {
      navigate(mod.path);
    } else if (mod.status === 'coming-soon') {
      addToast(`${mod.name} module is coming soon.`, 'warning');
    }
  }

  return (
    <div className={styles.root}>
      <TopHeader />
      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>SeedSphere · Seed lifecycle platform</span>
            <h1 className={styles.greeting}>
              {getGreeting()}, {user?.name ?? 'there'}
            </h1>
            <p className={styles.subtitle}>
              Variety registration → production → inspection → processing → certification → traceability, in one connected system.
            </p>
            <button type="button" className={styles.heroCta} onClick={() => navigate('/ai')}>
              <Sparkles size={16} /> Open AI Center
            </button>
          </div>
          <div className={styles.pulse} aria-label="Today's AI pulse">
            <div className={styles.pulseTitle}>
              <Sparkles size={14} /> Today&apos;s AI pulse
            </div>
            <button type="button" className={styles.pulseItem} onClick={() => navigate('/ai?tab=risk')}>
              <AlertTriangle size={18} className={styles.pulseIconDanger} />
              <span className={styles.pulseValue}>{pulse ? pulse.critical + pulse.high : '–'}</span>
              <span className={styles.pulseLabel}>seed lots at high or critical quality risk</span>
            </button>
            <button type="button" className={styles.pulseItem} onClick={() => navigate('/ai?tab=forecast')}>
              <CalendarClock size={18} className={styles.pulseIconWarn} />
              <span className={styles.pulseValue}>{pulse ? pulse.expiring : '–'}</span>
              <span className={styles.pulseLabel}>lots reaching label validity in 90 days</span>
            </button>
            <button type="button" className={styles.pulseItem} onClick={() => navigate('/ai?tab=forecast')}>
              <PackageSearch size={18} className={styles.pulseIconInfo} />
              <span className={styles.pulseValue}>{pulse ? pulse.short : '–'}</span>
              <span className={styles.pulseLabel}>crops with short or tight stock cover</span>
            </button>
          </div>
        </section>

        <h2 className={styles.sectionTitle}>Modules</h2>
        <div className={styles.grid}>
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const isActive = mod.status === 'active';
            return (
              <div
                key={mod.name}
                className={[
                  styles.moduleCard,
                  isActive ? styles.moduleCardActive : styles.moduleCardDisabled,
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleCardClick(mod)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleCardClick(mod);
                }}
                aria-disabled={!isActive}
                style={!isActive ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                <div className={styles.iconWrap}>
                  <Icon size={26} />
                </div>
                <div className={styles.moduleName}>{mod.name} module</div>
                <p className={styles.moduleDesc}>{mod.description}</p>
                <div className={styles.cardFooter}>
                  <Badge variant={mod.status === 'active' ? 'success' : 'warning'}>
                    {mod.status === 'active' ? 'Active' : 'Coming soon'}
                  </Badge>
                  {isActive && (
                    <span className={styles.openLink}>
                      Open module <ArrowRight size={14} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
