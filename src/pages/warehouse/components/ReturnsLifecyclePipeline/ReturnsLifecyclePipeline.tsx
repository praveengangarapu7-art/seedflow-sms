import { PlayCircle, Truck, PackageCheck, Search, HelpCircle, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';
import type { ReturnStatus } from '@/types/warehouse';
import styles from './ReturnsLifecyclePipeline.module.css';

interface ReturnsLifecyclePipelineProps {
  counts: Record<ReturnStatus, number>;
  activeStatus: ReturnStatus | null;
  onSelect: (status: ReturnStatus) => void;
}

const STAGES: Array<{ key: ReturnStatus; label: string; icon: LucideIcon }> = [
  { key: 'Initiated',           label: 'Initiated',           icon: PlayCircle },
  { key: 'In transit',          label: 'In transit',          icon: Truck },
  { key: 'Received',            label: 'Received',            icon: PackageCheck },
  { key: 'Inspecting',          label: 'Inspecting',          icon: Search },
  { key: 'Disposition pending', label: 'Disposition pending', icon: HelpCircle },
  { key: 'Resolved',            label: 'Resolved',            icon: CheckCircle2 },
  { key: 'Cancelled',           label: 'Cancelled',           icon: XCircle },
];

export function ReturnsLifecyclePipeline({ counts, activeStatus, onSelect }: ReturnsLifecyclePipelineProps) {
  return (
    <div className={styles.pipeline} role="tablist" aria-label="Returns lifecycle">
      {STAGES.map((stage, idx) => {
        const Icon = stage.icon;
        const count = counts[stage.key] ?? 0;
        const isActive = activeStatus === stage.key;
        const isLast = idx === STAGES.length - 1;
        const hasItems = count > 0;
        return (
          <div key={stage.key} className={styles.segmentWrap}>
            <button
              className={`${styles.segment} ${isActive ? styles.segmentActive : ''} ${!hasItems ? styles.segmentEmpty : ''}`}
              onClick={() => onSelect(stage.key)}
              role="tab"
              aria-selected={isActive}
              aria-label={`${stage.label}: ${count} returns`}
            >
              <span className={styles.iconBadge}><Icon size={14} /></span>
              <span className={styles.segmentLabel}>{stage.label}</span>
              <span className={styles.count}>{count}</span>
            </button>
            {!isLast && <span className={`${styles.connector} ${hasItems ? styles.connectorActive : ''}`} aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
