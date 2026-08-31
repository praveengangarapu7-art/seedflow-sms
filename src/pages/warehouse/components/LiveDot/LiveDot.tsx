import React from 'react';
import styles from './LiveDot.module.css';

export const LiveDot: React.FC = () => {
  return (
    <div className={styles.container} aria-label="Live data" aria-live="polite">
      <div className={styles.dot} />
      <div className={styles.pulse} />
    </div>
  );
};
