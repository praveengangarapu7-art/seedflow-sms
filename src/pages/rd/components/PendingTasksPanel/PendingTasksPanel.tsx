import React, { useState } from 'react';
import { Card } from '@/components/common/Card/Card';
import { Button } from '@/components/common/Button/Button';
import { Badge } from '@/components/common/Badge/Badge';
import { 
  ClipboardList, Clock, FileText, Award, 
  ChevronDown, ChevronRight, 
  AlertCircle, AlertTriangle, Info 
} from 'lucide-react';
import { pendingTasks } from '../../mockData/dashboardData';
import { useToast } from '@/components/common/Toast/ToastContext';
import type { TaskCategory, PendingTask } from '@/types/rd';
import styles from './PendingTasksPanel.module.css';

const severityIcons = {
  critical: <AlertCircle size={16} className={styles.iconCritical} />,
  warning: <AlertTriangle size={16} className={styles.iconWarning} />,
  info: <Info size={16} className={styles.iconInfo} />,
};

const categoryConfig: Record<TaskCategory, { label: string; icon: React.ReactNode }> = {
  observation_due: { label: 'Observations due', icon: <ClipboardList size={16} /> },
  approval_pending: { label: 'Approvals pending', icon: <Clock size={16} /> },
  data_review: { label: 'Data review', icon: <FileText size={16} /> },
  registration_milestone: { label: 'Registration milestones', icon: <Award size={16} /> },
};

export function PendingTasksPanel() {
  const { addToast } = useToast();
  const [expanded, setExpanded] = useState<Record<TaskCategory, boolean>>({
    observation_due: true,
    approval_pending: true,
    data_review: true,
    registration_milestone: true,
  });

  const toggleSection = (cat: TaskCategory) => {
    setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleAction = (id: string) => {
    addToast(`Take action on task ${id}`, 'success');
  };

  const groupedTasks = pendingTasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<TaskCategory, PendingTask[]>);

  const categories = Object.keys(categoryConfig) as TaskCategory[];

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <h3 className={styles.title}>Pending tasks</h3>
          {pendingTasks.length > 0 && (
            <Badge variant="warning">{pendingTasks.length}</Badge>
          )}
        </div>
        <a href="#" className={styles.viewAll} onClick={e => { e.preventDefault(); addToast('View all tasks', 'info'); }}>
          View all &rarr;
        </a>
      </div>

      <div className={styles.body}>
        {categories.map(cat => {
          const tasks = groupedTasks[cat] || [];
          if (tasks.length === 0) return null;

          const isExpanded = expanded[cat];
          const config = categoryConfig[cat];

          return (
            <div key={cat} className={styles.section}>
              <button 
                className={styles.sectionHeader} 
                onClick={() => toggleSection(cat)}
              >
                <div className={styles.sectionHeaderLeft}>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className={styles.sectionIcon}>{config.icon}</span>
                  <span className={styles.sectionLabel}>{config.label}</span>
                </div>
                <Badge variant="neutral">{tasks.length}</Badge>
              </button>

              {isExpanded && (
                <div className={styles.taskList}>
                  {tasks.map(task => (
                    <div key={task.id} className={styles.taskItem}>
                      <div className={styles.taskIconWrapper}>
                        {severityIcons[task.severity]}
                      </div>
                      <div className={styles.taskContent}>
                        <h4 className={styles.taskTitle}>{task.title}</h4>
                        <p className={`${styles.taskDue} ${task.dueDate.includes('Overdue') ? styles.overdue : ''}`}>
                          {task.dueDate}
                        </p>
                      </div>
                      <div className={styles.taskAction}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleAction(task.id)}
                        >
                          {task.actionLabel} &rarr;
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
