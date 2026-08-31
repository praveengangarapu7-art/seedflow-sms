import { Clock, Hand, Package, Truck, CheckCircle2, type LucideIcon } from 'lucide-react';
import type { DispatchStatus } from '@/types/warehouse';
import styles from './DispatchPipeline.module.css';

interface DispatchPipelineProps {
  counts: Record<DispatchStatus, number>;
  activeStatus: DispatchStatus | null;
  onSelect: (status: DispatchStatus) => void;
}

const STAGES: Array<{ key: DispatchStatus; label: string; icon: LucideIcon }> = [
  { key: 'Pending',    label: 'Pending',    icon: Clock },
  { key: 'Picking',    label: 'Picking',    icon: Hand },
  { key: 'Packed',     label: 'Packed',     icon: Package },
  { key: 'Dispatched', label: 'Dispatched', icon: Truck },
  { key: 'Delivered',  label: 'Delivered',  icon: CheckCircle2 },
];

export function DispatchPipeline({ counts, activeStatus, onSelect }: DispatchPipelineProps) {
  return (
    <div className={styles.pipeline} role="tablist" aria-label="Dispatch lifecycle">
      {STAGES.map((stage, idx) => {
        const Icon = stage.icon;
        const count = counts[stage.key] ?? 0;
        const isActive = activeStatus === stage.key;
        const isLast = idx === STAGES.length - 1;
        return (
          <div key={stage.key} className={styles.segmentWrap}>
            <button
              className={`${styles.segment} ${isActive ? styles.segmentActive : ''}`}
              onClick={() => onSelect(stage.key)}
              role="tab"
              aria-selected={isActive}
              aria-label={`${stage.label}: ${count} orders`}
            >
              <span className={styles.iconBadge}><Icon size={16} /></span>
              <span className={styles.segmentLabel}>{stage.label}</span>
              <span className={styles.count}>{count}</span>
            </button>
            {!isLast && <span className={styles.connector} aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
