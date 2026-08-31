import { Truck, Edit2, Ban, FileText, Calendar, MapPin, Hash } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import type { ASN } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './ASNDetailModal.module.css';

interface ASNDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asn: ASN | null;
  onCancel?: (id: string) => void;
}

export function ASNDetailModal({ isOpen, onClose, asn, onCancel }: ASNDetailModalProps) {
  const { addToast } = useToast();
  if (!asn) return null;

  const handleEdit = () => {
    addToast({ message: `Edit form opened for ${asn.id}` });
  };

  const handlePrintGatePass = () => {
    addToast({ type: 'success', message: `Gate pass for ${asn.id} sent to printer` });
  };

  const handleCancel = () => {
    onCancel?.(asn.id);
    addToast({ type: 'warning', message: `${asn.id} cancelled` });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ASN ${asn.id}`} size="lg">
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBadge}><Truck size={20} /></div>
          <div>
            <h3 className={styles.headerTitle}>{asn.supplier}</h3>
            <span className={styles.headerMeta}>PO {asn.poReference}</span>
          </div>
        </div>
        <span className={`${styles.statusChip} ${styles[`st_${asn.status}`]}`}>{asn.status}</span>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Logistics & schedule</h4>
        <div className={styles.grid}>
          <div className={styles.row}><Calendar size={14} className={styles.rowIcon} /><span>Expected</span><strong>{asn.expectedDate} · {asn.expectedTime}</strong></div>
          <div className={styles.row}><MapPin size={14} className={styles.rowIcon} /><span>Dock</span><strong>{asn.dockAssigned ?? '—'}</strong></div>
          {asn.vehicleNumber && <div className={styles.row}><Truck size={14} className={styles.rowIcon} /><span>Vehicle</span><strong>{asn.vehicleNumber}</strong></div>}
          {asn.driverName && <div className={styles.row}><Hash size={14} className={styles.rowIcon} /><span>Driver</span><strong>{asn.driverName}</strong></div>}
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Line items</h4>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>SKU</th><th>Item</th><th>Batch</th><th className={styles.alignRight}>Qty</th><th>UoM</th></tr>
            </thead>
            <tbody>
              {((asn as unknown as { lineItems?: Array<{ sku: string; itemName: string; batchNumber?: string; quantity: number; uom: string }> }).lineItems ?? []).map((line, i) => (
                <tr key={i}>
                  <td className={styles.mono}>{line.sku}</td>
                  <td>{line.itemName}</td>
                  <td className={styles.mono}>{line.batchNumber ?? '—'}</td>
                  <td className={styles.alignRight}>{formatIndianNumber(line.quantity)}</td>
                  <td>{line.uom}</td>
                </tr>
              ))}
              {(((asn as unknown as { lineItems?: unknown[] }).lineItems ?? []).length === 0) && (
                <tr><td colSpan={5} className={styles.empty}>{asn.items} items · {formatIndianNumber(asn.totalQuantity)} {asn.uom} (line breakdown not loaded)</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {asn.notes && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Notes</h4>
          <p className={styles.notes}>{asn.notes}</p>
        </div>
      )}

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        <div className={styles.footerRight}>
          <Button variant="ghost" size="sm" leftIcon={Edit2} onClick={handleEdit}>Edit</Button>
          <Button variant="secondary" size="sm" leftIcon={FileText} onClick={handlePrintGatePass}>Print gate pass</Button>
          {asn.status !== 'Completed' && asn.status !== 'Cancelled' && (
            <Button variant="ghost" size="sm" leftIcon={Ban} onClick={handleCancel}>Cancel ASN</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
