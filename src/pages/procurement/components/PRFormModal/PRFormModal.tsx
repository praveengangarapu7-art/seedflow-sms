import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { formatIndianCurrency } from '@/utils/formatters';
import type { Department, Priority } from '@/types/procurement';
import styles from './PRFormModal.module.css';

interface LineItemRow {
  description: string;
  quantity: string;
  unit: string;
  estimatedPrice: string;
}

interface PRFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    department: Department;
    priority: Priority;
    requiredBy: string;
    justification: string;
    lineItems: LineItemRow[];
  }) => void;
}

const DEPARTMENTS: Department[] = ['Laboratory', 'Procurement', 'Warehouse', 'R&D', 'Processing', 'Admin'];
const PRIORITIES: Priority[]    = ['Low', 'Medium', 'High', 'Urgent'];

const APPROVAL_FLOW: { name: string; role: string }[] = [
  { name: 'Department Manager', role: 'Level 1 — Auto-assigned' },
  { name: 'Rajesh Patel', role: 'Procurement Head' },
  { name: 'Meena CFO', role: 'CFO (for orders > ₹2 L)' },
];

function emptyRow(): LineItemRow {
  return { description: '', quantity: '', unit: '', estimatedPrice: '' };
}

function calcTotal(row: LineItemRow): number {
  const qty   = parseFloat(row.quantity)       || 0;
  const price = parseFloat(row.estimatedPrice) || 0;
  return qty * price;
}

export function PRFormModal({ isOpen, onClose, onSubmit }: PRFormModalProps) {
  const [title,         setTitle]        = useState('');
  const [department,    setDepartment]   = useState<Department>('Laboratory');
  const [priority,      setPriority]     = useState<Priority>('Medium');
  const [requiredBy,    setRequiredBy]   = useState('');
  const [justification, setJustification] = useState('');
  const [lineItems,     setLineItems]    = useState<LineItemRow[]>([emptyRow()]);

  const grandTotal = lineItems.reduce((sum, r) => sum + calcTotal(r), 0);

  function updateRow(idx: number, field: keyof LineItemRow, value: string) {
    setLineItems((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addRow() { setLineItems((prev) => [...prev, emptyRow()]); }

  function removeRow(idx: number) {
    setLineItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

  function handleSubmit() {
    onSubmit({ title, department, priority, requiredBy, justification, lineItems });
    handleClose();
  }

  function handleClose() {
    setTitle('');
    setDepartment('Laboratory');
    setPriority('Medium');
    setRequiredBy('');
    setJustification('');
    setLineItems([emptyRow()]);
    onClose();
  }

  const footer = (
    <div className={styles.footer}>
      <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
      <Button variant="ghost" size="sm" onClick={handleSubmit}>Save as Draft</Button>
      <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!title || lineItems.every((r) => !r.description)}>
        Submit for Approval
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Purchase Requisition" size="xl" footer={footer}>

      {/* ── Section 1: Basic details ──────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Requisition Details</p>
        <div className={styles.grid2}>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>Title <span className={styles.required}>*</span></label>
            <input
              className={styles.input}
              placeholder="e.g. Lab reagents — Q2 testing batch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Department <span className={styles.required}>*</span></label>
            <select
              className={styles.select}
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
            >
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Priority <span className={styles.required}>*</span></label>
            <select
              className={styles.select}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Required By <span className={styles.required}>*</span></label>
            <input
              type="date"
              className={styles.input}
              value={requiredBy}
              onChange={(e) => setRequiredBy(e.target.value)}
            />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>Justification</label>
            <textarea
              className={styles.textarea}
              placeholder="Why is this purchase required? Include urgency, business impact, etc."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Line items ─────────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Line Items</p>
        <table className={styles.lineTable}>
          <thead>
            <tr>
              <th className={styles.colDesc}>Description</th>
              <th className={styles.colQty}>Qty</th>
              <th className={styles.colUnit}>Unit</th>
              <th className={styles.colPrice}>Est. Price (₹)</th>
              <th className={styles.colTotal}>Total</th>
              <th className={styles.colAction}></th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((row, idx) => (
              <tr key={idx}>
                <td className={styles.colDesc}>
                  <input
                    className={styles.lineInput}
                    placeholder="Item description"
                    value={row.description}
                    onChange={(e) => updateRow(idx, 'description', e.target.value)}
                  />
                </td>
                <td className={styles.colQty}>
                  <input
                    type="number"
                    className={styles.lineInput}
                    placeholder="0"
                    min={0}
                    value={row.quantity}
                    onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                  />
                </td>
                <td className={styles.colUnit}>
                  <input
                    className={styles.lineInput}
                    placeholder="pcs"
                    value={row.unit}
                    onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                  />
                </td>
                <td className={styles.colPrice}>
                  <input
                    type="number"
                    className={styles.lineInput}
                    placeholder="0"
                    min={0}
                    value={row.estimatedPrice}
                    onChange={(e) => updateRow(idx, 'estimatedPrice', e.target.value)}
                  />
                </td>
                <td className={styles.colTotal}>
                  {calcTotal(row) > 0 ? formatIndianCurrency(calcTotal(row)) : '—'}
                </td>
                <td className={styles.colAction}>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeRow(idx)}
                    aria-label="Remove row"
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className={styles.addRowBtn} onClick={addRow} type="button">
          <Plus size={14} /> Add Line Item
        </button>

        <div className={styles.budgetRow}>
          <span className={styles.budgetLabel}>Estimated Total</span>
          <span className={styles.budgetValue}>{formatIndianCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* ── Section 3: Approval flow preview ─────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Approval Routing Preview</p>
        <div className={styles.approvalSteps}>
          {APPROVAL_FLOW.map((step, idx) => (
            <div key={idx} className={styles.approvalStep}>
              <div className={styles.stepNum}>{idx + 1}</div>
              <span className={styles.stepName}>{step.name}</span>
              <span className={styles.stepRole}>— {step.role}</span>
            </div>
          ))}
        </div>
      </div>

    </Modal>
  );
}
