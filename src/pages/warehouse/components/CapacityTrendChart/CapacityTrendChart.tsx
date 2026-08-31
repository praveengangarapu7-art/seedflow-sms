import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { CapacityTrendPoint } from '@/types/warehouse';
import styles from './CapacityTrendChart.module.css';

interface CapacityTrendChartProps {
  data: CapacityTrendPoint[];
  zones: string[];
}

const PALETTE = ['#0E5467', '#e6bc42', '#2D7A8F', '#2E8B5C', '#C0392B', '#5A6E76', '#94A3AB', '#0A3F4F', '#C8D7DD', '#1A2B33'];

const VIEW_W = 720;
const VIEW_H = 280;
const PAD_L = 36;
const PAD_R = 18;
const PAD_T = 14;
const PAD_B = 28;

export function CapacityTrendChart({ data, zones }: CapacityTrendChartProps) {
  if (data.length === 0) return null;

  const innerW = VIEW_W - PAD_L - PAD_R;
  const innerH = VIEW_H - PAD_T - PAD_B;

  const xFor = (idx: number) => PAD_L + (idx / (data.length - 1)) * innerW;
  const yFor = (pct: number) => PAD_T + innerH - (pct / 100) * innerH;

  const totalLine = data.map((p) => {
    const vals = Object.values(p.values);
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  });

  const tableRows = zones.map((zone) => {
    const series = data.map((p) => p.values[zone] ?? 0);
    const current = series[series.length - 1];
    const last4 = series.slice(-4);
    const avg = Math.round(last4.reduce((s, v) => s + v, 0) / last4.length);
    const prevAvg = series.slice(-8, -4).reduce((s, v) => s + v, 0) / 4;
    const trend = current - prevAvg;
    return { zone, current, avg, trend };
  });

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Capacity trends</h3>
          <span className={styles.subtitle}>Last 12 weeks · zone occupancy %</span>
        </div>
      </div>

      <div className={styles.legend}>
        {zones.map((zone, i) => (
          <span key={zone} className={styles.legendItem}>
            <i className={styles.legendDot} style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            {zone}
          </span>
        ))}
        <span className={styles.legendItem}>
          <span className={styles.legendDashed} />
          Warehouse avg
        </span>
      </div>

      <div className={styles.chartWrap}>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={styles.svg} role="img" aria-label="Zone capacity trends">
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD_L} x2={VIEW_W - PAD_R} y1={yFor(t)} y2={yFor(t)} className={styles.gridLine} />
              <text x={PAD_L - 6} y={yFor(t) + 4} textAnchor="end" className={styles.axisLabel}>{t}%</text>
            </g>
          ))}

          {data.map((p, idx) => (
            <text key={p.weekLabel} x={xFor(idx)} y={VIEW_H - 8} textAnchor="middle" className={styles.axisLabel}>
              {p.weekLabel}
            </text>
          ))}

          {zones.map((zone, zoneIdx) => {
            const points = data.map((p, idx) => `${xFor(idx)},${yFor(p.values[zone] ?? 0)}`).join(' ');
            return (
              <polyline
                key={zone}
                fill="none"
                stroke={PALETTE[zoneIdx % PALETTE.length]}
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
            );
          })}

          <polyline
            fill="none"
            stroke="#1A2B33"
            strokeWidth={1.6}
            strokeDasharray="5 4"
            points={totalLine.map((v, idx) => `${xFor(idx)},${yFor(v)}`).join(' ')}
          />
        </svg>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table} aria-label="Zone capacity trend summary">
          <thead>
            <tr>
              <th>Zone</th>
              <th className={styles.alignRight}>Current</th>
              <th className={styles.alignRight}>4-week avg</th>
              <th className={styles.alignRight}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => {
              const TrendIcon = r.trend > 1 ? TrendingUp : r.trend < -1 ? TrendingDown : Minus;
              const trendClass = r.trend > 1 ? styles.trendUp : r.trend < -1 ? styles.trendDown : styles.trendFlat;
              return (
                <tr key={r.zone}>
                  <td>{r.zone}</td>
                  <td className={styles.alignRight}><strong>{r.current}%</strong></td>
                  <td className={styles.alignRight}>{r.avg}%</td>
                  <td className={`${styles.alignRight} ${trendClass}`}>
                    <span className={styles.trendCell}>
                      <TrendIcon size={12} />
                      {r.trend > 0 ? '+' : ''}{Math.abs(r.trend).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
