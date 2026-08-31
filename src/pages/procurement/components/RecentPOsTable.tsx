import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/common/Badge/Badge';
import type { RecentPO, PoStatusValue } from '@/types/procurement';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './RecentPOsTable.module.css';

type BadgeVariant = 'neutral' | 'info' | 'warning' | 'success';

function getStatusVariant(status: PoStatusValue): BadgeVariant {
  switch (status) {
    case 'Draft':        return 'neutral';
    case 'Sent':         return 'info';
    case 'Acknowledged': return 'warning';
    case 'Received':     return 'success';
    case 'Closed':       return 'neutral';
  }
}

interface RecentPOsTableProps {
  data: RecentPO[];
}

export function RecentPOsTable({ data }: RecentPOsTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Recent purchase orders</h3>
          <span className={styles.subtitle}>Last 5 orders</span>
        </div>
        <Link to="/procurement/orders" className={styles.viewAll}>
          View all <ArrowRight size={13} />
        </Link>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table} aria-label="Recent purchase orders">
          <thead>
            <tr>
              <th scope="col">PO number</th>
              <th scope="col">Supplier</th>
              <th scope="col">Amount</th>
              <th scope="col">Status</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((po) => (
              <tr key={po.poNumber}>
                <td className={styles.poNumber}>{po.poNumber}</td>
                <td>{po.supplier}</td>
                <td className={styles.amount}>₹{formatIndianNumber(po.amount)}</td>
                <td>
                  <Badge variant={getStatusVariant(po.status)}>{po.status}</Badge>
                </td>
                <td className={styles.dateCell}>{po.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
