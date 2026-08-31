import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { CycleCount, AdjustmentReason } from '@/types/warehouse';
import { formatIndianNumber, formatRupees } from '@/utils/formatters';
import type { VarianceDecision } from '../CountReviewModal/CountReviewModal';
import styles from './VarianceApprovalModal.module.css';

interface VarianceApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: CycleCount | null;
  decisions: VarianceDecision[];
  onApprove?: (updatedCount: CycleCount) => void;
}

const REASONS: AdjustmentReason[] = [
  'Cycle count variance',
  'Damaged goods',
  'Expired stock',
  'Theft / shrinkage',
  'Quality rejection',
  'System correction',
  'Other',
];

export function VarianceApprovalModal({ isOpen, onClose, count, decisions, onApprove }: VarianceApprovalModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [reasonOverrides, setReasonOverrides] = useState<Record<string, AdjustmentReason>>({});

  useEffect(() => {
    if (isOpen) {
      setConfirmed(false);
      const initial: Record<string, AdjustmentReason> = {};
      decisions.forEach((d) => { initial[d.lineId] = d.reason; });
      setReasonOverrides(initial);
    }
  }, [isOpen, decisions]);

  if (!count || decisions.length === 0) return null;

  const variances = count.lines.filter((l) => decisions.some((d) => d.lineId === l.id));
  const totalPositive = variances.reduce((s, v) => s + (v.varianceQty > 0 ? Math.abs(v.varianceQty) : 0), 0);
  const totalNegative = variances.reduce((s, v) => s + (v.varianceQty < 0 ? Math.abs(v.varianceQty) : 0), 0);
  const netImpact = count.totalVarianceValue;
  const requiresExtraApproval = variances.some((v) => Math.abs(v.varianceQty * 1000) > 10_000);

  const post = () => {
    const newAdjustments = variances.map((v) => ({
      cycleCountRef: count.id,
      sku: v.itemSku,
      itemName: v.itemName,
      batch: v.batch,
      location: v.location,
      systemQty: v.systemQty,
      actualQty: v.countedQty ?? 0,
      varianceQty: v.varianceQty,
      reason: reasonOverrides[v.id] ?? 'Cycle count variance',
      source: 'Cycle count',
    }));
    console.log('post variances as adjustments', newAdjustments);
    onApprove?.(count);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Post variances — ${count.id}`} size="lg">
      <div className={styles.headerLine}>
        Posting <strong>{variances.length}</strong> variances as stock adjustments.
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryStat}>
          <span>Total positive variance</span>
          <strong className={styles.posText}>+{formatIndianNumber(totalPositive)}</strong>
        </div>
        <div className={styles.summaryStat}>
          <span>Total negative variance</span>
          <strong className={styles.negText}>−{formatIndianNumber(totalNegative)}</strong>
        </div>
        <div className={styles.summaryStat}>
          <span>Net financial impact</span>
          <strong className={netImpact < 0 ? styles.negText : netImpact > 0 ? styles.posText : ''}>
            {netImpact > 0 ? '+' : ''}{formatRupees(netImpact)}
          </strong>
        </div>
      </div>

      <div className={styles.listLabel}>Variances to post</div>
      <ul className={styles.list}>
        {variances.map((v) => (
          <li key={v.id} className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.itemName}>{v.itemName}</span>
              <span className={styles.itemSku}>{v.itemSku} · batch {v.batch} · {v.location}</span>
            </div>
            <div className={styles.rowVar}>
              <span className={`${styles.varQty} ${v.varianceQty < 0 ? styles.negText : styles.posText}`}>
                {v.varianceQty > 0 ? '+' : ''}{formatIndianNumber(v.varianceQty)} {v.itemSku.includes('PK') ? 'pcs' : v.itemSku.includes('CH') ? 'drums' : v.itemSku.includes('LB') ? 'kits' : 'bags'}
              </span>
            </div>
            <select
              className={styles.input}
              value={reasonOverrides[v.id] ?? 'Cycle count variance'}
              onChange={(e) => setReasonOverrides((m) => ({ ...m, [v.id]: e.target.value as AdjustmentReason }))}
            >
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </li>
        ))}
      </ul>

      {requiresExtraApproval && (
        <div className={styles.routingBanner}>
          Adjustments above ₹10K will require additional approval from Procurement Head.
        </div>
      )}

      <label className={styles.confirmRow}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        <span>I confirm physical counts are accurate and approve posting these adjustments.</span>
      </label>

      <div className={styles.noteCard}>
        <CheckCircle2 size={14} className={styles.noteIcon} />
        <p>Posting will create <strong>{variances.length}</strong> stock adjustment records linked to {count.id}, marking the cycle count as completed.</p>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" disabled={!confirmed} onClick={post}>
          Post to inventory
        </Button>
      </div>
    </Modal>
  );
}
