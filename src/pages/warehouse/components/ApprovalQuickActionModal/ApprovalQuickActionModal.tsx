import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { StockAdjustment } from '@/types/warehouse';
import { formatIndianNumber, formatRupees } from '@/utils/formatters';
import styles from './ApprovalQuickActionModal.module.css';

import { adjustStock, nowIso, whUpdate } from '../../warehouseStore';
import { useToast } from '@/components/common/Toast/ToastContext';
interface ApprovalQuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: StockAdjustment | null;
  decision: 'approve' | 'reject';
}

export function ApprovalQuickActionModal({ isOpen, onClose, adjustment, decision }: ApprovalQuickActionModalProps) {
  const { addToast } = useToast();
  const [comment, setComment] = useState('');

  useEffect(() => { if (isOpen) setComment(''); }, [isOpen]);

  if (!adjustment) return null;

  const isReject = decision === 'reject';
  const canSubmit = !isReject || comment.trim() !== '';
  const a = adjustment;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isReject ? 'Reject adjustment' : 'Approve adjustment'} size="md">
      <div className={styles.summaryCard}>
        <div className={styles.summaryRow}><span>Adjustment</span><strong className={styles.mono}>{a.id}</strong></div>
        <div className={styles.summaryRow}><span>Item</span><strong>{a.itemName}</strong></div>
        <div className={styles.summaryRow}>
          <span>Variance</span>
          <strong className={a.varianceQty < 0 ? styles.negText : styles.posText}>
            {a.varianceQty > 0 ? '+' : ''}{formatIndianNumber(a.varianceQty)} {a.uom}
          </strong>
        </div>
        <div className={styles.summaryRow}>
          <span>Variance value</span>
          <strong className={a.varianceValue < 0 ? styles.negText : styles.posText}>
            {a.varianceValue > 0 ? '+' : ''}{formatRupees(a.varianceValue)}
          </strong>
        </div>
        <div className={styles.summaryRow}><span>Reason</span><strong>{a.reason}</strong></div>
      </div>

      <label className={styles.field}>
        <span>Comment {isReject && <em className={styles.required}>(required)</em>}</span>
        <textarea
          className={styles.input}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={isReject ? 'Reason for rejection...' : 'Optional comment...'}
        />
      </label>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          variant={isReject ? 'secondary' : 'primary'}
          size="sm"
          disabled={!canSubmit}
          onClick={() => {
            const ok = decision === 'approve';
            whUpdate('adjustments', a.id, (x) => ({
              ...x,
              status: ok ? 'Posted' : 'Rejected',
              postedAt: ok ? nowIso() : x.postedAt,
              approvalChain: x.approvalChain.map((s) => (s.status === 'pending' ? { ...s, status: ok ? 'approved' : 'rejected', timestamp: nowIso(), comment: comment || undefined } : s)),
            }));
            if (ok) adjustStock(a.itemSku, a.varianceQty);
            addToast({ type: ok ? 'success' : 'warning', message: `${a.id} ${ok ? 'approved and posted' : 'rejected'}` });
            onClose();
          }}
        >
          {isReject ? 'Confirm rejection' : 'Confirm approval'}
        </Button>
      </div>
    </Modal>
  );
}
