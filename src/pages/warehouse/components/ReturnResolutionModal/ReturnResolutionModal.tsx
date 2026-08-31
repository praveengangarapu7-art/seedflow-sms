import { useState, useEffect } from 'react';
import { FileText, Receipt, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { ReturnRecord, ReturnDisposition } from '@/types/warehouse';
import { formatIndianCurrency } from '@/utils/formatters';
import styles from './ReturnResolutionModal.module.css';

interface ReturnResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ReturnRecord | null;
  onResolve?: (updated: ReturnRecord) => void;
}

const DISPOSITIONS: ReturnDisposition[] = ['Restock', 'Quarantine', 'Rework', 'Dispose', 'Return to supplier'];

export function ReturnResolutionModal({ isOpen, onClose, record, onResolve }: ReturnResolutionModalProps) {
  const [overallDisposition, setOverallDisposition] = useState<ReturnDisposition>('Restock');
  const [refundProcessed, setRefundProcessed] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank transfer');
  const [restockingFee, setRestockingFee] = useState(false);
  const [restockingPct, setRestockingPct] = useState('5');
  const [creditNoteRef, setCreditNoteRef] = useState('');
  const [debitNoteRef, setDebitNoteRef] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [replacementRequested, setReplacementRequested] = useState(false);
  const [replacementDate, setReplacementDate] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    if (isOpen && record) {
      const counts: Record<ReturnDisposition, number> = { Restock: 0, Quarantine: 0, Rework: 0, Dispose: 0, 'Return to supplier': 0, 'Pending decision': 0 };
      record.lineItems.forEach((l) => { counts[l.itemDisposition] = (counts[l.itemDisposition] ?? 0) + 1; });
      const top = (Object.entries(counts) as Array<[ReturnDisposition, number]>).sort((a, b) => b[1] - a[1])[0];
      setOverallDisposition(top?.[0] === 'Pending decision' ? 'Restock' : (top?.[0] ?? 'Restock'));
      setRefundProcessed(false);
      setRefundAmount(String(record.totalValue));
      setPaymentMethod('Bank transfer');
      setRestockingFee(false);
      setRestockingPct('5');
      setCreditNoteRef('');
      setDebitNoteRef('');
      setCreditAmount(String(record.totalValue));
      setReplacementRequested(false);
      setReplacementDate('');
      setResolutionNotes('');
    }
  }, [isOpen, record]);

  if (!record) return null;

  const goodCount = record.lineItems.filter((l) => l.conditionAssessment === 'Good').length;
  const damagedCount = record.lineItems.filter((l) => l.conditionAssessment === 'Damaged').length;
  const defectiveCount = record.lineItems.filter((l) => l.conditionAssessment === 'Defective').length;
  const restockableValue = record.lineItems.filter((l) => l.itemDisposition === 'Restock').reduce((s, l) => s + l.returnedQty * l.unitPrice, 0);

  const refundNum = parseFloat(refundAmount) || 0;
  const restockingFeeAmount = restockingFee ? refundNum * (parseFloat(restockingPct) / 100 || 0) : 0;
  const finalRefund = Math.max(0, refundNum - restockingFeeAmount);

  const generateCreditNote = () => {
    const ref = `CN-2026-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
    setCreditNoteRef(ref);
    console.log('generated credit note', ref);
  };

  const generateDebitNote = () => {
    const ref = `DN-2026-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
    setDebitNoteRef(ref);
    console.log('generated debit note', ref);
  };

  const submit = () => {
    if (!resolutionNotes.trim() || !record) return;
    
    const updated: ReturnRecord = {
      ...record,
      status: 'Resolved',
      disposition: overallDisposition,
      resolvedBy: 'Nitin R.',
      notes: resolutionNotes,
      resolutionTimeline: [
        ...record.resolutionTimeline,
        { stage: 'Resolved', timestamp: new Date().toISOString(), user: 'Nitin R.', comment: resolutionNotes }
      ]
    };

    console.log('resolve return', record.id, {
      overallDisposition,
      refundProcessed, refundAmount: finalRefund, paymentMethod, restockingFeeAmount,
      creditNoteRef, debitNoteRef, creditAmount,
      replacementRequested, replacementDate,
      resolutionNotes,
    });
    
    onResolve?.(updated);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Resolve return — ${record.id}`} size="lg">
      <div className={styles.headerCard}>
        <span className={styles.statusChip}>{record.status}</span>
        <strong>{record.party}</strong>
        <span className={styles.subtle}>· {record.direction}</span>
      </div>

      <div className={styles.summaryCard}>
        <h4 className={styles.sectionTitle}>Inspection summary</h4>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryStat}><span>Total items</span><strong>{record.lineItems.length}</strong></div>
          <div className={styles.summaryStat}><span>Good</span><strong className={styles.goodText}>{goodCount}</strong></div>
          <div className={styles.summaryStat}><span>Damaged</span><strong className={styles.warnText}>{damagedCount}</strong></div>
          <div className={styles.summaryStat}><span>Defective</span><strong className={styles.dangerText}>{defectiveCount}</strong></div>
          <div className={styles.summaryStat}><span>Restockable value</span><strong>{formatIndianCurrency(restockableValue)}</strong></div>
        </div>
      </div>

      <label className={styles.field}>
        <span>Overall disposition</span>
        <select className={styles.input} value={overallDisposition} onChange={(e) => setOverallDisposition(e.target.value as ReturnDisposition)}>
          {DISPOSITIONS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </label>

      {record.direction === 'Customer return' ? (
        <div className={styles.financialBlock}>
          <h4 className={styles.sectionTitle}>Customer settlement</h4>

          <label className={styles.toggleRow}>
            <input type="checkbox" checked={refundProcessed} onChange={(e) => setRefundProcessed(e.target.checked)} />
            <span>Refund processed</span>
          </label>

          {refundProcessed && (
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span>Refund amount (₹)</span>
                <input type="number" className={styles.input} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Payment method</span>
                <select className={styles.input} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option>Bank transfer</option>
                  <option>UPI</option>
                  <option>Cheque</option>
                  <option>Credit note only</option>
                </select>
              </label>
            </div>
          )}

          <div className={styles.creditRow}>
            {creditNoteRef ? (
              <span className={styles.creditNoteRef}>
                <Receipt size={14} /> Credit note: <strong>{creditNoteRef}</strong>
              </span>
            ) : (
              <Button variant="secondary" size="sm" leftIcon={Receipt} onClick={generateCreditNote}>
                Generate credit note
              </Button>
            )}
          </div>

          <label className={styles.toggleRow}>
            <input type="checkbox" checked={restockingFee} onChange={(e) => setRestockingFee(e.target.checked)} />
            <span>Restocking fee</span>
          </label>

          {restockingFee && (
            <label className={styles.field}>
              <span>Fee percentage</span>
              <input type="number" className={styles.input} value={restockingPct} onChange={(e) => setRestockingPct(e.target.value)} />
            </label>
          )}

          {refundProcessed && (
            <div className={styles.calcStrip}>
              Refund: <strong>{formatIndianCurrency(refundNum)}</strong>
              {restockingFee && (<>− Fee: <strong>{formatIndianCurrency(restockingFeeAmount)}</strong></>)}
              = <strong className={styles.finalAmt}>{formatIndianCurrency(finalRefund)}</strong> to customer
            </div>
          )}
        </div>
      ) : (
        <div className={styles.financialBlock}>
          <h4 className={styles.sectionTitle}>Supplier settlement</h4>

          <div className={styles.creditRow}>
            {debitNoteRef ? (
              <span className={styles.creditNoteRef}>
                <FileText size={14} /> Debit note: <strong>{debitNoteRef}</strong>
              </span>
            ) : (
              <Button variant="secondary" size="sm" leftIcon={FileText} onClick={generateDebitNote}>
                Generate debit note
              </Button>
            )}
          </div>

          <label className={styles.field}>
            <span>Credit expected from supplier (₹)</span>
            <input type="number" className={styles.input} value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
          </label>

          <label className={styles.toggleRow}>
            <input type="checkbox" checked={replacementRequested} onChange={(e) => setReplacementRequested(e.target.checked)} />
            <span>Replacement requested</span>
          </label>

          {replacementRequested && (
            <label className={styles.field}>
              <span>Expected delivery date</span>
              <input type="text" className={styles.input} value={replacementDate} onChange={(e) => setReplacementDate(e.target.value)} placeholder="DD MMM YYYY" />
            </label>
          )}
        </div>
      )}

      <div className={styles.movementCard}>
        <h4 className={styles.sectionTitle}>Stock movement preview</h4>
        <ul className={styles.movementList}>
          <li>Restockable items will move to: <strong>Available</strong></li>
          <li>Quarantined items will move to: <strong>Quarantine zone</strong></li>
          <li>Disposed items will be written off via stock adjustment</li>
          <li>"Return to supplier" items will move to: <strong>Dispatch Bay</strong></li>
        </ul>
      </div>

      <label className={styles.field}>
        <span>Resolution notes <span className={styles.required}>*</span></span>
        <textarea className={`${styles.input} ${styles.textarea}`} rows={3} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} required />
      </label>

      <div className={styles.confirmCard}>
        <CheckCircle2 size={14} className={styles.confirmIcon} />
        <p>Resolving will update inventory, generate stock movements, and finalize this return.</p>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" disabled={!resolutionNotes.trim()} onClick={submit}>Resolve return</Button>
      </div>
    </Modal>
  );
}
