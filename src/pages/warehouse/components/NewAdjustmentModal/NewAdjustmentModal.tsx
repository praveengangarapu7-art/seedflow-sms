import { useState, useEffect, useMemo } from 'react';
import { Camera, Upload, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import { adjustStock, logMovement, nowIso, useWh, whAdd, whNextId, whRead, whUser } from '../../warehouseStore';
import type { StockAdjustment } from '@/types/warehouse';
import { buildBinCode } from '../../mockData/storageData';
import type { AdjustmentReason, AdjustmentDirection, AdjustmentSource } from '@/types/warehouse';
import { formatIndianNumber, formatRupees } from '@/utils/formatters';
import styles from './NewAdjustmentModal.module.css';

interface NewAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillSource?: AdjustmentSource;
  prefillCycleCountRef?: string;
}

const REASONS: AdjustmentReason[] = [
  'Cycle count variance',
  'Damaged goods',
  'Expired stock',
  'Theft / shrinkage',
  'Quality rejection',
  'System correction',
  'Other',
];

const SOURCES: AdjustmentSource[] = [
  'Manual', 'Cycle count', 'Damage report', 'Quality rejection', 'System reconciliation',
];

const STRONG_PHOTO_REASONS: AdjustmentReason[] = ['Damaged goods', 'Theft / shrinkage', 'Quality rejection'];

