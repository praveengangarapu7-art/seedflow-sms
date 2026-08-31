import React from 'react';
import { Thermometer, Droplets, Wind, Info, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { SensorGauge } from '../SensorGauge/SensorGauge';
import { SensorsTable } from '../SensorsTable/SensorsTable';
import { IoTReading, IoTSensor, IoTAlert } from '@/types/warehouse';
import styles from './ZoneDetailModal.module.css';

interface ZoneDetailModalProps {
  zoneName: string;
  isOpen: boolean;
  onClose: () => void;
  readings: IoTReading;
  sensors: IoTSensor[];
  alerts: IoTAlert[];
}

export const ZoneDetailModal: React.FC<ZoneDetailModalProps> = ({
  zoneName,
  isOpen,
  onClose,
  readings,
  sensors,
  alerts
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Zone detail — ${zoneName}`}
      size="xl"
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.gauges}>
            {readings.temperature !== undefined && (
              <SensorGauge label="Temp" value={readings.temperature} unit="°C" min={14} max={18} icon={Thermometer} />
            )}
            {readings.humidity !== undefined && (
              <SensorGauge label="Humidity" value={readings.humidity} unit="%" min={50} max={60} icon={Droplets} />
            )}
            {readings.co2 !== undefined && (
              <SensorGauge label="CO2" value={readings.co2} unit="ppm" min={400} max={1000} icon={Wind} />
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Sensors in this zone</h4>
          <SensorsTable sensors={sensors} onRowClick={() => {}} />
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Optimal storage conditions</h4>
            <div className={styles.params}>
              <div className={styles.paramItem}>
                <label>Crop type</label>
                <span>Cotton Hybrid Seeds</span>
              </div>
              <div className={styles.paramItem}>
                <label>Ideal Temperature</label>
                <span>14°C - 18°C</span>
              </div>
              <div className={styles.paramItem}>
                <label>Ideal Humidity</label>
                <span>50% - 60% RH</span>
              </div>
              <div className={styles.paramNote}>
                <Info size={14} />
                <span>Parameters based on industry standards for medium-term storage.</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Recent alerts (7 days)</h4>
            <div className={styles.alertList}>
              {alerts.length === 0 ? (
                <div className={styles.emptyAlerts}>No alerts in the last 7 days</div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className={styles.alertItem}>
                    <AlertTriangle size={14} className={alert.severity === 'critical' ? styles.crit : styles.warn} />
                    <div className={styles.alertInfo}>
                      <div className={styles.alertMsg}>{alert.metric} {alert.thresholdViolated}</div>
                      <div className={styles.alertTime}>{new Date(alert.triggeredAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
