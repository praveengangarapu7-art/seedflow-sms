import { useState } from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { formatIndianCurrency } from '@/utils/formatters';
import type { PurchaseRequisition } from '@/types/procurement';
import styles from './PRDetailModal.module.css';

type DetailTab = 'overview' | 'lineItems' | 'approvals' | 'activity';

interface PRDetailModalProps {
  pr: PurchaseRequisition | null;
  isOpen: boolean;
  onClose: () => void;
  onCreatePO?: (pr: PurchaseRequisition) => void;
}

export function PRDetailModal({ pr, isOpen, onClose, onCreatePO }: PRDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  if (!pr) return null;

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'lineItems', label: 'Line Items' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'activity',  label: 'Activity Log' },
  ];

  const footer = (
    <div className={styles.footer}>
      <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
      {pr.status === 'Approved' && onCreatePO && (
        <Button variant="primary" size="sm" onClick={() => { onCreatePO(pr); onClose(); }}>
          Create PO from this PR
        </Button>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={pr.id} size="xl" footer={footer}>

      {/* ── Meta row ──────────────────────────────────────────────────── */}
      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaKey}>Status</span>
          <StatusBadge status={pr.status} type="pr" />
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaKey}>Priority</span>
          <StatusBadge status={pr.priority} type="priority" />
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaKey}>Department</span>
          <span className={styles.metaVal}>{pr.department}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaKey}>Created By</span>
          <span className={styles.metaVal}>{pr.createdBy}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaKey}>Created Date</span>
          <span className={styles.metaVal}>{pr.createdDate}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaKey}>Required By</span>
          <span className={styles.metaVal}>{pr.requiredBy}</span>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab panels ────────────────────────────────────────────────── */}

      {activeTab === 'overview' && (
        <div>
          <p className={styles.sectionTitle}>{pr.title}</p>
          {pr.justification && (
            <p className={styles.justification}>{pr.justification}</p>
          )}
        </div>
      )}

      {activeTab === 'lineItems' && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th className={styles.tdRight}>Est. Price</th>
              <th className={styles.tdRight}>Total</th>
            </tr>
          </thead>
          <tbody>
            {pr.lineItems.map((li, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{li.description}</td>
                <td>{li.quantity}</td>
                <td>{li.unit}</td>
                <td className={styles.tdRight}>
                  {li.estimatedPrice ? `₹${li.estimatedPrice.toLocaleString('en-IN')}` : '—'}
                </td>
                <td className={styles.tdRight}>{formatIndianCurrency(li.total)}</td>
              </tr>
            ))}
            <tr className={styles.totalRow}>
              <td colSpan={5} style={{ textAlign: 'right' }}>Estimated Total</td>
              <td className={styles.tdRight}>{formatIndianCurrency(pr.totalValue)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {activeTab === 'approvals' && (
        <div className={styles.approvalList}>
          {(!pr.approvalTrail || pr.approvalTrail.length === 0) && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No approval trail available.</p>
          )}
          {pr.approvalTrail?.map((step, idx) => {
            const dotClass =
              step.status === 'approved' ? styles.dotApproved :
              step.status === 'rejected' ? styles.dotRejected :
              styles.dotPending;

            const Icon =
              step.status === 'approved' ? CheckCircle2 :
              step.status === 'rejected' ? XCircle :
              Clock;

            return (
              <div key={idx} className={styles.approvalItem}>
                <div className={`${styles.approvalDot} ${dotClass}`}>
                  <Icon size={14} />
                </div>
                <div className={styles.approvalInfo}>
                  <div className={styles.approvalName}>{step.approver}</div>
                  <div className={styles.approvalRole}>{step.role}</div>
                  {step.timestamp && (
                    <div className={styles.approvalTime}>{step.timestamp}</div>
                  )}
                  {step.comment && (
                    <div className={styles.approvalComment}>"{step.comment}"</div>
                  )}
                </div>
                <StatusBadge status={step.status === 'pending' ? 'Pending Approval' : step.status === 'approved' ? 'Approved' : 'Rejected'} type="pr" />
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className={styles.activityList}>
          {(!pr.activityLog || pr.activityLog.length === 0) && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No activity recorded.</p>
          )}
          {pr.activityLog?.map((entry, idx) => (
            <div key={idx} className={styles.activityItem}>
              <span className={styles.activityTime}>{entry.time}</span>
              <div className={styles.activityBody}>
                <span className={styles.activityUser}>{entry.user} </span>
                <span className={styles.activityAction}>— {entry.action}</span>
                {entry.details && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{entry.details}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </Modal>
  );
}
