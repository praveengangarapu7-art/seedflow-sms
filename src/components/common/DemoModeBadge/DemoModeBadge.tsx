import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { isDemoMode, onDemoModeChange } from '@/services/seedLotRealtimeClient';
import { readAdminSettings } from '@/services/adminSettings';
import styles from './DemoModeBadge.module.css';

/**
 * The single honest signal that the app is running on the offline demo
 * dataset.
 *
 * The client deliberately shows no error banners when the backend is
 * unreachable — every page renders populated, working demo data instead — so
 * without this badge there would be nothing distinguishing a demo from a real
 * deployment's records. It is intentionally small and neutral rather than an
 * alarm: it informs without looking like a failure during a walkthrough.
 *
 * An administrator can suppress it from Administration → Admin settings (for
 * a screenshot or a demo where the badge is a distraction). That toggle is a
 * per-browser preference and the settings page warns what turning it off
 * costs — nothing else in the app tells you the data isn't live.
 */
export function DemoModeBadge() {
  const [active, setActive] = useState(isDemoMode());

  useEffect(() => onDemoModeChange(setActive), []);

  if (!active) return null;
  if (!readAdminSettings().showDemoBadge) return null;

  return (
    <div className={styles.badge} title="The backend is not reachable, so SeedSphere is showing a built-in demo dataset. Connect the API to see live records.">
      <Database size={13} />
      Demo data
    </div>
  );
}
