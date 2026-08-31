import { Check, X, Clock, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { StockAdjustment, AdjustmentStatus } from '@/types/warehouse';
import { formatIndianNumber, formatRupees } from '@/utils/formatters';
import styles from './AdjustmentDetailModal.module.css';

interface AdjustmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: StockAdjustment | null;
  isCurrentApprover: boolean;
  onApprove: (adj: StockAdjustment) => void;
  onReject: (adj: StockAdjustment) => void;
  onPost: (adj: StockAdjustment) => void;
  onReverse: (adj: StockAdjustment) => void;
  onResubmit: (adj: StockAdjustment) => void;
}

function statusClass(s: AdjustmentStatus): string {
  switch (s) {
    case 'Draft':            return styles.stDraft;
    case 'Pending approval': return styles.stPending;
    case 'Approved':         return styles.stApproved;
    case 'Posted':           return styles.stPosted;
    case 'Rejected':         return styles.stRejected;
  }
}

function impactInfo(value: number): { label: string; cls: string } {
  const abs = Math.abs(value);
  if (abs > 50_000) return { label: 'Major impact', cls: styles.impactMajor };
  if (abs > 10_000) return { label: 'Moderate impact', cls: styles.impactModerate };
  return { label: 'Minor impact', cls: styles.impactMinor };
}

