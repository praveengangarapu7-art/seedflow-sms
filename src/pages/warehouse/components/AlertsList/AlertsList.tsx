import { AlertCircle, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import type { WarehouseAlert, AlertSeverity } from '@/types/warehouse';
import styles from './AlertsList.module.css';

interface AlertsListProps {
  data: WarehouseAlert[];
  onAlertClick?: (alertId: string) => void;
}

const SEVERITY_ICON: Record<AlertSeverity, LucideIcon> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function AlertsList({ data, onAlertClick }: AlertsListProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.title}>Active alerts</h3>
          <span className={styles.subtitle}>Items needing attention</span>
        </div>
        <span className={styles.countBadge}>{data.length}</span>
      </div>

      <div className={styles.list}>
        {data.map((alert) => {
          const Icon = SEVERITY_ICON[alert.severity];
          const handleClick = () => onAlertClick?.(alert.id);
          const handleKey = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onAlertClick?.(alert.id);
            }
          };
          return (
            <div
              key={alert.id}
              className={styles.item}
              role={onAlertClick ? 'button' : undefined}
              tabIndex={onAlertClick ? 0 : undefined}
              onClick={onAlertClick ? handleClick : undefined}
              onKeyDown={onAlertClick ? handleKey : undefined}
            >
              <div className={`${styles.iconBadge} ${styles[`severity_${alert.severity}`]}`} aria-hidden="true">
                <Icon size={14} />
              </div>
              <div className={styles.body}>
                <div className={styles.topRow}>
                  <span className={styles.alertTitle}>{alert.title}</span>
                  <span className={styles.timeAgo}>{alert.timeAgo}</span>
                </div>
                <p className={styles.description}>{alert.description}</p>
                {alert.location && <span className={styles.locationChip}>{alert.location}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
