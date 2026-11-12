import { Check, X } from 'lucide-react';
import type { PendingApproval } from '@/types/procurement';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './PendingApprovalsList.module.css';

import { decideApproval, useApprovals } from '../procurementStore';
import type { Approval } from '@/types/procurement';
import { useToast } from '@/components/common/Toast';
interface PendingApprovalsListProps {
  data: PendingApproval[];
}

export function PendingApprovalsList({ data: sample }: PendingApprovalsListProps) {
  const [approvals] = useApprovals();
  const { addToast } = useToast();
  // Live queue (same as the Approvals page); the sample list only shows if the queue was never loaded.
  const data: (PendingApproval & { live?: Approval })[] = approvals.length
    ? approvals.slice(0, 5).map((a) => ({ id: a.id, type: a.type, title: a.title, amount: a.amount, submittedBy: a.submittedBy.name, timeAgo: a.submittedAt, live: a }) as unknown as PendingApproval & { live?: Approval })
    : sample;
  const decide = (item: PendingApproval & { live?: Approval }, d: 'approve' | 'reject') => {
    if (!item.live) return;
    decideApproval(item.live, d);
    addToast(`${item.live.referenceId} ${d === 'approve' ? 'approved' : 'rejected'}`, d === 'approve' ? 'success' : 'error');
  };
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
                  onClick={() => decide(item, 'approve')}
                >
                  <Check size={13} />
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionReject}`}
                  aria-label={`Reject: ${item.title}`}
                  onClick={() => decide(item, 'reject')}
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
