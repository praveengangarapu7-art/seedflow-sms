import { Truck, Calendar, MapPin, ArrowRight, Eye, ClipboardCheck, Ban } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { ActionMenu } from '@/components/common/ActionMenu';
import type { ASN, AsnStatus } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './AsnList.module.css';

import { usePermission } from '@/hooks/usePermission';

interface AsnListProps {
  asns: ASN[];
  onReceive: (asn: ASN) => void;
  onUpdateStatus?: (id: string, status: AsnStatus) => void;
  onViewDetails?: (asn: ASN) => void;
}

function statusClass(s: AsnStatus): string {
  switch (s) {
    case 'Expected':  return styles.stExpected;
    case 'Arrived':   return styles.stArrived;
    case 'Receiving': return styles.stReceiving;
    case 'Completed': return styles.stCompleted;
    case 'Cancelled': return styles.stCancelled;
  }
}

export function AsnList({ asns, onReceive, onUpdateStatus, onViewDetails }: AsnListProps) {
  const canReceive = usePermission('receive_incoming_goods');
  if (asns.length === 0) {
    return <div className={styles.empty}>No advance shipments match your filters.</div>;
  }

  return (
    <div className={styles.list}>
      {asns.map((asn) => {
        const canReceiveASN = canReceive && (asn.status === 'Expected' || asn.status === 'Arrived' || asn.status === 'Receiving');
        return (
          <div key={asn.id} className={styles.card}>
            <div className={styles.iconBadge}><Truck size={20} /></div>

            <div className={styles.body}>
              <div className={styles.headerRow}>
                <span className={styles.asnId}>{asn.id}</span>
                <span className={`${styles.statusChip} ${statusClass(asn.status)}`}>{asn.status}</span>
                {asn.dockAssigned && <span className={styles.dockChip}>{asn.dockAssigned}</span>}
              </div>

              <h4 className={styles.supplier}>{asn.supplier}</h4>

              <div className={styles.metaRow}>
                <span className={styles.metaItem}>
                  <Calendar size={12} /> {asn.expectedDate} · {asn.expectedTime}
                </span>
                <span className={styles.metaSep}>·</span>
                <span className={styles.metaItem}>{asn.items} items</span>
                <span className={styles.metaSep}>·</span>
                <span className={styles.metaItem}>{formatIndianNumber(asn.totalQuantity)} {asn.uom}</span>
                <span className={styles.metaSep}>·</span>
                <span className={styles.metaItem}>PO {asn.poReference}</span>
              </div>

              {asn.vehicleNumber && (
                <div className={styles.vehicleRow}>
                  <span className={styles.metaItem}>
                    <MapPin size={12} /> Vehicle {asn.vehicleNumber}
                  </span>
                  {asn.driverName && (
                    <>
                      <span className={styles.metaSep}>·</span>
                      <span className={styles.metaItem}>Driver {asn.driverName}</span>
                    </>
                  )}
                </div>
              )}

              {asn.notes && <p className={styles.notes}>{asn.notes}</p>}
            </div>

            <div className={styles.actions}>
              {canReceiveASN && (
                <Button variant="primary" size="sm" rightIcon={ArrowRight} onClick={() => onReceive(asn)}>
                  Receive goods
                </Button>
              )}
              {(() => {
                const items = [
                  { label: 'View details', icon: Eye, onClick: () => onViewDetails?.(asn) },
                  ...(canReceive ? [
                    { label: 'Log arrival', icon: ClipboardCheck, onClick: () => onUpdateStatus?.(asn.id, 'Arrived') },
                    { label: 'Process putaway', icon: ArrowRight, onClick: () => onReceive(asn) },
                    { label: 'Cancel', icon: Ban, variant: 'danger' as const, onClick: () => onUpdateStatus?.(asn.id, 'Cancelled') }
                  ] : [])
                ];
                return items.length > 0 ? <ActionMenu items={items} /> : null;
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
