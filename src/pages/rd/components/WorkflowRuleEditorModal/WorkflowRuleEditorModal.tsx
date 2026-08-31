import React, { useState, useEffect } from 'react';
import { Play, Filter } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { useToast } from '@/components/common/Toast/ToastContext';
import { WorkflowRule } from '../../mockData/settingsData';
import styles from './WorkflowRuleEditorModal.module.css';

interface WorkflowRuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: WorkflowRule | null;
  onSave?: (data: Partial<WorkflowRule>) => void;
}

export const WorkflowRuleEditorModal: React.FC<WorkflowRuleEditorModalProps> = ({
  isOpen,
  onClose,
  rule,
  onSave
}) => {
  const { addToast } = useToast();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('Observation Schedule');
  const [triggerEvent, setTriggerEvent] = useState('Observation Overdue (+48 hrs)');
  const [conditions, setConditions] = useState('');
  const [actionText, setActionText] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setDescription(rule.description);
      setTrigger(rule.trigger);
      setTriggerEvent(rule.triggerEvent);
      setConditions(rule.conditions);
      setActionText(rule.actionText);
      setActive(rule.active);
    } else {
      setName('');
      setDescription('');
      setTrigger('Observation Schedule');
      setTriggerEvent('Observation Overdue (+48 hrs)');
      setConditions('Trial status === "Active" AND observations.recorded === false');
      setActionText('Send email notification to Breeding Leads');
      setActive(true);
    }
  }, [rule, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast({ type: 'warning', message: 'Rule name is required.' });
      return;
    }

    if (onSave) {
      onSave({
        name,
        description,
        trigger,
        triggerEvent,
        conditions,
        actionText,
        active
      });
    }

    addToast({ 
      type: 'success', 
      message: rule ? `Workflow rule "${name}" updated` : `Workflow rule "${name}" created successfully` 
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={rule ? 'Edit Workflow Automation Rule' : 'Create R&D Automation Rule'}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input 
          label="Rule Designation Title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Notify breeder on observation due..."
          required
        />

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what this automation rule achieves..."
            className={styles.textarea}
            rows={2}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label}>Trigger Source</label>
            <select 
              value={trigger} 
              onChange={(e) => setTrigger(e.target.value)}
              className={styles.select}
            >
              <option value="Observation Schedule">Observation Schedule</option>
              <option value="Trial Status Update">Trial Status Update</option>
              <option value="Registration Tracker">Registration Tracker</option>
              <option value="Breeding Generation Increment">Breeding Generation Increment</option>
              <option value="Nursery Stock Change">Nursery Stock Change</option>
            </select>
          </div>

          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label}>Trigger Event Criteria</label>
            <input 
              type="text"
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
              className={styles.inputText}
              placeholder="e.g. Overdue (+48 hrs)"
              required
            />
          </div>
        </div>

        {/* Condition Builder */}
        <div className={styles.field}>
          <label className={styles.label}>
            <span className={styles.labelIconRow}>
              <Filter size={14} /> Rule Match Conditions (Logical Expression)
            </span>
          </label>
          <input 
            type="text" 
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            className={styles.inputText}
            placeholder="e.g. status === 'Active' AND recorded === false"
            required
          />
          <span className={styles.helper}>Evaluated dynamically in real-time when the trigger event fires.</span>
        </div>

        {/* Automation Action */}
        <div className={styles.field}>
          <label className={styles.label}>
            <span className={styles.labelIconRow}>
              <Play size={14} /> Resulting Action
            </span>
          </label>
          <input 
            type="text" 
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            className={styles.inputText}
            placeholder="e.g. Email lead breeder & field staff"
            required
          />
          <span className={styles.helper}>Supports email notifications, SMS alerts, and automatic database updates.</span>
        </div>

        {/* Active Toggle Switch */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Rule Active Status</span>
            <span className={styles.toggleDesc}>When deactivated, this automation will not run.</span>
          </div>
          <div 
            className={`${styles.toggleSwitch} ${active ? styles.activeSwitch : ''}`}
            onClick={() => setActive(!active)}
          >
            <div className={styles.toggleHandle} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {rule ? 'Save Rule Configuration' : 'Enable Automation Rule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
