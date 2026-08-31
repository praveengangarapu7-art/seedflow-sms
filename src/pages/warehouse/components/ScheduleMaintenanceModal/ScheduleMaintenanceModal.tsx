import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import styles from './ScheduleMaintenanceModal.module.css';

interface ScheduleMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (task: any) => void;
}

export const ScheduleMaintenanceModal: React.FC<ScheduleMaintenanceModalProps> = ({
  isOpen,
  onClose,
  onSchedule
}) => {
  const [formData, setFormData] = useState({
    asset: '',
    zone: 'Cold Zone A',
    taskType: 'Routine',
    description: '',
    scheduledDate: '',
    assignedTo: '',
    priority: 'Medium',
    estimatedDuration: '1'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSchedule(formData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule maintenance" size="lg">
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <Input 
            label="Asset / Equipment" 
            placeholder="e.g. Compressor Unit 4" 
            value={formData.asset}
            onChange={(e) => setFormData({...formData, asset: e.target.value})}
            required
          />
          <div className={styles.inputGroup}>
            <label>Zone</label>
            <select 
              className={styles.select}
              value={formData.zone}
              onChange={(e) => setFormData({...formData, zone: e.target.value})}
            >
              <option>Cold Zone A</option>
              <option>Cold Zone B</option>
              <option>Cold Zone C</option>
              <option>Controlled Zone</option>
            </select>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>Task type</label>
            <div className={styles.radioGrid}>
              {['Routine', 'Calibration', 'Repair', 'Inspection'].map(t => (
                <label key={t} className={styles.radioLabel}>
                  <input 
                    type="radio" 
                    name="taskType" 
                    checked={formData.taskType === t}
                    onChange={() => setFormData({...formData, taskType: t})}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div className={styles.inputGroup}>
            <label>Priority</label>
            <div className={styles.radioGrid}>
              {['Low', 'Medium', 'High'].map(p => (
                <label key={p} className={styles.radioLabel}>
                  <input 
                    type="radio" 
                    name="priority" 
                    checked={formData.priority === p}
                    onChange={() => setFormData({...formData, priority: p})}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label>Description</label>
          <textarea 
            className={styles.textarea} 
            placeholder="What needs to be done?"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
          />
        </div>

        <div className={styles.row}>
          <Input 
            label="Scheduled date" 
            type="date" 
            value={formData.scheduledDate}
            onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
            required
          />
          <Input 
            label="Est. duration (hrs)" 
            type="number" 
            value={formData.estimatedDuration}
            onChange={(e) => setFormData({...formData, estimatedDuration: e.target.value})}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Assign to</label>
          <select 
            className={styles.select}
            value={formData.assignedTo}
            onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
            required
          >
            <option value="">Select staff...</option>
            <option>Suresh Kumar</option>
            <option>Ramesh Singh</option>
            <option>Vikram Mehta</option>
          </select>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">Schedule task</Button>
        </div>
      </form>
    </Modal>
  );
};
