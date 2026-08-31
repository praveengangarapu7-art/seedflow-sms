import { useState } from 'react';
import { Download, Upload, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { useToast } from '@/components/common/Toast/ToastContext';
import styles from './BulkImportModal.module.css';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { key: 'template', label: 'Download template' },
  { key: 'upload',   label: 'Upload file' },
  { key: 'preview',  label: 'Preview & validate' },
  { key: 'confirm',  label: 'Confirm import' },
];

const SAMPLE_PREVIEW = [
  { sku: 'SD-MZ-204',    name: 'Maize hybrid GH-M-204',           category: 'Finished Seeds', qty: 240, uom: 'bags',  status: 'valid'   as const, message: '' },
  { sku: 'SD-CT-102-A',  name: 'Cotton hybrid GH-BT-102 Foundation', category: 'Finished Seeds', qty: 180, uom: 'bags',  status: 'valid'   as const, message: '' },
  { sku: 'SD-PD-IR64-F', name: 'Paddy IR-64 Foundation',          category: 'Finished Seeds', qty: 320, uom: 'bags',  status: 'valid'   as const, message: '' },
  { sku: 'SD-SF-S88',    name: 'Sunflower S-88 hybrid',           category: 'Finished Seeds', qty: 95,  uom: 'bags',  status: 'warning' as const, message: 'Reorder point not provided — using default' },
  { sku: 'CH-FG-010',    name: 'Fungicide concentrate 10 L',      category: 'Chemicals',      qty: 24,  uom: 'drums', status: 'valid'   as const, message: '' },
  { sku: '',             name: 'Unknown item',                    category: 'Raw Material',   qty: 12,  uom: 'kg',    status: 'error'   as const, message: 'SKU is required' },
];

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileName(f.name);
      addToast({ type: 'info', message: `${f.name} parsed — ${SAMPLE_PREVIEW.length} rows ready for review` });
      setStep(2);
    }
  };

  const handleDownloadTemplate = () => {
    addToast({ type: 'success', message: 'Template inventory-import-template.csv downloaded' });
  };

  const handleConfirm = () => {
    const validCount = SAMPLE_PREVIEW.filter((r) => r.status === 'valid').length;
    addToast({ type: 'success', message: `Imported ${validCount} items successfully` });
    setStep(0);
    setFileName(null);
    onClose();
  };

  const validCount = SAMPLE_PREVIEW.filter((r) => r.status === 'valid').length;
  const warningCount = SAMPLE_PREVIEW.filter((r) => r.status === 'warning').length;
  const errorCount = SAMPLE_PREVIEW.filter((r) => r.status === 'error').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk import items" size="lg">
      <div className={styles.stepperWrap}>
        <Stepper steps={STEPS} currentStep={step} onStepClick={(i) => setStep(i)} />
      </div>

      {step === 0 && (
        <div className={styles.section}>
          <div className={styles.iconRow}><FileSpreadsheet size={32} /></div>
          <h4 className={styles.sectionTitle}>Step 1: Download the import template</h4>
          <p className={styles.helper}>The template includes all required columns: SKU, Name, Category, Variety, Batch, Lot, Quantity, UoM, Location, Status, Expiry, Valuation method, Unit cost, Reorder point, ABC class, Supplier.</p>
          <Button variant="primary" leftIcon={Download} onClick={handleDownloadTemplate}>Download CSV template</Button>
        </div>
      )}

      {step === 1 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Step 2: Upload your filled template</h4>
          <p className={styles.helper}>CSV files only. Maximum 5 MB.</p>
          <label className={styles.dropzone}>
            <input type="file" accept=".csv" onChange={handleFile} className={styles.fileInput} />
            <Upload size={28} />
            <span>{fileName ?? 'Click to select a CSV file'}</span>
          </label>
        </div>
      )}

      {step === 2 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Step 3: Preview & validate</h4>
          <div className={styles.summaryRow}>
            <span className={styles.summaryChipValid}>{validCount} valid</span>
            <span className={styles.summaryChipWarn}>{warningCount} warning</span>
            <span className={styles.summaryChipError}>{errorCount} error</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>SKU</th><th>Name</th><th>Category</th><th>Qty</th><th>UoM</th><th>Status</th></tr>
              </thead>
              <tbody>
                {SAMPLE_PREVIEW.map((r, i) => (
                  <tr key={i} className={styles[`row_${r.status}`]}>
                    <td className={styles.mono}>{r.sku || '—'}</td>
                    <td>{r.name}</td>
                    <td>{r.category}</td>
                    <td>{r.qty}</td>
                    <td>{r.uom}</td>
                    <td>
                      <span className={styles[`chip_${r.status}`]}>{r.status}</span>
                      {r.message && <span className={styles.message}> {r.message}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={styles.section}>
          <div className={styles.iconRow}><CheckCircle2 size={32} className={styles.successIcon} /></div>
          <h4 className={styles.sectionTitle}>Ready to import</h4>
          <p className={styles.helper}>{validCount} items will be imported. Rows with errors will be skipped. You can re-upload after fixing them.</p>
        </div>
      )}

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <div className={styles.footerRight}>
          {step > 0 && <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</Button>}
          {step < STEPS.length - 1 ? (
            <Button variant="primary" size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next →</Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleConfirm}>Import {validCount} items</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
