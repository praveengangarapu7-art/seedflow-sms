import { useState, useEffect } from 'react';
import { Camera, Upload } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { useToast } from '@/components/common/Toast/ToastContext';
import { inventoryItems } from '../../mockData/inventoryData';
import type { ReturnDirection, ReturnReason, ReturnRecord } from '@/types/warehouse';
import { formatIndianCurrency } from '@/utils/formatters';
import styles from './NewReturnModal.module.css';

interface NewReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDirection?: ReturnDirection;
  onSave?: (data: ReturnRecord) => void;
}

const STEPS = [
  { key: 'direction', label: 'Direction & reference' },
  { key: 'items',     label: 'Items & reason' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'confirm',   label: 'Confirm' },
];

const REASONS: ReturnReason[] = [
  'Damaged in transit', 'Quality failure', 'Wrong item shipped', 'Excess quantity',
  'Customer cancellation', 'Expired stock', 'Mislabeled', 'Performance complaint', 'Other',
];

const PARTNERS = ['Blue Dart', 'VRL Logistics', 'Gati', 'TCI Express', 'Safexpress', 'Self'];

interface DraftLine {
  sku: string;
  itemName: string;
  batch: string;
  originalQty: number;
  returnedQty: number;
  uom: string;
  unitPrice: number;
  selected: boolean;
}

