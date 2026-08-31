import { useState, useEffect, useMemo } from 'react';
import { Clock, Check } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { DispatchOrder, DispatchLineItem } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './PickingListModal.module.css';

interface PickingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: DispatchOrder | null;
}

function getZoneFromLocation(loc: string): string {
  const m = loc.match(/^([A-Z]+)/);
  return m?.[1] ?? 'ZZZ';
}

export function PickingListModal({ isOpen, onClose, order }: PickingListModalProps) {
  const [pickedMap, setPickedMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen && order) {
      const initial: Record<string, number> = {};
      order.lineItems.forEach((li) => { initial[li.sku] = li.pickedQty; });
      setPickedMap(initial);
    }
  }, [isOpen, order]);

  const sequenced = useMemo(() => {
    if (!order) return [];
    return [...order.lineItems].sort((a, b) => {
      const za = getZoneFromLocation(a.pickFrom);
      const zb = getZoneFromLocation(b.pickFrom);
      if (za !== zb) return za.localeCompare(zb);
      return a.pickFrom.localeCompare(b.pickFrom);
    });
  }, [order]);

  if (!order) return null;

  const totalLines = order.lineItems.length;
  const totalPicked = Object.values(pickedMap).filter((v, i) => v >= sequenced[i]?.orderedQty).length;
  const allPicked = sequenced.every((li) => (pickedMap[li.sku] ?? 0) >= li.orderedQty);

  const setPicked = (sku: string, qty: number) => {
    setPickedMap((m) => ({ ...m, [sku]: Math.max(0, qty) }));
  };

  const markPicked = (li: DispatchLineItem) => {
    setPickedMap((m) => ({ ...m, [li.sku]: li.orderedQty }));
  };

  const completePicking = () => {
    console.log('complete picking', order.id, pickedMap);
    onClose();
  };

  const saveProgress = () => {
    console.log('save picking progress', order.id, pickedMap);
    onClose();
  };

  const zonesCount = new Set(sequenced.map((li) => getZoneFromLocation(li.pickFrom))).size;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Picking list — ${order.id}`} size="xl">
      <div className={styles.headerCard}>
        <div>
          <div className={styles.consigneeName}>{order.consignee.name}</div>
          <div className={styles.headerMeta}>{order.consignee.city}, {order.consignee.state} · expected {order.expectedDispatchDate}</div>
        </div>
        <span className={styles.statusChip}>{order.status}</span>
      </div>

      <div className={styles.strategyBanner}>
        <strong>{order.pickingStrategy} picking</strong> · {totalLines} items across {zonesCount} {zonesCount === 1 ? 'zone' : 'zones'} · sequenced by optimal walking path.
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Seq</th>
              <th>Item</th>
              <th>Batch (FEFO)</th>
              <th>Pick from</th>
              <th className={styles.alignRight}>Ordered</th>
              <th>Picked</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sequenced.map((li, idx) => {
              const picked = pickedMap[li.sku] ?? 0;
              const isDone = picked >= li.orderedQty;
              return (
                <tr key={li.sku} className={`${styles.row} ${isDone ? styles.rowDone : ''}`}>
                  <td>
                    <span className={`${styles.seqCircle} ${isDone ? styles.seqDone : ''}`}>
                      {isDone ? <Check size={12} strokeWidth={3} /> : idx + 1}
                    </span>
                  </td>
                  <td>
                    <div className={styles.itemName}>{li.itemName}</div>
                    <div className={styles.itemSku}>{li.sku}</div>
                  </td>
                  <td>
                    <div className={styles.batchCell}>
                      <span className={styles.batchValue}>{li.batch}</span>
                      <span className={styles.batchHint}><Clock size={11} /> First-expiry first</span>
                    </div>
                  </td>
                  <td className={styles.mono}>{li.pickFrom}</td>
                  <td className={`${styles.alignRight} ${styles.bold}`}>{formatIndianNumber(li.orderedQty)} {li.uom}</td>
                  <td>
                    <input
                      type="number"
                      className={styles.qtyInput}
                      value={picked || ''}
                      onChange={(e) => setPicked(li.sku, parseInt(e.target.value, 10) || 0)}
                      min={0}
                      max={li.orderedQty}
                    />
                  </td>
                  <td>
                    <Button
                      variant={isDone ? 'ghost' : 'primary'}
                      size="sm"
                      leftIcon={Check}
                      onClick={() => markPicked(li)}
                      disabled={isDone}
                    >
                      {isDone ? 'Picked' : 'Pick'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <span className={styles.progress}>
          <strong>{totalPicked}</strong> of {totalLines} items picked
        </span>
        <div className={styles.footerActions}>
          <Button variant="ghost" size="sm" onClick={saveProgress}>Save progress</Button>
          <Button variant="primary" size="sm" onClick={completePicking} disabled={!allPicked}>
            Complete picking
          </Button>
        </div>
      </div>
    </Modal>
  );
}
