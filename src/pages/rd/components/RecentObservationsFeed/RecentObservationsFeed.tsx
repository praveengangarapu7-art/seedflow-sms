import React from 'react';
import { Card } from '@/components/common/Card/Card';
import { Pencil, Sparkles, Plane, Radio } from 'lucide-react';
import { recentObservations } from '../../mockData/dashboardData';
import { useToast } from '@/components/common/Toast/ToastContext';
import styles from './RecentObservationsFeed.module.css';

const methodIcons = {
  manual: Pencil,
  ai: Sparkles,
  drone: Plane,
  sensor: Radio,
};

export function RecentObservationsFeed() {
  const { addToast } = useToast();

  const handleViewAll = (e: React.MouseEvent) => {
    e.preventDefault();
    addToast('Viewing all observations...', 'info');
  };

  const handleRowClick = (id: string) => {
    addToast(`Open observation ${id}`, 'info');
  };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Recent observations</h3>
          <p className={styles.subtitle}>Latest field data</p>
        </div>
        <a href="#" className={styles.viewAll} onClick={handleViewAll}>View all &rarr;</a>
      </div>
      
      <div className={styles.feedList}>
        {recentObservations.map((obs) => {
          const IconComponent = methodIcons[obs.method];
          
          return (
            <div 
              key={obs.id} 
              className={styles.feedItem}
              onClick={() => handleRowClick(obs.id)}
            >
              <div className={styles.avatar}>
                {obs.observerInitials}
              </div>
              
              <div className={styles.content}>
                <div className={styles.topRow}>
                  <span className={styles.trialRef}>{obs.trialRef}</span>
                  <span className={styles.locationChip}>{obs.locationName}</span>
                  <span className={styles.plotEntry}>{obs.plotEntry}</span>
                </div>
                
                <p className={styles.summary}>{obs.summary}</p>
                
                <div className={styles.bottomRow}>
                  <IconComponent size={12} className={styles.methodIcon} />
                  <span className={styles.methodLabel}>{obs.method}</span>
                  <span className={styles.dot}>&middot;</span>
                  <span className={styles.timestamp}>{obs.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
