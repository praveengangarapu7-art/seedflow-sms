import React from 'react';
import { Sparkles, LucideIcon } from 'lucide-react';
import styles from './InsightsPanel.module.css';

interface Insight {
  id?: string;
  type?: 'warning' | 'trend' | 'info';
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface InsightsPanelProps {
  title?: string;
  insights: Insight[];
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ 
  title = 'AI insights', 
  insights 
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Sparkles size={16} className={styles.headerIcon} />
        <h4 className={styles.headerTitle}>{title}</h4>
      </div>
      <div className={styles.list}>
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <div key={idx} className={styles.item}>
              <div className={styles.itemMain}>
                {Icon && <Icon size={16} className={styles.itemIcon} />}
                <div className={styles.itemContent}>
                  <p className={styles.itemTitle}>{insight.title}</p>
                  <p className={styles.itemDesc}>{insight.description}</p>
                </div>
              </div>
              {insight.actionLabel && (
                <button 
                  className={styles.actionBtn}
                  onClick={insight.onAction}
                >
                  {insight.actionLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
