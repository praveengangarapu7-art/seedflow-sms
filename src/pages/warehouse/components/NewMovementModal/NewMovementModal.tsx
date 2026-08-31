import { useState, useEffect } from 'react';
import { ArrowRightLeft, Move, Edit3, Undo2, Factory, Camera, Upload } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { useToast } from '@/components/common/Toast/ToastContext';
import { inventoryItems } from '../../mockData/inventoryData';
import type { MovementCategory, AdjustmentReason } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import { buildBinCode } from '../../mockData/storageData';
import styles from './NewMovementModal.module.css';

export type NewMovementType = 'Inter-warehouse' | 'Bin-to-bin' | 'Adjustment' | 'Return' | 'Material issue';

interface NewMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: NewMovementType | null;
}

const TYPE_LABELS: Record<NewMovementType, { title: string; category: MovementCategory; icon: React.ReactNode }> = {
  'Inter-warehouse': { title: 'Inter-warehouse transfer', category: 'Transfer',       icon: <ArrowRightLeft size={18} /> },
  'Bin-to-bin':      { title: 'Bin-to-bin transfer',      category: 'Transfer',       icon: <Move size={18} /> },
  'Adjustment':      { title: 'Stock adjustment',         category: 'Adjustment',     icon: <Edit3 size={18} /> },
  'Return':          { title: 'Return',                   category: 'Return',         icon: <Undo2 size={18} /> },
  'Material issue':  { title: 'Material issue to Processing', category: 'Material issue', icon: <Factory size={18} /> },
};

const REASONS: AdjustmentReason[] = [
  'Cycle count variance',
  'Damaged goods',
  'Expired stock',
  'Theft / shrinkage',
  'Quality rejection',
  'System correction',
  'Other',
];

const STEPS_BY_TYPE: Record<NewMovementType, Array<{ key: string; label: string }>> = {
  'Inter-warehouse': [
    { key: 'items', label: 'Items & quantities' },
    { key: 'route', label: 'From & to' },
    { key: 'approval', label: 'Approval & confirm' },
  ],
  'Bin-to-bin': [
    { key: 'item', label: 'Item & quantity' },
    { key: 'bins', label: 'From & to bins' },
  ],
  'Adjustment': [
    { key: 'detail', label: 'Adjustment details' },
  ],
  'Return': [
    { key: 'type',  label: 'Type & reference' },
    { key: 'items', label: 'Items & condition' },
  ],
  'Material issue': [
    { key: 'mr',  label: 'MR reference & items' },
    { key: 'lot', label: 'Lot selection & confirm' },
  ],
};

