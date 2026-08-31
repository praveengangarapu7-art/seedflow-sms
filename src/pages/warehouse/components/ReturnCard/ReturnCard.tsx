import { ArrowRight, Eye, Truck, PackageCheck, ClipboardCheck, Scale, Ban } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { ActionMenu } from '@/components/common/ActionMenu';
import type { ReturnRecord, ReturnStatus, ReturnDirection, ReturnDisposition, ReturnReason } from '@/types/warehouse';
import { formatIndianCurrency, formatIndianNumber } from '@/utils/formatters';
import { usePermission } from '@/hooks/usePermission';
import styles from './ReturnCard.module.css';

interface ReturnCardProps {
  record: ReturnRecord;
  onAction: (record: ReturnRecord, action: 'inspect' | 'resolve' | 'transit' | 'received' | 'view') => void;
  onUpdateStatus?: (id: string, status: ReturnStatus) => void;
}

function statusClass(s: ReturnStatus): string {
  switch (s) {
    case 'Initiated':            return styles.stInitiated;
    case 'In transit':           return styles.stInTransit;
    case 'Received':             return styles.stReceived;
    case 'Inspecting':           return styles.stInspecting;
    case 'Disposition pending':  return styles.stDispPending;
    case 'Resolved':             return styles.stResolved;
    case 'Cancelled':            return styles.stCancelled;
  }
}

function directionClass(d: ReturnDirection): string {
  return d === 'Customer return' ? styles.dirCustomer : styles.dirSupplier;
}

function dispositionClass(d: ReturnDisposition): string {
  switch (d) {
    case 'Restock':            return styles.dispRestock;
    case 'Quarantine':         return styles.dispQuarantine;
    case 'Rework':             return styles.dispRework;
    case 'Dispose':            return styles.dispDispose;
    case 'Return to supplier': return styles.dispReturn;
    case 'Pending decision':   return styles.dispPending;
  }
}

function reasonCategoryClass(r: ReturnReason): string {
  if (r === 'Damaged in transit' || r === 'Mislabeled') return styles.reasonDamage;
  if (r === 'Quality failure' || r === 'Performance complaint' || r === 'Expired stock') return styles.reasonQuality;
  if (r === 'Wrong item shipped' || r === 'Excess quantity') return styles.reasonLogistics;
  return styles.reasonOther;
}

export function ReturnCard({ record, onAction, onUpdateStatus }: ReturnCardProps) {
  const canLogReturn = usePermission('log_return');
  const canInspect = usePermission('quality_assess_returns');
  const canResolve = usePermission('approve_return_disposition');

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.id}>{record.id}</span>
        <span className={`${styles.directionChip} ${directionClass(record.direction)}`}>{record.direction}</span>
        <span className={`${styles.statusChip} ${statusClass(record.status)}`}>{record.status}</span>
        <span className={`${styles.reasonChip} ${reasonCategoryClass(record.reason)}`}>{record.reason}</span>
      </div>

      <div className={styles.midGrid}>
        <div className={styles.leftBlock}>
          <h4 className={styles.partyName}>{record.party}</h4>
          <div className={styles.metaRow}>Reference: <strong className={styles.mono}>{record.reference}</strong></div>
          <div className={styles.metaRow}>Initiated: {record.initiatedDate} · {record.initiatedBy}</div>
        </div>

        <div className={styles.rightBlock}>
          <div className={styles.metaRow}>{record.totalItems} items · {formatIndianNumber(record.totalQuantity)} {record.uom}</div>
          <div className={styles.metaRow}><strong className={styles.value}>{formatIndianCurrency(record.totalValue)}</strong></div>
          {record.expectedReturnDate && <div className={styles.metaRow}>Expected: {record.expectedReturnDate}</div>}
          {record.receivedDate && <div className={styles.metaRow}>Received: {record.receivedDate}</div>}
        </div>
      </div>

      {record.disposition !== 'Pending decision' && (
        <div className={styles.dispRow}>
          <span className={`${styles.dispChip} ${dispositionClass(record.disposition)}`}>{record.disposition}</span>
          {record.creditNoteRef && <span className={styles.note}>Credit note: <strong className={styles.mono}>{record.creditNoteRef}</strong></span>}
          {record.debitNoteRef && <span className={styles.note}>Debit note: <strong className={styles.mono}>{record.debitNoteRef}</strong></span>}
          {record.refundProcessed && record.refundAmount && <span className={styles.note}>Refund: <strong>{formatIndianCurrency(record.refundAmount)}</strong></span>}
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.subtle}>{record.lineItems.length} line items · {record.photos.length} photos</span>

        <div className={styles.actions}>
          {record.status === 'Initiated' && canLogReturn && (
            <Button variant="primary" size="sm" rightIcon={ArrowRight} onClick={() => { onUpdateStatus?.(record.id, 'In transit'); onAction(record, 'transit'); }}>Mark in transit</Button>
          )}
          {record.status === 'In transit' && canLogReturn && (
            <Button variant="primary" size="sm" rightIcon={ArrowRight} onClick={() => { onUpdateStatus?.(record.id, 'Received'); onAction(record, 'received'); }}>Mark received</Button>
          )}
          {record.status === 'Received' && canInspect && (
            <Button variant="primary" size="sm" rightIcon={ArrowRight} onClick={() => onAction(record, 'inspect')}>Start inspection</Button>
          )}
          {record.status === 'Inspecting' && canInspect && (
            <Button variant="primary" size="sm" rightIcon={ArrowRight} onClick={() => onAction(record, 'inspect')}>Continue inspection</Button>
          )}
          {record.status === 'Disposition pending' && canResolve && (
            <Button variant="primary" size="sm" rightIcon={ArrowRight} onClick={() => onAction(record, 'resolve')}>Resolve return</Button>
          )}
          {(record.status === 'Resolved' || record.status === 'Cancelled') && (
            <Button variant="ghost" size="sm" onClick={() => onAction(record, 'view')}>View details</Button>
          )}
          
          {(() => {
            const items = [
              { label: 'View details', icon: Eye, onClick: () => onAction(record, 'view') },
              ...(record.status === 'Initiated' && canLogReturn ? [{ label: 'Mark in transit', icon: Truck, onClick: () => { onUpdateStatus?.(record.id, 'In transit'); onAction(record, 'transit'); } }] : []),
              ...(record.status === 'In transit' && canLogReturn ? [{ label: 'Mark received', icon: PackageCheck, onClick: () => { onUpdateStatus?.(record.id, 'Received'); onAction(record, 'received'); } }] : []),
              ...( (record.status === 'Received' || record.status === 'Inspecting') && canInspect ? [{ label: 'Inspect', icon: ClipboardCheck, onClick: () => onAction(record, 'inspect') }] : []),
              ...(record.status === 'Disposition pending' && canResolve ? [{ label: 'Resolve', icon: Scale, onClick: () => onAction(record, 'resolve') }] : []),
              ...(record.status !== 'Resolved' && record.status !== 'Cancelled' && canLogReturn ? [{ label: 'Cancel return', icon: Ban, variant: 'danger' as const, onClick: () => onUpdateStatus?.(record.id, 'Cancelled') }] : []),
            ];
            return items.length > 0 ? <ActionMenu items={items} /> : null;
          })()}
        </div>
      </div>
    </div>
  );
}
