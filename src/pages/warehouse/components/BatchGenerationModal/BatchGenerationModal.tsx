import { useState, useEffect } from 'react';
import { ListPlus, Download } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import type { BarcodeFormat } from '@/types/warehouse';
import { inventoryItems } from '../../mockData/inventoryData';
import { BarcodeRenderer } from '../BarcodeRenderer/BarcodeRenderer';
import styles from './BatchGenerationModal.module.css';

interface BatchGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { key: 'source',  label: 'Source' },
  { key: 'options', label: 'Format & options' },
  { key: 'preview', label: 'Preview & generate' },
];

type Source = 'inventory' | 'new' | 'custom';
const FORMATS: BarcodeFormat[] = ['CODE128', 'QR', 'EAN13', 'CODE39'];
const SIZES = ['50×30 mm', '75×50 mm', '100×75 mm'];

interface IncludeFlags {
  itemName: boolean;
  batch: boolean;
  expiry: boolean;
  bin: boolean;
  custom: boolean;
}

export function BatchGenerationModal({ isOpen, onClose }: BatchGenerationModalProps) {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<Source>('inventory');
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [pasted, setPasted] = useState('');
  const [customList, setCustomList] = useState('');

  const [format, setFormat] = useState<BarcodeFormat>('CODE128');
  const [labelsPerItem, setLabelsPerItem] = useState('5');
  const [size, setSize] = useState(SIZES[1]);
  const [include, setInclude] = useState<IncludeFlags>({ itemName: true, batch: true, expiry: true, bin: false, custom: false });

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setSource('inventory');
      setSelectedSkus([]);
      setPasted('');
      setCustomList('');
      setFormat('CODE128');
      setLabelsPerItem('5');
      setSize(SIZES[1]);
      setInclude({ itemName: true, batch: true, expiry: true, bin: false, custom: false });
    }
  }, [isOpen]);

  const toggleSku = (sku: string) =>
    setSelectedSkus((p) => p.includes(sku) ? p.filter((x) => x !== sku) : [...p, sku]);

  const itemsForPreview = source === 'inventory'
    ? inventoryItems.filter((i) => selectedSkus.includes(i.sku))
    : source === 'new'
      ? pasted.split(/\n+/).map((s) => s.trim()).filter(Boolean).map((s, _i) => ({ sku: `NEW-${_i + 1}`, name: s, batchNumber: 'TBD', expiryDate: 'TBD', location: { zone: 'TBD', bin: 'TBD' } }))
      : customList.split(/\n+/).map((s) => s.trim()).filter(Boolean).map((s, _i) => ({ sku: s, name: s, batchNumber: 'TBD', expiryDate: 'TBD', location: { zone: 'TBD', bin: 'TBD' } }));

  const totalCount = itemsForPreview.length * (parseInt(labelsPerItem, 10) || 1);

  const submit = (download: boolean) => {
    console.log(download ? 'generate & download PDF' : 'add batch to print queue', {
      source, selectedSkus, pasted, customList, format, labelsPerItem, size, include, totalCount,
    });
    onClose();
  };

  const canNext =
    step === 0 ? (source === 'inventory' ? selectedSkus.length > 0 : source === 'new' ? pasted.trim() !== '' : customList.trim() !== '')
    : step === 1 ? parseInt(labelsPerItem, 10) > 0
    : true;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate codes in batch" size="lg">
      <div className={styles.stepperWrap}>
        <Stepper steps={STEPS} currentStep={step} onStepClick={(i) => setStep(i)} />
      </div>

      {step === 0 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Source selection</h4>
          <div className={styles.radioRow}>
            {(['inventory', 'new', 'custom'] as Source[]).map((s) => (
              <label key={s} className={`${styles.radioCard} ${source === s ? styles.radioActive : ''}`}>
                <input type="radio" name="source" value={s} checked={source === s} onChange={() => setSource(s)} />
                <span>{s === 'inventory' ? 'Existing inventory items' : s === 'new' ? 'New items (paste list)' : 'Custom list'}</span>
              </label>
            ))}
          </div>

          {source === 'inventory' && (
            <div className={styles.field}>
              <span>Select SKUs ({selectedSkus.length} selected)</span>
              <div className={styles.skuList}>
                {inventoryItems.map((it) => (
                  <label key={it.sku} className={`${styles.skuRow} ${selectedSkus.includes(it.sku) ? styles.skuActive : ''}`}>
                    <input type="checkbox" checked={selectedSkus.includes(it.sku)} onChange={() => toggleSku(it.sku)} />
                    <span className={styles.skuMono}>{it.sku}</span>
                    <span className={styles.skuName}>{it.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {source === 'new' && (
            <label className={styles.field}>
              <span>Paste a CSV-like list of items (one per line)</span>
              <textarea className={`${styles.input} ${styles.textarea}`} rows={6} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Cotton hybrid GH-BT-103, 25kg, BT-2026-A20, ..." />
            </label>
          )}

          {source === 'custom' && (
            <label className={styles.field}>
              <span>Custom code values (one per line)</span>
              <textarea className={`${styles.input} ${styles.textarea}`} rows={6} value={customList} onChange={(e) => setCustomList(e.target.value)} placeholder={'CUSTOM-001\nCUSTOM-002\n...'} />
            </label>
          )}
        </section>
      )}

      {step === 1 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Format & options</h4>

          <div className={styles.field}>
            <span>Barcode format</span>
            <div className={styles.radioRow}>
              {FORMATS.map((f) => (
                <label key={f} className={`${styles.radioCard} ${format === f ? styles.radioActive : ''}`}>
                  <input type="radio" name="batch-format" value={f} checked={format === f} onChange={() => setFormat(f)} />
                  <span>{f}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>Labels per item</span>
              <input type="number" className={styles.input} value={labelsPerItem} min={1} onChange={(e) => setLabelsPerItem(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>Label size</span>
              <select className={styles.input} value={size} onChange={(e) => setSize(e.target.value)}>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <div className={styles.field}>
            <span>Include on label</span>
            <div className={styles.checkRow}>
              {(['itemName', 'batch', 'expiry', 'bin', 'custom'] as Array<keyof IncludeFlags>).map((k) => (
                <label key={k} className={`${styles.checkCard} ${include[k] ? styles.checkActive : ''}`}>
                  <input type="checkbox" checked={include[k]} onChange={() => setInclude((p) => ({ ...p, [k]: !p[k] }))} />
                  <span>{k === 'itemName' ? 'Item name' : k === 'batch' ? 'Batch' : k === 'expiry' ? 'Expiry' : k === 'bin' ? 'Bin location' : 'Custom field'}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Preview ({Math.min(itemsForPreview.length, 4)} of {itemsForPreview.length})</h4>
          <div className={styles.previewGrid}>
            {itemsForPreview.slice(0, 4).map((it) => (
              <div key={it.sku} className={styles.previewCard}>
                <BarcodeRenderer value={`ITM-${it.sku}-2026`} format={format} width={180} height={60} />
                {include.itemName && <div className={styles.pName}>{it.name}</div>}
                {include.batch && <div className={styles.pMeta}>Batch <strong>{it.batchNumber}</strong></div>}
                {include.expiry && <div className={styles.pMeta}>Exp <strong>{it.expiryDate}</strong></div>}
                {include.bin && <div className={styles.pMeta}>Bin <strong>{it.location.zone} / {it.location.bin}</strong></div>}
              </div>
            ))}
          </div>

          <div className={styles.totalLine}>
            Will generate <strong>{totalCount}</strong> codes ({itemsForPreview.length} items × {labelsPerItem} labels each).
          </div>
        </section>
      )}

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <div className={styles.footerRight}>
          {step > 0 && <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</Button>}
          {step < STEPS.length - 1 ? (
            <Button variant="primary" size="sm" disabled={!canNext} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next →</Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" leftIcon={ListPlus} onClick={() => submit(false)}>Add to print queue</Button>
              <Button variant="primary" size="sm" leftIcon={Download} onClick={() => submit(true)}>Generate & download PDF</Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
