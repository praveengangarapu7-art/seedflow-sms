import React from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Download } from 'lucide-react';
import { AuditLogEntry } from '@/types/warehouse';
import styles from './AuditLogDetailModal.module.css';

import { downloadText } from '@/utils/fileExport';
interface AuditLogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: AuditLogEntry;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({ isOpen, onClose, entry }) => {
  if (!entry) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit log details"
      size="lg"
    >
      <div className={styles.container}>
        <div className={styles.headerInfo}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Timestamp</span>
              <span className={styles.infoValue}>{entry.timestamp}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>User</span>
              <span className={styles.infoValue}>{entry.user} ({entry.userRole})</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>IP Address</span>
              <span className={styles.infoValue}>{entry.ipAddress}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Entity</span>
              <span className={styles.infoValue}>{entry.entityType} ({entry.entityId})</span>
            </div>
          </div>
        </div>

        <div className={styles.summarySection}>
          <h4 className={styles.sectionTitle}>Action summary</h4>
          <p className={styles.summaryText}>{entry.details}</p>
        </div>

        <div className={styles.diffSection}>
          <h4 className={styles.sectionTitle}>Changes</h4>
          <div className={styles.diffGrid}>
            <div className={styles.diffCol}>
              <div className={styles.diffHeader}>Before</div>
              <pre className={styles.jsonBox}>
                {JSON.stringify({ threshold: 2000, active: true }, null, 2)}
              </pre>
            </div>
            <div className={styles.diffCol}>
              <div className={styles.diffHeader}>After</div>
              <pre className={`${styles.jsonBox} ${styles.successBox}`}>
                {JSON.stringify({ threshold: 5000, active: true }, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <div className={styles.relatedSection}>
          <h4 className={styles.sectionTitle}>Related actions</h4>
          <div className={styles.relatedList}>
            <div className={styles.relatedItem}>
              <span className={styles.relatedTime}>11:28 AM</span>
              <span className={styles.relatedText}>Workflow rule engine re-initialized</span>
            </div>
            <div className={styles.relatedItem}>
              <span className={styles.relatedTime}>11:25 AM</span>
              <span className={styles.relatedText}>Manual override flag set for WR-001</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => downloadText(`audit_${entry.id}.json`, JSON.stringify(entry, null, 2), 'application/json')}>Export entry</Button>
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};