export function NewMovementModal({ isOpen, onClose, type }: NewMovementModalProps) {
  const { addToast } = useToast();
  const [step, setStep] = useState(0);

  const [sku, setSku] = useState('');
  const [qty, setQty] = useState(0);
  const [toWarehouse, setToWarehouse] = useState('Karnataka');
  const [toBin, setToBin] = useState({ zone: '', rack: '', shelf: '', bin: '' });
  const [adjustType, setAdjustType] = useState<'increase' | 'decrease' | 'replace'>('decrease');
  const [reason, setReason] = useState<AdjustmentReason>('Cycle count variance');
  const [reasonNotes, setReasonNotes] = useState('');
  const [returnType, setReturnType] = useState<'Customer return' | 'Supplier return'>('Customer return');
  const [returnReference, setReturnReference] = useState('');
  const [returnAction, setReturnAction] = useState<'Restock' | 'Quarantine' | 'Dispose'>('Quarantine');
  const [mrReference, setMrReference] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setSku('');
      setQty(0);
      setToWarehouse('Karnataka');
      setToBin({ zone: '', rack: '', shelf: '', bin: '' });
      setAdjustType('decrease');
      setReason('Cycle count variance');
      setReasonNotes('');
      setReturnType('Customer return');
      setReturnReference('');
      setReturnAction('Quarantine');
      setMrReference('');
      setTransferNotes('');
    }
  }, [isOpen, type]);

  if (!type) return null;

  const meta = TYPE_LABELS[type];
  const steps = STEPS_BY_TYPE[type];
  const item = inventoryItems.find((i) => i.sku === sku) ?? null;
  const currentBin = item ? buildBinCode(item.location.zone, item.location.rack, item.location.shelf, item.location.bin) : '';
  const variance = adjustType === 'increase' ? qty : adjustType === 'decrease' ? -qty : (item ? qty - item.quantity : 0);
  const varianceValue = item ? Math.abs(variance) * item.unitCost : 0;
  const requiresApprovalForAdjustment = varianceValue > 10_000;

  const submit = () => {
    console.log('submit movement', type, { sku, qty, toWarehouse, toBin, adjustType, reason, reasonNotes, returnType, returnReference, returnAction, mrReference, transferNotes });
    onClose();
  };

  const inventoryOptions = inventoryItems.filter((i) => i.quantity > 0 || type === 'Adjustment' || type === 'Return');

  const renderItemSelector = () => (
    <label className={styles.field}>
      <span>Item</span>
      <select className={styles.input} value={sku} onChange={(e) => setSku(e.target.value)}>
        <option value="">Select an item…</option>
        {inventoryOptions.map((i) => <option key={i.sku} value={i.sku}>{i.sku} — {i.name}</option>)}
      </select>
      {item && (
        <div className={styles.itemMeta}>
          <span>Current bin: <strong className={styles.mono}>{currentBin}</strong></span>
          <span> · Available: <strong>{formatIndianNumber(item.quantity)} {item.uom}</strong></span>
          <span> · Batch: <strong className={styles.mono}>{item.batchNumber}</strong></span>
        </div>
      )}
    </label>
  );

  const renderQtyField = () => (
    <label className={styles.field}>
      <span>Quantity</span>
      <input
        type="number"
        className={styles.input}
        value={qty || ''}
        min={0}
        onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
      />
    </label>
  );

  const renderInterWarehouse = () => {
    if (step === 0) return (
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Items & quantities</h4>
        {renderItemSelector()}
        {renderQtyField()}
      </div>
    );
    if (step === 1) return (
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>From & to warehouses</h4>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>From warehouse (auto-detected)</span>
            <div className={styles.computed}>{item?.location.warehouse ?? '—'}</div>
          </label>
          <label className={styles.field}>
            <span>To warehouse</span>
            <select className={styles.input} value={toWarehouse} onChange={(e) => setToWarehouse(e.target.value)}>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Telangana Main">Telangana Main</option>
            </select>
          </label>
        </div>
      </div>
    );
    return (
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Approval routing</h4>
        <div className={styles.approvalCard}>
          <div className={styles.approvalRow}><span>1. Warehouse manager</span><strong>Vikram Singh</strong></div>
          {qty * (item?.unitCost ?? 0) > 100_000 && (
            <div className={styles.approvalRow}><span>2. Procurement head</span><strong>Rajesh Mehta</strong></div>
          )}
        </div>
        <label className={styles.field}>
          <span>Notes</span>
          <textarea className={`${styles.input} ${styles.textarea}`} rows={3} value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} />
        </label>
      </div>
    );
  };

  const renderBinToBin = () => {
    if (step === 0) return (
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Item & quantity</h4>
        {renderItemSelector()}
        {renderQtyField()}
      </div>
    );
    return (
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>From & to bins</h4>
        <label className={styles.field}>
          <span>From bin (current)</span>
          <div className={styles.computed}>{currentBin || '—'}</div>
        </label>
        <h5 className={styles.subTitle}>Destination bin</h5>
        <div className={styles.grid4}>
          <label className={styles.field}>
            <span>Zone</span>
            <input type="text" className={styles.input} value={toBin.zone} onChange={(e) => setToBin({ ...toBin, zone: e.target.value.toUpperCase() })} />
          </label>
          <label className={styles.field}>
            <span>Rack</span>
            <input type="text" className={styles.input} value={toBin.rack} onChange={(e) => setToBin({ ...toBin, rack: e.target.value.toUpperCase() })} />
          </label>
          <label className={styles.field}>
            <span>Shelf</span>
            <input type="text" className={styles.input} value={toBin.shelf} onChange={(e) => setToBin({ ...toBin, shelf: e.target.value.toUpperCase() })} />
          </label>
          <label className={styles.field}>
            <span>Bin</span>
            <input type="text" className={styles.input} value={toBin.bin} onChange={(e) => setToBin({ ...toBin, bin: e.target.value.toUpperCase() })} />
          </label>
        </div>
        <div className={styles.noteBanner}>Bin-to-bin moves are auto-approved and update inventory immediately.</div>
      </div>
    );
  };

  const renderAdjustment = () => (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>Adjustment details</h4>
      {renderItemSelector()}
      <label className={styles.field}>
        <span>Adjustment type</span>
        <div className={styles.radioRow}>
          {(['increase', 'decrease', 'replace'] as const).map((t) => (
            <label key={t} className={`${styles.radioCard} ${adjustType === t ? styles.radioActive : ''}`}>
              <input type="radio" name="adjType" value={t} checked={adjustType === t} onChange={() => setAdjustType(t)} />
              <span>{t === 'increase' ? 'Increase qty' : t === 'decrease' ? 'Decrease qty' : 'Replace qty'}</span>
            </label>
          ))}
        </div>
      </label>
      {renderQtyField()}
      {item && qty > 0 && (
        <div className={styles.varianceBox}>
          <strong>Current:</strong> {formatIndianNumber(item.quantity)} {item.uom} →
          <strong> After:</strong> {formatIndianNumber(adjustType === 'increase' ? item.quantity + qty : adjustType === 'decrease' ? Math.max(0, item.quantity - qty) : qty)} {item.uom}
          <span className={variance < 0 ? styles.varianceNeg : styles.variancePos}>
            {' '}(variance: {variance > 0 ? '+' : ''}{variance} {item.uom})
          </span>
        </div>
      )}
      <label className={styles.field}>
        <span>Reason code <span className={styles.required}>*</span></span>
        <select className={styles.input} value={reason} onChange={(e) => setReason(e.target.value as AdjustmentReason)}>
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>Notes {reason === 'Other' && <span className={styles.required}>(required)</span>}</span>
        <textarea className={`${styles.input} ${styles.textarea}`} rows={3} value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} />
      </label>
      <div className={styles.field}>
        <span>Photo evidence (optional)</span>
        <button className={styles.uploadBtn} onClick={() => { console.log('upload movement photos'); addToast({ type: 'success', message: 'Photo evidence uploaded' }); }}>
          <Camera size={14} /> Upload photos <Upload size={12} />
        </button>
      </div>
      {requiresApprovalForAdjustment && (
        <div className={styles.approvalBanner}>
          Variance value ₹{Math.round(varianceValue).toLocaleString('en-IN')} exceeds ₹10K threshold — warehouse manager approval required.
        </div>
      )}
    </div>
  );

  const renderReturn = () => {
    if (step === 0) return (
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Type & reference</h4>
        <label className={styles.field}>
          <span>Return type</span>
          <div className={styles.radioRow}>
            {(['Customer return', 'Supplier return'] as const).map((t) => (
              <label key={t} className={`${styles.radioCard} ${returnType === t ? styles.radioActive : ''}`}>
                <input type="radio" name="returnType" value={t} checked={returnType === t} onChange={() => setReturnType(t)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </label>
        <label className={styles.field}>
          <span>{returnType === 'Customer return' ? 'Sales order reference' : 'GRN reference'}</span>
          <input type="text" className={styles.input} value={returnReference} onChange={(e) => setReturnReference(e.target.value.toUpperCase())} placeholder="e.g. SO-2026-1148" />
        </label>
        <label className={styles.field}>
          <span>Reason</span>
          <select className={styles.input} value={reason} onChange={(e) => setReason(e.target.value as AdjustmentReason)}>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>
    );
    return (
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Items & condition</h4>
        {renderItemSelector()}
        {renderQtyField()}
        <label className={styles.field}>
          <span>Action</span>
          <div className={styles.radioRow}>
            {(['Restock', 'Quarantine', 'Dispose'] as const).map((a) => (
              <label key={a} className={`${styles.radioCard} ${returnAction === a ? styles.radioActive : ''}`}>
                <input type="radio" name="returnAction" value={a} checked={returnAction === a} onChange={() => setReturnAction(a)} />
                <span>{a}</span>
              </label>
            ))}
          </div>
        </label>
        <label className={styles.field}>
          <span>Notes</span>
          <textarea className={`${styles.input} ${styles.textarea}`} rows={3} value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} />
        </label>
      </div>
    );
  };

  const renderMaterialIssue = () => {
    if (step === 0) return (
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Material request reference & items</h4>
        <label className={styles.field}>
          <span>MR reference</span>
          <input type="text" className={styles.input} value={mrReference} onChange={(e) => setMrReference(e.target.value.toUpperCase())} placeholder="MR-2026-XXXX" />
        </label>
        {mrReference && (
          <div className={styles.mrPreview}>
            <h5 className={styles.subTitle}>Items from {mrReference}</h5>
            <ul className={styles.mrList}>
              <li>Cotton hybrid GH-BT-102 Foundation — <strong>200 bags</strong></li>
              <li>Coco peat substrate 50 kg — <strong>100 bags</strong></li>
            </ul>
          </div>
        )}
      </div>
    );
    return (
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Lot selection & confirm</h4>
        <div className={styles.lotCard}>
          <div className={styles.lotRow}>
            <span>Cotton hybrid GH-BT-102 Foundation</span>
            <strong>200 bags · BT-2025-A14 (FEFO)</strong>
          </div>
          <div className={styles.lotMeta}>
            Source lot: L-COT-0142 · GRN-2026-0085 · expiry 24 Jan 2027
          </div>
        </div>
        <div className={styles.lotCard}>
          <div className={styles.lotRow}>
            <span>Coco peat substrate 50 kg</span>
            <strong>100 bags · RM-2025-CP-12</strong>
          </div>
          <div className={styles.lotMeta}>
            Source lot: L-CP-1201 · GRN-2026-0078 · expiry 31 Mar 2028
          </div>
        </div>
        <label className={styles.field}>
          <span>Notes</span>
          <textarea className={`${styles.input} ${styles.textarea}`} rows={2} value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} />
        </label>
      </div>
    );
  };

  const body =
    type === 'Inter-warehouse' ? renderInterWarehouse() :
    type === 'Bin-to-bin'      ? renderBinToBin() :
    type === 'Adjustment'      ? renderAdjustment() :
    type === 'Return'          ? renderReturn() :
    renderMaterialIssue();

  const isLastStep = step >= steps.length - 1;
  const canSubmit =
    type === 'Adjustment' ? sku !== '' && qty > 0 && (reason !== 'Other' || reasonNotes.trim() !== '')
    : sku !== '' && qty > 0 || type === 'Material issue';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={meta.title} size="xl">
      {steps.length > 1 && (
        <div className={styles.stepperWrap}>
          <Stepper steps={steps} currentStep={step} onStepClick={(i) => setStep(i)} />
        </div>
      )}

      {body}

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <div className={styles.footerRight}>
          <Button variant="secondary" size="sm" onClick={() => { console.log('save movement draft'); addToast({ type: 'success', message: 'Movement saved as draft' }); onClose(); }}>Save as draft</Button>
          {step > 0 && steps.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</Button>
          )}
          {!isLastStep ? (
            <Button variant="primary" size="sm" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>Next →</Button>
          ) : (
            <Button variant="primary" size="sm" onClick={submit} disabled={!canSubmit}>Submit</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
