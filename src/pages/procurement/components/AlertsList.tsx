import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import type { Alert, AlertSeverity } from '@/types/procurement';
import styles from './AlertsList.module.css';

const warningCount = (data: Alert[]) =>
  data.filter((a) => a.severity === 'warning' || a.severity === 'critical').length;

function AlertIcon({ severity }: { severity: AlertSeverity }) {
  const iconMap = {
    critical: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  } as const;
  const badgeClass = {
    critical: styles.iconBadgeCritical,
    warning: styles.iconBadgeWarning,
    info: styles.iconBadgeInfo,
  }[severity];
  const Icon = iconMap[severity];
  return (
    <div className={`${styles.iconBadge} ${badgeClass}`} aria-hidden="true">
      <Icon size={16} />
    </div>
  );
}

interface AlertsListProps {
  data: Alert[];
}

export function AlertsList({ data }: AlertsListProps) {
  const warnCount = warningCount(data);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.title}>Active alerts</h3>
        <span
          className={styles.countBadge}
          aria-label={`${warnCount} warnings or critical alerts`}
        >
          {warnCount}
        </span>
      </div>

      <div className={styles.list}>
        {data.map((alert) => (
          <div key={alert.id} className={styles.item}>
            <AlertIcon severity={alert.severity} />
            <div className={styles.content}>
              <div className={styles.alertTitle}>{alert.title}</div>
              <div className={styles.alertDesc}>{alert.description}</div>
            </div>
            <span className={styles.timeAgo}>{alert.timeAgo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
