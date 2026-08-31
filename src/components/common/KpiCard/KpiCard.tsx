import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import styles from './KpiCard.module.css';

interface KpiCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subValue,
  icon: Icon,
  change,
  trend,
  className = '',
}) => {
  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.header}>
        <div className={styles.iconContainer}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`${styles.trend} ${styles[trend]}`}>
            {trend === 'up' && <TrendingUp size={12} />}
            {trend === 'down' && <TrendingDown size={12} />}
            <span>{change}</span>
          </div>
        )}
      </div>
      <div className={styles.content}>
        <h3 className={styles.value}>{value}</h3>
        {subValue && <p className={styles.subValue}>{subValue}</p>}
        <p className={styles.title}>{title}</p>
      </div>
    </div>
  );
};
