import styles from './StatusBadge.module.css';

type BadgeType = 'pr' | 'po' | 'priority' | 'supplier' | 'rfq' | 'grn' | 'movement' | 'rd';

interface StatusBadgeProps {
  status: string;
  type?: BadgeType;
  className?: string;
}

const PR_CLASS: Record<string, string> = {
  'Draft':          styles.draft,
  'Pending Approval': styles.pending,
  'Approved':       styles.approved,
  'Rejected':       styles.rejected,
  'Converted to PO': styles.converted,
};

const PO_CLASS: Record<string, string> = {
  'Draft':              styles.draft,
  'Sent':               styles.sent,
  'Acknowledged':       styles.acknowledged,
  'Partially Received': styles.partialReceived,
  'Received':           styles.received,
  'Closed':             styles.closed,
};

const PRIORITY_CLASS: Record<string, string> = {
  'Low':    styles.low,
  'Medium': styles.medium,
  'High':   styles.high,
  'Urgent': styles.urgent,
};

const SUPPLIER_CLASS: Record<string, string> = {
  'Preferred':   styles.preferred,
  'Approved':    styles.supApproved,
  'Registered':  styles.registered,
  'Blacklisted': styles.blacklisted,
};

const RFQ_CLASS: Record<string, string> = {
  'Draft':               styles.rfqDraft,
  'Sent':                styles.rfqSent,
  'Responses Received':  styles.rfqResponses,
  'Awarded':             styles.rfqAwarded,
  'Closed':              styles.rfqClosed,
};

const GRN_CLASS: Record<string, string> = {
  'Pending Inspection': styles.grnPending,
  'Inspected':          styles.grnInspected,
  'Accepted':           styles.grnAccepted,
  'Rejected':           styles.grnRejected,
  'Partial':            styles.grnPartial,
};

const MOVEMENT_CLASS: Record<string, string> = {
  'Inbound':    styles.inbound,
  'Outbound':   styles.outbound,
  'Transfer':   styles.transfer,
  'Adjustment': styles.adjustment,
};

const RD_CLASS: Record<string, string> = {
  'Active':       styles.approved,
  'Archived':     styles.draft,
  'Quarantine':   styles.rejected,
  'Planning':     styles.rfqDraft,
  'Approved':     styles.approved,
  'Sown':         styles.registered,
  'In progress':  styles.pending,
  'Harvested':    styles.acknowledged,
  'Analyzed':     styles.rfqAwarded,
  'Completed':    styles.supApproved,
};

function getClass(type: BadgeType | undefined, status: string): string {
  if (type === 'pr')       return PR_CLASS[status]       ?? styles.draft;
  if (type === 'po')       return PO_CLASS[status]       ?? styles.draft;
  if (type === 'priority') return PRIORITY_CLASS[status] ?? styles.low;
  if (type === 'supplier') return SUPPLIER_CLASS[status] ?? styles.registered;
  if (type === 'rfq')      return RFQ_CLASS[status]      ?? styles.rfqDraft;
  if (type === 'grn')      return GRN_CLASS[status]      ?? styles.grnPending;
  if (type === 'movement') return MOVEMENT_CLASS[status] ?? styles.draft;
  if (type === 'rd')       return RD_CLASS[status]       ?? styles.draft;
  
  // Try RD_CLASS as default if no type provided
  return RD_CLASS[status] ?? PR_CLASS[status] ?? styles.draft;
}

export function StatusBadge({ status, type, className = '' }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${getClass(type, status)} ${className}`}>
      {status}
    </span>
  );
}
