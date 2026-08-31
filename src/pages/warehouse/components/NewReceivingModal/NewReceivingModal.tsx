import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { DatePicker } from '@/components/common/DatePicker';
import styles from './NewReceivingModal.module.css';

interface NewReceivingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const NewReceivingModal: React.FC<NewReceivingModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    supplier: '',
    reference: '',
    expectedDate: '',
    items: 1,
    quantity: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: `ASN-${Date.now()}`,
      ...formData,
      status: 'In Transit',
      progress: 0,
      uom: 'units'
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Receiving (ASN)" size="md">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>
          <Input 
            label="Supplier" 
            value={formData.supplier} 
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} 
            required 
          />
          <Input 
            label="Reference PO/Document" 
            value={formData.reference} 
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })} 
            required 
          />
        </div>
        <div className={styles.grid}>
          <DatePicker 
            label="Expected Date" 
            value={formData.expectedDate} 
            onChange={(val) => setFormData({ ...formData, expectedDate: val })} 
            required 
          />
          <Input 
            label="Number of Items (SKUs)" 
            type="number" 
            value={formData.items as any} 
            onChange={(e) => setFormData({ ...formData, items: parseInt(e.target.value) || 0 })} 
            required 
          />
        </div>
        <div className={styles.grid}>
          <Input 
            label="Total Quantity" 
            type="number" 
            value={formData.quantity as any} 
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} 
            required 
          />
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Create ASN</Button>
        </div>
      </form>
    </Modal>
  );
};
