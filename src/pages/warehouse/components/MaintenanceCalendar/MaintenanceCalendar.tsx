import React from 'react';
import { MaintenanceTask } from '@/types/warehouse';
import styles from './MaintenanceCalendar.module.css';

interface MaintenanceCalendarProps {
  tasks: MaintenanceTask[];
}

export const MaintenanceCalendar: React.FC<MaintenanceCalendarProps> = ({ tasks }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const currentDayIndex = (today.getDay() + 6) % 7; // Mon is 0

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return '#dc2626';
      case 'High': return '#d97706';
      case 'Medium': return '#2563eb';
      default: return '#10b981';
    }
  };

  return (
    <div className={styles.calendar}>
      {days.map((day, i) => {
        const date = new Date();
        date.setDate(today.getDate() - currentDayIndex + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayTasks = tasks.filter(t => t.scheduledDate === dateStr);

        return (
          <div key={day} className={`${styles.dayCol} ${i === currentDayIndex ? styles.today : ''}`}>
            <div className={styles.dayHeader}>
              <span className={styles.dayName}>{day}</span>
              <span className={styles.dayNumber}>{date.getDate()}</span>
            </div>
            <div className={styles.taskList}>
              {dayTasks.map(task => (
                <div 
                  key={task.id} 
                  className={styles.taskDot} 
                  style={{ backgroundColor: getPriorityColor(task.priority) }}
                  title={`${task.asset}: ${task.taskType}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
