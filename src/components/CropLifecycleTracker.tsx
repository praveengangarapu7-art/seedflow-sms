import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Check,
  CircleDot,
  Flower2,
  Leaf,
  Sprout,
  Sun,
  Tractor,
  TrendingUp,
  Wheat,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CropPlan, FieldInspection } from '@/services/api';
import {
  buildCropLifecycle,
  formatLifecycleDate,
  formatLifecycleRange,
  type CropLifecycle,
  type CropLifecycleStage,
  type CropLifecycleStageKey,
} from '@/utils/cropLifecycle';
import styles from './CropLifecycleTracker.module.css';

const STAGE_ICONS: Record<CropLifecycleStageKey, LucideIcon> = {
  'land-preparation': Tractor,
  sowing: Sprout,
  germination: Leaf,
  'vegetative-growth': TrendingUp,
  flowering: Flower2,
  pollination: Wind,
  'seed-development': CircleDot,
  maturity: Sun,
  harvest: Wheat,
};

function healthChipClass(score: number): string {
  if (score > 80) return styles.chipHealthGood;
  if (score >= 60) return styles.chipHealthModerate;
  return styles.chipHealthPoor;
}

export interface CropLifecycleTrackerProps {
  /** Pre-computed lifecycle. Takes precedence over `plan` / `inspections`. */
  lifecycle?: CropLifecycle;
  /** Crop plan used to derive stage dates when `lifecycle` is not supplied. */
  plan?: CropPlan | null;
  /** Field inspections for this crop; each one is bucketed into its stage. */
  inspections?: FieldInspection[];
  /** Overrides "today" — useful for tests and for replaying past seasons. */
  referenceDate?: string | Date;
  /** `horizontal` is the compact widget; `vertical` is the full timeline. */
  orientation?: 'horizontal' | 'vertical';
  showHeader?: boolean;
  /** Show inspection results under each stage (vertical orientation only). */
  showInspections?: boolean;
  showDescriptions?: boolean;
  title?: string;
  subtitle?: string;
  selectedStageKey?: CropLifecycleStageKey | null;
  onSelectStage?: (stage: CropLifecycleStage) => void;
  className?: string;
}

/**
 * Crop Lifecycle Monitoring widget — renders the nine crop stages in order,
 * highlights the stage the crop is in today, and surfaces the dates and
 * inspection results attached to each stage.
 */
