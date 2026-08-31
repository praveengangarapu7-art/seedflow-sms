import React from 'react';
import { Thermometer, Droplets, Wind, Info } from 'lucide-react';
import { Badge } from '@/components/common/Badge/Badge';
import { LiveDot } from '../LiveDot/LiveDot';
import { SensorGauge } from '../SensorGauge/SensorGauge';
import { IoTReading } from '@/types/warehouse';
import styles from './ZoneMonitoringCard.module.css';

interface ZoneMonitoringCardProps {
  zoneName: string;
  zoneType: 'Cold' | 'Controlled' | 'Quarantine';
  readings: IoTReading;
  sensorCount: number;
  lastUpdated: string;
  history: number[]; // Temperature history for sparkline
  onClick: () => void;
}

export const ZoneMonitoringCard: React.FC<ZoneMonitoringCardProps> = ({
  zoneName,
  zoneType,
  readings,
  sensorCount,
  lastUpdated,
  history,
  onClick
}) => {
  const isAlert = readings.temperature && (readings.temperature > 18 || readings.temperature < 14);

  // Sparkline calculation
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min;
  const points = history.map((val, i) => {
    const x = (i / (history.length - 1)) * 100;
    const y = 30 - ((val - min) / (range || 1)) * 25;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h3 className={styles.zoneName}>{zoneName}</h3>
          <Badge variant={zoneType === 'Cold' ? 'info' : zoneType === 'Controlled' ? 'active' : 'warning'}>
            {zoneType}
          </Badge>
        </div>
        <LiveDot />
      </div>

      <div className={styles.gauges}>
        {readings.temperature !== undefined && (
          <SensorGauge 
            label="Temp" 
            value={readings.temperature} 
            unit="°C" 
            min={14} 
            max={18} 
            icon={Thermometer} 
          />
        )}
        {readings.humidity !== undefined && (
          <SensorGauge 
            label="Humidity" 
            value={readings.humidity} 
            unit="%" 
            min={50} 
            max={60} 
            icon={Droplets} 
          />
        )}
        {readings.co2 !== undefined && (
          <SensorGauge 
            label="CO2" 
            value={readings.co2} 
            unit="ppm" 
            min={400} 
            max={1000} 
            icon={Wind} 
          />
        )}
      </div>

      <div className={`${styles.statusRow} ${isAlert ? styles.alertStatus : styles.normalStatus}`}>
        {isAlert ? (
          <><Info size={14} /> <span>Temperature elevated ⚠</span></>
        ) : (
          <span>All within range ✓</span>
        )}
      </div>

      <div className={styles.sparkline}>
        <svg viewBox="0 0 100 30" preserveAspectRatio="none">
          {/* Threshold lines */}
          <line x1="0" y1="10" x2="100" y2="10" className={styles.thresholdLine} strokeDasharray="2,2" />
          <line x1="0" y1="25" x2="100" y2="25" className={styles.thresholdLine} strokeDasharray="2,2" />
          <polyline
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1"
            points={points}
          />
        </svg>
      </div>

      <div className={styles.footer}>
        <span className={styles.lastUpdated}>Last updated: {lastUpdated}</span>
        <Badge variant="neutral">{sensorCount} sensors active</Badge>
      </div>
    </div>
  );
};
