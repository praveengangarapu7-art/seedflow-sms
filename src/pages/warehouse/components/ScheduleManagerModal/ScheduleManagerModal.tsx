import { useState } from 'react';
import { Calendar, Edit2, Pause, Play, Trash2, Plus } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import styles from './ScheduleManagerModal.module.css';

interface RecurringSchedule {
  id: string;
  name: string;
  strategy: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  scope: string;
  counters: string;
  time: string;
  active: boolean;
}

interface ScheduledOccurrence {
  date: string;          // 'DD MMM'
  count: number;
}

interface ScheduleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_SCHEDULES: RecurringSchedule[] = [
  { id: 'SCH-001', name: 'High-velocity items',  strategy: 'ABC analysis (Class A)', frequency: 'Weekly',  scope: 'Cold zones', counters: 'Ramesh K., Priya S.', time: 'Mon 09:00', active: true },
  { id: 'SCH-002', name: 'Cold storage check',   strategy: 'Zone-based',             frequency: 'Weekly',  scope: 'Cold Zone A, B, C', counters: 'Vikram S.', time: 'Wed 10:30', active: true },
  { id: 'SCH-003', name: 'Random spot check',    strategy: 'Random',                 frequency: 'Daily',   scope: 'All zones', counters: 'Rotation', time: '15:00', active: true },
  { id: 'SCH-004', name: 'Quarterly full count', strategy: 'Full inventory',         frequency: 'Monthly', scope: 'All warehouses', counters: 'All staff', time: '1st Sat 06:00', active: false },
];

const UPCOMING_OCCURRENCES: ScheduledOccurrence[] = [
  { date: '04 May', count: 1 },
  { date: '06 May', count: 2 },
  { date: '08 May', count: 1 },
  { date: '11 May', count: 1 },
  { date: '13 May', count: 2 },
  { date: '15 May', count: 1 },
  { date: '18 May', count: 3 },
  { date: '20 May', count: 1 },
];

export function ScheduleManagerModal({ isOpen, onClose }: ScheduleManagerModalProps) {
  const { addToast } = useToast();
  const [schedules, setSchedules] = useState<RecurringSchedule[]>(INITIAL_SCHEDULES);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFrequency, setNewFrequency] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [newStrategy, setNewStrategy] = useState('ABC analysis');
  const [newScope, setNewScope] = useState('All zones');
  const [newTime, setNewTime] = useState('09:00');

  const togglePause = (id: string) => {
    setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, active: !s.active } : s));
    const sched = schedules.find((s) => s.id === id);
    if (sched) addToast({ type: sched.active ? 'warning' : 'success', message: `${sched.name} ${sched.active ? 'paused' : 'resumed'}` });
  };

  const remove = (id: string) => {
    const sched = schedules.find((s) => s.id === id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    if (sched) addToast({ type: 'warning', message: `${sched.name} schedule deleted` });
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const next: RecurringSchedule = {
      id: `SCH-${String(schedules.length + 1).padStart(3, '0')}`,
      name: newName,
      strategy: newStrategy,
      frequency: newFrequency,
      scope: newScope,
      counters: 'TBD',
      time: newTime,
      active: true,
    };
    setSchedules((prev) => [next, ...prev]);
    addToast({ type: 'success', message: `Schedule "${newName}" created` });
    setShowNewForm(false);
    setNewName('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule manager" size="xl">
      <section className={styles.calendarSection}>
        <h4 className={styles.sectionTitle}><Calendar size={14} /> Upcoming counts (next 30 days)</h4>
        <div className={styles.calendarStrip}>
          {UPCOMING_OCCURRENCES.map((o) => (
            <div key={o.date} className={styles.calendarCell}>
              <span className={styles.calendarDate}>{o.date}</span>
              <span className={styles.calendarBadge}>{o.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>Recurring schedules</h4>
          <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setShowNewForm((s) => !s)}>
            {showNewForm ? 'Cancel' : 'Add recurring schedule'}
          </Button>
        </div>

        {showNewForm && (
          <div className={styles.newForm}>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span>Name</span>
                <input type="text" className={styles.input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Quarterly cold zone audit" />
              </label>
              <label className={styles.field}>
                <span>Strategy</span>
                <select className={styles.input} value={newStrategy} onChange={(e) => setNewStrategy(e.target.value)}>
                  <option>ABC analysis</option>
                  <option>Zone-based</option>
                  <option>Random</option>
                  <option>Full inventory</option>
                  <option>Velocity-based</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Frequency</span>
                <select className={styles.input} value={newFrequency} onChange={(e) => setNewFrequency(e.target.value as 'Daily' | 'Weekly' | 'Monthly')}>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Scope</span>
                <input type="text" className={styles.input} value={newScope} onChange={(e) => setNewScope(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Time</span>
                <input type="time" className={styles.input} value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </label>
            </div>
            <div className={styles.formFooter}>
              <Button variant="primary" size="sm" disabled={!newName.trim()} onClick={handleAdd}>Save schedule</Button>
            </div>
          </div>
        )}

        <div className={styles.list}>
          {schedules.map((s) => (
            <div key={s.id} className={`${styles.row} ${!s.active ? styles.rowPaused : ''}`}>
              <div className={styles.rowMain}>
                <div className={styles.rowHeader}>
                  <span className={styles.rowName}>{s.name}</span>
                  <span className={`${styles.statusChip} ${s.active ? styles.chipActive : styles.chipPaused}`}>
                    {s.active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className={styles.rowMeta}>
                  {s.frequency} · {s.strategy} · {s.scope} · {s.counters} · {s.time}
                </div>
              </div>
              <div className={styles.rowActions}>
                <button className={styles.iconBtn} title="Edit" onClick={() => addToast({ message: `Edit form opened for ${s.name}` })}><Edit2 size={14} /></button>
                <button className={styles.iconBtn} title={s.active ? 'Pause' : 'Resume'} onClick={() => togglePause(s.id)}>
                  {s.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button className={`${styles.iconBtn} ${styles.danger}`} title="Delete" onClick={() => remove(s.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
