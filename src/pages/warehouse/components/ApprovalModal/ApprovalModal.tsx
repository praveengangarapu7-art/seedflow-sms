import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { MovementRecord } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './ApprovalModal.module.css';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MovementRecord | null;
  decision: 'approve' | 'reject';
}

export function ApprovalModal({ isOpen, onClose, record, decision }: ApprovalModalProps) {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isOpen) setComment('');
  }, [isOpen]);

  if (!record) return null;

  const isReject = decision === 'reject';
  const canSubmit = !isReject || comment.trim() !== '';

  const submit = () => {
    console.log(`${decision} movement`, record.id, comment);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isReject ? 'Reject movement' : 'Approve movement'} size="md">
      <div className={styles.summaryCard}>
        <div className={styles.summaryRow}><span>Movement ID</span><strong className={styles.mono}>{record.id}</strong></div>
        <div className={styles.summaryRow}><span>Item</span><strong>{record.itemName}</strong></div>
        <div className={styles.summaryRow}><span>Quantity</span><strong>{formatIndianNumber(Math.abs(record.quantity))} {record.uom}</strong></div>
        {record.fromLocation && <div className={styles.summaryRow}><span>From</span><strong>{record.fromLocation}</strong></div>}
        {record.toLocation && <div className={styles.summaryRow}><span>To</span><strong>{record.toLocation}</strong></div>}
        {record.reason && <div className={styles.summaryRow}><span>Reason</span><strong>{record.reason}</strong></div>}
        <div className={styles.summaryRow}><span>Initiated by</span><strong>{record.initiatedBy}</strong></div>
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
          onClick={submit}
          disabled={!canSubmit}
        >
          {isReject ? 'Confirm rejection' : 'Confirm approval'}
        </Button>
      </div>
    </Modal>
  );
}
