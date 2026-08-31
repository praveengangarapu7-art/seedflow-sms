import type { BarcodeFormat } from '@/types/warehouse';
import styles from './BarcodeRenderer.module.css';

interface BarcodeRendererProps {
  value: string;
  format: BarcodeFormat;
  width?: number;
  height?: number;
  showCaption?: boolean;
}

function hashChar(c: string): number {
  return c.charCodeAt(0);
}

function deterministicBars(value: string, totalBars: number): number[] {
  const widths: number[] = [];
  const seed = value || 'EMPTY';
  for (let i = 0; i < totalBars; i++) {
    const c = seed.charCodeAt(i % seed.length);
    widths.push(((c + i * 7) % 4) + 1);
  }
  return widths;
}

function qrCells(value: string, size: number): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const seed = value || 'EMPTY';

  const isFinder = (r: number, c: number) => {
    const inTL = r < 7 && c < 7;
    const inTR = r < 7 && c >= size - 7;
    const inBL = r >= size - 7 && c < 7;
    if (!inTL && !inTR && !inBL) return null;
    const lr = inTL ? r : inTR ? r : r - (size - 7);
    const lc = inTL ? c : inTR ? c - (size - 7) : c;
    if (lr === 0 || lr === 6) return true;
    if (lc === 0 || lc === 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const finder = isFinder(r, c);
      if (finder !== null) {
        grid[r][c] = finder;
      } else {
        const h = (hashChar(seed[(r * size + c) % seed.length]) + r * 13 + c * 31) >>> 0;
        grid[r][c] = h % 2 === 0;
      }
    }
  }
  return grid;
}

export function BarcodeRenderer({ value, format, width = 220, height = 80, showCaption = true }: BarcodeRendererProps) {
  if (format === 'QR') {
    const size = 21;
    const cells = qrCells(value, size);
    const cellSize = Math.floor(Math.min(width, height) / size);
    const dim = cellSize * size;
    return (
      <div className={styles.wrap} style={{ width }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className={styles.svg} role="img" aria-label={`QR code ${value}`}>
          <rect width={dim} height={dim} fill="var(--color-white)" />
          {cells.map((row, r) =>
            row.map((on, c) => on ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill="var(--color-text-primary)"
              />
            ) : null)
          )}
        </svg>
        {showCaption && <div className={styles.caption}>{value}</div>}
      </div>
    );
  }

  const totalBars = format === 'EAN13' ? 60 : format === 'CODE39' ? 50 : 70;
  const bars = deterministicBars(value, totalBars);
  const totalUnits = bars.reduce((s, w) => s + w, 0) * 2;
  const unit = (width - 8) / totalUnits;

  let cursor = 4;
  const segments: { x: number; w: number; on: boolean }[] = [];
  bars.forEach((w, idx) => {
    const widthPx = w * unit;
    segments.push({ x: cursor, w: widthPx, on: idx % 2 === 0 });
    cursor += widthPx;
    segments.push({ x: cursor, w: widthPx, on: false });
    cursor += widthPx;
  });

  return (
    <div className={styles.wrap} style={{ width }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label={`${format} barcode ${value}`}>
        <rect width={width} height={height} fill="var(--color-white)" />
        {segments.filter((s) => s.on).map((s, i) => (
          <rect key={i} x={s.x} y={6} width={s.w} height={height - 24} fill="var(--color-text-primary)" />
        ))}
      </svg>
      {showCaption && <div className={styles.caption}>{value}</div>}
    </div>
  );
}