export function AdjustmentDetailModal({
  isOpen, onClose, adjustment, isCurrentApprover, onApprove, onReject, onPost, onReverse, onResubmit,
}: AdjustmentDetailModalProps) {
  if (!adjustment) return null;
  const impact = impactInfo(adjustment.varianceValue);
  const a = adjustment;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Adjustment ${a.id}`} size="xl">
      <div className={styles.headerRow}>
        <div>
          <span className={`${styles.statusChip} ${statusClass(a.status)}`}>{a.status}</span>
          <span className={`${styles.impactChip} ${impact.cls}`}>{impact.label}</span>
          {a.source && <span className={styles.sourceChip}>{a.source}</span>}
        </div>
        <span className={styles.timestamp}>Initiated {a.initiatedAt} · {a.initiatedBy}</span>
      </div>

      <div className={styles.grid}>
        <div className={styles.left}>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Item summary</h4>
            <dl className={styles.dl}>
              <div className={styles.dRow}><dt>Item</dt><dd>{a.itemName}</dd></div>
              <div className={styles.dRow}><dt>SKU</dt><dd className={styles.mono}>{a.itemSku}</dd></div>
              <div className={styles.dRow}><dt>Batch</dt><dd className={styles.mono}>{a.batch}</dd></div>
              <div className={styles.dRow}><dt>Location</dt><dd className={styles.mono}>{a.location}</dd></div>
              <div className={styles.dRow}><dt>Warehouse</dt><dd>{a.warehouse}</dd></div>
              <div className={styles.dRow}><dt>Direction</dt><dd>{a.direction}</dd></div>
            </dl>
          </div>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Variance</h4>
            <div className={styles.varianceGrid}>
              <div className={styles.varBlock}>
                <span className={styles.varLabel}>System qty</span>
                <strong>{formatIndianNumber(a.systemQty)} {a.uom}</strong>
              </div>
              <div className={styles.varBlock}>
                <span className={styles.varLabel}>Actual qty</span>
                <strong>{formatIndianNumber(a.actualQty)} {a.uom}</strong>
              </div>
              <div className={styles.varBlock}>
                <span className={styles.varLabel}>Variance qty</span>
                <strong className={a.varianceQty < 0 ? styles.negText : a.varianceQty > 0 ? styles.posText : ''}>
                  {a.varianceQty > 0 ? '+' : ''}{formatIndianNumber(a.varianceQty)} {a.uom}
                </strong>
              </div>
              <div className={styles.varBlock}>
                <span className={styles.varLabel}>Unit cost</span>
                <strong>{formatRupees(a.unitCost)}</strong>
              </div>
              <div className={`${styles.varBlock} ${styles.varBlockSpan}`}>
                <span className={styles.varLabel}>Variance value</span>
                <strong className={`${styles.varValueBig} ${a.varianceValue < 0 ? styles.negText : a.varianceValue > 0 ? styles.posText : ''}`}>
                  {a.varianceValue > 0 ? '+' : ''}{formatRupees(a.varianceValue)}
                </strong>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Reason</h4>
            <div className={styles.reasonChipRow}>
              <span className={styles.reasonChip}>{a.reason}</span>
              {a.cycleCountRef && (
                <span className={styles.linkChip}>
                  <LinkIcon size={11} /> {a.cycleCountRef}
                </span>
              )}
            </div>
            {a.reasonNotes && <p className={styles.notes}>{a.reasonNotes}</p>}
          </div>

          {a.photos.length > 0 && (
            <div className={styles.card}>
              <h4 className={styles.cardTitle}>Photo evidence ({a.photos.length})</h4>
              <div className={styles.photoGrid}>
                {a.photos.map((p, i) => (
                  <div key={p} className={styles.photoTile} role="button" tabIndex={0} aria-label={`Photo ${i + 1}`}>
                    <ImageIcon size={28} />
                    <span>Photo {i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Approval chain</h4>
            <ol className={styles.approvalList}>
              {a.approvalChain.map((step, idx) => {
                const Icon = step.status === 'approved' ? Check : step.status === 'rejected' ? X : Clock;
                const stepCls =
                  step.status === 'approved' ? styles.stepApproved :
                  step.status === 'rejected' ? styles.stepRejected : styles.stepPending;
                return (
                  <li key={idx} className={`${styles.approvalStep} ${stepCls}`}>
                    <span className={styles.stepBadge}><Icon size={12} strokeWidth={3} /></span>
                    <div className={styles.stepBody}>
                      <div className={styles.stepName}>{step.approver}</div>
                      <div className={styles.stepRole}>{step.role}</div>
                      {step.timestamp && <div className={styles.stepTime}>{step.timestamp}</div>}
                      {step.comment && <div className={styles.stepComment}>{step.comment}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Activity log</h4>
            <ul className={styles.activityList}>
              <li className={styles.activityRow}>
                <span className={styles.activityTime}>{a.initiatedAt}</span>
                <span><strong>{a.initiatedBy}</strong> created adjustment</span>
              </li>
              {a.approvalChain.filter((s) => s.status !== 'pending').map((s, i) => (
                <li key={i} className={styles.activityRow}>
                  <span className={styles.activityTime}>{s.timestamp ?? '—'}</span>
                  <span><strong>{s.approver}</strong> {s.status} the adjustment</span>
                </li>
              ))}
              {a.postedAt && (
                <li className={styles.activityRow}>
                  <span className={styles.activityTime}>{a.postedAt}</span>
                  <span>Adjustment <strong>posted</strong> to inventory</span>
                </li>
              )}
              {a.reversedAt && (
                <li className={styles.activityRow}>
                  <span className={styles.activityTime}>{a.reversedAt}</span>
                  <span>Adjustment <strong>reversed</strong>: {a.reversalReason}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        <div className={styles.footerRight}>
          {a.status === 'Pending approval' && isCurrentApprover && (
            <>
              <Button variant="secondary" size="sm" leftIcon={X} onClick={() => onReject(a)}>Reject</Button>
              <Button variant="primary" size="sm" leftIcon={Check} onClick={() => onApprove(a)}>Approve</Button>
            </>
          )}
          {a.status === 'Approved' && (
            <Button variant="primary" size="sm" leftIcon={Check} onClick={() => onPost(a)}>Post to inventory</Button>
          )}
          {a.status === 'Posted' && (
            <Button variant="ghost" size="sm" onClick={() => onReverse(a)}>Reverse adjustment</Button>
          )}
          {a.status === 'Rejected' && (
            <Button variant="primary" size="sm" onClick={() => onResubmit(a)}>Resubmit</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
