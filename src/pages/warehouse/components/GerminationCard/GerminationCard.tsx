import React from 'react';
import { Calendar } from 'lucide-react';
import { Badge } from '@/components/common/Badge/Badge';
import { GerminationDeclineRecord } from '@/types/warehouse';
import styles from './GerminationCard.module.css';

interface GerminationCardProps {
  record: GerminationDeclineRecord;
  onPrioritize: (sku: string) => void;
  isPrioritized?: boolean;
}

export const GerminationCard: React.FC<GerminationCardProps> = ({ record, onPrioritize, isPrioritized }) => {
  const {
    sku,
    itemName,
    batch,
    zone,
    monthsInStorage,
    initialGerminationPct,
    currentGerminationPct,
    predictedExpiryDate,
    declineRate,
    riskLevel,
    historicalReadings
  } = record;

  // Chart calculation
  const maxMonths = Math.max(monthsInStorage + 6, 18);
  const getX = (m: number) => (m / maxMonths) * 100;
  const getY = (p: number) => 100 - ((p - 60) / 40) * 100;

  const points = historicalReadings.map(r => `${getX(r.month)},${getY(r.germinationPct)}`).join(' ');
  
  // Projection line
  const lastReading = historicalReadings[historicalReadings.length - 1];
  const projectionX = getX(maxMonths);
  const projectionY = getY(currentGerminationPct - (declineRate * (maxMonths - monthsInStorage)));

  return (
    <div className={`${styles.card} ${isPrioritized ? styles.cardPrioritized : ''}`}>
      <div className={styles.header}>
        <div className={styles.titleInfo}>
          <h4 className={styles.itemName}>{itemName}</h4>
          <span className={styles.sku}>{sku}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {isPrioritized && <Badge variant="success">Priority</Badge>}
          <Badge variant={
            riskLevel === 'Critical' ? 'danger' :
            riskLevel === 'High' ? 'warning' :
            riskLevel === 'Medium' ? 'info' : 'success'
          }>
            {riskLevel}
          </Badge>
        </div>
      </div>
      
      <div className={styles.batch}>{batch}</div>

      <div className={styles.chartArea}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.svg}>
          {/* Threshold line (75%) */}
          <line x1="0" y1={getY(75)} x2="100" y2={getY(75)} className={styles.thresholdLine} strokeDasharray="2,2" />
          
          {/* Historical line */}
          <polyline
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
            points={points}
          />
          
          {/* Projection dashed line */}
          <line 
            x1={getX(lastReading.month)} y1={getY(lastReading.germinationPct)}
            x2={projectionX} y2={projectionY}
            className={styles.projectionLine}
            strokeDasharray="2,2"
          />

          {/* Data points */}
          {historicalReadings.map((r, i) => (
            <circle key={i} cx={getX(r.month)} cy={getY(r.germinationPct)} r="2" fill="var(--color-primary)" />
          ))}
        </svg>
        <div className={styles.chartLabels}>
          <span>0m</span>
          <span>{maxMonths}m</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <div className={styles.statLabel}><Calendar size={12} /> Stored since</div>
          <div className={styles.statValue}>{monthsInStorage} months</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>Germination</div>
          <div className={styles.statValue}>{initialGerminationPct}% → {currentGerminationPct}%</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>Decline rate</div>
          <div className={styles.statValue}>{declineRate}% / mo</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>Exp (pred)</div>
          <div className={styles.statValue}>{new Date(predictedExpiryDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}</div>
        </div>
      </div>

      <div className={styles.footer}>
        <Badge variant="neutral">{zone}</Badge>
        <button className={styles.actionBtn} onClick={() => onPrioritize(sku)}>Prioritize for dispatch →</button>
      </div>
    </div>
  );
};
