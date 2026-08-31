import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { UoMConfig } from '@/types/warehouse';
import styles from './UoMFormModal.module.css';

interface UoMFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  uom?: UoMConfig;
  onSave: (data: any) => void;
}

export const UoMFormModal: React.FC<UoMFormModalProps> = ({ isOpen, onClose, uom, onSave }) => {
  const [formData, setFormData] = useState<Partial<UoMConfig>>({
    code: '',
    name: '',
    type: 'weight',
    conversionToBase: 1,
    baseUnit: '',
    active: true
  });

  useEffect(() => {
    if (uom) setFormData(uom);
    else setFormData({ code: '', name: '', type: 'weight', conversionToBase: 1, baseUnit: '', active: true });
  }, [uom, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={uom ? 'Edit unit of measure' : 'Add unit of measure'}
      size="md"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <Input
            label="UoM code"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
            placeholder="e.g. kg"
            required
                      />
          <Input
            label="UoM name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Kilograms"
            required
                      />
        </div>
        
        <div className={styles.inputGroup}>
          <label className={styles.label}>UoM type</label>
          <div className={styles.radioGroup}>
            {(['weight', 'volume', 'count', 'distance'] as const).map(type => (
              <label key={type} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="uomType"
                  checked={formData.type === type}
                  onChange={() => setFormData(prev => ({ ...prev, type }))}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <Input
            label="Conversion factor"
            type="number"
            step="any"
            value={formData.conversionToBase}
            onChange={(e) => setFormData(prev => ({ ...prev, conversionToBase: parseFloat(e.target.value) }))}
            required
                      />
          <div className={styles.inputGroup}>
            <label className={styles.label}>Base unit</label>
            <select
              className={styles.select}
              value={formData.baseUnit}
              onChange={(e) => setFormData(prev => ({ ...prev, baseUnit: e.target.value }))}
            >
              <option value="">Select base unit</option>
              <option value="kg">kg (weight)</option>
              <option value="liters">liters (volume)</option>
              <option value="pcs">pcs (count)</option>
            </select>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Status</label>
          <div className={`${styles.toggle} ${formData.active ? styles.active : ''}`} onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}>
            <div className={styles.toggleHandle} />
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit">Save UoM</Button>
        </div>
      </form>
    </Modal>
  );
};
