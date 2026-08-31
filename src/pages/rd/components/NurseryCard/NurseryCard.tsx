import React from 'react';
import { MapPin, Calendar, Grid } from 'lucide-react';
import { Nursery } from '@/types/rd';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { ActionMenu } from '@/components/common/ActionMenu';
import { usePermission } from '@/hooks/usePermission';
import styles from './NurseryCard.module.css';

interface NurseryCardProps {
  nursery: Nursery;
  onStatusChange?: (id: string, newStatus: Nursery['status']) => void;
  onDelete?: (id: string) => void;
  onClick: (id: string) => void;
  index: number;
}

function getInitials(name: string): string {
  if (!name) return 'S';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const NurseryCard: React.FC<NurseryCardProps> = ({
  nursery,
  onStatusChange,
  onDelete,
  onClick,
  index,
}) => {
  const totalSlots = nursery.location.rows * nursery.location.plants;

  const canCreate = usePermission('create_nursery');
  const canInspect = usePermission('inspect_nursery');

  const actionItems = [
    {
      label: 'View details',
      onClick: () => onClick(nursery.id),
    },
    ...(canCreate ? [
      {
        label: 'Mark as Growing',
        onClick: () => onStatusChange?.(nursery.id, 'Growing'),
        disabled: nursery.status === 'Growing',
      },
      {
        label: 'Mark as Completed',
        onClick: () => onStatusChange?.(nursery.id, 'Completed'),
        disabled: nursery.status === 'Completed',
      },
      {
        label: 'Delete nursery',
        onClick: () => onDelete?.(nursery.id),
        variant: 'danger' as const,
      },
    ] : []),
    ...(canInspect ? [
      {
        label: 'Record inspection',
        onClick: () => {
          // Action handled implicitly via mock state or toast trigger
        },
      },
      {
        label: 'Flag issue',
        onClick: () => {
          // Mock action
        },
      },
    ] : []),
  ];

  const getSuccessRate = () => {
    if (!nursery.crossesMade) return 0;
    return Math.round((nursery.crossesSuccessful || 0) / nursery.crossesMade * 100);
  };

  return (
    <div
      className={styles.card}
      onClick={() => onClick(nursery.id)}
      style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
    >
      {/* Top Row */}
      <div className={styles.topRow}>
        <span className={styles.id}>{nursery.id}</span>
        <div className={styles.topRight} onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={nursery.status} type="rd" />
          <ActionMenu items={actionItems} />
        </div>
      </div>

      {/* Name */}
      <h3 className={styles.title}>{nursery.name}</h3>

      {/* Chip row */}
      <div className={styles.chips}>
        <span className={styles.cropChip}>{nursery.crop}</span>
        <span className={styles.typeChip}>{nursery.type}</span>
      </div>

      {/* Meta grid */}
      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <MapPin size={14} className={styles.metaIcon} />
          <span>{nursery.location.facility} • {nursery.location.block}</span>
        </div>
        <div className={styles.metaItem}>
          <Calendar size={14} className={styles.metaIcon} />
          <span>{nursery.season}</span>
        </div>
        <div className={styles.metaItem}>
          <Grid size={14} className={styles.metaIcon} />
          <span>{nursery.location.rows} x {nursery.location.plants} ({totalSlots.toLocaleString()} slots)</span>
        </div>
      </div>

      {/* Crossing block success status if type is Crossing block */}
      {nursery.type === 'Crossing block' && (nursery.crossesMade || 0) > 0 && (
        <div className={styles.crossesProgressSection}>
          <div className={styles.progressLabel}>
            <span>Crosses: {nursery.crossesSuccessful} / {nursery.crossesMade}</span>
            <span>{getSuccessRate()}% success</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${getSuccessRate()}%` }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.linkedCount}>
          {nursery.programRefs.length} linked programs
        </span>
        <div className={styles.staffAvatars}>
          {nursery.responsibleStaff.slice(0, 3).map((staff, idx) => (
            <div
              key={idx}
              className={styles.avatar}
              title={staff}
              style={{ zIndex: 3 - idx }}
            >
              {getInitials(staff)}
            </div>
          ))}
          {nursery.responsibleStaff.length > 3 && (
            <div className={`${styles.avatar} ${styles.avatarMore}`} title="More staff">
              +{nursery.responsibleStaff.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
