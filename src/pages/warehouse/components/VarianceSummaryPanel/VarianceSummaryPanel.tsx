import { AlertCircle, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import { formatRupees, formatIndianNumber } from '@/utils/formatters';
import type { VarianceByReason, TopItemVariance, AdjustmentAlert } from '../../mockData/adjustmentsData';
import styles from './VarianceSummaryPanel.module.css';

interface VarianceSummaryPanelProps {
  varianceByReason: VarianceByReason[];
  topItems: TopItemVariance[];
  alerts: AdjustmentAlert[];
  onItemClick: (adjustmentId: string) => void;
}

const SEVERITY_ICON: Record<AdjustmentAlert['severity'], LucideIcon> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function VarianceSummaryPanel({ varianceByReason, topItems, alerts, onItemClick }: VarianceSummaryPanelProps) {
  const maxAbs = Math.max(...varianceByReason.map((v) => Math.abs(v.value)), 1);

  return (
    <div className={styles.panel}>
      <div className={styles.col}>
        <h4 className={styles.colTitle}>Net variance by reason</h4>
        <div className={styles.barList}>
          {varianceByReason.map((row) => {
            const pct = (Math.abs(row.value) / maxAbs) * 100;
            const isPositive = row.value > 0;
            return (
              <div key={row.reason} className={styles.barRow}>
                <span className={styles.barLabel}>{row.reason}</span>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${isPositive ? styles.barPositive : styles.barNegative}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`${styles.barValue} ${isPositive ? styles.posText : styles.negText}`}>
                  {row.value > 0 ? '+' : ''}{formatRupees(row.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.col}>
        <h4 className={styles.colTitle}>Top items by variance</h4>
        <ul className={styles.itemsList}>
          {topItems.map((it) => (
            <li
              key={it.sku}
              className={styles.itemRow}
              role="button"
              tabIndex={0}
              onClick={() => onItemClick(it.latestAdjustmentId)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onItemClick(it.latestAdjustmentId); } }}
            >
              <div className={styles.itemMain}>
                <span className={styles.itemName} title={it.itemName}>{it.itemName}</span>
                <span className={styles.itemSku}>{it.sku}</span>
              </div>
              <div className={styles.itemRight}>
                <span className={`${styles.itemQty} ${it.varianceQty < 0 ? styles.negText : styles.posText}`}>
                  {it.varianceQty > 0 ? '+' : ''}{formatIndianNumber(it.varianceQty)} {it.uom}
                </span>
                <span className={`${styles.itemValue} ${it.varianceValue < 0 ? styles.negText : styles.posText}`}>
                  {it.varianceValue > 0 ? '+' : ''}{formatRupees(it.varianceValue)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.col}>
        <h4 className={styles.colTitle}>Alerts</h4>
        <ul className={styles.alertsList}>
          {alerts.map((a) => {
            const Icon = SEVERITY_ICON[a.severity];
            return (
              <li key={a.id} className={`${styles.alertRow} ${styles[`severity_${a.severity}`]}`}>
                <span className={styles.alertIcon}><Icon size={14} /></span>
                <div className={styles.alertBody}>
                  <span className={styles.alertTitle}>{a.title}</span>
                  <p className={styles.alertDesc}>{a.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
