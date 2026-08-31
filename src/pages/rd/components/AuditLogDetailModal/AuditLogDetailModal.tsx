import React from 'react';
import { Clock, Shield, Globe, Terminal, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Badge } from '@/components/common/Badge/Badge';
import { RDAuditLog } from '../../mockData/settingsData';
import styles from './AuditLogDetailModal.module.css';

interface AuditLogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: RDAuditLog | null;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  isOpen,
  onClose,
  entry
}) => {
  if (!entry) return null;

  const renderDiffMockup = () => {
    // Generate interesting mock before/after data depending on the log ID
    let diffItems: Array<{ field: string; before: string; after: string }> = [];

    if (entry.id === 'AUD-002') {
      diffItems = [
        { field: 'Overdue Deadline Threshold', before: '72 hours', after: '48 hours' },
        { field: 'Recipient Escalation List', before: 'Dr. Anita Desai', after: 'Dr. Anita Desai, Field Operations' }
      ];
    } else if (entry.id === 'AUD-005') {
      diffItems = [
        { field: 'Variety Stage Lifecycle', before: 'Pre-release candidate', after: 'Released Commercial' },
        { field: 'Commercial Code Designation', before: '—', after: 'Standard Registered' }
      ];
    } else if (entry.id === 'AUD-009') {
      diffItems = [
        { field: 'Sync Timeout limit', before: '15 seconds', after: '45 seconds' },
        { field: 'Retry Threshold Count', before: '3 retries', after: '5 retries' }
      ];
    }

    if (diffItems.length === 0) {
      return (
        <div className={styles.noDiff}>
          <Badge variant="neutral">Created Record</Badge>
          <p>This action represents the creation of a new database entity. No prior values were modified.</p>
        </div>
      );
    }

    return (
      <div className={styles.diffSection}>
        <h4 className={styles.diffHeader}>Parameter Changes Diff</h4>
        <div className={styles.diffTable}>
          <div className={styles.diffTableHeader}>
            <span>Configuration Attribute</span>
            <span>Before Value</span>
            <span></span>
            <span>After Value</span>
          </div>
          {diffItems.map((item, idx) => (
            <div key={idx} className={styles.diffTableRow}>
              <span className={styles.fieldName}>{item.field}</span>
              <span className={styles.fieldBefore}>{item.before}</span>
              <ArrowRight size={14} className={styles.diffArrow} />
              <span className={styles.fieldAfter}>{item.after}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const actionVar = 
    entry.action === 'Created' ? 'success' :
    entry.action === 'Updated' ? 'info' :
    entry.action === 'Deleted' ? 'danger' :
    entry.action === 'Approved' ? 'success' : 'warning';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Compliance Audit Log Details"
    >
      <div className={styles.container}>
        {/* Top Header Row */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.logId}>{entry.id}</span>
            <Badge variant={actionVar}>{entry.action.toUpperCase()}</Badge>
          </div>
          <span className={styles.timeLabel}>
            <Clock size={12} /> {entry.timestamp}
          </span>
        </div>

        {/* User Card */}
        <div className={styles.metaCard}>
          <div className={styles.userSection}>
            <div className={styles.avatar}>{entry.user.charAt(0)}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{entry.user}</span>
              <span className={styles.userRole}>
                <Shield size={10} /> {entry.userRole}
              </span>
            </div>
          </div>

          <div className={styles.networkSection}>
            <span>
              <Globe size={12} /> {entry.ipAddress.split('·')[0].trim()}
            </span>
            <span>
              <Terminal size={12} /> {entry.ipAddress.split('·')[1]?.trim() || 'Web'}
            </span>
          </div>
        </div>

        {/* Activity Details */}
        <div className={styles.detailsSection}>
          <h4>Operational Description</h4>
          <p className={styles.detailsText}>{entry.details}</p>
        </div>

        {/* Entity Ref */}
        <div className={styles.entitySection}>
          <div className={styles.entityRow}>
            <span>Affected Entity Type:</span>
            <Badge variant="neutral">{entry.entityType}</Badge>
          </div>
          <div className={styles.entityRow}>
            <span>Database Reference Key:</span>
            <code className={styles.mono}>{entry.entityId}</code>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Diff Mockup */}
        {renderDiffMockup()}

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Close Audit Details
          </Button>
        </div>
      </div>
    </Modal>
  );
};
