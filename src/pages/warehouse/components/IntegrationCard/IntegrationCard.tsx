import React from 'react';
import { RefreshCw, Settings, Link, Unlink } from 'lucide-react';
import { Integration } from '@/types/warehouse';
import { Badge } from '@/components/common/Badge/Badge';
import styles from './IntegrationCard.module.css';

interface IntegrationCardProps {
  integration: Integration;
  onConfigure: (i: Integration) => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({ 
  integration, 
  onConfigure, 
  onConnect, 
  onDisconnect 
}) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Connected': return 'success';
      case 'Not connected': return 'neutral';
      case 'Error': return 'danger';
      case 'Authentication required': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconContainer}>
          <div className={styles.iconCircle} />
        </div>
        <div className={styles.headerInfo}>
          <h4 className={styles.name}>{integration.name}</h4>
          <Badge variant={getStatusVariant(integration.status) as any}>{integration.status}</Badge>
        </div>
      </div>

      <div className={styles.body}>
        <p className={styles.description}>{integration.description}</p>
        <div className={styles.meta}>
          <Badge variant="neutral">{integration.category}</Badge>
          {integration.lastSync && (
            <div className={styles.lastSync}>
              <RefreshCw size={12} className={styles.syncIcon} />
              <span>Last sync: {integration.lastSync}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        {integration.status === 'Connected' || integration.status === 'Error' || integration.status === 'Authentication required' ? (
          <>
            <button className={styles.footerBtn} onClick={() => onConfigure(integration)}>
              <Settings size={14} />
              <span>Configure</span>
            </button>
            <button className={`${styles.footerBtn} ${styles.danger}`} onClick={() => onDisconnect(integration.id)}>
              <Unlink size={14} />
              <span>Disconnect</span>
            </button>
          </>
        ) : (
          <button className={`${styles.footerBtn} ${styles.primary}`} onClick={() => onConnect(integration.id)}>
            <Link size={14} />
            <span>Connect</span>
          </button>
        )}
      </div>
    </div>
  );
};
