import { useState, useEffect } from 'react';
import { Camera, Check } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { ReturnRecord, ReturnDisposition, ReturnLineItem } from '@/types/warehouse';
import styles from './ReturnInspectionModal.module.css';

interface ReturnInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ReturnRecord | null;
  onComplete: (record: ReturnRecord) => void;
}

const CONDITIONS: ReturnLineItem['conditionAssessment'][] = ['Good', 'Damaged', 'Defective', 'Not assessed'];
const DISPOSITIONS: ReturnDisposition[] = ['Restock', 'Quarantine', 'Rework', 'Dispose', 'Return to supplier', 'Pending decision'];

export function ReturnInspectionModal({ isOpen, onClose, record, onComplete }: ReturnInspectionModalProps) {
  const [lines, setLines] = useState<ReturnLineItem[]>([]);
  const [bulkCondition, setBulkCondition] = useState<ReturnLineItem['conditionAssessment']>('Good');
  const [bulkDisposition, setBulkDisposition] = useState<ReturnDisposition>('Restock');

  useEffect(() => {
    if (isOpen && record) setLines(record.lineItems.map((l) => ({ ...l })));
  }, [isOpen, record]);

  if (!record) return null;

  const setLine = (idx: number, patch: Partial<ReturnLineItem>) =>
    setLines((p) => p.map((l, i) => i === idx ? { ...l, ...patch } : l));

  const applyBulk = () => {
    setLines((p) => p.map((l) => l.conditionAssessment === 'Not assessed' ? { ...l, conditionAssessment: bulkCondition, itemDisposition: bulkDisposition } : l));
  };

  const inspectedCount = lines.filter((l) => l.conditionAssessment !== 'Not assessed' && l.itemDisposition !== 'Pending decision').length;
  const allInspected = inspectedCount === lines.length;
  const allValid = lines.every((l) => l.conditionAssessment === 'Good' || (l.inspectionNotes ?? '').trim() !== '');

  const submit = () => {
    console.log('complete inspection', record.id, lines);
    onComplete({ ...record, lineItems: lines, status: 'Disposition pending' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Inspection — ${record.id}`} size="xl">
      <div className={styles.headerCard}>
        <div>
          <h3 className={styles.headerTitle}>{record.party}</h3>
          <span className={styles.headerMeta}>{record.direction} · ref {record.reference} · reason: {record.reason}</span>
        </div>
        <span className={styles.statusChip}>{record.status}</span>
      </div>

      {record.photos.length > 0 && (
        <div className={styles.photosSection}>
          <h4 className={styles.sectionTitle}>Photo evidence</h4>
          <div className={styles.photoGrid}>
            {record.photos.map((p, i) => (
              <div key={p} className={styles.photoTile}>
                <Camera size={20} />
                <span>Photo {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.linesSection}>
        <h4 className={styles.sectionTitle}>Line-by-line inspection</h4>

        {lines.map((line, idx) => {
          const inspected = line.conditionAssessment !== 'Not assessed' && line.itemDisposition !== 'Pending decision';
          const needsNotes = line.conditionAssessment === 'Damaged' || line.conditionAssessment === 'Defective';
          return (
            <div key={idx} className={`${styles.lineCard} ${inspected ? styles.lineInspected : ''}`}>
              <div className={styles.lineHeader}>
                <div>
                  <div className={styles.lineName}>{line.itemName}</div>
                  <div className={styles.lineMeta}>
                    SKU <span className={styles.mono}>{line.sku}</span> · Batch <span className={styles.mono}>{line.batch}</span> · Returned {line.returnedQty} of {line.originalQty} {line.uom}
                  </div>
                </div>
                {inspected && <span className={styles.inspectedChip}><Check size={11} /> Inspected</span>}
              </div>

              <div className={styles.lineRow}>
                <div className={styles.field}>
                  <span>Condition <span className={styles.required}>*</span></span>
                  <div className={styles.radioRow}>
                    {CONDITIONS.filter((c) => c !== 'Not assessed').map((c) => (
                      <label key={c} className={`${styles.radioCard} ${line.conditionAssessment === c ? styles.radioActive : ''}`}>
                        <input type="radio" name={`cond-${idx}`} checked={line.conditionAssessment === c} onChange={() => setLine(idx, { conditionAssessment: c })} />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <span>Disposition <span className={styles.required}>*</span></span>
                  <select className={styles.input} value={line.itemDisposition} onChange={(e) => setLine(idx, { itemDisposition: e.target.value as ReturnDisposition })}>
                    {DISPOSITIONS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {needsNotes && (
                <label className={styles.field}>
                  <span>Inspection notes <span className={styles.required}>(required for {line.conditionAssessment})</span></span>
                  <textarea
                    className={`${styles.input} ${styles.textarea}`}
                    rows={2}
                    value={line.inspectionNotes ?? ''}
                    onChange={(e) => setLine(idx, { inspectionNotes: e.target.value })}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.bulkBar}>
        <span className={styles.bulkLabel}>Apply to all unassessed lines:</span>
        <select className={styles.input} value={bulkCondition} onChange={(e) => setBulkCondition(e.target.value as ReturnLineItem['conditionAssessment'])}>
          {CONDITIONS.filter((c) => c !== 'Not assessed').map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className={styles.input} value={bulkDisposition} onChange={(e) => setBulkDisposition(e.target.value as ReturnDisposition)}>
          {DISPOSITIONS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <Button variant="secondary" size="sm" onClick={applyBulk}>Apply</Button>
      </div>

      <div className={styles.footer}>
        <span className={styles.progress}><strong>{inspectedCount}</strong> of {lines.length} items inspected</span>
        <div className={styles.footerRight}>
          <Button variant="ghost" size="sm" onClick={onClose}>Save & continue later</Button>
          <Button variant="primary" size="sm" disabled={!allInspected || !allValid} onClick={submit}>
            Complete inspection
          </Button>
        </div>
      </div>
    </Modal>
  );
}
