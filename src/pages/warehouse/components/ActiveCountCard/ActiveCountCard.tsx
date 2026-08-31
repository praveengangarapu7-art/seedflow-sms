import { Users, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import type { CycleCount, CountStatus } from '@/types/warehouse';
import { formatRupees } from '@/utils/formatters';
import styles from './ActiveCountCard.module.css';

interface ActiveCountCardProps {
  count: CycleCount;
  onAction: (count: CycleCount) => void;
}

function statusClass(s: CountStatus): string {
  switch (s) {
    case 'Scheduled':         return styles.stScheduled;
    case 'In progress':       return styles.stInProgress;
    case 'Pending review':    return styles.stPendingReview;
    case 'Variance approval': return styles.stVarApproval;
    case 'Completed':         return styles.stCompleted;
    case 'Cancelled':         return styles.stCancelled;
  }
}

function actionLabel(s: CountStatus): string {
  switch (s) {
    case 'In progress':       return 'Continue counting';
    case 'Pending review':    return 'Review variances';
    case 'Variance approval': return 'Approve & post';
    case 'Scheduled':         return 'Start count';
    default:                  return 'Open count';
  }
}

import { usePermission } from '@/hooks/usePermission';

export function ActiveCountCard({ count, onAction }: ActiveCountCardProps) {
  const canExecute = usePermission('execute_cycle_count');
  const canApprove = usePermission('approve_cycle_count');
  const progress = count.totalLines === 0 ? 0 : Math.round((count.countedLines / count.totalLines) * 100);
  const varianceClass = count.totalVarianceValue < 0 ? styles.negText : count.totalVarianceValue > 0 ? styles.posText : '';

  const isExecution = count.status === 'Scheduled' || count.status === 'In progress';
  const isApproval = count.status === 'Pending review' || count.status === 'Variance approval';
  const showAction = (isExecution && canExecute) || (isApproval && canApprove);

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <span className={styles.id}>{count.id}</span>
          <span className={`${styles.statusChip} ${statusClass(count.status)}`}>{count.status}</span>
          <span className={styles.frequencyChip}>{count.frequency}</span>
        </div>
      </div>

      <h4 className={styles.name}>{count.name}</h4>

      <div className={styles.progressSection}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.progressMeta}>
          <span><strong>{count.countedLines}</strong> of <strong>{count.totalLines}</strong> lines counted</span>
          <span className={styles.dot}>·</span>
          <span><strong>{count.variancesFound}</strong> variances found</span>
          {count.variancesFound > 0 && (
            <span className={`${styles.varChip} ${varianceClass}`}>
              {count.totalVarianceValue > 0 ? '+' : ''}{formatRupees(count.totalVarianceValue)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.bodyCol}>
          <span className={styles.label}>Strategy</span>
          <span className={styles.value}>{count.strategy} · {count.zonesScope.join(', ')}</span>
        </div>
        <div className={styles.bodyCol}>
          <span className={styles.label}>Counters</span>
          <span className={styles.counters}>
            <Users size={12} /> {count.assignedCounters.join(', ')}
          </span>
          {count.startedAt && (
            <span className={styles.startedAt}>
              <Calendar size={11} /> Started {count.startedAt}
            </span>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        {showAction && (
          <Button variant="primary" size="sm" rightIcon={ArrowRight} onClick={() => onAction(count)}>
            {actionLabel(count.status)}
          </Button>
        )}
      </div>
    </div>
  );
}
