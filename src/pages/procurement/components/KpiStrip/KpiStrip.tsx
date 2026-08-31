import type { LucideIcon } from 'lucide-react';
import styles from './KpiStrip.module.css';

export interface KpiStripItem {
  label: string;
  value: string;
  icon: LucideIcon;
}

interface KpiStripProps {
  items: KpiStripItem[];
}

export function KpiStrip({ items }: KpiStripProps) {
  return (
    <div className={styles.grid}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={styles.card}>
            <div className={styles.iconBadge} aria-hidden="true">
              <Icon size={18} />
            </div>
            <div className={styles.text}>
              <span className={styles.value}>{item.value}</span>
              <span className={styles.label}>{item.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
