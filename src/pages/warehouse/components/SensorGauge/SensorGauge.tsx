import React from 'react';
import { LucideIcon } from 'lucide-react';
import styles from './SensorGauge.module.css';

interface SensorGaugeProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  icon: LucideIcon;
  status?: 'success' | 'warning' | 'danger';
}

export const SensorGauge: React.FC<SensorGaugeProps> = ({
  label,
  value,
  unit,
  min,
  max,
  icon: Icon,
  status = 'success'
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const isOutOfRange = value < min || value > max;
  const displayStatus = isOutOfRange ? (value > max + 5 ? 'danger' : 'warning') : status;

  return (
    <div className={styles.gauge}>
      <div className={styles.labelRow}>
        <div className={styles.iconName}>
          <Icon size={14} className={styles[displayStatus]} />
          <span>{label}</span>
        </div>
      </div>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        <span className={styles.unit}>{unit}</span>
      </div>
      <div className={styles.rangeText}>Range: {min}-{max}{unit}</div>
      <div className={styles.track}>
        <div 
          className={`${styles.marker} ${styles[displayStatus + 'Marker']}`}
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
