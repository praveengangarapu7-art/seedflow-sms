import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Warehouse,
  FlaskConical,
  Cog,
  TestTube,
  Sprout,
  ArrowRight,
} from 'lucide-react';
import { TopHeader } from '@/components/layout/TopHeader/TopHeader';
import { Badge } from '@/components/common/Badge/Badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/common/Toast/ToastContext';
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
];

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
        <h1 className={styles.greeting}>
          {getGreeting()}, {user?.name ?? 'there'}
        </h1>
        <p className={styles.subtitle}>Seed lifecycle overview: variety registration → production → inspection → processing → certification → traceability</p>

        <div className={styles.grid}>
          {modules.map((mod) => {
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