export function CropLifecycleTracker({
  lifecycle,
  plan,
  inspections = [],
  referenceDate,
  orientation = 'horizontal',
  showHeader = true,
  showInspections = true,
  showDescriptions = true,
  title = 'Crop Lifecycle',
  subtitle,
  selectedStageKey = null,
  onSelectStage,
  className = '',
}: CropLifecycleTrackerProps) {
  const resolved = useMemo(
    () => lifecycle ?? buildCropLifecycle({ plan, inspections, referenceDate }),
    [lifecycle, plan, inspections, referenceDate],
  );

  const rootClasses = [
    styles.root,
    orientation === 'vertical' ? styles.vertical : styles.horizontal,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const resolvedSubtitle = subtitle
    ?? (resolved.hasDates
      ? `${formatLifecycleDate(resolved.startDate)} → ${formatLifecycleDate(resolved.endDate)}`
      : 'Stage dates are estimated — this plan has no sowing or harvest date.');

  return (
    <div className={rootClasses} data-orientation={orientation}>
      {showHeader ? (
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <h3 className={styles.title}>{title}</h3>
              <p className={styles.subtitle}>{resolvedSubtitle}</p>
            </div>
            {resolved.currentStage ? (
              <span className={styles.currentChip}>
                <span className={styles.currentChipDot} />
                {resolved.isComplete
                  ? 'Lifecycle complete'
                  : `Stage ${resolved.currentStage.order} of ${resolved.totalStages} · ${resolved.currentStage.label}`}
              </span>
            ) : (
              <span className={styles.currentChip}>Not in progress</span>
            )}
          </div>

          <div className={styles.progressRow}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${resolved.progressPercent}%` }} />
            </div>
            <span className={styles.progressValue}>{resolved.progressPercent}%</span>
          </div>

          {resolved.isCancelled ? (
            <div className={styles.notice}>
              <AlertTriangle size={14} />
              This crop plan was cancelled — remaining stages will not be carried out.
            </div>
          ) : null}
          {!resolved.hasDates && !resolved.isCancelled ? (
            <div className={styles.notice}>
              <AlertTriangle size={14} />
              Add a sowing and harvest date to the crop plan for exact stage dates.
            </div>
          ) : null}
        </div>
      ) : null}

      <ol className={styles.stages}>
        {resolved.stages.map((stage) => (
          <StageItem
            key={stage.key}
            stage={stage}
            orientation={orientation}
            showInspections={showInspections}
            showDescriptions={showDescriptions}
            isSelected={selectedStageKey === stage.key}
            onSelectStage={onSelectStage}
          />
        ))}
      </ol>
    </div>
  );
}

interface StageItemProps {
  stage: CropLifecycleStage;
  orientation: 'horizontal' | 'vertical';
  showInspections: boolean;
  showDescriptions: boolean;
  isSelected: boolean;
  onSelectStage?: (stage: CropLifecycleStage) => void;
}

function StageItem({
  stage,
  orientation,
  showInspections,
  showDescriptions,
  isSelected,
  onSelectStage,
}: StageItemProps) {
  const Icon = STAGE_ICONS[stage.key];
  const interactive = Boolean(onSelectStage);

  const itemClasses = [
    styles.stage,
    styles[stage.status],
    isSelected ? styles.selected : '',
    interactive ? styles.stageInteractive : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content: ReactNode = (
    <>
      <span className={styles.node}>
        {stage.status === 'completed' ? <Check size={20} strokeWidth={3} /> : <Icon size={20} />}
        <span className={styles.nodeIndex}>{stage.order}</span>
      </span>

      <span className={styles.body}>
        <span className={styles.headRow}>
          <span>
            <span className={styles.stageMeta}>Stage {stage.order}</span>
            <span className={styles.stageLabel}>{stage.label}</span>
          </span>
          {orientation === 'vertical' ? <StageChips stage={stage} /> : null}
        </span>

        <span className={styles.stageDates}>
          <CalendarDays size={13} />
          {formatLifecycleRange(stage.startDate, stage.endDate)}
        </span>

        {stage.durationDays !== null ? (
          <span className={styles.stageDuration}>{stage.durationDays} days</span>
        ) : null}

        {orientation === 'horizontal' ? <StageChips stage={stage} compact /> : null}

        {showDescriptions ? <span className={styles.stageDescription}>{stage.description}</span> : null}

        {showInspections ? <StageInspections stage={stage} /> : null}
      </span>
    </>
  );

  return (
    <li
      className={itemClasses}
      data-stage={stage.key}
      data-status={stage.status}
      aria-current={stage.isCurrent ? 'step' : undefined}
    >
      {interactive ? (
        <button
          type="button"
          className={styles.stageButton}
          onClick={() => onSelectStage?.(stage)}
          aria-pressed={isSelected}
        >
          {content}
        </button>
      ) : (
        <span className={styles.stageButton}>{content}</span>
      )}
    </li>
  );
}

function StageChips({ stage, compact = false }: { stage: CropLifecycleStage; compact?: boolean }) {
  const hasInspections = stage.inspections.length > 0;

  if (!hasInspections) {
    if (compact) return null;
    return (
      <span className={styles.chipRow}>
        <span className={`${styles.chip} ${styles.chipMuted}`}>No inspection</span>
      </span>
    );
  }

  return (
    <span className={styles.chipRow}>
      {stage.averageHealthScore !== null ? (
        <span className={`${styles.chip} ${healthChipClass(stage.averageHealthScore)}`}>
          <Activity size={11} />
          Health {stage.averageHealthScore}
        </span>
      ) : null}
      <span className={`${styles.chip} ${styles.chipCount}`}>
        {stage.inspections.length} {stage.inspections.length === 1 ? 'inspection' : 'inspections'}
      </span>
      {stage.diseaseCount > 0 ? (
        <span className={`${styles.chip} ${styles.chipDisease}`}>
          <AlertTriangle size={11} />
          {stage.diseaseCount} disease
        </span>
      ) : null}
    </span>
  );
}

function StageInspections({ stage }: { stage: CropLifecycleStage }) {
  if (stage.inspections.length === 0) {
    return <span className={styles.noInspection}>No inspection recorded at this stage.</span>;
  }

  return (
    <span className={styles.inspectionList}>
      {stage.inspections.map((inspection: FieldInspection) => (
        <span key={inspection.id} className={styles.inspectionItem}>
          <Activity size={13} />
          <span className={styles.inspectionMain}>
            <span>
              <span className={styles.inspectionCode}>{inspection.inspectionCode}</span>
              {' · '}
              {formatLifecycleDate(inspection.inspectionDate)}
              {' · '}
              Health {inspection.healthScore}
              {inspection.inspectorName ? ` · ${inspection.inspectorName}` : ''}
            </span>
            {inspection.diseaseDetected ? (
              <span className={styles.inspectionNote}>
                Disease: {inspection.diseaseName ?? 'Detected'}
              </span>
            ) : null}
            {inspection.notes ? <span className={styles.inspectionNote}>{inspection.notes}</span> : null}
          </span>
        </span>
      ))}
    </span>
  );
}

export default CropLifecycleTracker;
