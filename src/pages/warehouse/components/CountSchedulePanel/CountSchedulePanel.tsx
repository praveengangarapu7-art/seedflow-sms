import { Calendar } from 'lucide-react';
import type { RecurringSchedule } from '../../mockData/cycleCountData';
import styles from './CountSchedulePanel.module.css';

interface CountSchedulePanelProps {
  recurring: RecurringSchedule[];
  weekDays: { label: string; date: string; dots: string[] }[];
  onManageSchedule: () => void;
}

export function CountSchedulePanel({ recurring, weekDays, onManageSchedule }: CountSchedulePanelProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Upcoming schedule</h3>
          <span className={styles.subtitle}>This week + recurring cycles</span>
        </div>
        <button className={styles.manageLink} onClick={onManageSchedule}>Manage schedule</button>
      </div>

      <div className={styles.calendar}>
        {weekDays.map((day) => (
          <div key={day.label} className={styles.dayCell}>
            <div className={styles.dayLabel}>{day.label}</div>
            <div className={styles.dayDate}>{day.date}</div>
            <div className={styles.dayDots}>
              {day.dots.length === 0
                ? <span className={styles.dotEmpty} />
                : day.dots.map((cls, idx) => <span key={idx} className={`${styles.dot} ${styles[cls]}`} />)}
            </div>
          </div>
        ))}
      </div>

      <h4 className={styles.recurringTitle}>Recurring counts</h4>
      <ul className={styles.recurringList}>
        {recurring.map((r) => (
          <li key={r.id} className={styles.recurringRow}>
            <div className={styles.recMain}>
              <span className={styles.recName}>{r.name}</span>
              <span className={styles.recFreq}>
                <Calendar size={11} /> {r.frequency} · Next: {r.nextDate}
              </span>
            </div>
            {r.lastAccuracyPct !== undefined && (
              <span className={styles.accuracyChip}>{r.lastAccuracyPct}% accuracy</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
