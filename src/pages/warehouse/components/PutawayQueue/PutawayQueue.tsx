import { ChevronRight, User, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import type { PutawayTask, PutawayPriority } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './PutawayQueue.module.css';

import { usePermission } from '@/hooks/usePermission';

interface PutawayQueueProps {
  tasks: PutawayTask[];
  onAction: (task: PutawayTask) => void;
}

const PRIORITY_RANK: Record<PutawayPriority, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

function priorityClass(p: PutawayPriority): string {
  switch (p) {
    case 'Urgent': return styles.prioUrgent;
    case 'High':   return styles.prioHigh;
    case 'Medium': return styles.prioMedium;
    case 'Low':    return styles.prioLow;
  }
}

function statusClass(s: PutawayTask['status']): string {
  switch (s) {
    case 'Pending':     return styles.statusPending;
    case 'In Progress': return styles.statusInProgress;
    case 'Completed':   return styles.statusCompleted;
  }
}

export function PutawayQueue({ tasks, onAction }: PutawayQueueProps) {
  const canAssignLocation = usePermission('assign_storage_location');
  const sorted = [...tasks].sort((a, b) => {
    const pdiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pdiff !== 0) return pdiff;
    return a.createdAt.localeCompare(b.createdAt);
  });

  if (sorted.length === 0) {
    return <div className={styles.empty}>No putaway tasks match your filters.</div>;
  }

  return (
    <div className={styles.list}>
      {sorted.map((task) => {
        const isCompleted = task.status === 'Completed';
        const fullSuggested = `${task.suggestedLocation.zone} / ${task.suggestedLocation.rack} / ${task.suggestedLocation.shelf} / ${task.suggestedLocation.bin}`;
        const actionLabel = task.status === 'Pending' ? 'Start putaway' : 'Confirm completion';

        return (
          <div key={task.id} className={styles.card}>
            <div className={styles.topRow}>
              <div className={styles.topLeft}>
                <span className={`${styles.priorityDot} ${priorityClass(task.priority)}`} aria-hidden="true" />
                <span className={styles.taskId}>{task.id}</span>
                <span className={`${styles.statusChip} ${statusClass(task.status)}`}>{task.status}</span>
              </div>
              <span className={`${styles.priorityLabel} ${priorityClass(task.priority)}`}>
                {task.priority}
              </span>
            </div>

            <h4 className={styles.itemName}>{task.itemName}</h4>
            <div className={styles.itemMeta}>
              <span className={styles.mono}>{task.sku}</span>
              <span className={styles.metaSep}>·</span>
              <span className={styles.qty}>{formatIndianNumber(task.quantity)} {task.uom}</span>
              <span className={styles.metaSep}>·</span>
              <span>GRN {task.grnReference}</span>
            </div>

            <div className={styles.routeBox}>
              <div className={styles.routeCol}>
                <span className={styles.routeLabel}>From</span>
                <span className={styles.routeValue}>{task.fromLocation}</span>
              </div>
              <ChevronRight size={18} className={styles.routeArrow} />
              <div className={styles.routeCol}>
                <span className={styles.routeLabel}>Suggested location</span>
                <span className={`${styles.routeValue} ${styles.routeSuggested}`}>{fullSuggested}</span>
              </div>
            </div>

            {task.reasoning && (
              <div className={styles.reasoning}>
                <Sparkles size={12} />
                <span><em>{task.reasoning}</em></span>
              </div>
            )}

            <div className={styles.footer}>
              <div className={styles.footerLeft}>
                {task.assignedTo && (
                  <span className={styles.assignee}>
                    <User size={12} /> {task.assignedTo}
                  </span>
                )}
                <span className={styles.timestamp}>{task.createdAt}</span>
              </div>
              {isCompleted ? (
                <span className={styles.completedNote}>Completed {task.completedAt}</span>
              ) : (
                canAssignLocation && (
                  <Button variant="primary" size="sm" rightIcon={ArrowRight} onClick={() => onAction(task)}>
                    {actionLabel}
                  </Button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
