import type { POStatus } from '@/types/procurement';
import styles from './POLifecycleTimeline.module.css';

const PO_STEPS: POStatus[] = ['Draft', 'Sent', 'Acknowledged', 'Partially Received', 'Received', 'Closed'];

function stepIndex(status: POStatus): number {
  return PO_STEPS.indexOf(status);
}

interface POLifecycleTimelineProps {
  status: POStatus;
}

export function POLifecycleTimeline({ status }: POLifecycleTimelineProps) {
  const current = stepIndex(status);

  return (
    <div className={styles.root}>
      <p className={styles.label}>Order lifecycle</p>
      <div className={styles.track}>
        {PO_STEPS.map((step, idx) => {
          const isDone = idx < current;
          const isCurrent = idx === current;

          const circleClass = isDone
            ? styles.circleDone
            : isCurrent
              ? styles.circleCurrent
              : styles.circlePending;

          const labelClass = isDone
            ? `${styles.stepLabel} ${styles.stepLabelDone}`
            : isCurrent
              ? `${styles.stepLabel} ${styles.stepLabelCurrent}`
              : styles.stepLabel;

          return (
            <>
              <div key={step} className={styles.step}>
                <div className={`${styles.circle} ${circleClass}`}>
                  {idx + 1}
                </div>
                <span className={labelClass}>{step}</span>
              </div>
              {idx < PO_STEPS.length - 1 && (
                <div
                  key={`connector-${idx}`}
                  className={`${styles.connector} ${isDone ? styles.connectorDone : styles.connectorPending}`}
                />
              )}
            </>
          );
        })}
      </div>
    </div>
  );
}
