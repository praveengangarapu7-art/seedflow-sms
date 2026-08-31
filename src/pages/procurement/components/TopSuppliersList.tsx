import { Star } from 'lucide-react';
import type { TopSupplier } from '@/types/procurement';
import { formatIndianCurrency } from '@/utils/formatters';
import styles from './TopSuppliersList.module.css';

interface TopSuppliersListProps {
  data: TopSupplier[];
}

export function TopSuppliersList({ data }: TopSuppliersListProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.title}>Top suppliers this month</h3>
        <span className={styles.subtitle}>By total spend</span>
      </div>

      <div className={styles.list}>
        {data.map((supplier) => (
          <div key={supplier.rank} className={styles.row}>
            <div className={styles.rank} aria-label={`Rank ${supplier.rank}`}>
              {supplier.rank}
            </div>

            <div className={styles.info}>
              <div className={styles.supplierName}>{supplier.name}</div>
              <div className={styles.meta}>
                <Star size={11} className={styles.starIcon} aria-hidden="true" />
                {supplier.score}
                <span>·</span>
                {supplier.poCount} POs this month
              </div>
            </div>

            <div className={styles.spend}>{formatIndianCurrency(supplier.totalSpend)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
