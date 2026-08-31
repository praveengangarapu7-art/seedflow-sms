import { useState, useEffect, useMemo } from 'react';
import { Check, RotateCw, Search } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { CycleCount, AdjustmentReason } from '@/types/warehouse';
import { formatIndianNumber, formatRupees } from '@/utils/formatters';
import styles from './CountReviewModal.module.css';

interface CountReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: CycleCount | null;
  onPostVariances: (count: CycleCount, decisions: VarianceDecision[]) => void;
}

export interface VarianceDecision {
  lineId: string;
  reason: AdjustmentReason;
  action: 'approve' | 'recount' | 'investigate';
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

export function CountReviewModal({ isOpen, onClose, count, onPostVariances }: CountReviewModalProps) {
  const [decisions, setDecisions] = useState<Record<string, VarianceDecision>>({});
  const [selected, setSelected] = useState<string[]>([]);

  const variances = useMemo(() => {
    if (!count) return [];
    return count.lines.filter((l) => l.varianceQty !== 0 && l.countedQty !== null);
  }, [count]);

  useEffect(() => {
    if (isOpen && count) {
      const init: Record<string, VarianceDecision> = {};
      variances.forEach((v) => {
        init[v.id] = { lineId: v.id, reason: 'Cycle count variance', action: 'approve' };
      });
      setDecisions(init);
      setSelected([]);
    }
  }, [isOpen, count, variances]);

  if (!count) return null;

  const totalVarianceQty = variances.reduce((s, v) => s + v.varianceQty, 0);
  const totalVarianceValue = count.totalVarianceValue;
  const accuracy = count.totalLines === 0 ? 0 : ((count.totalLines - variances.length) / count.totalLines) * 100;

  const setDecisionField = <K extends keyof VarianceDecision>(lineId: string, key: K, val: VarianceDecision[K]) => {
    setDecisions((d) => ({ ...d, [lineId]: { ...d[lineId], [key]: val, lineId } }));
  };

  const toggleSelect = (lineId: string) =>
    setSelected((p) => p.includes(lineId) ? p.filter((x) => x !== lineId) : [...p, lineId]);

  const approveAll = () => {
    variances.forEach((v) => setDecisionField(v.id, 'action', 'approve'));
  };

  const postAll = () => {
    onPostVariances(count, Object.values(decisions));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Review variances — ${count.id}`} size="xl">
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total variances</span>
          <strong>{variances.length}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Net variance qty</span>
          <strong className={totalVarianceQty < 0 ? styles.negText : totalVarianceQty > 0 ? styles.posText : ''}>
            {totalVarianceQty > 0 ? '+' : ''}{formatIndianNumber(totalVarianceQty)}
          </strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Net variance value</span>
          <strong className={totalVarianceValue < 0 ? styles.negText : totalVarianceValue > 0 ? styles.posText : ''}>
            {totalVarianceValue > 0 ? '+' : ''}{formatRupees(totalVarianceValue)}
          </strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Accuracy</span>
          <strong>{accuracy.toFixed(1)}%</strong>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selected.length === variances.length && variances.length > 0}
                  onChange={() => setSelected(selected.length === variances.length ? [] : variances.map((v) => v.id))}
                  aria-label="Select all variances"
                />
              </th>
              <th>Item</th>
              <th>Batch</th>
              <th>Bin</th>
              <th className={styles.alignRight}>System</th>
              <th className={styles.alignRight}>Counted</th>
              <th className={styles.alignRight}>Variance</th>
              <th>Counted by</th>
              <th>Suggested reason</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {variances.length === 0 ? (
              <tr><td colSpan={10} className={styles.emptyRow}>No variances to review for this count.</td></tr>
            ) : variances.map((v) => {
              const d = decisions[v.id];
              return (
                <tr key={v.id} className={styles.row}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(v.id)}
                      onChange={() => toggleSelect(v.id)}
                      aria-label={`Select ${v.itemSku}`}
                    />
                  </td>
                  <td>
                    <div className={styles.itemName}>{v.itemName}</div>
                    <div className={styles.itemSku}>{v.itemSku}</div>
                  </td>
                  <td className={styles.mono}>{v.batch}</td>
                  <td className={styles.mono}>{v.location}</td>
                  <td className={`${styles.alignRight} ${styles.bold}`}>{formatIndianNumber(v.systemQty)}</td>
                  <td className={`${styles.alignRight} ${styles.bold}`}>{v.countedQty !== null ? formatIndianNumber(v.countedQty) : '—'}</td>
                  <td className={`${styles.alignRight} ${v.varianceQty < 0 ? styles.negText : styles.posText}`}>
                    {v.varianceQty > 0 ? '+' : ''}{formatIndianNumber(v.varianceQty)}
                  </td>
                  <td className={styles.byCell}>{v.countedBy ?? '—'}</td>
                  <td>
                    <select
                      className={styles.input}
                      value={d?.reason ?? 'Cycle count variance'}
                      onChange={(e) => setDecisionField(v.id, 'reason', e.target.value as AdjustmentReason)}
                    >
                      {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className={styles.actionRow}>
                      <button
                        className={`${styles.actionBtn} ${d?.action === 'approve' ? styles.actionApproved : ''}`}
                        title="Approve variance"
                        onClick={() => setDecisionField(v.id, 'action', 'approve')}
                        aria-label="Approve variance"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${d?.action === 'recount' ? styles.actionRecount : ''}`}
                        title="Request recount"
                        onClick={() => setDecisionField(v.id, 'action', 'recount')}
                        aria-label="Request recount"
                      >
                        <RotateCw size={12} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${d?.action === 'investigate' ? styles.actionInvestigate : ''}`}
                        title="Investigate"
                        onClick={() => setDecisionField(v.id, 'action', 'investigate')}
                        aria-label="Investigate variance"
                      >
                        <Search size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        <div className={styles.footerRight}>
          <Button variant="secondary" size="sm" onClick={approveAll} disabled={variances.length === 0}>
            Approve all variances
          </Button>
          <Button variant="primary" size="sm" onClick={postAll} disabled={variances.length === 0}>
            Post all to adjustments
          </Button>
        </div>
      </div>
    </Modal>
  );
}
