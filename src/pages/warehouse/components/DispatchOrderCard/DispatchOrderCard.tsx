import { Calendar, Truck, Phone, MapPin, ArrowRight, User, PackageOpen, UserPlus, Ban } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { ActionMenu } from '@/components/common/ActionMenu';
import type { DispatchOrder, DispatchStatus, DispatchType } from '@/types/warehouse';
import { formatIndianCurrency, formatIndianNumber } from '@/utils/formatters';
import styles from './DispatchOrderCard.module.css';

interface DispatchOrderCardProps {
  order: DispatchOrder;
  onPick: (order: DispatchOrder) => void;
  onPack: (order: DispatchOrder) => void;
  onDispatch: (order: DispatchOrder) => void;
  onTrack?: (order: DispatchOrder) => void;
  onUpdateStatus?: (id: string, status: DispatchStatus) => void;
  onAssignPicker?: (id: string) => void;
}

function statusClass(s: DispatchStatus): string {
  switch (s) {
    case 'Pending':    return styles.stPending;
    case 'Picking':    return styles.stPicking;
    case 'Packed':     return styles.stPacked;
    case 'Dispatched': return styles.stDispatched;
    case 'Delivered':  return styles.stDelivered;
    case 'Cancelled':  return styles.stCancelled;
  }
}

function typeClass(t: DispatchType): string {
  switch (t) {
    case 'Sales order':       return styles.typeSales;
    case 'Material request':  return styles.typeMaterial;
    case 'Inter-warehouse':   return styles.typeInter;
  }
}

import { usePermission } from '@/hooks/usePermission';

export function DispatchOrderCard({ order, onPick, onPack, onDispatch, onTrack, onUpdateStatus, onAssignPicker }: DispatchOrderCardProps) {
  const canPrepareOutbound = usePermission('prepare_outbound_dispatch');
  const canApproveOutbound = usePermission('approve_outbound_dispatch');

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.id}>{order.id}</span>
        <span className={styles.refChip}>{order.salesOrderRef}</span>
        <span className={`${styles.typeChip} ${typeClass(order.type)}`}>{order.type}</span>
        <span className={`${styles.statusChip} ${statusClass(order.status)}`}>{order.status}</span>
      </div>

      <div className={styles.midGrid}>
        <div className={styles.consigneeBlock}>
          <h4 className={styles.consigneeName}>{order.consignee.name}</h4>
          <div className={styles.metaRow}>
            <MapPin size={12} /> {order.consignee.city}, {order.consignee.state}
          </div>
          <div className={styles.metaRow}>
            <Phone size={12} /> {order.consignee.phone}
          </div>
        </div>

        <div className={styles.logisticsBlock}>
          {order.vehicleNumber && (
            <div className={styles.metaRow}>
              <Truck size={12} /> {order.vehicleNumber}
              {order.driverName && <span className={styles.subtle}> · {order.driverName}</span>}
            </div>
          )}
          {order.logisticsPartner && (
            <div className={styles.metaRow}>
              <span className={styles.subtle}>Carrier:</span> {order.logisticsPartner}
            </div>
          )}
          <div className={styles.metaRow}>
            <Calendar size={12} /> Expected: {order.expectedDispatchDate}
          </div>
        </div>
      </div>

      <div className={styles.bottomRow}>
        <div className={styles.summary}>
          <span>{order.totalItems} items</span>
          <span className={styles.dot}>·</span>
          <span>{formatIndianNumber(order.totalQuantity)} {order.uom}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.value}>{formatIndianCurrency(order.totalValue)}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.subtle}>created {order.createdAt}</span>
        </div>

        <div className={styles.actions}>
          {(order.pickerAssigned || order.packerAssigned) && (
            <span className={styles.assigneeChip}>
              <User size={11} />
              {order.pickerAssigned && <span>Picker: {order.pickerAssigned}</span>}
              {order.packerAssigned && <span> · Packer: {order.packerAssigned}</span>}
            </span>
          )}
          {order.status === 'Pending' && canPrepareOutbound && (
            <Button variant="primary" size="sm" rightIcon={ArrowRight} onClick={() => onPick(order)}>
              Generate picking list
            </Button>
          )}
          {order.status === 'Picking' && canPrepareOutbound && (
            <Button variant="primary" size="sm" rightIcon={ArrowRight} onClick={() => onPick(order)}>
              Open picking list
            </Button>
          )}
          {order.status === 'Packed' && canPrepareOutbound && (
            <Button variant="primary" size="sm" rightIcon={ArrowRight} onClick={() => onPack(order)}>
              Validate packing
            </Button>
          )}
          {(order.status === 'Dispatched' || order.status === 'Delivered') && (
            <Button variant="ghost" size="sm" rightIcon={ArrowRight} onClick={() => (onTrack ?? onDispatch)(order)}>
              Track shipment
            </Button>
          )}
          {(() => {
            const items = [
              ...(canPrepareOutbound ? [
                { label: 'Start picking', icon: PackageOpen, onClick: () => { onUpdateStatus?.(order.id, 'Picking'); onPick(order); } },
                { label: 'Assign picker', icon: UserPlus, onClick: () => onAssignPicker?.(order.id) }
              ] : []),
              ...(canApproveOutbound ? [
                { label: 'Cancel order', icon: Ban, variant: 'danger' as const, onClick: () => onUpdateStatus?.(order.id, 'Cancelled') }
              ] : [])
            ];
            return items.length > 0 ? <ActionMenu items={items} /> : null;
          })()}
        </div>
      </div>
    </div>
  );
}
