import { useState, useEffect } from 'react';
import { Truck, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { ASN } from '@/types/warehouse';
import styles from './GrnReceiveModal.module.css';

interface GrnReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  asn: ASN | null;
}

interface FormState {
  vehicleNumber: string;
  dock: string;
  driverName: string;
  driverPhone: string;
  grossWeight: string;
  tareWeight: string;
  receivedQty: string;
  damagedQty: string;
  notes: string;
}

const EMPTY: FormState = {
  vehicleNumber: '',
  dock: 'Dock 1',
  driverName: '',
  driverPhone: '',
  grossWeight: '',
  tareWeight: '',
  receivedQty: '',
  damagedQty: '0',
  notes: '',
};

export function GrnReceiveModal({ isOpen, onClose, asn }: GrnReceiveModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (isOpen && asn) {
      setForm({
        ...EMPTY,
        vehicleNumber: asn.vehicleNumber ?? '',
        dock: asn.dockAssigned ?? 'Dock 1',
        driverName: asn.driverName ?? '',
        driverPhone: asn.driverPhone ?? '',
        receivedQty: String(asn.totalQuantity),
      });
    }
  }, [isOpen, asn]);

  if (!asn) return null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const gross = parseFloat(form.grossWeight);
  const tare = parseFloat(form.tareWeight);
  const netWeight = Number.isFinite(gross) && Number.isFinite(tare) && gross > tare
    ? (gross - tare).toFixed(1)
    : '—';

  const received = parseFloat(form.receivedQty);
  const damaged = parseFloat(form.damagedQty);
  const accepted = Number.isFinite(received) && Number.isFinite(damaged)
    ? Math.max(0, received - damaged).toString()
    : '—';

  let qtyValidation: { kind: 'short' | 'over' | 'ok'; msg: string } = { kind: 'ok', msg: '' };
  if (Number.isFinite(received)) {
    if (received < asn.totalQuantity) {
      qtyValidation = {
        kind: 'short',
        msg: `Below expected (${asn.totalQuantity - received} ${asn.uom} short)`,
      };
    } else if (received > asn.totalQuantity) {
      qtyValidation = {
        kind: 'over',
        msg: `Exceeds expected by ${received - asn.totalQuantity} ${asn.uom}`,
      };
    }
  }

  const submit = () => {
    console.log('create grn for asn', asn.id, { ...form, netWeight, accepted });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive goods" size="lg">
      <div className={styles.headerCard}>
        <div className={styles.headerIcon}><Truck size={20} /></div>
        <div>
          <h3 className={styles.headerTitle}>Receive goods</h3>
          <p className={styles.headerMeta}>
            {asn.id} · {asn.supplier} · PO {asn.poReference}
          </p>
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Vehicle entry</h4>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>Vehicle number</span>
            <input
              type="text"
              className={styles.input}
              placeholder="TS-09-AB-1234"
              value={form.vehicleNumber}
              onChange={(e) => set('vehicleNumber', e.target.value.toUpperCase())}
            />
          </label>
          <label className={styles.field}>
            <span>Dock used</span>
            <select className={styles.input} value={form.dock} onChange={(e) => set('dock', e.target.value)}>
              <option value="Dock 1">Dock 1</option>
              <option value="Dock 2">Dock 2</option>
              <option value="Dock 3">Dock 3</option>
              <option value="Dock 4">Dock 4</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Driver name</span>
            <input
              type="text"
              className={styles.input}
              value={form.driverName}
              onChange={(e) => set('driverName', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Driver phone</span>
            <input
              type="tel"
              className={styles.input}
              placeholder="+91 ..."
              value={form.driverPhone}
              onChange={(e) => set('driverPhone', e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Weighbridge</h4>
        <div className={styles.grid3}>
          <label className={styles.field}>
            <span>Gross weight (kg)</span>
            <input
              type="number"
              className={styles.input}
              value={form.grossWeight}
              onChange={(e) => set('grossWeight', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Tare weight (kg)</span>
            <input
              type="number"
              className={styles.input}
              value={form.tareWeight}
              onChange={(e) => set('tareWeight', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabelMuted}>Net weight (kg) <em>auto-computed</em></span>
            <div className={styles.computed}>{netWeight}</div>
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Quantity received</h4>
        <div className={styles.expectedNote}>
          Expected from ASN: <strong>{asn.totalQuantity} {asn.uom}</strong> · {asn.items} items
        </div>
        <div className={styles.grid3}>
          <label className={styles.field}>
            <span>Received quantity</span>
            <input
              type="number"
              className={styles.input}
              value={form.receivedQty}
              onChange={(e) => set('receivedQty', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Damaged quantity</span>
            <input
              type="number"
              className={styles.input}
              value={form.damagedQty}
              onChange={(e) => set('damagedQty', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabelMuted}>Accepted quantity <em>computed</em></span>
            <div className={styles.computed}>{accepted}</div>
          </label>
        </div>
        {qtyValidation.kind !== 'ok' && (
          <div className={`${styles.validationMsg} ${qtyValidation.kind === 'short' ? styles.validationShort : styles.validationOver}`}>
            {qtyValidation.msg}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Receipt notes</h4>
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          rows={3}
          placeholder="Any observations about packaging, seals, condition..."
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      <div className={styles.summaryCard}>
        <CheckCircle2 size={16} className={styles.summaryIcon} />
        <p>
          Submitting will create a GRN, route the goods to staging, and queue putaway tasks.
          Quality inspection will be triggered automatically.
        </p>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={submit}>
          Create GRN & route to staging
        </Button>
      </div>
    </Modal>
  );
}
