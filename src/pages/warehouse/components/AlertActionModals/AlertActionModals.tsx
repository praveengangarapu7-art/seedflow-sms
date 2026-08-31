import React from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import styles from './AlertActionModals.module.css';

interface AcknowledgeAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
}

export const AcknowledgeAlertModal: React.FC<AcknowledgeAlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [notes, setNotes] = React.useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Acknowledge alert" size="md">
      <div className={styles.modalContent}>
        <p className={styles.desc}>Acknowledging this alert notifies other staff that you are handling the situation.</p>
        <div className={styles.inputGroup}>
          <label>Action plan / Notes (optional)</label>
          <textarea 
            className={styles.textarea} 
            placeholder="e.g. Checking compressor settings..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className={styles.checkboxRow}>
          <input type="checkbox" id="handle" defaultChecked />
          <label htmlFor="handle">I'll handle this and update status shortly</label>
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(notes)}>Acknowledge</Button>
        </div>
      </div>
    </Modal>
  );
};

interface ResolveAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resolution: string, notes: string) => void;
}

export const ResolveAlertModal: React.FC<ResolveAlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [resolution, setResolution] = React.useState('Fixed');
  const [notes, setNotes] = React.useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resolve alert" size="md">
      <div className={styles.modalContent}>
        <div className={styles.inputGroup}>
          <label>Resolution type</label>
          <select 
            className={styles.select}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          >
            <option>Fixed</option>
            <option>False alarm</option>
            <option>Outside parameters</option>
            <option>Equipment failure</option>
            <option>Other</option>
          </select>
        </div>
        <div className={styles.inputGroup}>
          <label>Resolution notes (required)</label>
          <textarea 
            className={styles.textarea} 
            placeholder="Describe how the issue was resolved..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
          />
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(resolution, notes)} disabled={!notes}>Confirm resolution</Button>
        </div>
      </div>
    </Modal>
  );
};
