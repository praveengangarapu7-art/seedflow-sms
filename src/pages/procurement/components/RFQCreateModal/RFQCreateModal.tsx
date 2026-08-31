import { useState } from 'react';
import { Plus, Trash2, X, Users } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import type { Department } from '@/types/procurement';
import styles from './RFQCreateModal.module.css';

interface RFQLineItemRow {
  description: string;
  quantity: string;
  unit: string;
  specs: string;
}

interface RFQCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const DEPARTMENTS: Department[] = ['Laboratory', 'Procurement', 'Warehouse', 'R&D', 'Processing', 'Admin'];

function emptyRow(): RFQLineItemRow {
  return { description: '', quantity: '', unit: '', specs: '' };
}

export function RFQCreateModal({ isOpen, onClose, onSubmit }: RFQCreateModalProps) {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState<Department>('Procurement');
  const [deadline, setDeadline] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [lineItems, setLineItems] = useState<RFQLineItemRow[]>([emptyRow()]);
  
  // Mock suppliers for the sake of demonstration
  const [invitedSuppliers, setInvitedSuppliers] = useState<string[]>(['GreenSeeds Corp', 'AgriTech Solutions']);
  const [newSupplier, setNewSupplier] = useState('');

  function updateRow(idx: number, field: keyof RFQLineItemRow, value: string) {
    setLineItems((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setLineItems((prev) => [...prev, emptyRow()]);
  }

  function removeRow(idx: number) {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  function addSupplier() {
    if (newSupplier && !invitedSuppliers.includes(newSupplier)) {
      setInvitedSuppliers([...invitedSuppliers, newSupplier]);
      setNewSupplier('');
    }
  }

  function removeSupplier(name: string) {
    setInvitedSuppliers(invitedSuppliers.filter((s) => s !== name));
  }

  function handleClose() {
    setTitle('');
    setDepartment('Procurement');
    setDeadline('');
    setExpectedDelivery('');
    setPaymentTerms('Net 30');
    setLineItems([emptyRow()]);
    setInvitedSuppliers(['GreenSeeds Corp', 'AgriTech Solutions']);
    onClose();
  }

  function handleSubmit() {
    onSubmit({
      title,
      department,
      deadline,
      expectedDelivery,
      paymentTerms,
      lineItems,
      invitedSuppliers,
    });
    handleClose();
  }

  const footer = (
    <div className={styles.footer}>
      <Button variant="secondary" size="sm" onClick={handleClose}>
        Cancel
      </Button>
      <Button variant="ghost" size="sm" onClick={handleSubmit}>
        Save as Draft
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={handleSubmit}
        disabled={!title || lineItems.every((r) => !r.description)}
      >
        Create & Send RFQ
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Request for Quotation" size="xl" footer={footer}>
      {/* Basic Details */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>RFQ Overview</p>
        <div className={styles.grid2}>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>
              RFQ Title <span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              placeholder="e.g. Bulk purchase of Cotton Hybrid Seeds - Kharif 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Department <span className={styles.required}>*</span>
            </label>
            <select
              className={styles.select}
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Payment Terms</label>
            <input
              className={styles.input}
              placeholder="e.g. Net 30, 50% Advance"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Submission Deadline <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              className={styles.input}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Expected Delivery Date</label>
            <input
              type="date"
              className={styles.input}
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Line Items & Specifications</p>
        <div className={styles.lineTableWrap}>
          <table className={styles.lineTable}>
            <thead>
              <tr>
                <th className={styles.colDesc}>Description</th>
                <th className={styles.colQty}>Qty</th>
                <th className={styles.colUnit}>Unit</th>
                <th className={styles.colSpecs}>Specifications / Requirements</th>
                <th className={styles.colAction}></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((row, idx) => (
                <tr key={idx}>
                  <td className={styles.colDesc}>
                    <input
                      className={styles.lineInput}
                      placeholder="Item name"
                      value={row.description}
                      onChange={(e) => updateRow(idx, 'description', e.target.value)}
                    />
                  </td>
                  <td className={styles.colQty}>
                    <input
                      type="number"
                      className={styles.lineInput}
                      placeholder="0"
                      value={row.quantity}
                      onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                    />
                  </td>
                  <td className={styles.colUnit}>
                    <input
                      className={styles.lineInput}
                      placeholder="e.g. Kg, Bags"
                      value={row.unit}
                      onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                    />
                  </td>
                  <td className={styles.colSpecs}>
                    <input
                      className={styles.lineInput}
                      placeholder="e.g. Grade A, Germination > 95%"
                      value={row.specs}
                      onChange={(e) => updateRow(idx, 'specs', e.target.value)}
                    />
                  </td>
                  <td className={styles.colAction}>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeRow(idx)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className={styles.addRowBtn} onClick={addRow}>
          <Plus size={16} /> Add Line Item
        </button>
      </div>

      {/* Supplier Selection */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Invite Suppliers</p>
        <div className={styles.field}>
          <label className={styles.label}>Select Suppliers</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className={styles.input}
              placeholder="Type supplier name..."
              value={newSupplier}
              onChange={(e) => setNewSupplier(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSupplier()}
            />
            <Button variant="secondary" size="sm" onClick={addSupplier} leftIcon={Users}>
              Invite
            </Button>
          </div>
          <div className={styles.supplierChips}>
            {invitedSuppliers.map((s) => (
              <div key={s} className={styles.supplierChip}>
                {s}
                <button className={styles.removeChip} onClick={() => removeSupplier(s)}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
