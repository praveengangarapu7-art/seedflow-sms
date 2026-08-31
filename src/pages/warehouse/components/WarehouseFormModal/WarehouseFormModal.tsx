import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { WarehouseConfig, WarehouseType } from '@/types/warehouse';
import styles from './WarehouseFormModal.module.css';

interface WarehouseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse?: WarehouseConfig;
  onSave: (data: any) => void;
}

export const WarehouseFormModal: React.FC<WarehouseFormModalProps> = ({ isOpen, onClose, warehouse, onSave }) => {
  const [formData, setFormData] = useState<Partial<WarehouseConfig>>({
    name: '',
    code: '',
    type: 'Main',
    active: true,
    address: { line1: '', line2: '', city: '', state: '', pincode: '' },
    manager: '',
    managerPhone: '',
    managerEmail: '',
    totalCapacity: 0,
    operatingHours: { open: '08:00', close: '20:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    notes: ''
  });

  useEffect(() => {
    if (warehouse) {
      setFormData(warehouse);
    } else {
      setFormData({
        name: '',
        code: '',
        type: 'Main',
        active: true,
        address: { line1: '', line2: '', city: '', state: '', pincode: '' },
        manager: '',
        managerPhone: '',
        managerEmail: '',
        totalCapacity: 0,
        operatingHours: { open: '08:00', close: '20:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
        notes: ''
      });
    }
  }, [warehouse, isOpen]);

  const handleChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...(prev[parent as keyof typeof prev] as any), [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleDayToggle = (day: string) => {
    const currentDays = formData.operatingHours?.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    handleChange('operatingHours.days', newDays);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={warehouse ? 'Edit warehouse' : 'Add new warehouse'}
      size="lg"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Basic info</h4>
          <div className={styles.row}>
            <Input
              label="Warehouse name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
                          />
            <Input
              label="Code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="e.g. TG-MAIN"
                          />
          </div>
          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Warehouse type</label>
              <div className={styles.radioGroup}>
                {(['Main', 'Regional', 'Cold storage', 'Distribution'] as WarehouseType[]).map(type => (
                  <label key={type} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="type"
                      checked={formData.type === type}
                      onChange={() => handleChange('type', type)}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Active status</label>
              <div className={`${styles.toggle} ${formData.active ? styles.active : ''}`} onClick={() => handleChange('active', !formData.active)}>
                <div className={styles.toggleHandle} />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Address</h4>
          <div className={styles.row}>
            <Input
              label="Address line 1"
              value={formData.address?.line1}
              onChange={(e) => handleChange('address.line1', e.target.value)}
              required
            />
          </div>
          <div className={styles.row}>
            <Input
              label="Address line 2"
              value={formData.address?.line2}
              onChange={(e) => handleChange('address.line2', e.target.value)}
            />
          </div>
          <div className={styles.grid3}>
            <Input
              label="City"
              value={formData.address?.city}
              onChange={(e) => handleChange('address.city', e.target.value)}
              required
            />
            <Input
              label="State"
              value={formData.address?.state}
              onChange={(e) => handleChange('address.state', e.target.value)}
              required
            />
            <Input
              label="Pincode"
              value={formData.address?.pincode}
              onChange={(e) => handleChange('address.pincode', e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Manager</h4>
          <div className={styles.row}>
            <Input
              label="Manager name"
              value={formData.manager}
              onChange={(e) => handleChange('manager', e.target.value)}
              required
                          />
          </div>
          <div className={styles.row}>
            <Input
              label="Phone"
              value={formData.managerPhone}
              onChange={(e) => handleChange('managerPhone', e.target.value)}
                          />
            <Input
              label="Email"
              value={formData.managerEmail}
              onChange={(e) => handleChange('managerEmail', e.target.value)}
                          />
          </div>
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Capacity & Hours</h4>
          <div className={styles.row}>
            <Input
              label="Total capacity (bags equivalent)"
              type="number"
              value={formData.totalCapacity}
              onChange={(e) => handleChange('totalCapacity', parseInt(e.target.value))}
              required
                          />
            <Input
              label="Zones count"
              type="number"
              value={formData.zonesCount || 0}
              readOnly={!!warehouse}
                          />
          </div>
          <div className={styles.row}>
            <Input
              label="Opening time"
              type="time"
              value={formData.operatingHours?.open}
              onChange={(e) => handleChange('operatingHours.open', e.target.value)}
                          />
            <Input
              label="Closing time"
              type="time"
              value={formData.operatingHours?.close}
              onChange={(e) => handleChange('operatingHours.close', e.target.value)}
                          />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Operating days</label>
            <div className={styles.dayChips}>
              {days.map(day => (
                <button
                  key={day}
                  type="button"
                  className={`${styles.dayChip} ${formData.operatingHours?.days.includes(day) ? styles.selected : ''}`}
                  onClick={() => handleDayToggle(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Notes</h4>
          <textarea
            className={styles.textarea}
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            placeholder="Additional notes about the warehouse..."
          />
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit">Save warehouse</Button>
        </div>
      </form>
    </Modal>
  );
};
