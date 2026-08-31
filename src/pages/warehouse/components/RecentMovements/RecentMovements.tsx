import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Edit3, ArrowRight } from 'lucide-react';
import type { StockMovement, MovementType } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './RecentMovements.module.css';

interface RecentMovementsProps {
  data: StockMovement[];
  onViewAll?: () => void;
}

const ICON_MAP = {
  Inbound: ArrowDownToLine,
  Outbound: ArrowUpFromLine,
  Transfer: ArrowLeftRight,
  Adjustment: Edit3,
} as const;

function getTypeClass(type: MovementType): string {
  return styles[`type_${type.toLowerCase()}`];
}

function locationLabel(m: StockMovement): string {
  if (m.type === 'Transfer' && m.fromLocation && m.toLocation) {
    return `${m.fromLocation} → ${m.toLocation}`;
  }
  return m.fromLocation ?? m.toLocation ?? '—';
}

export function RecentMovements({ data, onViewAll }: RecentMovementsProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.title}>Recent stock movements</h3>
          <span className={styles.subtitle}>Last 24 hours</span>
        </div>
        <button className={styles.viewAll} onClick={onViewAll || (() => console.log('view all movements'))}>
          View all <ArrowRight size={13} />
        </button>
      </div>

      <div className={styles.list}>
        {data.map((m) => {
          const Icon = ICON_MAP[m.type];
          const qtyDisplay = m.quantity < 0
            ? `-${formatIndianNumber(Math.abs(m.quantity))} ${m.uom}`
            : `${formatIndianNumber(m.quantity)} ${m.uom}`;

          return (
            <div key={m.id} className={styles.item}>
              <div className={`${styles.iconBadge} ${getTypeClass(m.type)}`} aria-hidden="true">
                <Icon size={14} />
              </div>

              <div className={styles.body}>
                <div className={styles.topRow}>
                  <span className={styles.itemName} title={m.itemName}>{m.itemName}</span>
                  <span className={styles.qty}>{qtyDisplay}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaType}>{m.type}</span>
                  <span className={styles.metaSep}>·</span>
                  <span className={styles.metaLoc}>{locationLabel(m)}</span>
                  <span className={styles.metaTime}>{m.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
