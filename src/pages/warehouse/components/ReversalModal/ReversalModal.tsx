import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { StockAdjustment } from '@/types/warehouse';
import styles from './ReversalModal.module.css';

import { adjustStock, nowIso, whUpdate } from '../../warehouseStore';
import { useToast } from '@/components/common/Toast/ToastContext';
interface ReversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: StockAdjustment | null;
}

export function ReversalModal({ isOpen, onClose, adjustment }: ReversalModalProps) {
  const { addToast } = useToast();
  const [reason, setReason] = useState('');
  useEffect(() => { if (isOpen) setReason(''); }, [isOpen]);

  if (!adjustment) return null;

  const canSubmit = reason.trim() !== '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reverse adjustment" size="md">
      <div className={styles.warning}>
        <AlertTriangle size={16} />
        <p>
          Reverse adjustment <strong>{adjustment.id}</strong>?
          A counter-adjustment will be created to restore the original quantity.
          This action cannot be undone.
        </p>
      </div>

      <label className={styles.field}>
        <span>Reversal reason <em className={styles.required}>(required)</em></span>
        <textarea
          className={styles.input}
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this posted adjustment must be reversed..."
        />
      </label>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canSubmit}
          onClick={() => {
            whUpdate('adjustments', adjustment.id, { reversedAt: nowIso(), reversalReason: reason });
            if (adjustment.status === 'Posted') adjustStock(adjustment.itemSku, -adjustment.varianceQty);
            addToast({ type: 'success', message: `${adjustment.id} reversed${adjustment.status === 'Posted' ? '; stock restored' : ''}` });
            onClose();
          }}
        >
          Reverse adjustment
        </Button>
      </div>
    </Modal>
  );
}
