import { useState, useEffect } from 'react';
import { MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { PutawayTask } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './PutawayConfirmModal.module.css';

interface PutawayConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: PutawayTask | null;
  onComplete?: (taskId: string, finalLocation: PutawayTask['suggestedLocation']) => void;
}

const STAFF = ['Ramesh Kumar', 'Mohammed Khan', 'Sunita Rao', 'Priya Sharma', 'Vikram Singh'];

interface FormState {
  useSuggested: boolean;
  zone: string;
  rack: string;
  shelf: string;
  bin: string;
  assignedTo: string;
  notes: string;
}

export function PutawayConfirmModal({ isOpen, onClose, task, onComplete }: PutawayConfirmModalProps) {
  const [form, setForm] = useState<FormState>({
    useSuggested: true,
    zone: '',
    rack: '',
    shelf: '',
    bin: '',
    assignedTo: STAFF[0],
    notes: '',
  });

  useEffect(() => {
    if (isOpen && task) {
      setForm({
        useSuggested: true,
        zone: task.suggestedLocation.zone,
        rack: task.suggestedLocation.rack,
        shelf: task.suggestedLocation.shelf,
        bin: task.suggestedLocation.bin,
        assignedTo: task.assignedTo ?? STAFF[0],
        notes: '',
      });
    }
  }, [isOpen, task]);

  if (!task) return null;

  const fullSuggested = `${task.suggestedLocation.zone} / ${task.suggestedLocation.rack} / ${task.suggestedLocation.shelf} / ${task.suggestedLocation.bin}`;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const finalLocation = form.useSuggested
      ? task.suggestedLocation
      : { warehouse: task.suggestedLocation.warehouse, zone: form.zone, rack: form.rack, shelf: form.shelf, bin: form.bin };
    console.log('confirm putaway', task.id, { ...form, finalLocation });
    onComplete?.(task.id, finalLocation);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm putaway" size="md">
      <div className={styles.headerCard}>
        <div className={styles.headerIcon}><MapPin size={20} /></div>
        <div>
          <h3 className={styles.headerTitle}>Confirm putaway</h3>
          <p className={styles.headerMeta}>{task.id} · {task.itemName}</p>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryRow}><span>Item</span><strong>{task.itemName}</strong></div>
        <div className={styles.summaryRow}><span>SKU</span><span className={styles.mono}>{task.sku}</span></div>
        <div className={styles.summaryRow}><span>Quantity</span><strong>{formatIndianNumber(task.quantity)} {task.uom}</strong></div>
        <div className={styles.summaryRow}><span>From location</span><span>{task.fromLocation}</span></div>
      </div>

      <div className={styles.suggestedSection}>
        <span className={styles.sectionLabel}>Suggested location</span>
        <div className={styles.suggestedChip}>{fullSuggested}</div>
        {task.reasoning && (
          <div className={styles.reasoning}>
            <Sparkles size={12} />
            <em>{task.reasoning}</em>
          </div>
        )}
      </div>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={form.useSuggested}
          onChange={(e) => set('useSuggested', e.target.checked)}
        />
        <span>Use suggested location</span>
      </label>

      {!form.useSuggested && (
        <div className={styles.locationGrid}>
          <label className={`${styles.field} ${styles.fieldZone}`}>
            <span>Zone</span>
            <input
              type="text"
              className={styles.input}
              value={form.zone}
              onChange={(e) => set('zone', e.target.value.toUpperCase())}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Rack</span>
            <input
              type="text"
              className={styles.input}
              value={form.rack}
              onChange={(e) => set('rack', e.target.value.toUpperCase())}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Shelf</span>
            <input
              type="text"
              className={styles.input}
              value={form.shelf}
              onChange={(e) => set('shelf', e.target.value.toUpperCase())}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Bin</span>
            <input
              type="text"
              className={styles.input}
              value={form.bin}
              onChange={(e) => set('bin', e.target.value.toUpperCase())}
              required
            />
          </label>
        </div>
      )}

      <label className={styles.field}>
        <span>Assigned to</span>
        <select
          className={styles.input}
          value={form.assignedTo}
          onChange={(e) => set('assignedTo', e.target.value)}
        >
          {STAFF.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className={styles.field}>
        <span>Notes (optional)</span>
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Any deviations or observations..."
        />
      </label>

      <div className={styles.confirmCard}>
        <CheckCircle2 size={14} className={styles.confirmIcon} />
        <p>Confirming will mark this task complete and update inventory location.</p>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={submit}>Confirm putaway</Button>
      </div>
    </Modal>
  );
}
