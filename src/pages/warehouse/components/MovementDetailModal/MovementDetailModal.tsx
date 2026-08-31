import { Modal } from '@/components/common/Modal/Modal';
import { Camera, Check, X, Clock } from 'lucide-react';
import type { MovementRecord, MovementCategory, MovementStatus } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './MovementDetailModal.module.css';

interface MovementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MovementRecord | null;
}

function statusClass(s: MovementStatus): string {
  switch (s) {
    case 'Pending approval': return styles.stPending;
    case 'Approved':         return styles.stApproved;
    case 'In transit':       return styles.stInTransit;
    case 'Completed':        return styles.stCompleted;
    case 'Rejected':         return styles.stRejected;
  }
}

function categoryClass(c: MovementCategory): string {
  switch (c) {
    case 'Transfer':       return styles.catTransfer;
    case 'Adjustment':     return styles.catAdjustment;
    case 'Return':         return styles.catReturn;
    case 'Material issue': return styles.catMaterial;
  }
}

export function MovementDetailModal({ isOpen, onClose, record }: MovementDetailModalProps) {
  if (!record) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Movement ${record.id}`} size="lg">
      <div className={styles.headerCard}>
        <div>
          <span className={`${styles.categoryChip} ${categoryClass(record.category)}`}>{record.category} · {record.subType}</span>
          <h3 className={styles.itemName}>{record.itemName}</h3>
        </div>
        <span className={`${styles.statusChip} ${statusClass(record.status)}`}>{record.status}</span>
      </div>

      <div className={styles.summaryCard}>
        <h4 className={styles.summaryTitle}>Summary</h4>
        <div className={styles.grid2}>
          <div className={styles.kvRow}><span>SKU</span><strong className={styles.mono}>{record.sku}</strong></div>
          <div className={styles.kvRow}><span>Batch</span><strong className={styles.mono}>{record.batch}</strong></div>
          <div className={styles.kvRow}><span>Quantity</span><strong>{record.quantity > 0 ? '+' : ''}{formatIndianNumber(record.quantity)} {record.uom}</strong></div>
          <div className={styles.kvRow}><span>Reference</span><strong className={styles.mono}>{record.reference ?? '—'}</strong></div>
          {record.fromLocation && <div className={styles.kvRow}><span>From</span><strong>{record.fromLocation}</strong></div>}
          {record.toLocation && <div className={styles.kvRow}><span>To</span><strong>{record.toLocation}</strong></div>}
          <div className={styles.kvRow}><span>Initiated by</span><strong>{record.initiatedBy}</strong></div>
          <div className={styles.kvRow}><span>Initiated at</span><strong>{record.initiatedAt}</strong></div>
          {record.completedAt && <div className={styles.kvRow}><span>Completed at</span><strong>{record.completedAt}</strong></div>}
        </div>
      </div>

      {(record.reason || record.reasonNotes || record.hasPhotoEvidence) && (
        <div className={styles.summaryCard}>
          <h4 className={styles.summaryTitle}>Reason & evidence</h4>
          {record.reason && <div className={styles.kvRow}><span>Reason code</span><strong>{record.reason}</strong></div>}
          {record.reasonNotes && <p className={styles.notes}>{record.reasonNotes}</p>}
          {record.hasPhotoEvidence && (
            <div className={styles.photoEvidence}>
              <Camera size={14} /> 3 photos attached
              <span className={styles.photoNote}>Click to view in full screen.</span>
            </div>
          )}
        </div>
      )}

      {record.approvalChain && record.approvalChain.length > 0 && (
        <div className={styles.summaryCard}>
          <h4 className={styles.summaryTitle}>Approval chain</h4>
          <ol className={styles.approvalList}>
            {record.approvalChain.map((step, idx) => {
              const Icon = step.status === 'approved' ? Check : step.status === 'rejected' ? X : Clock;
              const stepClass =
                step.status === 'approved' ? styles.stepApproved :
                step.status === 'rejected' ? styles.stepRejected :
                styles.stepPending;
              return (
                <li key={idx} className={`${styles.approvalStep} ${stepClass}`}>
                  <span className={styles.stepBadge}><Icon size={12} strokeWidth={3} /></span>
                  <div className={styles.stepBody}>
                    <div className={styles.stepHeader}>
                      <span className={styles.stepName}>{step.approver}</span>
                      <span className={styles.stepRole}>{step.role}</span>
                    </div>
                    {step.timestamp && <div className={styles.stepTime}>{step.timestamp}</div>}
                    {step.comment && <div className={styles.stepComment}>{step.comment}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className={styles.summaryCard}>
        <h4 className={styles.summaryTitle}>Activity log</h4>
        <ul className={styles.activityList}>
          <li className={styles.activityRow}>
            <span className={styles.activityTime}>{record.initiatedAt}</span>
            <span><strong>{record.initiatedBy}</strong> initiated movement</span>
          </li>
          {record.approvalChain?.filter((s) => s.status !== 'pending').map((s, i) => (
            <li key={i} className={styles.activityRow}>
              <span className={styles.activityTime}>{s.timestamp ?? '—'}</span>
              <span><strong>{s.approver}</strong> {s.status} the movement</span>
            </li>
          ))}
          {record.completedAt && (
            <li className={styles.activityRow}>
              <span className={styles.activityTime}>{record.completedAt}</span>
              <span>Movement marked <strong>{record.status}</strong></span>
            </li>
          )}
        </ul>
      </div>
    </Modal>
  );
}
