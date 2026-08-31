import React from 'react';
import { AlertCircle, Clock, User } from 'lucide-react';
import { Badge } from '@/components/common/Badge/Badge';
import { Button } from '@/components/common/Button/Button';
import { MaintenanceTask } from '@/types/warehouse';
import styles from './MaintenanceTaskCard.module.css';

interface MaintenanceTaskCardProps {
  task: MaintenanceTask;
  onAction: (id: string, action: string) => void;
}

export const MaintenanceTaskCard: React.FC<MaintenanceTaskCardProps> = ({ task, onAction }) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.typePriority}>
          <Badge variant="neutral">{task.taskType}</Badge>
          <Badge variant={
            task.priority === 'Critical' ? 'danger' : 
            task.priority === 'High' ? 'warning' : 'info'
          }>{task.priority}</Badge>
        </div>
        <Badge variant={
          task.status === 'Completed' ? 'success' : 
          task.status === 'Overdue' ? 'danger' : 'warning'
        }>{task.status}</Badge>
      </div>

      <div className={styles.body}>
        <h4 className={styles.assetName}>{task.asset}</h4>
        <span className={styles.zone}>{task.zone}</span>
        <p className={styles.desc}>{task.description}</p>
        
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <Clock size={12} />
            <span>{task.scheduledDate} ({task.estimatedDurationHours}h)</span>
          </div>
          <div className={styles.metaItem}>
            <User size={12} />
            <span>{task.assignedTo}</span>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        {task.triggeredByAlert && (
          <div className={styles.alertTrigger}>
            <AlertCircle size={12} />
            <span>Triggered by alert {task.triggeredByAlert}</span>
          </div>
        )}
        <div className={styles.actions}>
          {task.status !== 'Completed' && (
            <Button variant="secondary" onClick={() => onAction(task.id, 'complete')}>Mark complete</Button>
          )}
          <Button variant="secondary" onClick={() => onAction(task.id, 'reschedule')}>Reschedule</Button>
        </div>
      </div>
    </div>
  );
};
