import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { DatePicker } from '@/components/common/DatePicker';
import styles from './AddItemModal.module.css';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Finished Seeds',
    batchNumber: '',
    quantity: 0,
    uom: 'kg',
    expiryDate: '',
    warehouse: 'Telangana Main',
    zone: 'A',
    rack: 'R1',
    shelf: 'S1',
    bin: 'B1',
    totalValue: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: `ITEM-${Date.now()}`,
      ...formData,
      lotNumber: `LOT-${Math.floor(Math.random() * 10000)}`,
      location: {
        warehouse: formData.warehouse,
        zone: formData.zone,
        rack: formData.rack,
        shelf: formData.shelf,
        bin: formData.bin,
      },
      status: 'Available',
      abcClass: 'C',
      reorderPoint: 50
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Inventory Item" size="lg">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h3>Basic Info</h3>
          <div className={styles.grid}>
            <Input label="Item Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="SKU" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} required />
            <div className={styles.selectGroup}>
              <label>Category</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                <option value="Finished Seeds">Finished Seeds</option>
                <option value="Raw Material">Raw Material</option>
                <option value="Packaging">Packaging</option>
              </select>
            </div>
            <Input label="Batch Number" value={formData.batchNumber} onChange={e => setFormData({ ...formData, batchNumber: e.target.value })} required />
          </div>
        </div>

        <div className={styles.section}>
          <h3>Stock Details</h3>
          <div className={styles.grid}>
            <Input label="Quantity" type="number" value={formData.quantity as any} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} required />
            <Input label="UOM" value={formData.uom} onChange={e => setFormData({ ...formData, uom: e.target.value })} required />
            <Input label="Total Value (₹)" type="number" value={formData.totalValue as any} onChange={e => setFormData({ ...formData, totalValue: parseInt(e.target.value) || 0 })} required />
            <DatePicker label="Expiry Date" value={formData.expiryDate} onChange={val => setFormData({ ...formData, expiryDate: val })} required />
          </div>
        </div>

        <div className={styles.section}>
          <h3>Location</h3>
          <div className={styles.grid}>
            <Input label="Warehouse" value={formData.warehouse} onChange={e => setFormData({ ...formData, warehouse: e.target.value })} required />
            <Input label="Zone" value={formData.zone} onChange={e => setFormData({ ...formData, zone: e.target.value })} required />
            <Input label="Rack" value={formData.rack} onChange={e => setFormData({ ...formData, rack: e.target.value })} required />
            <div className={styles.flexRow}>
              <Input label="Shelf" value={formData.shelf} onChange={e => setFormData({ ...formData, shelf: e.target.value })} required />
              <Input label="Bin" value={formData.bin} onChange={e => setFormData({ ...formData, bin: e.target.value })} required />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Add Item</Button>
        </div>
      </form>
    </Modal>
  );
};
