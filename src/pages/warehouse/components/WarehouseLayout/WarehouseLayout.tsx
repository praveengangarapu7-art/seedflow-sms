import { Compass, Truck } from 'lucide-react';
import type { ZoneLayoutShape, ZoneType } from '@/types/warehouse';
import styles from './WarehouseLayout.module.css';

interface WarehouseLayoutProps {
  zones: ZoneLayoutShape[];
  selectedZone: string | null;
  onSelectZone: (zone: string) => void;
}

function fillClass(zoneType: ZoneType): string {
  switch (zoneType) {
    case 'cold':       return styles.fillCold;
    case 'ambient':    return styles.fillAmbient;
    case 'controlled': return styles.fillControlled;
    case 'staging':    return styles.fillStaging;
    case 'quarantine': return styles.fillQuarantine;
    case 'dispatch':   return styles.fillDispatch;
  }
}

const TYPE_LABELS: Array<{ key: ZoneType; label: string; swatch: string }> = [
  { key: 'cold',       label: 'Cold',       swatch: 'swatchCold' },
  { key: 'ambient',    label: 'Ambient',    swatch: 'swatchAmbient' },
  { key: 'controlled', label: 'Controlled', swatch: 'swatchControlled' },
  { key: 'staging',    label: 'Staging',    swatch: 'swatchStaging' },
  { key: 'quarantine', label: 'Quarantine', swatch: 'swatchQuarantine' },
  { key: 'dispatch',   label: 'Dispatch',   swatch: 'swatchDispatch' },
];

export function WarehouseLayout({ zones, selectedZone, onSelectZone }: WarehouseLayoutProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Warehouse layout</h3>
          <span className={styles.subtitle}>Click any zone to inspect</span>
        </div>
        <span className={styles.scaleNote}>1 unit ≈ 10 sqm</span>
      </div>

      <div className={styles.svgWrap}>
        <svg viewBox="0 0 760 420" className={styles.svg} role="img" aria-label="Warehouse zone map">
          <rect x={10} y={10} width={740} height={390} rx={8} className={styles.floor} />

          {zones.map((z) => {
            const isSelected = selectedZone === z.zone;
            const opacity = 0.45 + (z.occupancyPct / 100) * 0.5;
            return (
              <g
                key={z.zone}
                className={`${styles.zoneGroup} ${isSelected ? styles.zoneSelected : ''}`}
                transform={`translate(${z.x}, ${z.y})`}
                onClick={() => onSelectZone(z.zone)}
                role="button"
                tabIndex={0}
                aria-label={`${z.zone} ${z.occupancyPct} percent occupied`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectZone(z.zone); } }}
              >
                <rect
                  width={z.width}
                  height={z.height}
                  rx={6}
                  className={`${styles.zoneRect} ${fillClass(z.zoneType)}`}
                  style={{ fillOpacity: opacity }}
                />
                <text x={z.width / 2} y={z.height / 2 - 6} className={styles.zoneName} textAnchor="middle">
                  {z.zone}
                </text>
                <text x={z.width / 2} y={z.height / 2 + 12} className={styles.zoneStat} textAnchor="middle">
                  {z.occupied.toLocaleString()} / {z.capacity.toLocaleString()}
                </text>
                <text x={z.width / 2} y={z.height / 2 + 28} className={styles.zonePct} textAnchor="middle">
                  {z.occupancyPct}%
                </text>
              </g>
            );
          })}

          <g transform="translate(700, 350)" aria-hidden="true">
            <foreignObject width={28} height={28}>
              <div className={styles.truckIcon}><Truck size={20} /></div>
            </foreignObject>
            <text x={14} y={42} textAnchor="middle" className={styles.exitLabel}>Exit</text>
          </g>

          <g transform="translate(28, 380)" aria-hidden="true">
            <foreignObject width={20} height={20}>
              <div className={styles.compassIcon}><Compass size={14} /></div>
            </foreignObject>
            <text x={26} y={14} className={styles.compassLabel}>N</text>
          </g>
        </svg>
      </div>

      <div className={styles.legend} aria-label="Zone type legend">
        {TYPE_LABELS.map((t) => (
          <span key={t.key} className={styles.legendItem}>
            <i className={`${styles.swatch} ${styles[t.swatch]}`} />
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
