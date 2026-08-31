import { useState, useMemo } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import styles from './AddLocationModal.module.css';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WAREHOUSES = ['Telangana Main', 'Karnataka Regional', 'Maharashtra Distribution', 'Tamil Nadu Cold Storage'];
const ZONES = ['Cold Zone A', 'Cold Zone B', 'Cold Zone C', 'Ambient Zone 1', 'Ambient Zone 2', 'Quarantine', 'Controlled Zone'];

export function AddLocationModal({ isOpen, onClose }: AddLocationModalProps) {
  const { addToast } = useToast();
  const [warehouse, setWarehouse] = useState(WAREHOUSES[0]);
  const [zone, setZone] = useState(ZONES[0]);
  const [rack, setRack] = useState('');
  const [shelf, setShelf] = useState('');
  const [bin, setBin] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [abc, setAbc] = useState('B');
  const [active, setActive] = useState(true);

  const code = useMemo(() => {
    const z = (zone || '').replace(/\s+/g, '-').toUpperCase();
    return [z, rack, shelf, bin].filter(Boolean).join('-');
  }, [zone, rack, shelf, bin]);

  const canSubmit = rack.trim() !== '' && shelf.trim() !== '' && bin.trim() !== '' && capacity.trim() !== '';

  const handleSubmit = () => {
    console.log('add location', { warehouse, zone, rack, shelf, bin, code, capacity, abc, active });
    addToast({ type: 'success', message: `Bin ${code} added` });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add location" size="md">
      <div className={styles.grid2}>
        <label className={styles.field}>
          <span>Warehouse</span>
          <select className={styles.input} value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
            {WAREHOUSES.map((w) => <option key={w}>{w}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>Zone</span>
          <select className={styles.input} value={zone} onChange={(e) => setZone(e.target.value)}>
            {ZONES.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.grid3}>
        <label className={styles.field}>
          <span>Rack</span>
          <input type="text" className={styles.input} value={rack} onChange={(e) => setRack(e.target.value.toUpperCase())} placeholder="R5" />
        </label>
        <label className={styles.field}>
          <span>Shelf</span>
          <input type="text" className={styles.input} value={shelf} onChange={(e) => setShelf(e.target.value.toUpperCase())} placeholder="S2" />
        </label>
        <label className={styles.field}>
          <span>Bin</span>
          <input type="text" className={styles.input} value={bin} onChange={(e) => setBin(e.target.value.toUpperCase())} placeholder="B14" />
        </label>
      </div>

      <div className={styles.codePreview}>
        Bin code preview: <strong className={styles.mono}>{code || '—'}</strong>
      </div>

      <div className={styles.grid2}>
        <label className={styles.field}>
          <span>Capacity (bags)</span>
          <input type="number" className={styles.input} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>ABC zone</span>
          <select className={styles.input} value={abc} onChange={(e) => setAbc(e.target.value)}>
            <option>A</option>
            <option>B</option>
            <option>C</option>
          </select>
        </label>
      </div>

      <label className={styles.toggleRow}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>Active</span>
      </label>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" disabled={!canSubmit} onClick={handleSubmit}>Add location</Button>
      </div>
    </Modal>
  );
}
