import { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { createCapa, type CreateCapaPayload } from '@/services/seedLotRealtimeClient';
import { Field, todayIso, useQualityAction } from './shared';
import styles from './Quality.module.css';

interface Props {
  isOpen: boolean;
  token: string | null;
  /** Email pre-filled as the action owner — the signed-in backend user. */
  defaultOwner: string | null;
  ncrId?: string;
  complaintId?: string;
  /** Lets the CAPA board link a standalone action to an NCR from a list. */
  ncrOptions?: { id: string; label: string }[];
  onClose: () => void;
  onCreated: () => void;
}

function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CapaFormModal({ isOpen, token, defaultOwner, ncrId, complaintId, ncrOptions, onClose, onCreated }: Props) {
  const { addToast } = useToast();
  const { run, busy } = useQualityAction();
  const [actionType, setActionType] = useState<'corrective' | 'preventive'>('corrective');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState(inDays(14));
  const [linkedNcr, setLinkedNcr] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setActionType('corrective');
    setTitle('');
    setDescription('');
    setOwner(defaultOwner ?? '');
    setDueDate(inDays(14));
    setLinkedNcr('');
  }, [isOpen, defaultOwner]);

  const submit = async () => {
    if (!token) return;
    if (!title.trim() || !description.trim() || !owner.trim()) {
      addToast('Title, description and owner are required.', 'error');
      return;
    }
    const payload: CreateCapaPayload = {
      actionType,
      title: title.trim(),
      description: description.trim(),
      ownerEmail: owner.trim(),
      dueDate,
      ncrId: ncrId ?? (linkedNcr || undefined),
      complaintId,
    };
    const created = await run(() => createCapa(token, payload), (c) => `${c.capa_code} created`);
    if (created) {
      onCreated();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New corrective / preventive action">
      <div className={styles.modalStack}>
        <div className={styles.radioRow}>
          <label>
            <input type="radio" checked={actionType === 'corrective'} onChange={() => setActionType('corrective')} /> Corrective (fix the cause)
          </label>
          <label>
            <input type="radio" checked={actionType === 'preventive'} onChange={() => setActionType('preventive')} /> Preventive (stop it recurring)
          </label>
        </div>
        {ncrOptions && !ncrId && (
          <Field label="Linked non-conformance (optional)" htmlFor="capa-ncr">
            <select id="capa-ncr" className={styles.select} value={linkedNcr} onChange={(e) => setLinkedNcr(e.target.value)}>
              <option value="">Standalone action</option>
              {ncrOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Action title" htmlFor="capa-title">
          <input id="capa-title" className={styles.textInput} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </Field>
        <div>
          <label className={styles.label} htmlFor="capa-desc">
            What will be done
          </label>
          <textarea id="capa-desc" className={styles.textArea} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className={styles.twoCol}>
          <Field label="Owner (email)" htmlFor="capa-owner">
            <input id="capa-owner" className={styles.textInput} type="email" value={owner} onChange={(e) => setOwner(e.target.value)} />
          </Field>
          <Field label="Due date" htmlFor="capa-due">
            <input id="capa-due" className={styles.textInput} type="date" min={todayIso()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        <div className={styles.actionsRow}>
          <Button isLoading={busy} onClick={() => void submit()}>
            Create action
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
