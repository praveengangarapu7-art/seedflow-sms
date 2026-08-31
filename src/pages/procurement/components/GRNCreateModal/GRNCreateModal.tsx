import { useState } from 'react';
import { Truck, Scale, FileText } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import styles from './GRNCreateModal.module.css';

interface GRNCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function GRNCreateModal({ isOpen, onClose, onSubmit }: GRNCreateModalProps) {
  const [poRef, setPoRef] = useState('');
  const [supplier, setSupplier] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Vehicle details
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  
  // Weights
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  
  const netWeight = (parseFloat(grossWeight) || 0) - (parseFloat(tareWeight) || 0);

  // Line items
  const [lineItems, setLineItems] = useState([
    { description: 'Cotton Seeds - Hybrid X', orderedQty: 500, receivedQty: 500, damagedQty: 0, unit: 'Bags' },
    { description: 'Packaging Material - Laminated', orderedQty: 1000, receivedQty: 995, damagedQty: 5, unit: 'Pcs' },
  ]);

  function handleLineItemChange(idx: number, field: string, value: string) {
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function handleClose() {
    setPoRef('');
    setSupplier('');
    setVehicleNumber('');
    setDriverName('');
    setDriverPhone('');
    setGrossWeight('');
    setTareWeight('');
    onClose();
  }

  function handleSubmit() {
    onSubmit({
      poReference: poRef,
      supplier,
      receivedDate,
      vehicleEntry: {
        vehicleNumber,
        driverName,
        driverPhone,
        grossWeight: parseFloat(grossWeight),
        tareWeight: parseFloat(tareWeight),
        netWeight,
      },
      lineItems,
    });
    handleClose();
  }

  const footer = (
    <div className={styles.footer}>
      <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!poRef || !vehicleNumber}>
        Create Goods Receipt
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Goods Receipt Note (GRN)" size="xl" footer={footer}>
      
      {/* ── Section 1: Source Details ────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Reference Details</p>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>PO Reference <span className={styles.required}>*</span></label>
            <input 
              className={styles.input} 
              placeholder="e.g. PO-2026-0145" 
              value={poRef} 
              onChange={(e) => setPoRef(e.target.value)} 
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Supplier</label>
            <input 
              className={styles.input} 
              placeholder="Auto-fills from PO" 
              value={supplier} 
              onChange={(e) => setSupplier(e.target.value)} 
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Received Date</label>
            <input 
              type="date" 
              className={styles.input} 
              value={receivedDate} 
              onChange={(e) => setReceivedDate(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Logistics & Weighbridge ───────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}><Truck size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Logistics & Weighbridge</p>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Vehicle Number <span className={styles.required}>*</span></label>
            <input 
              className={styles.input} 
              placeholder="e.g. MH-12-AB-1234" 
              value={vehicleNumber} 
              onChange={(e) => setVehicleNumber(e.target.value)} 
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Driver Name</label>
            <input 
              className={styles.input} 
              placeholder="Full Name" 
              value={driverName} 
              onChange={(e) => setDriverName(e.target.value)} 
            />
          </div>
        </div>

        <div className={styles.weightPanel}>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}><Scale size={12} /> Gross Weight (kg)</label>
              <input 
                type="number" 
                className={styles.input} 
                placeholder="0.00" 
                value={grossWeight} 
                onChange={(e) => setGrossWeight(e.target.value)} 
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}><Scale size={12} /> Tare Weight (kg)</label>
              <input 
                type="number" 
                className={styles.input} 
                placeholder="0.00" 
                value={tareWeight} 
                onChange={(e) => setTareWeight(e.target.value)} 
              />
            </div>
          </div>
          <div className={styles.netWeightRow}>
            <span className={styles.netWeightLabel}>Calculated Net Weight:</span>
            <span className={styles.netWeightValue}>{netWeight.toLocaleString()} kg</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Material Details ─────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}><FileText size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Material Receipt Details</p>
        <div className={styles.tableWrap}>
          <table className={styles.lineTable}>
            <thead>
              <tr>
                <th className={styles.colDesc}>Item Description</th>
                <th className={styles.colQty}>Ordered</th>
                <th className={styles.colQty}>Received</th>
                <th className={styles.colQty}>Damaged</th>
                <th className={styles.colUnit}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={idx}>
                  <td className={styles.colDesc}>{item.description}</td>
                  <td className={styles.colQty}>{item.orderedQty}</td>
                  <td className={styles.colQty}>
                    <input 
                      type="number" 
                      className={styles.lineInput} 
                      value={item.receivedQty} 
                      onChange={(e) => handleLineItemChange(idx, 'receivedQty', e.target.value)}
                    />
                  </td>
                  <td className={styles.colQty}>
                    <input 
                      type="number" 
                      className={styles.lineInput} 
                      value={item.damagedQty} 
                      onChange={(e) => handleLineItemChange(idx, 'damagedQty', e.target.value)}
                    />
                  </td>
                  <td className={styles.colUnit}>{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.fieldFull}>
          <label className={styles.label}>Notes / Observations</label>
          <textarea className={styles.textarea} placeholder="Any visible damage, seal status, etc." />
        </div>
      </div>

    </Modal>
  );
}
