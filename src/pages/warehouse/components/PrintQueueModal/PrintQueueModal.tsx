import { useState } from 'react';
import { Printer, RefreshCw, X as XIcon, Play } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import type { PrintJob } from '@/types/warehouse';
import styles from './PrintQueueModal.module.css';

interface PrintQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: PrintJob[];
}

function statusClass(s: PrintJob['status']): string {
  switch (s) {
    case 'Queued':    return styles.stQueued;
    case 'Printing':  return styles.stPrinting;
    case 'Completed': return styles.stCompleted;
    case 'Failed':    return styles.stFailed;
  }
}

export function PrintQueueModal({ isOpen, onClose, jobs }: PrintQueueModalProps) {
  const { addToast } = useToast();
  const { items, update, remove } = useRealtimeMockStore<PrintJob>(jobs, 'warehouse.print_jobs');
  const [confirmAll, setConfirmAll] = useState(false);

  if (!isOpen) return null;

  const queued = items.filter((j) => j.status === 'Queued');
  const totalLabels = queued.reduce((s, j) => s + j.codeCount, 0);

  const handlePrintAll = () => {
    queued.forEach((j) => update(j.id, { status: 'Printing' }));
    addToast({ type: 'success', message: `Printing ${queued.length} jobs (${totalLabels} labels total)` });
    setConfirmAll(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print queue" size="lg">
      <div className={styles.headerRow}>
        <div>
          <span className={styles.summaryStat}><strong>{items.length}</strong> total jobs</span>
          <span className={styles.dot}>·</span>
          <span className={styles.summaryStat}><strong>{queued.length}</strong> queued</span>
          <span className={styles.dot}>·</span>
          <span className={styles.summaryStat}><strong>{totalLabels}</strong> labels pending</span>
        </div>
        <Button variant="primary" size="sm" leftIcon={Printer} disabled={queued.length === 0} onClick={() => setConfirmAll(true)}>
          Print all queued
        </Button>
      </div>

      {confirmAll && (
        <div className={styles.confirmBar}>
          Confirm print all {queued.length} queued jobs ({totalLabels} labels)?
          <div className={styles.confirmActions}>
            <Button variant="ghost" size="sm" onClick={() => setConfirmAll(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handlePrintAll}>Confirm</Button>
          </div>
        </div>
      )}

      <div className={styles.listWrap}>
        {items.length === 0 ? (
          <div className={styles.empty}>No print jobs in queue.</div>
        ) : items.map((job) => (
          <div key={job.id} className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.jobId}>{job.id}</span>
              <span className={styles.jobMeta}>
                <strong>{job.codeCount}</strong> {job.type.toLowerCase()} labels · {job.format} · {job.printer}
              </span>
              <span className={styles.jobMeta}>
                Initiated by <strong>{job.initiatedBy}</strong> · {job.initiatedAt}
              </span>
            </div>
            <span className={`${styles.statusChip} ${statusClass(job.status)}`}>{job.status}</span>
            <div className={styles.rowActions}>
              {job.status === 'Queued' && (
                <Button variant="primary" size="sm" leftIcon={Play} onClick={() => { update(job.id, { status: 'Printing' }); addToast({ type: 'success', message: `Printing ${job.id}` }); }}>Print now</Button>
              )}
              {job.status === 'Printing' && (
                <Button variant="ghost" size="sm" onClick={() => { update(job.id, { status: 'Queued' }); addToast({ type: 'info', message: `${job.id} returned to queue` }); }}>Pause</Button>
              )}
              {job.status === 'Failed' && (
                <Button variant="secondary" size="sm" leftIcon={RefreshCw} onClick={() => { update(job.id, { status: 'Queued' }); addToast({ type: 'info', message: `Retry queued for ${job.id}` }); }}>Retry</Button>
              )}
              {(job.status === 'Queued' || job.status === 'Failed') && (
                <button className={styles.cancelBtn} aria-label="Cancel" onClick={() => { remove(job.id); addToast({ type: 'warning', message: `${job.id} removed from queue` }); }}>
                  <XIcon size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
