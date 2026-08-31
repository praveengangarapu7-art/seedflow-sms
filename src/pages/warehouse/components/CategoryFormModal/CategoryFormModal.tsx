import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { ItemCategoryConfig, ValuationMethod, ZoneType } from '@/types/warehouse';
import styles from './CategoryFormModal.module.css';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: ItemCategoryConfig;
  onSave: (data: any) => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, category, onSave }) => {
  const [formData, setFormData] = useState<Partial<ItemCategoryConfig>>({
    name: '',
    description: '',
    defaultValuationMethod: 'FIFO',
    defaultZoneType: 'ambient',
    active: true
  });

  useEffect(() => {
    if (category) setFormData(category);
    else setFormData({ name: '', description: '', defaultValuationMethod: 'FIFO', defaultZoneType: 'ambient', active: true });
  }, [category, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Edit category' : 'Add category'}
      size="md"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Category name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
                  />
        <div className={styles.inputGroup}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>
        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Default valuation</label>
            <select
              className={styles.select}
              value={formData.defaultValuationMethod}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultValuationMethod: e.target.value as ValuationMethod }))}
            >
              <option value="FIFO">FIFO</option>
              <option value="LIFO">LIFO</option>
              <option value="WA">Weighted Average (WA)</option>
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Default zone type</label>
            <select
              className={styles.select}
              value={formData.defaultZoneType}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultZoneType: e.target.value as ZoneType }))}
            >
              <option value="ambient">Ambient</option>
              <option value="cold">Cold</option>
              <option value="controlled">Controlled</option>
              <option value="staging">Staging</option>
              <option value="quarantine">Quarantine</option>
              <option value="dispatch">Dispatch</option>
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
          <Button variant="primary" type="submit">Save category</Button>
        </div>
      </form>
    </Modal>
  );
};
