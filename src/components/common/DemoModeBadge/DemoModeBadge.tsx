import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { isDemoMode, onDemoModeChange } from '@/services/seedLotRealtimeClient';
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
 */
export function DemoModeBadge() {
  const [active, setActive] = useState(isDemoMode());

  useEffect(() => onDemoModeChange(setActive), []);

  if (!active) return null;

  return (
    <div className={styles.badge} title="The backend is not reachable, so SeedSphere is showing a built-in demo dataset. Connect the API to see live records.">
      <Database size={13} />
      Demo data
    </div>
  );
}
