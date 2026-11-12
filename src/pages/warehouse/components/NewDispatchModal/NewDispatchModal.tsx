import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useWh, whAdd, whRead, whNextId, whDisplayDate, whDate, nowIso } from '../../warehouseStore';
import type { DispatchOrder } from '@/types/warehouse';
import type { DispatchType, PickingStrategy } from '@/types/warehouse';
import { formatIndianCurrency, formatIndianNumber } from '@/utils/formatters';
import { buildBinCode } from '../../mockData/storageData';
import styles from './NewDispatchModal.module.css';

interface NewDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DraftLine {
  sku: string;
  itemName: string;
  batch: string;
  pickFrom: string;
  available: number;
  orderedQty: number;
  unitPrice: number;
  uom: string;
}

const STEPS = [
  { key: 'order',     label: 'Order details' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'items',     label: 'Line items' },
  { key: 'logistics', label: 'Logistics & confirm' },
];

const LOGISTICS_PARTNERS = ['Blue Dart', 'VRL Logistics', 'Gati', 'TCI Express', 'Safexpress', 'Self'];

export function NewDispatchModal({ isOpen, onClose }: NewDispatchModalProps) {
  const { addToast } = useToast();
  const [inventoryItems] = useWh('items');
  const [step, setStep] = useState(0);
  const [type, setType] = useState<DispatchType>('Sales order');
  const [reference, setReference] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [strategy, setStrategy] = useState<PickingStrategy>('Single order');

  const [consignee, setConsignee] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    gst: '',
  });

  const [lines, setLines] = useState<DraftLine[]>([]);

  const [logistics, setLogistics] = useState({
    partner: 'Blue Dart',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
  });

  const reset = () => {
    setStep(0);
    setType('Sales order');
    setReference('');
    setExpectedDate('');
    setStrategy('Single order');
    setConsignee({ name: '', address: '', city: '', state: '', phone: '', gst: '' });
    setLines([]);
    setLogistics({ partner: 'Blue Dart', vehicleNumber: '', driverName: '', driverPhone: '' });
  };

  const handleClose = () => { reset(); onClose(); };

  const buildOrder = (): DispatchOrder => {
    const valid = lines.filter((l) => l.sku && l.orderedQty > 0);
    return {
      id: whNextId('DO', whRead('dispatch').map((o) => o.id)),
      salesOrderRef: reference || '—',
      type,
      consignee: { name: consignee.name, address: consignee.address, city: consignee.city, state: consignee.state, phone: consignee.phone },
      logisticsPartner: logistics.partner,
      vehicleNumber: logistics.vehicleNumber || undefined,
      driverName: logistics.driverName || undefined,
      expectedDispatchDate: expectedDate ? whDisplayDate(expectedDate) : whDate(),
      status: 'Pending',
      pickingStrategy: strategy,
      totalItems: valid.length,
      totalQuantity: valid.reduce((s, l) => s + Number(l.orderedQty), 0),
      uom: valid[0]?.uom ?? 'bags',
      totalValue: valid.reduce((s, l) => s + Number(l.orderedQty) * Number(l.unitPrice), 0),
      documents: {},
      lineItems: valid.map((l) => ({ sku: l.sku, itemName: l.itemName, batch: l.batch, pickFrom: l.pickFrom, orderedQty: Number(l.orderedQty), pickedQty: 0, packedQty: 0, uom: l.uom, unitPrice: Number(l.unitPrice) })),
      createdAt: nowIso(),
    };
  };

  const handleSubmit = () => {
    const order = buildOrder();
    whAdd('dispatch', order);
    addToast({ type: 'success', message: `Dispatch order ${order.id} created for ${order.consignee.name || 'consignee'}` });
    handleClose();
  };

  const addLine = () => {
    setLines([...lines, { sku: '', itemName: '', batch: '', pickFrom: '', available: 0, orderedQty: 0, unitPrice: 0, uom: 'bags' }]);
  };

  const updateLine = (idx: number, sku: string) => {
    const item = inventoryItems.find((i) => i.sku === sku);
    if (!item) {
      setLines((prev) => prev.map((l, i) => i === idx ? { ...l, sku } : l));
      return;
    }
    setLines((prev) => prev.map((l, i) => i === idx ? {
      ...l,
      sku: item.sku,
      itemName: item.name,
      batch: item.batchNumber,
      pickFrom: buildBinCode(item.location.zone, item.location.rack, item.location.shelf, item.location.bin),
      available: item.quantity,
      unitPrice: item.unitCost,
      uom: item.uom,
    } : l));
  };

  const setLineQty = (idx: number, qty: number) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, orderedQty: Math.max(0, qty) } : l));
  };

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const totalValue = lines.reduce((s, l) => s + l.orderedQty * l.unitPrice, 0);
  const totalQuantity = lines.reduce((s, l) => s + l.orderedQty, 0);
  const totalItems = lines.length;

  const canNext =
    step === 0 ? reference.trim() !== '' && expectedDate.trim() !== ''
    : step === 1 ? consignee.name.trim() !== '' && consignee.city.trim() !== '' && consignee.phone.trim() !== ''
    : step === 2 ? lines.length > 0 && lines.every((l) => l.sku !== '' && l.orderedQty > 0 && l.orderedQty <= l.available)
    : true;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New dispatch order" size="xl">
      <div className={styles.stepperWrap}>
        <Stepper steps={STEPS} currentStep={step} onStepClick={(i) => setStep(i)} />
      </div>

      {step === 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Order type</h4>
          <div className={styles.radioRow}>
            {(['Sales order', 'Material request', 'Inter-warehouse'] as DispatchType[]).map((t) => (
              <label key={t} className={`${styles.radioCard} ${type === t ? styles.radioActive : ''}`}>
                <input type="radio" name="dispatchType" value={t} checked={type === t} onChange={() => setType(t)} />
                <span>{t}</span>
              </label>
            ))}
          </div>

          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>{type === 'Material request' ? 'MR reference' : type === 'Inter-warehouse' ? 'Transfer reference' : 'Sales order reference'}</span>
              <input type="text" className={styles.input} value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="e.g. SO-2026-1188" />
            </label>
            <label className={styles.field}>
              <span>Expected dispatch date</span>
              <input type="text" className={styles.input} value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} placeholder="DD MMM YYYY" />
            </label>
          </div>

          <div className={styles.field}>
            <span>Picking strategy</span>
            <div className={styles.radioRow}>
              {(['Wave', 'Batch', 'Single order'] as PickingStrategy[]).map((s) => (
                <label key={s} className={`${styles.radioCard} ${strategy === s ? styles.radioActive : ''}`}>
                  <input type="radio" name="strategy" value={s} checked={strategy === s} onChange={() => setStrategy(s)} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Consignee details</h4>
          {type === 'Material request' && (
            <div className={styles.preFilled}>
              To: <strong>Processing department</strong> · pre-filled for material requests.
            </div>
          )}
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>Consignee name</span>
              <input type="text" className={styles.input} value={consignee.name} onChange={(e) => setConsignee({ ...consignee, name: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Phone</span>
              <input type="tel" className={styles.input} value={consignee.phone} onChange={(e) => setConsignee({ ...consignee, phone: e.target.value })} placeholder="+91 ..." />
            </label>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span>Address</span>
              <input type="text" className={styles.input} value={consignee.address} onChange={(e) => setConsignee({ ...consignee, address: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>City</span>
              <input type="text" className={styles.input} value={consignee.city} onChange={(e) => setConsignee({ ...consignee, city: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>State</span>
              <input type="text" className={styles.input} value={consignee.state} onChange={(e) => setConsignee({ ...consignee, state: e.target.value })} />
            </label>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span>GST (optional)</span>
              <input type="text" className={styles.input} value={consignee.gst} onChange={(e) => setConsignee({ ...consignee, gst: e.target.value.toUpperCase() })} />
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.section}>
          <div className={styles.lineHeader}>
            <h4 className={styles.sectionTitle}>Line items</h4>
            <Button variant="secondary" size="sm" leftIcon={Plus} onClick={addLine}>Add line</Button>
          </div>

          {lines.length === 0 ? (
            <p className={styles.emptyLines}>Add a line to start picking items from inventory.</p>
          ) : (
            <div className={styles.lineTable}>
              <div className={styles.lineHeaderRow}>
                <span>SKU</span>
                <span>Item</span>
                <span>Batch (FEFO)</span>
                <span>Pick from</span>
                <span className={styles.alignRight}>Available</span>
                <span className={styles.alignRight}>Ordered</span>
                <span className={styles.alignRight}>Total</span>
                <span></span>
              </div>
              {lines.map((line, idx) => {
                const overOrdered = line.orderedQty > line.available;
                return (
                  <div key={idx} className={styles.lineRow}>
                    <select
                      className={styles.input}
                      value={line.sku}
                      onChange={(e) => updateLine(idx, e.target.value)}
                    >
                      <option value="">Select SKU…</option>
                      {inventoryItems.filter((i) => i.quantity > 0).map((it) => (
                        <option key={it.sku} value={it.sku}>{it.sku}</option>
                      ))}
                    </select>
                    <span className={styles.cellName} title={line.itemName}>{line.itemName || '—'}</span>
                    <span className={styles.cellMono}>{line.batch || '—'}</span>
                    <span className={styles.cellMono}>{line.pickFrom || '—'}</span>
                    <span className={`${styles.cell} ${styles.alignRight}`}>{line.available ? formatIndianNumber(line.available) : '—'}</span>
                    <input
                      type="number"
                      className={`${styles.input} ${styles.qtyInput} ${overOrdered ? styles.qtyError : ''}`}
                      value={line.orderedQty || ''}
                      onChange={(e) => setLineQty(idx, parseInt(e.target.value, 10) || 0)}
                      min={0}
                      max={line.available}
                    />
                    <span className={`${styles.cell} ${styles.alignRight}`}>{formatIndianCurrency(line.orderedQty * line.unitPrice)}</span>
                    <button className={styles.removeBtn} aria-label="Remove line" onClick={() => removeLine(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {lines.length > 0 && (
            <div className={styles.totalsBar}>
              <div className={styles.totalsItem}>
                <span>Items</span>
                <strong>{totalItems}</strong>
              </div>
              <div className={styles.totalsItem}>
                <span>Quantity</span>
                <strong>{formatIndianNumber(totalQuantity)}</strong>
              </div>
              <div className={styles.totalsItem}>
                <span>Total value</span>
                <strong>{formatIndianCurrency(totalValue)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Logistics</h4>
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>Logistics partner</span>
              <select className={styles.input} value={logistics.partner} onChange={(e) => setLogistics({ ...logistics, partner: e.target.value })}>
                {LOGISTICS_PARTNERS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span>Vehicle number</span>
              <input type="text" className={styles.input} value={logistics.vehicleNumber} onChange={(e) => setLogistics({ ...logistics, vehicleNumber: e.target.value.toUpperCase() })} placeholder="TS-09-AB-1234" />
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

          <h4 className={styles.sectionTitle} style={{ marginTop: 16 }}>Summary</h4>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryRow}><span>Type</span><strong>{type}</strong></div>
            <div className={styles.summaryRow}><span>Reference</span><strong>{reference || '—'}</strong></div>
            <div className={styles.summaryRow}><span>Expected dispatch</span><strong>{expectedDate || '—'}</strong></div>
            <div className={styles.summaryRow}><span>Picking strategy</span><strong>{strategy}</strong></div>
            <div className={styles.summaryRow}><span>Consignee</span><strong>{consignee.name || '—'} · {consignee.city || '—'}</strong></div>
            <div className={styles.summaryRow}><span>Items / quantity</span><strong>{totalItems} · {formatIndianNumber(totalQuantity)}</strong></div>
            <div className={styles.summaryRow}><span>Total value</span><strong>{formatIndianCurrency(totalValue)}</strong></div>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
        <div className={styles.footerRight}>
          <Button variant="secondary" size="sm" onClick={() => { const order = buildOrder(); whAdd('dispatch', { ...order, status: 'Pending', salesOrderRef: `${order.salesOrderRef} (draft)` }); addToast({ type: 'success', message: `Dispatch ${order.id} saved as draft` }); handleClose(); }}>Save as draft</Button>
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button variant="primary" size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canNext}>
              Next →
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleSubmit}>Create dispatch order</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
