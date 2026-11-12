import { useState, useEffect } from 'react';
import { ScanBarcode, FileText, Receipt, FileCheck, Check } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { DispatchOrder } from '@/types/warehouse';
import { formatIndianCurrency, formatIndianNumber } from '@/utils/formatters';
import styles from './PackingValidationModal.module.css';

import { whUpdate, whUser } from '../../warehouseStore';
import { useToast } from '@/components/common/Toast/ToastContext';
interface PackingValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: DispatchOrder | null;
}

interface DocChecklist {
  invoice: boolean;
  challan: boolean;
  eWayBill: boolean;
}

export function PackingValidationModal({ isOpen, onClose, order }: PackingValidationModalProps) {
  const { addToast } = useToast();
  const [scanInput, setScanInput] = useState('');
  const [scannedSet, setScannedSet] = useState<Set<string>>(new Set());
  const [docs, setDocs] = useState<DocChecklist>({ invoice: false, challan: false, eWayBill: false });
  const [boxes, setBoxes] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      setScannedSet(new Set());
      setDocs({
        invoice: !!order.documents.invoice,
        challan: !!order.documents.deliveryChallan,
        eWayBill: !!order.documents.eWayBill,
      });
      setScanInput('');
      const totalWeightKg = order.lineItems.reduce((s, l) => s + l.orderedQty * (l.uom === 'bags' ? 25 : l.uom === 'drums' ? 12 : 0.05), 0);
      setBoxes(String(Math.max(1, Math.ceil(order.totalQuantity / 50))));
      setWeight(String(Math.round(totalWeightKg)));
      setNotes('');
    }
  }, [isOpen, order]);

  if (!order) return null;

  const handleScan = () => {
    if (!scanInput.trim()) return;
    const s = scanInput.trim().toUpperCase();
    const matchingItem = order.lineItems.find((l) => l.sku.toUpperCase() === s);
    if (matchingItem) {
      setScannedSet((prev) => {
        const next = new Set(prev);
        next.add(matchingItem.sku);
        return next;
      });
    }
    setScanInput('');
  };

  const eWayRequired = order.totalValue > 50_000;
  const allScanned = order.lineItems.every((l) => scannedSet.has(l.sku));
  const requiredDocs = eWayRequired ? docs.invoice && docs.challan && docs.eWayBill : docs.invoice && docs.challan;
  const canPack = allScanned && requiredDocs;

  const submit = () => {
    whUpdate('dispatch', order.id, (o) => ({
      ...o,
      status: 'Packed',
      packerAssigned: o.packerAssigned ?? whUser(),
      documents: {
        invoice: docs.invoice ? o.documents.invoice ?? `INV-${o.id}` : o.documents.invoice,
        deliveryChallan: docs.challan ? o.documents.deliveryChallan ?? `DC-${o.id}` : o.documents.deliveryChallan,
        eWayBill: docs.eWayBill ? o.documents.eWayBill ?? `EWB-${o.id}` : o.documents.eWayBill,
      },
      lineItems: o.lineItems.map((li) => ({ ...li, packedQty: scannedSet.has(li.sku) ? li.pickedQty || li.orderedQty : li.packedQty })),
    }));
    addToast({ type: 'success', message: `${order.id} packed${boxes ? ` in ${boxes} box(es)` : ''}${weight ? `, ${weight} kg` : ''}${notes ? ' — notes saved' : ''}` });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Packing validation — ${order.id}`} size="lg">
      <div className={styles.scanBox}>
        <ScanBarcode size={28} className={styles.scanIcon} />
        <div className={styles.scanContent}>
          <div className={styles.scanLabel}>Scan barcode</div>
          <div className={styles.scanRow}>
            <input
              type="text"
              className={styles.scanInput}
              placeholder="Scan or enter SKU manually"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleScan(); } }}
            />
            <Button variant="primary" size="sm" onClick={handleScan}>Scan</Button>
          </div>
          <div className={styles.scanHint}>{scannedSet.size} of {order.lineItems.length} items scanned</div>
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Items</h4>
        <div className={styles.itemsList}>
          {order.lineItems.map((li) => {
            const isScanned = scannedSet.has(li.sku);
            const expected = li.packedQty || li.pickedQty || li.orderedQty;
            return (
              <div key={li.sku} className={`${styles.itemRow} ${isScanned ? styles.itemScanned : ''}`}>
                <span className={`${styles.checkBadge} ${isScanned ? styles.checkBadgeOn : ''}`}>
                  {isScanned && <Check size={12} strokeWidth={3} />}
                </span>
                <div className={styles.itemMain}>
                  <div className={styles.itemName}>{li.itemName}</div>
                  <div className={styles.itemSku}>{li.sku} · batch {li.batch}</div>
                </div>
                <span className={styles.itemQty}>
                  Expected: {formatIndianNumber(expected)} {li.uom}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Packaging info</h4>
        <div className={styles.grid3}>
          <label className={styles.field}>
            <span>Number of boxes</span>
            <input type="number" className={styles.input} value={boxes} onChange={(e) => setBoxes(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Total weight (kg)</span>
            <input type="number" className={styles.input} value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Order value</span>
            <div className={styles.computed}>{formatIndianCurrency(order.totalValue)}</div>
          </label>
        </div>
        <label className={styles.field}>
          <span>Special handling notes</span>
          <textarea className={`${styles.input} ${styles.textarea}`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Documentation checklist</h4>
        <div className={styles.docsList}>
          <DocRow
            done={docs.invoice}
            icon={<FileText size={14} />}
            label="Invoice"
            actionLabel="Generate invoice"
            onAction={() => setDocs((d) => ({ ...d, invoice: true }))}
          />
          <DocRow
            done={docs.challan}
            icon={<Receipt size={14} />}
            label="Delivery challan"
            actionLabel="Generate DC"
            onAction={() => setDocs((d) => ({ ...d, challan: true }))}
          />
          <DocRow
            done={docs.eWayBill}
            icon={<FileCheck size={14} />}
            label={`E-way bill ${eWayRequired ? '(required, value > ₹50K)' : '(optional)'}`}
            actionLabel="Generate e-way bill"
            onAction={() => setDocs((d) => ({ ...d, eWayBill: true }))}
            optional={!eWayRequired}
          />
        </div>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Save & continue later</Button>
        <Button variant="primary" size="sm" onClick={submit} disabled={!canPack}>
          Mark as packed
        </Button>
      </div>
    </Modal>
  );
}

function DocRow({
  done, icon, label, actionLabel, onAction, optional = false,
}: { done: boolean; icon: React.ReactNode; label: string; actionLabel: string; onAction: () => void; optional?: boolean }) {
  return (
    <div className={`${styles.docRow} ${done ? styles.docRowDone : ''}`}>
      <span className={`${styles.docCheck} ${done ? styles.docCheckOn : ''}`}>
        {done && <Check size={12} strokeWidth={3} />}
      </span>
      <span className={styles.docIcon}>{icon}</span>
      <span className={styles.docLabel}>{label}</span>
      {!done ? (
        <Button variant="secondary" size="sm" onClick={onAction}>{actionLabel}</Button>
      ) : (
        <span className={styles.docDoneText}>{optional ? 'Generated' : 'Generated ✓'}</span>
      )}
    </div>
  );
}
