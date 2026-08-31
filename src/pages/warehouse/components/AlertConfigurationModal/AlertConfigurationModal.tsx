import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import styles from './AlertConfigurationModal.module.css';

interface AlertConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertConfigurationModal: React.FC<AlertConfigurationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const steps = [
    { key: 'zone', label: 'Zone & metric' },
    { key: 'thresholds', label: 'Thresholds' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'escalation', label: 'Escalation' }
  ];

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className={styles.stepContent}>
            <div className={styles.inputGroup}>
              <label>Select zones</label>
              <div className={styles.chipGrid}>
                {['Cold Zone A', 'Cold Zone B', 'Cold Zone C', 'Controlled Zone'].map(z => (
                  <button key={z} className={styles.chip}>{z}</button>
                ))}
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label>Metric</label>
              <div className={styles.radioGrid}>
                {['Temperature', 'Humidity', 'CO2', 'Energy'].map(m => (
                  <label key={m} className={styles.radioLabel}>
                    <input type="radio" name="metric" defaultChecked={m === 'Temperature'} />
                    <span>{m}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className={styles.stepContent}>
            <div className={styles.row}>
              <Input label="Min threshold (°C)" placeholder="e.g. 14" />
              <Input label="Max threshold (°C)" placeholder="e.g. 18" />
            </div>
            <Input label="Rate of change limit (°C/hr)" placeholder="e.g. 2" />
            <Input label="Hysteresis (minutes)" placeholder="e.g. 10" helperText="Wait time before triggering alert" />
          </div>
        );
      case 2:
        return (
          <div className={styles.stepContent}>
            <div className={styles.inputGroup}>
              <label>Recipients</label>
              <Input placeholder="Search staff names..." />
            </div>
            <div className={styles.channelMatrix}>
              <div className={styles.matrixHeader}>
                <span>Severity</span>
                <span>SMS</span>
                <span>Email</span>
                <span>In-app</span>
              </div>
              {['Critical', 'Warning', 'Info'].map(s => (
                <div key={s} className={styles.matrixRow}>
                  <span>{s}</span>
                  <input type="checkbox" defaultChecked={s === 'Critical'} />
                  <input type="checkbox" defaultChecked />
                  <input type="checkbox" defaultChecked />
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className={styles.stepContent}>
            <p className={styles.stepDesc}>Define escalation rules if alerts are not acknowledged.</p>
            <div className={styles.escalationTier}>
              <div className={styles.tierHeader}>Escalation Tier 1</div>
              <div className={styles.row}>
                <Input label="If un-acked after (min)" placeholder="30" />
                <div className={styles.inputGroup}>
                  <label>Notify</label>
                  <select className={styles.select}>
                    <option>Warehouse Manager</option>
                    <option>Operations Head</option>
                  </select>
                </div>
              </div>
            </div>
            <Button variant="secondary" onClick={() => {}}>+ Add escalation tier</Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure alerts"
      size="xl"
    >
      <div className={styles.container}>
        <Stepper 
          steps={steps} 
          currentStep={activeStep} 
          onStepClick={(idx: number) => setActiveStep(idx)} 
        />
        
        <div className={styles.body}>
          {renderStep()}
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <div className={styles.rightActions}>
            {activeStep > 0 && (
              <Button variant="secondary" onClick={() => setActiveStep(v => v - 1)}>Back</Button>
            )}
            {activeStep < steps.length - 1 ? (
              <Button variant="primary" onClick={() => setActiveStep(v => v + 1)}>Next</Button>
            ) : (
              <Button variant="primary" onClick={() => { console.log('Config saved'); onClose(); }}>Save configuration</Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
