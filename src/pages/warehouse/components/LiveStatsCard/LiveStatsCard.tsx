import React from 'react';
import { LucideIcon } from 'lucide-react';
import { LiveDot } from '../LiveDot/LiveDot';
import styles from './LiveStatsCard.module.css';

interface LiveStatsCardProps {
  label: string;
  value: string;
  sublabel: string;
  icon: LucideIcon;
  trend?: 'success' | 'warning' | 'danger' | 'neutral';
}

export const LiveStatsCard: React.FC<LiveStatsCardProps> = ({
  label,
  value,
  sublabel,
  icon: Icon,
  trend = 'neutral'
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <LiveDot />
      </div>
      <div className={styles.content}>
        <div className={`${styles.iconWrapper} ${styles[trend]}`}>
          <Icon size={20} />
        </div>
        <div className={styles.info}>
          <div className={styles.value}>{value}</div>
          <div className={`${styles.sublabel} ${styles[trend + 'Text']}`}>{sublabel}</div>
        </div>
      </div>
    </div>
  );
};
