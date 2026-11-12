import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { ReportDefinition, ReportFrequency, ReportFormat } from '@/types/warehouse';
import styles from './ScheduleReportModal.module.css';

import { setCollection } from '@/hooks/persistentCollections';
import { scheduledReports } from '../../mockData/reportsData';
import type { ScheduledReport } from '@/types/warehouse';
import { useToast } from '@/components/common/Toast/ToastContext';
interface ScheduleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ReportDefinition[];
}

export const ScheduleReportModal: React.FC<ScheduleReportModalProps> = ({
  isOpen,
  onClose,
  reports
}) => {
  const [selectedReportId, setSelectedReportId] = useState('');
  const [frequency, setFrequency] = useState<ReportFrequency>('Weekly');
  const [format, setFormat] = useState<ReportFormat>('PDF');
  const [day, setDay] = useState('Mon');
  const { addToast } = useToast();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule a report"
      size="lg"
    >
      <div className={styles.container}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Select report</label>
          <select 
            className={styles.select}
            value={selectedReportId}
            onChange={(e) => setSelectedReportId(e.target.value)}
          >
            <option value="">Select a report...</option>
            {reports.map(r => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Frequency</label>
          <div className={styles.radioGrid}>
            {['Daily', 'Weekly', 'Monthly', 'Quarterly'].map((f) => (
              <label key={f} className={styles.radioLabel}>
                <input 
                  type="radio" 
                  name="frequency" 
                  checked={frequency === f}
                  onChange={() => setFrequency(f as ReportFrequency)}
                />
                <span>{f}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.scheduleOptions}>
          {frequency === 'Daily' && (
            <Input label="Preferred time" type="time" defaultValue="09:00" />
          )}
          {frequency === 'Weekly' && (
            <div className={styles.row}>
              <div className={styles.formGroup} style={{flex: 1}}>
                <label className={styles.label}>Day of week</label>
                <div className={styles.chipGroup}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <button key={d} type="button" className={`${styles.chip} ${day === d ? styles.chipActive : ''}`} onClick={() => setDay(d)}>{d}</button>
                  ))}
                </div>
              </div>
              <div style={{width: '120px'}}>
                <Input label="Time" type="time" defaultValue="09:00" />
              </div>
            </div>
          )}
          {frequency === 'Monthly' && (
            <div className={styles.row}>
              <div style={{flex: 1}}>
                <Input label="Day of month" type="number" min="1" max="31" defaultValue="1" />
              </div>
              <div style={{flex: 1}}>
                <Input label="Time" type="time" defaultValue="09:00" />
              </div>
            </div>
          )}
          {frequency === 'Quarterly' && (
            <div className={styles.infoNote}>
              Reports will be generated on the 1st day of every quarter at 9:00 AM.
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Recipients</label>
          <Input placeholder="Enter email addresses or search staff..." />
          <div className={styles.recipientList}>
            <div className={styles.recipient}>Nitin R. (Warehouse Mgr)</div>
            <div className={styles.recipient}>Operations Head</div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Format</label>
          <div className={styles.radioGrid}>
            {['PDF', 'Excel', 'CSV'].map((f) => (
              <label key={f} className={styles.radioLabel}>
                <input 
                  type="radio" 
                  name="format" 
                  checked={format === f}
                  onChange={() => setFormat(f as ReportFormat)}
                />
                <span>{f}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            const rep = reports.find((r) => r.id === selectedReportId) ?? reports[0];
            if (!rep) { onClose(); return; }
            const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day);
            setCollection<ScheduledReport>('warehouse.scheduled', scheduledReports, (prev) => [{ id: `SCH-${Date.now().toString(36).toUpperCase()}`, reportId: rep.id, reportTitle: rep.title, frequency, dayOfWeek: frequency === 'Weekly' ? dow : undefined, timeOfDay: '09:00', recipients: [], format, active: true, nextRun: new Date(Date.now() + 86_400_000).toISOString(), createdBy: 'You', createdAt: new Date().toISOString() }, ...prev]);
            addToast({ type: 'success', message: `${rep.title} scheduled (${frequency}${frequency === 'Weekly' ? `, ${day}` : ''}, ${format})` });
            onClose();
          }}>
            Schedule report
          </Button>
        </div>
      </div>
    </Modal>
  );
};
