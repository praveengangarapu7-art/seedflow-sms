import React from 'react';
import { Mail, Phone, MapPin, MoreVertical, Edit2, Map, Power } from 'lucide-react';
import { WarehouseConfig } from '@/types/warehouse';
import { Badge } from '@/components/common/Badge/Badge';
import { useToast } from '@/components/common/Toast/ToastContext';
import styles from './WarehouseCard.module.css';

interface WarehouseCardProps {
  warehouse: WarehouseConfig;
  onEdit: (w: WarehouseConfig) => void;
  onDeactivate: (id: string) => void;
  onViewMap?: (w: WarehouseConfig) => void;
}

export const WarehouseCard: React.FC<WarehouseCardProps> = ({ warehouse, onEdit, onDeactivate, onViewMap }) => {
  const { addToast } = useToast();
  const occupancyPct = warehouse.currentlyStored && warehouse.totalCapacity
    ? Math.round((warehouse.currentlyStored / warehouse.totalCapacity) * 100)
    : 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Badge variant={warehouse.active ? 'success' : 'neutral'}>
          {warehouse.active ? 'Active' : 'Inactive'}
        </Badge>
        <Badge variant="info">{warehouse.type}</Badge>
        <div className={styles.headerActions}>
          <div className={`${styles.toggle} ${warehouse.active ? styles.active : ''}`} onClick={() => onDeactivate(warehouse.id)}>
            <div className={styles.toggleHandle} />
          </div>
          <button className={styles.moreBtn}><MoreVertical size={16} /></button>
        </div>
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{warehouse.name}</h3>
        <code className={styles.code}>{warehouse.code}</code>

        <div className={styles.managerRow}>
          <div className={styles.avatar}>{warehouse.manager.charAt(0)}</div>
          <div className={styles.managerInfo}>
            <span className={styles.managerName}>{warehouse.manager}</span>
            <div className={styles.managerLinks}>
              {warehouse.managerPhone && <Phone size={12} className={styles.managerIcon} />}
              {warehouse.managerEmail && <Mail size={12} className={styles.managerIcon} />}
            </div>
          </div>
        </div>

        <div className={styles.address}>
          <MapPin size={14} className={styles.addressIcon} />
          <span>{warehouse.address.line1}, {warehouse.address.city}</span>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Zones</span>
            <span className={styles.statValue}>{warehouse.zonesCount}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Capacity</span>
            <span className={styles.statValue}>{warehouse.totalCapacity.toLocaleString()} bags</span>
          </div>
          <div className={styles.statFull}>
            <div className={styles.statLabelRow}>
              <span>Stored</span>
              <span>{warehouse.currentlyStored?.toLocaleString()} ({occupancyPct}%)</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${occupancyPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.footerBtn} onClick={() => onEdit(warehouse)}>
          <Edit2 size={14} />
          <span>Edit</span>
        </button>
        <button className={styles.footerBtn} onClick={() => { if (onViewMap) { onViewMap(warehouse); } else { console.log('View on map', warehouse.id); addToast({ message: `Map view opened for ${warehouse.name}` }); } }}>
          <Map size={14} />
          <span>Map</span>
        </button>
        <button className={`${styles.footerBtn} ${styles.danger}`} onClick={() => onDeactivate(warehouse.id)}>
          <Power size={14} />
          <span>{warehouse.active ? 'Deactivate' : 'Activate'}</span>
        </button>
      </div>
    </div>
  );
};
