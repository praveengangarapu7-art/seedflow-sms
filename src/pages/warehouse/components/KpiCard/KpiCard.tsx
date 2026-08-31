import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import styles from './KpiCard.module.css';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend: { direction: 'up' | 'down'; percentage: string; isPositive: boolean };
  comparison: string;
  className?: string;
}

export function KpiCard({ label, value, icon: Icon, trend, comparison, className = '' }: KpiCardProps) {
  const TrendIcon = trend.direction === 'up' ? TrendingUp : TrendingDown;
  const trendClass = trend.isPositive ? styles.trendPositive : styles.trendNegative;

  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.topRow}>
        <div className={styles.iconBadge} aria-hidden="true">
          <Icon size={20} />
        </div>
        <div className={`${styles.trendPill} ${trendClass}`}>
          <TrendIcon size={11} />
          {trend.percentage}
        </div>
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      <div className={styles.comparison}>{comparison}</div>
    </div>
  );
}
