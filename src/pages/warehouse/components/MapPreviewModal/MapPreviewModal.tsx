import { Map as MapIcon, ExternalLink, MapPin } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import type { WarehouseConfig } from '@/types/warehouse';
import styles from './MapPreviewModal.module.css';

interface MapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: WarehouseConfig | null;
}

export function MapPreviewModal({ isOpen, onClose, warehouse }: MapPreviewModalProps) {
  const { addToast } = useToast();
  if (!warehouse) return null;

  const handleOpenExternal = () => {
    const query = encodeURIComponent(`${warehouse.address.line1}, ${warehouse.address.city}`);
    console.log('open in google maps', query);
    addToast({ type: 'info', message: 'Opening in Google Maps...' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Map preview — ${warehouse.name}`} size="lg">
      <div className={styles.headerCard}>
        <div className={styles.iconBadge}><MapPin size={20} /></div>
        <div>
          <h3 className={styles.title}>{warehouse.name}</h3>
          <p className={styles.address}>
            {warehouse.address.line1}, {warehouse.address.city}, {warehouse.address.state} {warehouse.address.pincode}
          </p>
        </div>
      </div>

      <div className={styles.mapPlaceholder}>
        <MapIcon size={56} />
        <span className={styles.placeholderTitle}>Map view</span>
        <span className={styles.placeholderSub}>Interactive map preview not available in this build.</span>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}><span>Type</span><strong>{warehouse.type}</strong></div>
        <div className={styles.stat}><span>Manager</span><strong>{warehouse.manager}</strong></div>
        <div className={styles.stat}><span>Capacity</span><strong>{warehouse.totalCapacity.toLocaleString()} bags</strong></div>
        <div className={styles.stat}><span>Zones</span><strong>{warehouse.zonesCount}</strong></div>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        <Button variant="primary" size="sm" rightIcon={ExternalLink} onClick={handleOpenExternal}>
          Open in Google Maps
        </Button>
      </div>
    </Modal>
  );
}
