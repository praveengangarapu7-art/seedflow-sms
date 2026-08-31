import { Users, Eye, Play, CheckCircle2, Check, Ban } from 'lucide-react';
import type { CycleCount, CountStatus } from '@/types/warehouse';
import { ActionMenu } from '@/components/common/ActionMenu';
import { formatRupees } from '@/utils/formatters';
import styles from './CountsTable.module.css';

interface CountsTableProps {
  rows: CycleCount[];
  onRowClick: (count: CycleCount) => void;
  onUpdateStatus?: (id: string, status: CountStatus) => void;
}

function statusClass(s: CountStatus): string {
  switch (s) {
    case 'Scheduled':         return styles.stScheduled;
    case 'In progress':       return styles.stInProgress;
    case 'Pending review':    return styles.stPendingReview;
    case 'Variance approval': return styles.stVarApproval;
    case 'Completed':         return styles.stCompleted;
    case 'Cancelled':         return styles.stCancelled;
  }
}

import { usePermission } from '@/hooks/usePermission';

export function CountsTable({ rows, onRowClick, onUpdateStatus }: CountsTableProps) {
  const canExecute = usePermission('execute_cycle_count');
  const canApprove = usePermission('approve_cycle_count');

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableScroll}>
        <table className={styles.table} aria-label="Cycle counts">
          <thead>
            <tr>
              <th>Count ID</th>
              <th>Name</th>
              <th>Strategy</th>
              <th>Frequency</th>
              <th>Scheduled</th>
              <th>Counters</th>
              <th>Progress</th>
              <th>Variances</th>
              <th>Status</th>
              <th className={styles.actionsCell}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={10} className={styles.emptyRow}>No counts match your filters.</td></tr>
            ) : rows.map((c) => {
              const progress = c.totalLines === 0 ? 0 : Math.round((c.countedLines / c.totalLines) * 100);
              return (
                <tr key={c.id} className={styles.row} onClick={() => onRowClick(c)}>
                  <td className={styles.id}>{c.id}</td>
                  <td>
                    <div className={styles.name}>{c.name}</div>
                    <div className={styles.zones}>{c.zonesScope.join(', ')}</div>
                  </td>
                  <td>{c.strategy}</td>
                  <td>{c.frequency}</td>
                  <td>{c.scheduledDate}</td>
                  <td>
                    <span className={styles.counters}>
                      <Users size={12} /> {c.assignedCounters.length}
                    </span>
                  </td>
                  <td>
                    <div className={styles.progressCell}>
                      <span className={styles.progressLabel}>{c.countedLines}/{c.totalLines} · {progress}%</span>
                      <div className={styles.miniBarTrack}>
                        <div className={styles.miniBarFill} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    {c.variancesFound > 0 ? (
                      <div className={styles.varCell}>
                        <strong>{c.variancesFound}</strong>
                        <span className={c.totalVarianceValue < 0 ? styles.negText : styles.posText}>
                          {c.totalVarianceValue > 0 ? '+' : ''}{formatRupees(c.totalVarianceValue)}
                        </span>
                      </div>
                    ) : '—'}
                  </td>
                  <td><span className={`${styles.statusChip} ${statusClass(c.status)}`}>{c.status}</span></td>
                  <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const items = [
                        { label: 'View details', icon: Eye, onClick: () => onRowClick(c) },
                        ...(c.status === 'Scheduled' && canExecute ? [{ label: 'Start counting', icon: Play, onClick: () => { onUpdateStatus?.(c.id, 'In progress'); onRowClick({ ...c, status: 'In progress' }); } }] : []),
                        ...(c.status === 'In progress' && canExecute ? [{ label: 'Complete count', icon: CheckCircle2, onClick: () => { onUpdateStatus?.(c.id, 'Pending review'); onRowClick({ ...c, status: 'Pending review' }); } }] : []),
                        ...( (c.status === 'Pending review' || c.status === 'Variance approval') && canApprove ? [{ label: 'Review variances', icon: Check, onClick: () => onRowClick(c) }] : []),
                        ...( (c.status === 'Scheduled' || c.status === 'In progress') && canExecute ? [{ label: 'Cancel count', icon: Ban, variant: 'danger' as const, onClick: () => onUpdateStatus?.(c.id, 'Cancelled') }] : []),
                      ];
                      return items.length > 0 ? <ActionMenu items={items} /> : null;
                    })()}
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
