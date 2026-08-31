import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Printer } from 'lucide-react';
import type { PrintJob } from '@/types/warehouse';
import { BarcodeRenderer } from '../BarcodeRenderer/BarcodeRenderer';
import { useToast } from '@/components/common/Toast/ToastContext';
import styles from './LabelPreviewModal.module.css';

interface LabelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: PrintJob | null;
}

export function LabelPreviewModal({ isOpen, onClose, job }: LabelPreviewModalProps) {
  const { addToast } = useToast();
  if (!job) return null;

  const sampleCount = Math.min(job.codeCount, 8);
  const codes = Array.from({ length: sampleCount }, (_, i) =>
    `${job.type === 'Item' ? 'ITM' : job.type === 'Bin' ? 'BIN' : job.type === 'Pallet' ? 'PLT' : job.type === 'Shipment' ? 'SHP' : 'LOC'}-${String(i + 1).padStart(4, '0')}-${job.id.slice(-4)}`
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Print job ${job.id}`} size="xl">
      <div className={styles.headerRow}>
        <div className={styles.headerInfo}>
          <span className={styles.label}>{job.type} labels · {job.format}</span>
          <strong>{job.codeCount} codes · {job.printer}</strong>
        </div>
        <span className={`${styles.statusChip} ${styles[`st_${job.status}`]}`}>{job.status}</span>
      </div>

      <div className={styles.note}>
        Showing the first {sampleCount} of {job.codeCount} labels — all labels in this batch follow the same format.
      </div>

      <div className={styles.grid}>
        {codes.map((code) => (
          <div key={code} className={styles.labelCard}>
            <BarcodeRenderer value={code} format={job.format} width={180} height={60} />
            <div className={styles.labelMeta}>{job.type} label</div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        <div className={styles.footerRight}>
          <Button variant="secondary" size="sm" onClick={() => { console.log('print selected', job.id); addToast({ type: 'success', message: `Printing selected labels from ${job.id}` }); }}>Print selected</Button>
          <Button variant="primary" size="sm" leftIcon={Printer} onClick={() => { console.log('print all', job.id); addToast({ type: 'success', message: `Printing all ${job.codeCount} labels from ${job.id}` }); onClose(); }}>Print all</Button>
        </div>
      </div>
    </Modal>
  );
}
