import { useState, useMemo } from 'react';
import { Printer, ListPlus, Download } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import type { LabelType, BarcodeFormat } from '@/types/warehouse';
import { BarcodeRenderer } from '../BarcodeRenderer/BarcodeRenderer';
import { inventoryItems } from '../../mockData/inventoryData';
import { bins, buildBinCode } from '../../mockData/storageData';
import styles from './QuickGeneratorCard.module.css';

const LABEL_TYPES: LabelType[] = ['Item', 'Bin', 'Location', 'Pallet', 'Shipment'];
const FORMATS: BarcodeFormat[] = ['CODE128', 'QR', 'EAN13', 'CODE39'];

import { usePermission } from '@/hooks/usePermission';

import { printDocument } from '@/utils/fileExport';
import { queuePrint } from '../../warehouseStore';
export function QuickGeneratorCard() {
  const { addToast } = useToast();
  const [type, setType] = useState<LabelType>('Item');
  const [format, setFormat] = useState<BarcodeFormat>('CODE128');
  const [linkedTo, setLinkedTo] = useState('');
  const [quantity, setQuantity] = useState('1');
  const canPrint = usePermission('print_barcode_labels');

  const resetForm = () => {
    setType('Item');
    setFormat('CODE128');
    setLinkedTo('');
    setQuantity('1');
  };

  const options = useMemo(() => {
    if (type === 'Item') return inventoryItems.map((i) => ({ value: i.sku, label: `${i.sku} — ${i.name}` }));
    if (type === 'Bin') return bins.map((b) => ({ value: buildBinCode(b.zone, b.rack, b.shelf, b.bin), label: buildBinCode(b.zone, b.rack, b.shelf, b.bin) }));
    if (type === 'Location') return [
      { value: 'DOCK-1', label: 'Receiving Dock 1' },
      { value: 'DOCK-2', label: 'Receiving Dock 2' },
      { value: 'DISP-1', label: 'Dispatch Bay 1' },
      { value: 'QA-LAB', label: 'Quality lab' },
    ];
    if (type === 'Pallet') return Array.from({ length: 6 }, (_, i) => ({ value: `PLT-${String(i + 1).padStart(3, '0')}`, label: `Pallet ${String(i + 1).padStart(3, '0')}` }));
    return [
      { value: 'DO-2026-0411', label: 'DO-2026-0411 · AgriDealer Hub' },
      { value: 'DO-2026-0412', label: 'DO-2026-0412 · GreenField Distributors' },
      { value: 'DO-2026-0408', label: 'DO-2026-0408 · Sahyadri Agri Stores' },
    ];
  }, [type]);

  const generatedCode = useMemo(() => {
    if (!linkedTo) return '';
    const prefix =
      type === 'Item' ? 'ITM'
      : type === 'Bin' ? 'BIN'
      : type === 'Location' ? 'LOC'
      : type === 'Pallet' ? 'PLT'
      : 'SHP';
    return `${prefix}-${linkedTo}-2026`;
  }, [type, linkedTo]);

  const linkedItem = type === 'Item' ? inventoryItems.find((i) => i.sku === linkedTo) : null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Quick generate</h3>
        <span className={styles.subtitle}>One-off codes & labels</span>
      </div>

      <div className={styles.field}>
        <span>Label type</span>
        <div className={styles.radioRow}>
          {LABEL_TYPES.map((t) => (
            <label key={t} className={`${styles.radioCard} ${type === t ? styles.radioActive : ''}`}>
              <input type="radio" name="qg-type" value={t} checked={type === t} onChange={() => { setType(t); setLinkedTo(''); }} />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <span>Format</span>
        <div className={styles.radioRow}>
          {FORMATS.map((f) => (
            <label key={f} className={`${styles.radioCard} ${format === f ? styles.radioActive : ''}`}>
              <input type="radio" name="qg-format" value={f} checked={format === f} onChange={() => setFormat(f)} />
              <span>{f}</span>
            </label>
          ))}
        </div>
      </div>

      <label className={styles.field}>
        <span>Linked to</span>
        <select className={styles.input} value={linkedTo} onChange={(e) => setLinkedTo(e.target.value)}>
          <option value="">Select {type.toLowerCase()}…</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <label className={styles.field}>
        <span>Quantity</span>
        <input
          type="number"
          className={styles.input}
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>

      <div className={styles.previewCard}>
        <div className={styles.previewLabel}>Live preview</div>
        {generatedCode ? (
          <>
            <BarcodeRenderer value={generatedCode} format={format} width={200} height={70} />
            {linkedItem && (
              <div className={styles.simulatedLabel}>
                <div className={styles.labelName}>{linkedItem.name}</div>
                <div className={styles.labelMeta}>
                  Batch <strong className={styles.mono}>{linkedItem.batchNumber}</strong>
                </div>
                <div className={styles.labelMeta}>
                  Expiry <strong>{linkedItem.expiryDate}</strong>
                </div>
                <div className={styles.labelMeta}>
                  Bin <strong className={styles.mono}>{linkedItem.location.zone} / {linkedItem.location.bin}</strong>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.previewEmpty}>Choose a {type.toLowerCase()} to preview the label.</div>
        )}
      </div>

      {canPrint && (
        <div className={styles.actions}>
          <Button variant="primary" size="sm" leftIcon={Printer} onClick={() => { queuePrint(type, Number(quantity) || 1, format); printDocument(`Label ${generatedCode}`, [{ fields: [['Code', generatedCode], ['Type', type], ['Linked to', linkedTo || '—'], ['Copies', quantity]] }], String(format)); addToast({ type: 'success', message: `Printing ${quantity} label${quantity === '1' ? '' : 's'} to Printer-WH01` }); resetForm(); }} disabled={!generatedCode}>Print now</Button>
          <Button variant="secondary" size="sm" leftIcon={ListPlus} onClick={() => { queuePrint(type, Number(quantity) || 1, format); addToast({ type: 'success', message: `Added ${quantity} label${quantity === '1' ? '' : 's'} to print queue` }); resetForm(); }} disabled={!generatedCode}>Add to queue</Button>
          <Button variant="ghost" size="sm" leftIcon={Download} onClick={() => { printDocument(`Label ${generatedCode}`, [{ fields: [['Code', generatedCode], ['Type', type], ['Linked to', linkedTo || '—'], ['Copies', quantity]] }], String(format)); addToast({ type: 'success', message: 'Label sheet opened — choose “Save as PDF” in the print dialog' }); resetForm(); }} disabled={!generatedCode}>Download PDF</Button>
        </div>
      )}
    </div>
  );
}
