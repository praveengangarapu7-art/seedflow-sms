import { TrendingUp, TrendingDown } from 'lucide-react';
import type { KpiData } from '@/types/procurement';
import styles from './KpiCard.module.css';

interface KpiCardProps {
  data: KpiData;
  className?: string;
}

export function KpiCard({ data, className = '' }: KpiCardProps) {
  const { label, value, icon: Icon, trend, comparison } = data;
  const TrendIcon = trend.direction === 'up' ? TrendingUp : TrendingDown;
  const trendClass = trend.isPositive ? styles.trendPositive : styles.trendNegative;
  const trendPrefix = trend.direction === 'up' ? '↑' : '↓';

  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.topRow}>
        <div className={styles.iconBadge} aria-hidden="true">
          <Icon size={20} />
        </div>
        <div className={`${styles.trendPill} ${trendClass}`}>
          <TrendIcon size={11} />
          {trendPrefix} {trend.percentage}
        </div>
      </div>

      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      <div className={styles.comparison}>{comparison}</div>
    </div>
  );
}
