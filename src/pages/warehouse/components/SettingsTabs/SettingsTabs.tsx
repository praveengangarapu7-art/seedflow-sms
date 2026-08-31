import React from 'react';
import { LucideIcon } from 'lucide-react';
import styles from './SettingsTabs.module.css';

interface SettingsTabsProps {
  tabs: Array<{ key: string; label: string; icon: LucideIcon }>;
  activeTab: string;
  onChange: (key: string) => void;
}

export const SettingsTabs: React.FC<SettingsTabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className={styles.container} role="tablist" aria-orientation="vertical">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        
        return (
          <button
            key={tab.key}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(tab.key)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.key}`}
            id={`tab-${tab.key}`}
          >
            <Icon className={styles.icon} size={18} />
            <span className={styles.label}>{tab.label}</span>
            {isActive && <div className={styles.indicator} />}
          </button>
        );
      })}
    </div>
  );
};
