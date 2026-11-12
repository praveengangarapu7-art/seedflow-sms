import { Check, X, Eye, Ban } from 'lucide-react';
import { ActionMenu } from '@/components/common/ActionMenu';
import type { StockAdjustment, AdjustmentStatus } from '@/types/warehouse';
import { formatIndianNumber, formatRupees } from '@/utils/formatters';
import styles from './AdjustmentTable.module.css';

interface AdjustmentTableProps {
  rows: StockAdjustment[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onTogglePage: (ids: string[]) => void;
  onRowClick: (adj: StockAdjustment) => void;
  onApprove: (adj: StockAdjustment) => void;
  onReject: (adj: StockAdjustment) => void;
  isCurrentApprover: (adj: StockAdjustment) => boolean;
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

function impactInfo(value: number): { tier: 'major' | 'moderate' | 'minor'; cls: string } {
  const abs = Math.abs(value);
  if (abs > 50_000) return { tier: 'major',    cls: styles.impactMajor };
  if (abs > 10_000) return { tier: 'moderate', cls: styles.impactModerate };
  return { tier: 'minor', cls: styles.impactMinor };
}

import { usePermission } from '@/hooks/usePermission';

import { whRemove } from '../../warehouseStore';
export function AdjustmentTable({
  rows,
  selectedIds,
  onToggleSelect,
  onTogglePage,
  onRowClick,
  onApprove,
  onReject,
  isCurrentApprover,
}: AdjustmentTableProps) {
  const canApprove = usePermission('approve_stock_adjustment');
  const pendingIds = rows.filter((r) => r.status === 'Pending approval').map((r) => r.id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedIds.includes(id));

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableScroll}>
        <table className={styles.table} aria-label="Stock adjustments">
          <thead>
            <tr>
              <th className={styles.checkCell}>
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={() => onTogglePage(pendingIds)}
                  disabled={pendingIds.length === 0 || !canApprove}
                  aria-label="Select all pending"
                />
              </th>
              <th>Adjustment ID</th>
              <th>Item</th>
              <th>Batch</th>
              <th>Location</th>
              <th className={styles.alignRight}>System qty</th>
              <th className={styles.alignRight}>Actual qty</th>
              <th className={styles.alignRight}>Variance</th>
              <th>Reason</th>
              <th>Source</th>
              <th>Initiated by</th>
              <th>Status</th>
              <th className={styles.actionsCell}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={13} className={styles.emptyRow}>No adjustments match your filters.</td></tr>
            ) : rows.map((r) => {
              const impact = impactInfo(r.varianceValue);
              const selected = selectedIds.includes(r.id);
              const isPending = r.status === 'Pending approval';
              const showInline = isPending && isCurrentApprover(r) && canApprove;
              return (
                <tr
                  key={r.id}
                  className={`${styles.row} ${impact.cls} ${selected ? styles.rowSelected : ''}`}
                  onClick={() => onRowClick(r)}
                >
                  <td className={styles.checkCell} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!isPending || !canApprove}
                      onChange={() => onToggleSelect(r.id)}
                      aria-label={`Select ${r.id}`}
                    />
                  </td>
                  <td className={styles.id}>{r.id}</td>
                  <td>
                    <div className={styles.itemName} title={r.itemName}>{r.itemName}</div>
                    <div className={styles.itemSku}>{r.itemSku}</div>
                  </td>
                  <td className={styles.mono}>{r.batch}</td>
                  <td className={styles.mono}>{r.location}</td>
                  <td className={`${styles.alignRight} ${styles.bold}`}>{formatIndianNumber(r.systemQty)} {r.uom}</td>
                  <td className={`${styles.alignRight} ${styles.bold}`}>{formatIndianNumber(r.actualQty)} {r.uom}</td>
                  <td className={styles.alignRight}>
                    <div className={`${styles.varianceQty} ${r.varianceQty < 0 ? styles.negText : styles.posText}`}>
                      {r.varianceQty > 0 ? '+' : ''}{formatIndianNumber(r.varianceQty)} {r.uom}
                    </div>
                    <div className={`${styles.varianceVal} ${r.varianceValue < 0 ? styles.negText : styles.posText}`}>
                      {r.varianceValue > 0 ? '+' : ''}{formatRupees(r.varianceValue)}
                    </div>
                  </td>
                  <td><span className={styles.reasonChip}>{r.reason}</span></td>
                  <td>{r.source ? <span className={styles.sourceChip}>{r.source}</span> : '—'}</td>
                  <td className={styles.byCell}>{r.initiatedBy}</td>
                  <td><span className={`${styles.statusChip} ${statusClass(r.status)}`}>{r.status}</span></td>
                  <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                    {showInline ? (
                      <div className={styles.inlineActions}>
                        <button
                          className={`${styles.iconBtn} ${styles.btnApprove}`}
                          onClick={() => onApprove(r)}
                          aria-label={`Approve ${r.id}`}
                          title="Approve"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className={`${styles.iconBtn} ${styles.btnReject}`}
                          onClick={() => onReject(r)}
                          aria-label={`Reject ${r.id}`}
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <ActionMenu
                        items={[
                          { label: 'View details', icon: Eye, onClick: () => onRowClick(r) },
                          ...(r.status === 'Draft' ? [
                            { label: 'Cancel', icon: Ban, variant: 'danger' as const, onClick: () => whRemove('adjustments', r.id) }
                          ] : []),
                        ]}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
