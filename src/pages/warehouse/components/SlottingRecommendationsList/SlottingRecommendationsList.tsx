import { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import type { SlottingRecommendation } from '@/types/warehouse';
import styles from './SlottingRecommendationsList.module.css';

import { logMovement } from '../../warehouseStore';
interface SlottingRecommendationsListProps {
  data: SlottingRecommendation[];
}

export function SlottingRecommendationsList({ data }: SlottingRecommendationsListProps) {
  const { addToast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [scheduled, setScheduled] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const handleApply = (id: string) => {
    const rec = data.find((r) => r.id === id);
    if (rec) logMovement({ category: 'Transfer', subType: 'Bin-to-bin (slotting)', itemName: rec.itemName, sku: rec.sku, batch: '', quantity: 0, uom: '', fromLocation: rec.currentLocation, toLocation: rec.suggestedLocation, reasonNotes: rec.reasoning, status: 'Pending approval', approvalChain: [{ approver: 'Warehouse manager', role: 'Warehouse manager', status: 'pending' }] });
    setApplied((prev) => new Set([...prev, id]));
    addToast({ type: 'success', message: 'Slotting suggestion applied — transfer task created' });
  };

  const handleSchedule = (id: string) => {
    setScheduled((prev) => new Set([...prev, id]));
    addToast({ type: 'info', message: 'Slotting scheduled for next maintenance window' });
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    addToast({ message: 'Recommendation dismissed' });
  };

  const visible = data.filter((r) => !dismissed.has(r.id));

  return (
    <div className={styles.list}>
      {visible.map((r) => {
        const isApplied = applied.has(r.id);
        const isScheduled = scheduled.has(r.id);
        return (
          <div key={r.id} className={styles.card}>
            <div className={styles.iconBadge} aria-hidden="true">
              <Sparkles size={16} />
            </div>

            <div className={styles.body}>
              <h4 className={styles.title}>{r.title}</h4>

              <div className={styles.routeRow}>
                <span className={styles.routeFrom}>{r.currentLocation}</span>
                <ArrowRight size={14} className={styles.routeArrow} />
                <span className={styles.routeTo}>{r.suggestedLocation}</span>
              </div>

              <p className={styles.reasoning}>{r.reasoning}</p>

              <span className={styles.impactChip}>{r.impactMetric}</span>
            </div>

            <div className={styles.actions}>
              <Button variant="primary" size="sm" disabled={isApplied} onClick={() => handleApply(r.id)}>
                {isApplied ? 'Applied' : 'Apply'}
              </Button>
              <Button variant="ghost" size="sm" disabled={isScheduled} onClick={() => handleSchedule(r.id)}>
                {isScheduled ? 'Scheduled' : 'Schedule'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDismiss(r.id)}>Dismiss</Button>
            </div>
          </div>
        );
      })}
      {visible.length === 0 && data.length > 0 && (
        <div className={styles.emptyState}>All recommendations have been actioned.</div>
      )}
    </div>
  );
}
