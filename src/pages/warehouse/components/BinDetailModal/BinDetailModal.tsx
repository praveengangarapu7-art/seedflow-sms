import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { ArrowRightLeft, Ban, Printer } from 'lucide-react';
import { useToast } from '@/components/common/Toast/ToastContext';
import type { StorageLocation } from '@/types/warehouse';
import { buildBinCode } from '../../mockData/storageData';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './BinDetailModal.module.css';

import { useNavigate } from 'react-router-dom';
import { queuePrint, whUpdate } from '../../warehouseStore';
interface BinDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bin: StorageLocation | null;
}

function statusClass(s: StorageLocation['status']): string {
  switch (s) {
    case 'Available': return styles.stAvailable;
    case 'Full':      return styles.stFull;
    case 'Reserved':  return styles.stReserved;
    case 'Blocked':   return styles.stBlocked;
  }
}

export function BinDetailModal({ isOpen, onClose, bin }: BinDetailModalProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  if (!bin) return null;

  const code = buildBinCode(bin.zone, bin.rack, bin.shelf, bin.bin);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Bin ${code}`} size="lg">
      <div className={styles.headerCard}>
        <div>
          <div className={styles.binCode}>{code}</div>
          <div className={styles.zoneLine}>{bin.zone} · {bin.warehouse}</div>
        </div>
        <span className={`${styles.statusChip} ${statusClass(bin.status)}`}>{bin.status}</span>
      </div>

      <div className={styles.grid}>
        <div className={styles.detailCard}>
          <h4 className={styles.detailTitle}>Location details</h4>
          <dl className={styles.dl}>
            <div className={styles.dRow}><dt>Warehouse</dt><dd>{bin.warehouse}</dd></div>
            <div className={styles.dRow}><dt>Zone</dt><dd>{bin.zone}</dd></div>
            <div className={styles.dRow}><dt>Rack</dt><dd>{bin.rack}</dd></div>
            <div className={styles.dRow}><dt>Shelf</dt><dd>{bin.shelf}</dd></div>
            <div className={styles.dRow}><dt>Bin</dt><dd>{bin.bin}</dd></div>
            {bin.abcZone && <div className={styles.dRow}><dt>ABC zone</dt><dd>Class {bin.abcZone}</dd></div>}
            <div className={styles.dRow}><dt>Capacity</dt><dd>{formatIndianNumber(bin.capacity)}</dd></div>
            <div className={styles.dRow}><dt>Occupied</dt><dd>{formatIndianNumber(bin.occupied)} ({bin.occupancyPct}%)</dd></div>
          </dl>
        </div>

        <div className={styles.detailCard}>
          <h4 className={styles.detailTitle}>Current contents</h4>
          {bin.currentSku ? (
            <dl className={styles.dl}>
              <div className={styles.dRow}><dt>SKU</dt><dd className={styles.mono}>{bin.currentSku}</dd></div>
              <div className={styles.dRow}><dt>Item</dt><dd>{bin.currentItem}</dd></div>
              <div className={styles.dRow}><dt>Batch</dt><dd className={styles.mono}>{bin.currentBatch ?? '—'}</dd></div>
              <div className={styles.dRow}><dt>Quantity</dt><dd>{formatIndianNumber(bin.occupied)}</dd></div>
              {bin.expiryDate && <div className={styles.dRow}><dt>Expiry</dt><dd>{bin.expiryDate}</dd></div>}
              {bin.lastMovement && <div className={styles.dRow}><dt>Last movement</dt><dd>{bin.lastMovement}</dd></div>}
              {bin.temperature !== undefined && <div className={styles.dRow}><dt>Temperature</dt><dd>{bin.temperature} °C</dd></div>}
              {bin.humidity !== undefined && <div className={styles.dRow}><dt>Humidity</dt><dd>{bin.humidity}% RH</dd></div>}
            </dl>
          ) : (
            <p className={styles.emptyContent}>This bin is currently empty.</p>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" leftIcon={ArrowRightLeft} onClick={() => { onClose(); navigate('/warehouse/movements'); addToast({ type: 'info', message: `Move stock flow started from ${code}` }); }}>Move stock</Button>
        <Button variant="ghost" size="sm" leftIcon={Ban} onClick={() => { whUpdate('bins', bin.id, { status: bin.status === 'Blocked' ? 'Available' : 'Blocked' }); addToast({ type: 'warning', message: `Bin ${code} marked as blocked` }); onClose(); }}>Mark as blocked</Button>
        <Button variant="primary" size="sm" leftIcon={Printer} onClick={() => { queuePrint('Bin', 1); addToast({ type: 'success', message: `Bin label ${code} queued for printing` }); }}>Print bin label</Button>
      </div>
    </Modal>
  );
}
