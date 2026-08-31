import { useState, useEffect } from 'react';
import type { PoStatus } from '@/types/procurement';
import styles from './PoStatusDonut.module.css';

const SEGMENT_COLORS: Record<string, string> = {
  Draft: '#C8D7DD',
  Sent: '#94A3AB',
  Acknowledged: '#2D7A8F',
  Received: '#0E5467',
  Closed: '#0A3F4F',
};

const RADIUS = 70;
const STROKE = 24;
const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface PoStatusDonutProps {
  data: PoStatus[];
}

export function PoStatusDonut({ data }: PoStatusDonutProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const total = data.reduce((s, d) => s + d.count, 0);

  let cumulativePct = 0;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.title}>PO status distribution</h3>
        <span className={styles.subtitle}>All purchase orders</span>
      </div>

      <div className={styles.chartArea}>
        <div className={styles.svgWrap}>
          <svg
            width={SIZE}
            height={SIZE}
            role="img"
            aria-label={`Donut chart: ${data.map((d) => `${d.status} ${d.percentage}%`).join(', ')}`}
          >
            {/* Background track */}
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={STROKE}
            />

            {data.map((item) => {
              const arc = (item.percentage / 100) * CIRCUMFERENCE;
              const rotation = -90 + (cumulativePct / 100) * 360;
              cumulativePct += item.percentage;

              return (
                <circle
                  key={item.status}
                  cx={CX}
                  cy={CY}
                  r={RADIUS}
                  fill="none"
                  stroke={SEGMENT_COLORS[item.status]}
                  strokeWidth={STROKE}
                  strokeDasharray={`${arc} ${CIRCUMFERENCE}`}
                  strokeDashoffset={animated ? 0 : arc}
                  strokeLinecap="butt"
                  transform={`rotate(${rotation} ${CX} ${CY})`}
                  style={{
                    transition: `stroke-dashoffset 800ms ease-out`,
                  }}
                />
              );
            })}
          </svg>

          <div className={styles.donutCenter}>
            <span className={styles.donutTotal}>{total}</span>
            <span className={styles.donutLabel}>Total POs</span>
          </div>
        </div>

        <div className={styles.legend}>
          {data.map((item) => (
            <div key={item.status} className={styles.legendItem}>
              <div
                className={styles.legendDot}
                style={{ backgroundColor: SEGMENT_COLORS[item.status] }}
              />
              <div className={styles.legendContent}>
                <span className={styles.legendStatus}>{item.status}</span>
                <div className={styles.legendStats}>
                  <span className={styles.legendCount}>{item.count}</span>
                  <span className={styles.legendPct}>· {item.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
