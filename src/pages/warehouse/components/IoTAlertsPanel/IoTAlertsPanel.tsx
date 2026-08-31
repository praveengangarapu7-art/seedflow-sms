import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/common/Badge/Badge';
import { Button } from '@/components/common/Button/Button';
import { LiveDot } from '../LiveDot/LiveDot';
import { IoTAlert, IoTAlertSeverity } from '@/types/warehouse';
import styles from './IoTAlertsPanel.module.css';

interface IoTAlertsPanelProps {
  alerts: IoTAlert[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onViewSensor: (sensorId: string) => void;
}

import { usePermission } from '@/hooks/usePermission';

export const IoTAlertsPanel: React.FC<IoTAlertsPanelProps> = ({
  alerts,
  onAcknowledge,
  onResolve,
  onViewSensor
}) => {
  const [filter, setFilter] = useState<IoTAlertSeverity | 'all'>('all');
  const canResolveAlerts = usePermission('resolve_safety_alerts');

  const filteredAlerts = alerts
    .filter(a => filter === 'all' || a.severity === filter)
    .sort((a, b) => {
      const severityMap = { critical: 0, warning: 1, info: 2 };
      if (severityMap[a.severity] !== severityMap[b.severity]) {
        return severityMap[a.severity] - severityMap[b.severity];
      }
      return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
    });

  const getSeverityIcon = (severity: IoTAlertSeverity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className={styles.criticalIcon} size={20} />;
      case 'warning': return <AlertTriangle className={styles.warningIcon} size={20} />;
      case 'info': return <Info className={styles.infoIcon} size={20} />;
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>Active alerts</h3>
          <Badge variant="warning">{alerts.length}</Badge>
          <LiveDot />
        </div>
        <div className={styles.filters}>
          {(['all', 'critical', 'warning', 'info'] as const).map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.activeFilter : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.alertList}>
        {filteredAlerts.length === 0 ? (
          <div className={styles.empty}>
            <CheckCircle size={32} className={styles.successIcon} />
            <p>No active alerts matching filter</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div key={alert.id} className={`${styles.alertRow} ${styles[alert.severity + 'Row']}`}>
              <div className={styles.iconCol}>
                {getSeverityIcon(alert.severity)}
              </div>
              <div className={styles.contentCol}>
                <div className={styles.alertTitle}>
                  {alert.zone} — {alert.metric} {alert.thresholdViolated}
                </div>
                <div className={styles.alertDesc}>
                  Measured: {alert.measuredValue}{alert.unit} · Threshold: {alert.thresholdValue}{alert.unit}
                </div>
                <div className={styles.timeRow}>
                  Triggered {alert.durationMinutes} min ago · Ongoing
                </div>
                <div className={styles.notifRow}>
                  <span className={styles.notifLabel}>Sent:</span>
                  {['SMS', 'Email', 'In-app'].map(channel => (
                    <span 
                      key={channel} 
                      className={`${styles.notifChip} ${alert.notificationsSent.includes(channel as any) ? styles.notifSent : ''}`}
                    >
                      {channel}
                    </span>
                  ))}
                </div>
                {alert.acknowledgedAt ? (
                  <div className={styles.ackInfo}>
                    Acknowledged by {alert.acknowledgedBy} at {new Date(alert.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ) : (
                  <div className={styles.actions}>
                    {canResolveAlerts && <Button variant="ghost" size="sm" onClick={() => onAcknowledge(alert.id)}>Acknowledge</Button>}
                    {canResolveAlerts && <Button variant="ghost" size="sm" onClick={() => onResolve(alert.id)}>Mark resolved</Button>}
                    <Button variant="ghost" size="sm" onClick={() => onViewSensor(alert.sensor)} leftIcon={Eye}>View sensor</Button>
                  </div>
                )}
                {alert.acknowledgedAt && !alert.resolvedAt && (
                  <div className={styles.actions}>
                    {canResolveAlerts && <Button variant="ghost" size="sm" onClick={() => onResolve(alert.id)}>Mark resolved</Button>}
                    <Button variant="ghost" size="sm" onClick={() => onViewSensor(alert.sensor)} leftIcon={Eye}>View sensor</Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