export function NewReturnModal({ isOpen, onClose, defaultDirection = 'Customer return', onSave }: NewReturnModalProps) {
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<ReturnDirection>(defaultDirection);
  const [reference, setReference] = useState('');
  const [partyName, setPartyName] = useState('');
  const [reason, setReason] = useState<ReturnReason>('Damaged in transit');
  const [reasonNotes, setReasonNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [expectedDate, setExpectedDate] = useState('');
  const [pickupArranged, setPickupArranged] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<'self' | 'pickup'>('self');
  const [logistics, setLogistics] = useState({ partner: 'Blue Dart', vehicleNumber: '', driverName: '', driverPhone: '' });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setDirection(defaultDirection);
      setReference('');
      setPartyName('');
      setReason('Damaged in transit');
      setReasonNotes('');
      setLines(inventoryItems.slice(0, 3).map((it) => ({
        sku: it.sku, itemName: it.name, batch: it.batchNumber,
        originalQty: it.quantity, returnedQty: 0, uom: it.uom, unitPrice: it.unitCost, selected: false,
      })));
      setExpectedDate('');
      setPickupArranged(false);
      setShippingMethod('self');
      setLogistics({ partner: 'Blue Dart', vehicleNumber: '', driverName: '', driverPhone: '' });
      setNotes('');
    }
  }, [isOpen, defaultDirection]);

  const setLine = (idx: number, patch: Partial<DraftLine>) =>
    setLines((p) => p.map((l, i) => i === idx ? { ...l, ...patch } : l));

  const selectedLines = lines.filter((l) => l.selected && l.returnedQty > 0);
  const totalQty = selectedLines.reduce((s, l) => s + l.returnedQty, 0);
  const totalValue = selectedLines.reduce((s, l) => s + l.returnedQty * l.unitPrice, 0);

  const canNext =
    step === 0 ? reference.trim() !== '' && partyName.trim() !== ''
    : step === 1 ? selectedLines.length > 0 && (reason !== 'Other' || reasonNotes.trim() !== '')
    : step === 2 ? expectedDate.trim() !== ''
    : true;

  const submit = () => {
    const data: ReturnRecord = {
      id: `RTN-${Math.floor(1000 + Math.random() * 9000)}`,
      direction,
      reference,
      party: partyName,
      initiatedDate: new Date().toISOString(),
      status: 'Initiated',
      reason,
      reasonNotes,
      totalItems: selectedLines.length,
      totalQuantity: totalQty,
      uom: selectedLines[0]?.uom || 'bags',
      totalValue,
      disposition: 'Pending decision',
      initiatedBy: 'Nitin R.',
      lineItems: selectedLines.map(l => ({
        sku: l.sku,
        itemName: l.itemName,
        batch: l.batch,
        originalQty: l.originalQty,
        returnedQty: l.returnedQty,
        uom: l.uom,
        unitPrice: l.unitPrice,
        conditionAssessment: 'Not assessed',
        itemDisposition: 'Pending decision'
      })),
      photos: [],
      resolutionTimeline: [
        { stage: 'Initiated', timestamp: new Date().toISOString(), user: 'Nitin R.', comment: 'Return initiated via portal' }
      ]
    };

    onSave?.(data);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New return" size="xl">
      <div className={styles.stepperWrap}>
        <Stepper steps={STEPS} currentStep={step} onStepClick={(i) => setStep(i)} />
      </div>

      {step === 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Direction & reference</h4>
          <div className={styles.radioRow}>
            {(['Customer return', 'Supplier return'] as ReturnDirection[]).map((d) => (
              <label key={d} className={`${styles.radioCard} ${direction === d ? styles.radioActive : ''}`}>
                <input type="radio" name="rtn-direction" value={d} checked={direction === d} onChange={() => setDirection(d)} />
                <span>{d}</span>
              </label>
            ))}
          </div>

          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>{direction === 'Customer return' ? 'Sales order / DO reference' : 'GRN / PO reference'}</span>
              <input type="text" className={styles.input} value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder={direction === 'Customer return' ? 'SO-2026-XXXX' : 'GRN-XXXX'} />
            </label>
            <label className={styles.field}>
              <span>{direction === 'Customer return' ? 'Customer name' : 'Supplier name'}</span>
              <input type="text" className={styles.input} value={partyName} onChange={(e) => setPartyName(e.target.value)} />
            </label>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Items & reason</h4>
          <p className={styles.helper}>Select items being returned and enter quantity per line.</p>

          <div className={styles.lineHeader}>
            <span></span>
            <span>SKU</span>
            <span>Item</span>
            <span>Batch</span>
            <span className={styles.alignRight}>Original</span>
            <span className={styles.alignRight}>Returned</span>
            <span className={styles.alignRight}>Total</span>
          </div>
          {lines.map((line, idx) => {
            const overOrdered = line.returnedQty > line.originalQty;
            return (
              <div key={idx} className={`${styles.lineRow} ${line.selected ? styles.lineSelected : ''}`}>
                <input
                  type="checkbox"
                  checked={line.selected}
                  onChange={(e) => setLine(idx, { selected: e.target.checked, returnedQty: e.target.checked ? line.returnedQty : 0 })}
                />
                <span className={styles.lineMono}>{line.sku}</span>
                <span className={styles.lineName} title={line.itemName}>{line.itemName}</span>
                <span className={styles.lineMono}>{line.batch}</span>
                <span className={styles.alignRight}>{line.originalQty} {line.uom}</span>
                <input
                  type="number"
                  className={`${styles.input} ${styles.qtyInput} ${overOrdered ? styles.qtyError : ''}`}
                  value={line.returnedQty || ''}
                  min={0}
                  max={line.originalQty}
                  disabled={!line.selected}
                  onChange={(e) => setLine(idx, { returnedQty: parseInt(e.target.value, 10) || 0 })}
                />
                <span className={`${styles.alignRight} ${styles.lineTotal}`}>{formatIndianCurrency(line.returnedQty * line.unitPrice)}</span>
              </div>
            );
          })}

          <div className={styles.summaryStrip}>
            Selected: <strong>{selectedLines.length}</strong> lines · Total qty: <strong>{totalQty}</strong> · Total value: <strong>{formatIndianCurrency(totalValue)}</strong>
          </div>

          <label className={styles.field}>
            <span>Reason <span className={styles.required}>*</span></span>
            <select className={styles.input} value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Reason notes {reason === 'Other' && <span className={styles.required}>(required)</span>}</span>
            <textarea className={`${styles.input} ${styles.textarea}`} rows={2} value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} />
          </label>
          <div className={styles.field}>
            <span>Photo evidence (recommended)</span>
            <button className={styles.uploadBtn} onClick={() => { addToast({ type: 'success', message: 'Photo evidence uploaded' }); }}>
              <Camera size={14} /> Upload photos <Upload size={12} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Logistics</h4>

          <label className={styles.field}>
            <span>Expected return date</span>
            <input type="text" className={styles.input} value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} placeholder="DD MMM YYYY" />
          </label>

          {direction === 'Customer return' ? (
            <>
              <label className={styles.toggleRow}>
                <input type="checkbox" checked={pickupArranged} onChange={(e) => setPickupArranged(e.target.checked)} />
                <span>Pickup arranged</span>
              </label>
              {pickupArranged && (
                <div className={styles.grid2}>
                  <label className={styles.field}>
                    <span>Logistics partner</span>
                    <select className={styles.input} value={logistics.partner} onChange={(e) => setLogistics({ ...logistics, partner: e.target.value })}>
                      {PARTNERS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Vehicle number</span>
                    <input type="text" className={styles.input} value={logistics.vehicleNumber} onChange={(e) => setLogistics({ ...logistics, vehicleNumber: e.target.value.toUpperCase() })} />
                  </label>
                  <label className={styles.field}>
                    <span>Driver name</span>
                    <input type="text" className={styles.input} value={logistics.driverName} onChange={(e) => setLogistics({ ...logistics, driverName: e.target.value })} />
                  </label>
                  <label className={styles.field}>
                    <span>Driver phone</span>
                    <input type="tel" className={styles.input} value={logistics.driverPhone} onChange={(e) => setLogistics({ ...logistics, driverPhone: e.target.value })} />
                  </label>
                </div>
              )}
            </>
          ) : (
            <>
              <div className={styles.field}>
                <span>Shipping method</span>
                <div className={styles.radioRow}>
                  {(['self', 'pickup'] as const).map((m) => (
                    <label key={m} className={`${styles.radioCard} ${shippingMethod === m ? styles.radioActive : ''}`}>
                      <input type="radio" name="ship-method" value={m} checked={shippingMethod === m} onChange={() => setShippingMethod(m)} />
                      <span>{m === 'self' ? 'We ship to supplier' : 'Supplier pickup'}</span>
                    </label>
                  ))}
                </div>
              </div>
              {shippingMethod === 'self' && (
                <div className={styles.grid2}>
                  <label className={styles.field}>
                    <span>Logistics partner</span>
                    <select className={styles.input} value={logistics.partner} onChange={(e) => setLogistics({ ...logistics, partner: e.target.value })}>
                      {PARTNERS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Vehicle number</span>
                    <input type="text" className={styles.input} value={logistics.vehicleNumber} onChange={(e) => setLogistics({ ...logistics, vehicleNumber: e.target.value.toUpperCase() })} />
                  </label>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Confirm</h4>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryRow}><span>Direction</span><strong>{direction}</strong></div>
            <div className={styles.summaryRow}><span>Reference</span><strong>{reference}</strong></div>
            <div className={styles.summaryRow}><span>Party</span><strong>{partyName}</strong></div>
            <div className={styles.summaryRow}><span>Reason</span><strong>{reason}</strong></div>
            <div className={styles.summaryRow}><span>Lines / qty / value</span><strong>{selectedLines.length} · {totalQty} · {formatIndianCurrency(totalValue)}</strong></div>
            <div className={styles.summaryRow}><span>Expected return</span><strong>{expectedDate || '—'}</strong></div>
          </div>
          <label className={styles.field}>
            <span>Notes</span>
            <textarea className={`${styles.input} ${styles.textarea}`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
      )}

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <div className={styles.footerRight}>
          <Button variant="secondary" size="sm" onClick={() => { addToast({ type: 'success', message: 'Return saved as draft' }); onClose(); }}>Save as draft</Button>
          {step > 0 && <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</Button>}
          {step < STEPS.length - 1 ? (
            <Button variant="primary" size="sm" disabled={!canNext} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next →</Button>
          ) : (
            <Button variant="primary" size="sm" onClick={submit}>Initiate return</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
