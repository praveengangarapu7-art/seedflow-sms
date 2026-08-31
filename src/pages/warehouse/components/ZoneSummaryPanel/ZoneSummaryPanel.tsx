import { Thermometer, Droplets, MapPin, ArrowRight } from 'lucide-react';
import type { ZoneLayoutShape } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './ZoneSummaryPanel.module.css';

interface ZoneSummaryPanelProps {
  zone: ZoneLayoutShape | null;
  onViewBins: (zone: string) => void;
}

function densityClass(pct: number): string {
  if (pct >= 90) return styles.barCritical;
  if (pct >= 75) return styles.barHigh;
  if (pct >= 50) return styles.barModerate;
  return styles.barLow;
}

export function ZoneSummaryPanel({ zone, onViewBins }: ZoneSummaryPanelProps) {
  if (!zone) {
    return (
      <div className={styles.card}>
        <div className={styles.empty}>
          <MapPin size={32} className={styles.emptyIcon} />
          <p>Select a zone in the layout to see details.</p>
        </div>
      </div>
    );
  }

  const available = Math.max(0, zone.capacity - zone.occupied);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.zoneName}>{zone.zone}</h3>
        <span className={`${styles.typeChip} ${styles[`type_${zone.zoneType}`]}`}>{zone.zoneType}</span>
      </div>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{formatIndianNumber(zone.capacity)}</div>
          <div className={styles.statLabel}>Capacity</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{formatIndianNumber(zone.occupied)}</div>
          <div className={styles.statLabel}>Occupied</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{formatIndianNumber(available)}</div>
          <div className={styles.statLabel}>Available</div>
        </div>
      </div>

      <div className={styles.barSection}>
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${densityClass(zone.occupancyPct)}`} style={{ width: `${zone.occupancyPct}%` }} />
        </div>
        <div className={styles.barFooter}>
          <span>Occupancy</span>
          <strong>{zone.occupancyPct}%</strong>
        </div>
      </div>

      {(zone.temperature !== undefined || zone.humidity !== undefined) && (
        <div className={styles.envBlock}>
          {zone.temperature !== undefined && (
            <div className={styles.envRow}>
              <span className={styles.envLeft}><Thermometer size={14} /> Temperature</span>
              <span className={styles.envValue}>{zone.temperature} °C</span>
            </div>
          )}
          {zone.humidity !== undefined && (
            <div className={styles.envRow}>
              <span className={styles.envLeft}><Droplets size={14} /> Humidity</span>
              <span className={styles.envValue}>{zone.humidity}% RH</span>
            </div>
          )}
        </div>
      )}

      <div className={styles.itemsBlock}>
        <h4 className={styles.itemsTitle}>Top items in zone</h4>
        {zone.topItems.length === 0 ? (
          <p className={styles.emptyItems}>No items currently stored.</p>
        ) : (
          <ul className={styles.itemsList}>
            {zone.topItems.slice(0, 5).map((it) => (
              <li key={`${it.sku}-${it.bin}`} className={styles.itemRow}>
                <div className={styles.itemMain}>
                  <span className={styles.itemName} title={it.itemName}>{it.itemName}</span>
                  <span className={styles.itemBin}>{it.bin}</span>
                </div>
                <span className={styles.itemQty}>{formatIndianNumber(it.quantity)} {it.uom}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button className={styles.viewAllBtn} onClick={() => onViewBins(zone.zone)}>
        View all bins <ArrowRight size={13} />
      </button>
    </div>
  );
}
