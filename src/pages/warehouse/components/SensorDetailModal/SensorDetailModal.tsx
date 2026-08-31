import React from 'react';
import { 
  Thermometer, 
  Battery, 
  Signal, 
  Calendar, 
  Cpu, 
  Tag, 
  RefreshCw, 
  Settings,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { Badge } from '@/components/common/Badge/Badge';
import { LiveDot } from '../LiveDot/LiveDot';
import { IoTSensor } from '@/types/warehouse';
import styles from './SensorDetailModal.module.css';

interface SensorDetailModalProps {
  sensor: IoTSensor | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SensorDetailModal: React.FC<SensorDetailModalProps> = ({
  sensor,
  isOpen,
  onClose
}) => {
  if (!sensor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sensor detail — ${sensor.id}`}
      size="xl"
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.typeBadge}>
            <Thermometer size={18} />
            <span>{sensor.type}</span>
          </div>
          <Badge variant={
            sensor.status === 'Online' ? 'success' : 
            sensor.status === 'Warning' ? 'warning' : 'danger'
          }>{sensor.status}</Badge>
          {sensor.status === 'Online' && <LiveDot />}
        </div>

        <div className={styles.content}>
          <div className={styles.leftCol}>
            <div className={styles.card}>
              <h4 className={styles.cardTitle}>Device information</h4>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label><Cpu size={14} /> Model</label>
                  <span>{sensor.model || 'Standard IoT Node'}</span>
                </div>
                <div className={styles.infoItem}>
                  <label><Tag size={14} /> Zone</label>
                  <span>{sensor.zone}</span>
                </div>
                <div className={styles.infoItem}>
                  <label><Calendar size={14} /> Installed</label>
                  <span>{sensor.installedDate}</span>
                </div>
                <div className={styles.infoItem}>
                  <label><RefreshCw size={14} /> Last calibration</label>
                  <span>{sensor.lastCalibration}</span>
                </div>
                <div className={styles.infoItem}>
                  <label><Battery size={14} /> Battery</label>
                  <span>{sensor.batteryPct}%</span>
                </div>
                <div className={styles.infoItem}>
                  <label><Signal size={14} /> Signal</label>
                  <span>{sensor.signalStrength}%</span>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h4 className={styles.cardTitle}>Reading history (24h)</h4>
              <div className={styles.chartPlaceholder}>
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={styles.sparkline}>
                  <polyline
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="1"
                    points="0,30 10,25 20,28 30,22 40,24 50,20 60,18 70,22 80,15 90,12 100,14"
                  />
                </svg>
              </div>
              <div className={styles.statsRow}>
                <div className={styles.miniStat}>
                  <label>Min</label>
                  <span>14.2{sensor.unit}</span>
                </div>
                <div className={styles.miniStat}>
                  <label>Max</label>
                  <span>17.8{sensor.unit}</span>
                </div>
                <div className={styles.miniStat}>
                  <label>Avg</label>
                  <span>16.1{sensor.unit}</span>
                </div>
                <div className={styles.miniStat}>
                  <label>Current</label>
                  <span className={styles.primaryText}>{sensor.currentValue}{sensor.unit}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.rightCol}>
            <div className={styles.card}>
              <h4 className={styles.cardTitle}>Threshold configuration</h4>
              <div className={styles.configForm}>
                <Input label={`Min threshold (${sensor.unit})`} value={sensor.thresholdMin?.toString()} />
                <Input label={`Max threshold (${sensor.unit})`} value={sensor.thresholdMax?.toString()} />
                <Input label={`Rate of change limit (${sensor.unit}/hr)`} placeholder="e.g. 2" />
                <Button variant="primary" onClick={() => {}}>Save thresholds</Button>
              </div>
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" leftIcon={RefreshCw} onClick={() => {}}>Recalibrate now</Button>
              <Button variant="secondary" leftIcon={Settings} onClick={() => {}}>Advanced settings</Button>
              <Button variant="danger" leftIcon={Trash2} onClick={() => {}}>Disable sensor</Button>
            </div>
            
            <div className={styles.alertNote}>
              <AlertCircle size={14} />
              <span>Threshold changes will trigger notifications for all assigned staff.</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
