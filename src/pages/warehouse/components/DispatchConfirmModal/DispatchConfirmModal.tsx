import { useState, useEffect } from 'react';
import { Truck, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { DispatchOrder } from '@/types/warehouse';
import { formatIndianCurrency, formatIndianNumber } from '@/utils/formatters';
import styles from './DispatchConfirmModal.module.css';

import { adjustStock, logMovement, nowIso, whUpdate } from '../../warehouseStore';
import { useToast } from '@/components/common/Toast/ToastContext';
interface DispatchConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: DispatchOrder | null;
}

export function DispatchConfirmModal({ isOpen, onClose, order }: DispatchConfirmModalProps) {
  const { addToast } = useToast();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (isOpen) setConfirmed(false);
  }, [isOpen]);

  if (!order) return null;

  const submit = () => {
    whUpdate('dispatch', order.id, { status: 'Dispatched', dispatchedAt: nowIso() });
    order.lineItems.forEach((li) => {
      adjustStock(li.sku, -(li.packedQty || li.pickedQty || li.orderedQty));
      logMovement({ category: 'Material issue', subType: 'Dispatch', itemName: li.itemName, sku: li.sku, batch: li.batch, quantity: li.packedQty || li.pickedQty || li.orderedQty, uom: li.uom, fromLocation: li.pickFrom, toLocation: order.consignee.city, reference: order.id, status: 'Completed', completedAt: nowIso() });
    });
    addToast({ type: 'success', message: `${order.id} dispatched; stock reduced` });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm dispatch" size="md">
      <div className={styles.headerCard}>
        <div className={styles.headerIcon}><Truck size={20} /></div>
        <div>
          <div className={styles.title}>Dispatch {order.id}</div>
          <div className={styles.subtitle}>{order.consignee.name} · {order.consignee.city}</div>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryRow}><span>Vehicle</span><strong>{order.vehicleNumber ?? '—'}</strong></div>
        <div className={styles.summaryRow}><span>Driver</span><strong>{order.driverName ?? '—'}</strong></div>
        <div className={styles.summaryRow}><span>Logistics partner</span><strong>{order.logisticsPartner ?? '—'}</strong></div>
        <div className={styles.summaryRow}><span>Items</span><strong>{order.totalItems}</strong></div>
        <div className={styles.summaryRow}><span>Total quantity</span><strong>{formatIndianNumber(order.totalQuantity)} {order.uom}</strong></div>
        <div className={styles.summaryRow}><span>Total value</span><strong>{formatIndianCurrency(order.totalValue)}</strong></div>
      </div>

      <label className={styles.confirmRow}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>I confirm goods have been loaded and verified.</span>
      </label>

      <div className={styles.noteCard}>
        <CheckCircle2 size={14} className={styles.noteIcon} />
        <p>Confirming will mark the order as <strong>Dispatched</strong>, set the dispatched timestamp, and notify the consignee.</p>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" disabled={!confirmed} onClick={submit}>
          Confirm dispatch
        </Button>
      </div>
    </Modal>
  );
}
