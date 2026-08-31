import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import styles from './LocationModal.module.css';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    zone: '',
    rack: '',
    shelf: '',
    bin: '',
    capacity: 100,
    abcZone: 'C',
    status: 'Available'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: `BIN-${Date.now()}`,
      ...formData,
      occupied: 0,
      occupancyPct: 0
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Storage Location" size="md">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <Input 
            label="Zone" 
            value={formData.zone} 
            onChange={(e) => setFormData({ ...formData, zone: e.target.value })} 
            required 
          />
          <Input 
            label="Rack" 
            value={formData.rack} 
            onChange={(e) => setFormData({ ...formData, rack: e.target.value })} 
            required 
          />
        </div>
        <div className={styles.row}>
          <Input 
            label="Shelf" 
            value={formData.shelf} 
            onChange={(e) => setFormData({ ...formData, shelf: e.target.value })} 
            required 
          />
          <Input 
            label="Bin" 
            value={formData.bin} 
            onChange={(e) => setFormData({ ...formData, bin: e.target.value })} 
            required 
          />
        </div>
        <div className={styles.row}>
          <Input 
            label="Capacity (kg/units)" 
            type="number" 
            value={formData.capacity as any} 
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} 
            required 
          />
          <div className={styles.selectGroup}>
            <label>ABC Class</label>
            <select value={formData.abcZone} onChange={(e) => setFormData({ ...formData, abcZone: e.target.value })}>
              <option value="A">A (Fast)</option>
              <option value="B">B (Medium)</option>
              <option value="C">C (Slow)</option>
            </select>
          </div>
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save Location</Button>
        </div>
      </form>
    </Modal>
  );
};
