import { MoreHorizontal } from 'lucide-react';
import type { SpendCategory } from '@/types/procurement';
import { formatIndianCurrency } from '@/utils/formatters';
import styles from './SpendByCategoryChart.module.css';

interface SpendByCategoryChartProps {
  data: SpendCategory[];
}

export function SpendByCategoryChart({ data }: SpendByCategoryChartProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Spend by category</h3>
          <span className={styles.subtitle}>Last 6 months</span>
        </div>
        <button className={styles.moreBtn} aria-label="More options">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div
        className={styles.bars}
        role="img"
        aria-label="Bar chart showing spend by category"
      >
        <span className={styles.srOnly}>
          {data.map((d) => `${d.category}: ${formatIndianCurrency(d.amount)}`).join(', ')}
        </span>

        {data.map((item, index) => (
          <div className={styles.barRow} key={item.category}>
            <span className={styles.barLabel}>{item.category}</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{
                  width: `${item.percentage}%`,
                  animationDelay: `${index * 80}ms`,
                }}
              />
            </div>
            <span className={styles.barValue}>{formatIndianCurrency(item.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
