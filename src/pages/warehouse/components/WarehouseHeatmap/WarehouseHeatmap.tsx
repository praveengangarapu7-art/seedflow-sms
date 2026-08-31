import { useState } from 'react';
import { Thermometer, Droplets } from 'lucide-react';
import type { ZoneUtilization } from '@/types/warehouse';
import styles from './WarehouseHeatmap.module.css';

interface WarehouseHeatmapProps {
  zones: ZoneUtilization[];
}

function getDensity(pct: number): 'critical' | 'high' | 'moderate' | 'low' {
  if (pct >= 90) return 'critical';
  if (pct >= 75) return 'high';
  if (pct >= 50) return 'moderate';
  return 'low';
}

function getDensityLabel(pct: number): string {
  if (pct >= 90) return 'Near full';
  if (pct >= 75) return 'High';
  if (pct >= 50) return 'Moderate';
  return 'Low';
}

export function WarehouseHeatmap({ zones }: WarehouseHeatmapProps) {
  const [hovered, setHovered] = useState<ZoneUtilization | null>(null);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Warehouse heatmap</h3>
          <span className={styles.subtitle}>Zone utilization · live</span>
        </div>
        <div className={styles.legend} aria-label="Density legend">
          <span className={styles.legendItem}><i className={`${styles.swatch} ${styles.swatchLow}`} />Low</span>
          <span className={styles.legendItem}><i className={`${styles.swatch} ${styles.swatchModerate}`} />Moderate</span>
          <span className={styles.legendItem}><i className={`${styles.swatch} ${styles.swatchHigh}`} />High</span>
          <span className={styles.legendItem}><i className={`${styles.swatch} ${styles.swatchCritical}`} />Near full</span>
        </div>
      </div>

      <div className={styles.gridWrap}>
        <div className={styles.grid}>
          {zones.map((zone) => {
            // 0.4 base + 0.6 scaled by utilization fills denser cells more solidly
            const opacity = 0.4 + (zone.utilizationPct / 100) * 0.6;
            const density = getDensity(zone.utilizationPct);
            return (
              <div
                key={zone.zone}
                className={`${styles.cell} ${styles[`cell_${density}`]}`}
                style={{ opacity }}
                tabIndex={0}
                role="button"
                aria-label={`${zone.zone}: ${zone.utilizationPct} percent utilized`}
                onMouseEnter={() => setHovered(zone)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(zone)}
                onBlur={() => setHovered(null)}
              >
                <div className={styles.cellName}>{zone.zone}</div>
                <div className={styles.cellPct}>{zone.utilizationPct}%</div>
              </div>
            );
          })}
        </div>

        {hovered && (
          <div className={styles.tooltip} role="tooltip">
            <div className={styles.tipName}>{hovered.zone}</div>
            <div className={styles.tipMetaRow}>
              <span className={styles.tipBadge}>{getDensityLabel(hovered.utilizationPct)}</span>
              <span className={styles.tipPct}>{hovered.utilizationPct}%</span>
            </div>
            <div className={styles.tipDetail}>{hovered.used.toLocaleString()} / {hovered.capacity.toLocaleString()} bags</div>
            {hovered.temperature !== undefined && (
              <div className={styles.tipDetail}>
                <Thermometer size={12} /> {hovered.temperature} °C
              </div>
            )}
            {hovered.humidity !== undefined && (
              <div className={styles.tipDetail}>
                <Droplets size={12} /> {hovered.humidity}% RH
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
