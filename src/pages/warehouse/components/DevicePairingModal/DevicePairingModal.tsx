import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { ScanDevice } from '@/types/warehouse';
import styles from './DevicePairingModal.module.css';

interface DevicePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPES: ScanDevice[] = ['Handheld scanner', 'Mobile phone', 'Fixed RFID reader'];
const STAFF = ['Anjali Reddy', 'Mohammed Khan', 'Sunita Rao', 'Priya Sharma', 'Vikram Singh', 'Ramesh Kumar', 'System'];
const ZONES = ['Receiving Dock 1', 'Receiving Dock 2', 'Cold Zone A', 'Cold Zone B', 'Ambient Zone 1', 'Ambient Zone 3', 'Controlled Zone', 'Quality lab', 'Dispatch Bay', 'Gate / Receiving'];

export function DevicePairingModal({ isOpen, onClose }: DevicePairingModalProps) {
  const [type, setType] = useState<ScanDevice>('Handheld scanner');
  const [name, setName] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [assignedTo, setAssignedTo] = useState(STAFF[0]);
  const [defaultZone, setDefaultZone] = useState(ZONES[0]);

  useEffect(() => {
    if (isOpen) {
      setType('Handheld scanner');
      setName('');
      setPairingCode('');
      setAssignedTo(STAFF[0]);
      setDefaultZone(ZONES[0]);
    }
  }, [isOpen]);

  const canSubmit = name.trim() !== '' && /^\d{6}$/.test(pairingCode.trim());

  const submit = () => {
    console.log('pair device', { type, name, pairingCode, assignedTo, defaultZone });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pair scan device" size="md">
      <div className={styles.field}>
        <span>Device type</span>
        <div className={styles.radioRow}>
          {TYPES.map((t) => (
            <label key={t} className={`${styles.radioCard} ${type === t ? styles.radioActive : ''}`}>
              <input type="radio" name="device-type" value={t} checked={type === t} onChange={() => setType(t)} />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </div>

      <label className={styles.field}>
        <span>Device name</span>
        <input
          type="text"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Handheld scanner — HW-005"
        />
      </label>

      <label className={styles.field}>
        <span>Pairing code <em className={styles.hint}>(6 digits shown on device)</em></span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          className={`${styles.input} ${styles.codeInput}`}
          value={pairingCode}
          onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
        />
      </label>

      <div className={styles.grid2}>
        <label className={styles.field}>
          <span>Assigned to</span>
          <select className={styles.input} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            {STAFF.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>Default zone</span>
          <select className={styles.input} value={defaultZone} onChange={(e) => setDefaultZone(e.target.value)}>
            {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" disabled={!canSubmit} onClick={submit}>Pair device</Button>
      </div>
    </Modal>
  );
}
