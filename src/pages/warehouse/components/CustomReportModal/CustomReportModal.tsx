import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { Input } from '@/components/common/Input/Input';
import styles from './CustomReportModal.module.css';

import { setCollection } from '@/hooks/persistentCollections';
import { reportDefinitions } from '../../mockData/reportsData';
import type { ReportDefinition } from '@/types/warehouse';
import { useToast } from '@/components/common/Toast/ToastContext';
interface CustomReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomReportModal: React.FC<CustomReportModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [whFilter, setWhFilter] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { addToast } = useToast();
  const steps = [
    { key: 'source', label: 'Data source' },
    { key: 'metrics', label: 'Metrics' },
    { key: 'viz', label: 'Visualization' },
    { key: 'save', label: 'Save & schedule' }
  ];

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className={styles.stepContent}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Data source module</label>
              <select className={styles.select}>
                <option>Inventory</option>
                <option>Stock Movements</option>
                <option>Adjustments</option>
                <option>Cycle Counts</option>
                <option>IoT Monitoring</option>
              </select>
            </div>
            <div className={styles.row}>
              <div style={{flex: 1}}><Input label="Start date" type="date" /></div>
              <div style={{flex: 1}}><Input label="End date" type="date" /></div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Filter by Warehouse</label>
              <div className={styles.chipGrid}>
                {['Main', 'North', 'South', 'East'].map(w => (
                  <button key={w} type="button" className={`${styles.chip} ${whFilter.includes(w) ? styles.chipActive : ''}`} onClick={() => setWhFilter((p) => (p.includes(w) ? p.filter((x) => x !== w) : [...p, w]))}>{w}</button>
                ))}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className={styles.stepContent}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Selected fields</label>
              <div className={styles.checkboxGrid}>
                {['Item Name', 'Category', 'Quantity', 'Unit Cost', 'Value', 'Zone', 'Last Moved'].map(f => (
                  <label key={f} className={styles.checkboxLabel}>
                    <input type="checkbox" defaultChecked={f === 'Item Name' || f === 'Value'} />
                    <span>{f}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Aggregations</label>
              <div className={styles.radioGrid}>
                {['Sum', 'Avg', 'Count', 'Min', 'Max'].map(a => (
                  <label key={a} className={styles.radioLabel}>
                    <input type="radio" name="agg" defaultChecked={a === 'Sum'} />
                    <span>{a}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className={styles.stepContent}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Chart type</label>
              <div className={styles.radioGrid}>
                {['Bar', 'Line', 'Donut', 'Table only'].map(t => (
                  <label key={t} className={styles.radioLabel}>
                    <input type="radio" name="viz" defaultChecked={t === 'Bar'} />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <Input label="Report title" placeholder="e.g. Monthly Stock Value by Category" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input label="Description" placeholder="Optional description..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        );
      case 3:
        return (
          <div className={styles.stepContent}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" defaultChecked />
                <span>Save to library</span>
              </label>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" />
                <span>Schedule recurring report</span>
              </label>
            </div>
            <div className={styles.infoNote}>
              This report will be generated and added to your Library. You can view it anytime from the Reports dashboard.
            </div>
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
      title="Create custom report"
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
              <Button variant="primary" onClick={() => {
                const def: ReportDefinition = { id: `RPT-${Date.now().toString(36).toUpperCase()}`, title: title.trim() || 'Custom report', category: 'Inventory', description: description.trim() || (whFilter.length ? `Warehouses: ${whFilter.join(', ')}` : 'Custom report'), iconName: 'BarChart3', miniPreviewType: 'kpi', miniPreviewValue: 'New', saved: true, hasFullDetailView: false, lastGenerated: 'just now' };
                setCollection<ReportDefinition>('warehouse.reports', reportDefinitions, (prev) => [def, ...prev]);
                addToast({ type: 'success', message: `${def.title} created — find it under Saved reports` });
                onClose();
              }}>Generate report</Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
