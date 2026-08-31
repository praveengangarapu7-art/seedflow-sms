import { Check, X } from 'lucide-react';
import type { PendingApproval } from '@/types/procurement';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './PendingApprovalsList.module.css';

interface PendingApprovalsListProps {
  data: PendingApproval[];
}

export function PendingApprovalsList({ data }: PendingApprovalsListProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.title}>Pending approvals</h3>
        <span className={styles.countBadge} aria-label={`${data.length} pending`}>
          {data.length}
        </span>
      </div>

      <div className={styles.list}>
        {data.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.topRow}>
              <span className={styles.typeBadge}>{item.type}</span>
              <span className={styles.amount}>₹{formatIndianNumber(item.amount)}</span>
            </div>

            <div className={styles.itemTitle}>{item.title}</div>

            <div className={styles.bottomRow}>
              <span className={styles.meta}>
                Submitted by {item.submittedBy} · {item.timeAgo}
              </span>
              <div className={styles.actions}>
                <button
                  className={`${styles.actionBtn} ${styles.actionApprove}`}
                  aria-label={`Approve: ${item.title}`}
                  onClick={() => console.log('approve', item.id)}
                >
                  <Check size={13} />
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionReject}`}
                  aria-label={`Reject: ${item.title}`}
                  onClick={() => console.log('reject', item.id)}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
