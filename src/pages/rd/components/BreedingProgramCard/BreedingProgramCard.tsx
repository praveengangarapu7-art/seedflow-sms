import React from 'react';
import { BreedingProgram } from '@/types/rd';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { ActionMenu } from '@/components/common/ActionMenu';
import { formatIndianCurrency } from '@/utils/formatters';
import { usePermission } from '@/hooks/usePermission';
import styles from './BreedingProgramCard.module.css';

interface BreedingProgramCardProps {
  program: BreedingProgram;
  onStatusChange?: (id: string, newStatus: BreedingProgram['status']) => void;
  onArchive?: (id: string) => void;
  index: number;
}

// Stage progress percentages helper
const STAGE_PROGRESS: Record<string, number> = {
  'P (parents)': 10,
  'F1': 20,
  'F2': 35,
  'F3': 50,
  'F4': 65,
  'F5': 75,
  'F6+': 85,
  'Pre-release': 95,
  'Released': 100,
};

function getInitials(name: string): string {
  if (!name) return 'B';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getDaysRunning(startDateStr: string): number {
  const start = Date.parse(startDateStr);
  if (isNaN(start)) return 0;
  const diffTime = Math.abs(Date.now() - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export const BreedingProgramCard: React.FC<BreedingProgramCardProps> = ({
  program,
  onStatusChange,
  onArchive,
  index,
}) => {
  const daysRunning = getDaysRunning(program.startDate);
  const progressPercent = STAGE_PROGRESS[program.currentStage] ?? 0;

  const canCreate = usePermission('create_breeding_program');
  const canApprove = usePermission('approve_breeding_program');

  // Custom stage style coloring helper
  const getStageClass = (stage: string) => {
    if (stage.startsWith('P')) return styles.stageP;
    if (stage === 'F1' || stage === 'F2') return styles.stageEarly;
    if (stage === 'F3' || stage === 'F4') return styles.stageMid;
    if (stage === 'F5' || stage === 'F6+') return styles.stageLate;
    if (stage === 'Pre-release') return styles.stagePreRelease;
    return styles.stageReleased;
  };

  const actionItems = [
    ...(canCreate ? [
      {
        label: program.status === 'On hold' ? 'Resume program' : 'Place on hold',
        onClick: () => {
          if (onStatusChange) {
            onStatusChange(program.id, program.status === 'On hold' ? 'Active' : 'On hold');
          }
        },
      },
      {
        label: 'Mark completed',
        onClick: () => {
          if (onStatusChange) {
            onStatusChange(program.id, 'Completed');
          }
        },
      },
    ] : []),
    ...(canApprove ? [
      {
        label: 'Approve program',
        onClick: () => {
          if (onStatusChange) onStatusChange(program.id, 'Active');
        },
      },
      {
        label: 'Reject program',
        onClick: () => {
          if (onStatusChange) onStatusChange(program.id, 'On hold');
        },
      },
      {
        label: 'Archive program',
        onClick: () => {
          if (onArchive) onArchive(program.id);
        },
        variant: 'danger' as const,
      },
    ] : []),
  ];

  return (
    <div
      className={styles.card}
      style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
    >
      {/* Top row */}
      <div className={styles.topRow}>
        <span className={styles.programId}>{program.id}</span>
        <div className={styles.topRight} onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={program.status} type="rd" />
          <ActionMenu items={actionItems} />
        </div>
      </div>

      {/* Title */}
      <h3 className={styles.title}>{program.name}</h3>

      {/* Chip row */}
      <div className={styles.chips}>
        <span className={styles.cropChip}>{program.crop}</span>
        <span className={styles.objectiveChip}>{program.objective}</span>
      </div>

      {/* Stage */}
      <div className={styles.stageSection}>
        <span className={styles.stageLabel}>Current Stage</span>
        <span className={`${styles.stageChip} ${getStageClass(program.currentStage)}`}>
          {program.currentStage}
        </span>
      </div>

      {/* Lead Breeder */}
      <div className={styles.breederRow}>
        <div className={styles.avatar}>
          {getInitials(program.leadBreeder)}
        </div>
        <span className={styles.breederName}>{program.leadBreeder}</span>
      </div>

      {/* Progress & Footer */}
      <div className={styles.footerSection}>
        <div className={styles.progressContainer}>
          <div className={styles.progressBar} style={{ width: `${progressPercent}%` }} />
        </div>
        
        <div className={styles.footerMeta}>
          <span>Budget: {formatIndianCurrency(program.spentToDate)} / {formatIndianCurrency(program.budget)}</span>
          <span>{daysRunning} days running</span>
        </div>
      </div>
    </div>
  );
};
