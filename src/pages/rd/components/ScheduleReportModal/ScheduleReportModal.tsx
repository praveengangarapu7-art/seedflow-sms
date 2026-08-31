import React, { useState } from 'react';
import { Mail, Clock } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { useToast } from '@/components/common/Toast/ToastContext';
import { ReportDefinition, ScheduledReport } from '../../mockData/reportsData';
import styles from './ScheduleReportModal.module.css';

interface ScheduleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ReportDefinition[];
  onAddSchedule?: (newSchedule: ScheduledReport) => void;
}

export const ScheduleReportModal: React.FC<ScheduleReportModalProps> = ({
  isOpen,
  onClose,
  reports,
  onAddSchedule
}) => {
  const { addToast } = useToast();
  const [selectedReportId, setSelectedReportId] = useState(reports[0]?.id || '');
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Quarterly'>('Weekly');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [recipientsText, setRecipientsText] = useState('dr.anita@seedsphere.in, vijay.kumar@seedsphere.in');
  const [format, setFormat] = useState('PDF');
  const [subjectTemplate, setSubjectTemplate] = useState('Weekly Research Report: {report_name} - {date_range}');
  const [active, setActive] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedReport = reports.find(r => r.id === selectedReportId);
    const reportTitle = matchedReport ? matchedReport.title : 'Research Report';

    const emails = recipientsText
      .split(',')
      .map(email => email.trim())
      .filter(email => email.includes('@'));

    if (emails.length === 0) {
      addToast({ type: 'warning', message: 'Please specify at least one valid recipient email.' });
      return;
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7); // Mock next run 7 days out

    const newSchedule: ScheduledReport = {
      id: `SCH-ADD-${Math.floor(Math.random() * 1000)}`,
      reportId: selectedReportId,
      reportTitle,
      frequency,
      timeOfDay,
      ...(frequency === 'Weekly' ? { dayOfWeek } : { dayOfMonth }),
      nextRun: nextDate.toISOString(),
      lastRun: '—',
      lastRunStatus: 'Success',
      recipients: emails,
      format,
      active
    };

    if (onAddSchedule) {
      onAddSchedule(newSchedule);
    }

    addToast({ 
      type: 'success', 
      message: `Report scheduled — first automated run scheduled for ${nextDate.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${timeOfDay}` 
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Schedule Automated Report"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Report Selector */}
        <div className={styles.field}>
          <label className={styles.label}>Select Report Template</label>
          <select 
            value={selectedReportId}
            onChange={(e) => setSelectedReportId(e.target.value)}
            className={styles.select}
          >
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                [{r.category}] {r.title}
              </option>
            ))}
          </select>
        </div>

        {/* Recurrence Frequency */}
        <div className={styles.field}>
          <label className={styles.label}>Frequency</label>
          <div className={styles.radioGrid}>
            {(['Daily', 'Weekly', 'Monthly', 'Quarterly'] as const).map((freq) => (
              <label 
                key={freq} 
                className={`${styles.radioLabel} ${frequency === freq ? styles.activeRadio : ''}`}
              >
                <input 
                  type="radio" 
                  name="frequency" 
                  value={freq}
                  checked={frequency === freq} 
                  onChange={() => setFrequency(freq)} 
                  className={styles.hiddenInput}
                />
                <span>{freq}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dynamic Timing Setup */}
        <div className={styles.row}>
          {frequency === 'Weekly' && (
            <div className={styles.field} style={{ flex: 1 }}>
              <label className={styles.label}>Day of Week</label>
              <select 
                value={dayOfWeek} 
                onChange={(e) => setDayOfWeek(e.target.value)}
                className={styles.select}
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {frequency === 'Monthly' && (
            <div className={styles.field} style={{ flex: 1 }}>
              <label className={styles.label}>Day of Month</label>
              <input 
                type="number" 
                min="1" 
                max="28" 
                value={dayOfMonth} 
                onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                className={styles.inputNum}
              />
            </div>
          )}

          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label}>Time (24h)</label>
            <div className={styles.inputWithIcon}>
              <Clock size={16} className={styles.inputIcon} />
              <input 
                type="time" 
                value={timeOfDay} 
                onChange={(e) => setTimeOfDay(e.target.value)}
                className={styles.inputText}
              />
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div className={styles.field}>
          <label className={styles.label}>Recipients (Comma-separated emails)</label>
          <div className={styles.inputWithIcon}>
            <Mail size={16} className={styles.inputIcon} />
            <input 
              type="text" 
              value={recipientsText} 
              onChange={(e) => setRecipientsText(e.target.value)}
              placeholder="e.g. anita.desai@seedsphere.in, team@seedsphere.in"
              className={styles.inputText}
              required
            />
          </div>
          <span className={styles.helper}>Recipients will receive custom PDF/Excel attachments directly in their inbox.</span>
        </div>

        {/* Format Select */}
        <div className={styles.field}>
          <label className={styles.label}>Delivery Format</label>
          <div className={styles.radioGrid}>
            {['PDF', 'Excel', 'Both (Zip Archive)'].map((f) => (
              <label 
                key={f} 
                className={`${styles.radioLabel} ${format === f ? styles.activeRadio : ''}`}
              >
                <input 
                  type="radio" 
                  name="format" 
                  value={f}
                  checked={format === f} 
                  onChange={() => setFormat(f)} 
                  className={styles.hiddenInput}
                />
                <span>{f}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Subject Template */}
        <div className={styles.field}>
          <Input 
            label="Email Subject Template"
            value={subjectTemplate}
            onChange={(e) => setSubjectTemplate(e.target.value)}
            placeholder="Weekly Research Summary..."
          />
          <span className={styles.helper}>Supports dynamic variables: <code>{`{report_name}`}</code> and <code>{`{date_range}`}</code>.</span>
        </div>

        {/* Active Toggle Switch */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Enable Automated Dispatch</span>
            <span className={styles.toggleDesc}>When enabled, this report will run and dispatch according to scheduling variables.</span>
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
            Schedule Report
          </Button>
        </div>
      </form>
    </Modal>
  );
};
