import React from 'react';
import { X, LucideIcon } from 'lucide-react';
import styles from './BulkActionBar.module.css';

interface BulkAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface BulkActionBarProps {
  selectedCount: number;
  contextLabel?: string;
  actions: BulkAction[];
  onClear: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount, contextLabel, actions, onClear
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <span className={styles.countBadge}>{selectedCount} selected</span>
        {contextLabel && <span className={styles.contextLabel}>{contextLabel}</span>}
      </div>
      <div className={styles.right}>
        {actions.map((action, index) => (
          <button
            key={index}
            className={`${styles.actionBtn} ${styles[action.variant || 'secondary']}`}
            onClick={action.onClick}
          >
            {action.icon && <action.icon size={16} />}
            {action.label}
          </button>
        ))}
        <div className={styles.divider} />
        <button className={styles.clearBtn} onClick={onClear} aria-label="Clear selection">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