export function NewAdjustmentModal({ isOpen, onClose, prefillSource, prefillCycleCountRef }: NewAdjustmentModalProps) {
  const { addToast } = useToast();
  const [inventoryItems] = useWh('items');
  const [sku, setSku] = useState('');
  const [direction, setDirection] = useState<AdjustmentDirection>('Decrease');
  const [actualQty, setActualQty] = useState('');
  const [reason, setReason] = useState<AdjustmentReason | ''>('');
  const [reasonNotes, setReasonNotes] = useState('');
  const [source, setSource] = useState<AdjustmentSource>('Manual');
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSku('');
      setDirection('Decrease');
      setActualQty('');
      setReason('');
      setReasonNotes('');
      setSource(prefillSource ?? 'Manual');
      setPhotoCount(0);
    }
  }, [isOpen, prefillSource]);

  const item = useMemo(() => inventoryItems.find((i) => i.sku === sku) ?? null, [sku, inventoryItems]);
  const currentBin = item ? buildBinCode(item.location.zone, item.location.rack, item.location.shelf, item.location.bin) : '';
  const actualQtyNum = parseInt(actualQty, 10);
  const validActual = Number.isFinite(actualQtyNum) && actualQtyNum >= 0;

  const newQty = item && validActual
    ? direction === 'Increase' ? item.quantity + actualQtyNum
    : direction === 'Decrease' ? Math.max(0, item.quantity - actualQtyNum)
    : actualQtyNum
    : null;

  const variance = item && newQty !== null ? newQty - item.quantity : 0;
  const varianceValue = item ? variance * item.unitCost : 0;
  const requiresApproval = Math.abs(varianceValue) > 10_000;

  const buildAdjustment = (status: StockAdjustment['status']): StockAdjustment | null => {
    if (!item) return null;
    return {
      id: whNextId('ADJ', whRead('adjustments').map((a) => a.id)),
      itemSku: item.sku, itemName: item.name, batch: item.batchNumber, location: currentBin, direction,
      systemQty: item.quantity, actualQty: newQty ?? item.quantity, varianceQty: variance, uom: item.uom,
      unitCost: item.unitCost, varianceValue,
      reason: (reason || 'Other') as StockAdjustment['reason'], reasonNotes: reasonNotes || undefined,
      photos: Array.from({ length: photoCount }, (_, i) => `photo-${i + 1}.jpg`),
      initiatedBy: whUser(), initiatedAt: nowIso(), status,
      approvalChain: status === 'Pending approval' ? [{ approver: 'Warehouse manager', role: 'Warehouse manager', status: 'pending' }] : [],
      source, cycleCountRef: prefillCycleCountRef,
      postedAt: status === 'Posted' ? nowIso() : undefined,
      warehouse: item.location.warehouse,
    };
  };

  const reasonRequired = reason === '';
  const notesRequired = reason === 'Other' && reasonNotes.trim() === '';
  const canSubmit = !reasonRequired && !notesRequired && sku !== '' && validActual && actualQtyNum > 0;

  const handleSubmit = (autoPost: boolean) => {
    const adj = buildAdjustment(autoPost ? 'Posted' : 'Pending approval');
    if (!adj) return;
    whAdd('adjustments', adj);
    if (autoPost && item) {
      adjustStock(item.sku, adj.varianceQty);
      logMovement({ category: 'Adjustment', subType: direction, itemName: item.name, sku: item.sku, batch: item.batchNumber, quantity: Math.abs(adj.varianceQty), uom: item.uom, fromLocation: adj.location, reason: adj.reason, reasonNotes: adj.reasonNotes, reference: adj.id, status: 'Completed', completedAt: nowIso() });
    }
    addToast({ type: 'success', message: autoPost ? `${adj.id} posted; stock updated` : `${adj.id} submitted for approval` });
    onClose();
  };

  const photoStrong = STRONG_PHOTO_REASONS.includes(reason as AdjustmentReason);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New stock adjustment" size="lg">
      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Item & location</h4>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>Item</span>
            <select className={styles.input} value={sku} onChange={(e) => setSku(e.target.value)}>
              <option value="">Select an item…</option>
              {inventoryItems.map((i) => <option key={i.sku} value={i.sku}>{i.sku} — {i.name}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Batch</span>
            <div className={styles.computed}>{item?.batchNumber ?? '—'}</div>
          </label>
          <label className={styles.field}>
            <span>Current location</span>
            <div className={styles.computed}>{currentBin || '—'}</div>
          </label>
          <label className={styles.field}>
            <span>System quantity</span>
            <div className={`${styles.computed} ${styles.qtyBig}`}>
              {item ? `${formatIndianNumber(item.quantity)} ${item.uom}` : '—'}
            </div>
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Adjustment</h4>
        <div className={styles.field}>
          <span>Direction</span>
          <div className={styles.radioRow}>
            {(['Increase', 'Decrease', 'Replace'] as AdjustmentDirection[]).map((d) => (
              <label key={d} className={`${styles.radioCard} ${direction === d ? styles.radioActive : ''}`}>
                <input type="radio" name="direction" value={d} checked={direction === d} onChange={() => setDirection(d)} />
                <span>{d}</span>
              </label>
            ))}
          </div>
        </div>

        <label className={styles.field}>
          <span>{direction === 'Replace' ? 'Replace with quantity' : direction === 'Increase' ? 'Quantity to add' : 'Quantity to remove'}</span>
          <input
            type="number"
            className={styles.input}
            value={actualQty}
            min={0}
            onChange={(e) => setActualQty(e.target.value)}
          />
        </label>

        {item && validActual && actualQtyNum > 0 && newQty !== null && (
          <div className={styles.varianceCard}>
            <div className={styles.varianceLine}>
              <strong>System:</strong> {formatIndianNumber(item.quantity)} {item.uom} →
              <strong> Actual:</strong> {formatIndianNumber(newQty)} {item.uom}
            </div>
            <div className={`${styles.varianceFigure} ${variance < 0 ? styles.negText : variance > 0 ? styles.posText : ''}`}>
              Variance: {variance > 0 ? '+' : ''}{formatIndianNumber(variance)} {item.uom} ({variance > 0 ? '+' : ''}{formatRupees(varianceValue)})
            </div>
            {requiresApproval && (
              <div className={styles.approvalBanner}>
                <AlertTriangle size={12} /> Approval required: Warehouse Manager → Procurement Head
              </div>
            )}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Reason <span className={styles.required}>*</span></h4>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>Reason code <span className={styles.required}>*</span></span>
            <select className={styles.input} value={reason} onChange={(e) => setReason(e.target.value as AdjustmentReason)}>
              <option value="">Select a reason…</option>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Source</span>
            <select className={styles.input} value={source} onChange={(e) => setSource(e.target.value as AdjustmentSource)}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <label className={styles.field}>
          <span>Notes {reason === 'Other' ? <span className={styles.required}>(required)</span> : <em className={styles.subtle}>(recommended)</em>}</span>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            rows={3}
            value={reasonNotes}
            onChange={(e) => setReasonNotes(e.target.value)}
            placeholder="Describe the cause and any investigation steps..."
          />
        </label>
        {prefillCycleCountRef && (
          <div className={styles.refBanner}>Linked to cycle count {prefillCycleCountRef}</div>
        )}
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Evidence</h4>
        <div className={styles.field}>
          <span>
            Photo evidence
            {photoStrong && <em className={styles.evidenceHint}> · strongly recommended for {reason}</em>}
          </span>
          <button className={styles.uploadBtn} onClick={() => setPhotoCount((c) => c + 1)}>
            <Camera size={14} /> Add photo <Upload size={12} />
          </button>
          {photoCount > 0 && (
            <div className={styles.photoChips}>
              {Array.from({ length: photoCount }).map((_, i) => (
                <span key={i} className={styles.photoChip}>Photo {i + 1}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <div className={styles.footerRight}>
          <Button variant="secondary" size="sm" onClick={() => { const adj = buildAdjustment('Draft'); if (adj) { whAdd('adjustments', adj); addToast({ type: 'success', message: `${adj.id} saved as draft` }); } onClose(); }}>Save as draft</Button>
          {!requiresApproval && validActual && (
            <Button variant="secondary" size="sm" disabled={!canSubmit} onClick={() => handleSubmit(true)}>
              Submit & post
            </Button>
          )}
          <Button variant="primary" size="sm" disabled={!canSubmit} onClick={() => handleSubmit(false)}>
            Submit for approval
          </Button>
        </div>
      </div>
    </Modal>
  );
}
