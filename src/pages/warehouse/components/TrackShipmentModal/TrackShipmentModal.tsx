import { MapIcon, PhoneCall, RefreshCw, CheckCircle2, Clock, Package } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import type { DispatchOrder } from '@/types/warehouse';
import styles from './TrackShipmentModal.module.css';

interface TrackShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: DispatchOrder | null;
}

interface TimelineEvent {
  label: string;
  detail?: string;
  timestamp: string;
  state: 'done' | 'current' | 'pending';
}

function buildTimeline(order: DispatchOrder): TimelineEvent[] {
  const status = order.status as string;
  const dispatchedDone = status === 'Dispatched' || status === 'In transit' || status === 'Delivered';
  const inTransitDone = status === 'In transit' || status === 'Delivered';
  const reachedHubDone = status === 'In transit' || status === 'Delivered';
  const outForDeliveryDone = status === 'Delivered';
  const deliveredDone = status === 'Delivered';

  return [
    { label: 'Dispatched from Telangana Main warehouse', timestamp: order.dispatchedAt ?? '—', state: dispatchedDone ? 'done' : 'pending' },
    { label: `In transit to ${order.consignee?.city ?? 'destination'}`, detail: `Expected ${order.expectedDispatchDate}`, timestamp: order.dispatchedAt ?? '—', state: inTransitDone ? 'done' : (dispatchedDone ? 'current' : 'pending') },
    { label: 'Reached transit hub: Bangalore', timestamp: order.dispatchedAt ?? '—', state: reachedHubDone ? 'done' : 'pending' },
    { label: 'Out for delivery', timestamp: order.deliveredAt ?? '—', state: outForDeliveryDone ? 'done' : (inTransitDone ? 'current' : 'pending') },
    { label: 'Delivered', timestamp: order.deliveredAt ?? '—', state: deliveredDone ? 'done' : 'pending' },
  ];
}

export function TrackShipmentModal({ isOpen, onClose, order }: TrackShipmentModalProps) {
  const { addToast } = useToast();
  if (!order) return null;

  const events = buildTimeline(order);

  const handleRefresh = () => {
    addToast({ type: 'info', message: `${order.id}: status ${order.status}${order.dispatchedAt ? `, dispatched ${new Date(order.dispatchedAt).toLocaleString('en-IN')}` : ''}. Live GPS needs the ${order.logisticsPartner ?? 'courier'} tracking integration.` });
  };

  const handleContactDriver = () => {
    const phone = order.consignee?.phone ?? '';
    if (phone) {
      void navigator.clipboard?.writeText(phone).catch(() => undefined);
      window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
    }
    addToast({ type: phone ? 'success' : 'warning', message: phone ? `Calling ${phone} (number copied to clipboard)` : 'No phone number on this order' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Track shipment ${order.id}`} size="md">
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBadge}><Package size={18} /></div>
          <div>
            <h3 className={styles.headerTitle}>{order.consignee?.name ?? '—'}</h3>
            <span className={styles.headerMeta}>{order.consignee?.city ?? ''}</span>
          </div>
        </div>
        <span className={`${styles.statusChip} ${styles[`st_${(order.status || '').replace(/\s+/g, '_')}`]}`}>{order.status}</span>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Shipment timeline</h4>
        <ol className={styles.timeline}>
          {events.map((ev, i) => (
            <li key={i} className={`${styles.timelineItem} ${styles[`state_${ev.state}`]}`}>
              <div className={styles.timelineDot}>
                {ev.state === 'done' ? <CheckCircle2 size={14} /> : ev.state === 'current' ? <Clock size={14} /> : <span className={styles.timelinePip} />}
              </div>
              <div className={styles.timelineBody}>
                <span className={styles.timelineLabel}>{ev.label}</span>
                {ev.detail && <span className={styles.timelineDetail}>{ev.detail}</span>}
                <span className={styles.timelineStamp}>{ev.timestamp}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Vehicle & driver</h4>
        <div className={styles.vehicleCard}>
          <div className={styles.vehicleRow}><span>Vehicle</span><strong>{order.vehicleNumber ?? '—'}</strong></div>
          <div className={styles.vehicleRow}><span>Driver</span><strong>{order.driverName ?? '—'}</strong></div>
          <div className={styles.vehicleRow}><span>Consignee phone</span><strong>{order.consignee?.phone ?? '—'}</strong></div>
          <div className={styles.vehicleRow}><span>Logistics partner</span><strong>{order.logisticsPartner ?? '—'}</strong></div>
        </div>
      </div>

      <div className={styles.mapPlaceholder}>
        <MapIcon size={28} />
        <span>Live tracking via {order.logisticsPartner ?? 'logistics partner'}</span>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        <div className={styles.footerRight}>
          <Button variant="secondary" size="sm" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
          <Button variant="primary" size="sm" leftIcon={PhoneCall} onClick={handleContactDriver}>Contact driver</Button>
        </div>
      </div>
    </Modal>
  );
}
