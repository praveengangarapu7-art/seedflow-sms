import React from 'react';
import { ScoreRing } from '@/components/common/ScoreRing/ScoreRing';
import styles from './MiniPreview.module.css';

interface MiniPreviewProps {
  type: 'bar' | 'line' | 'donut' | 'kpi' | 'rings' | 'sparkline';
  value?: string;
  data?: number[];
  segments?: Array<{ label: string; value: number; color: string }>;
}

export const MiniPreview: React.FC<MiniPreviewProps> = ({ type, value, data = [], segments = [] }) => {
  if (type === 'kpi') {
    return (
      <div className={styles.kpiWrapper}>
        <span className={styles.kpiValue}>{value}</span>
      </div>
    );
  }

  if (type === 'rings') {
    return (
      <div className={styles.ringsWrapper}>
        {data.map((val, i) => (
          <ScoreRing key={i} score={val} size="sm" />
        ))}
      </div>
    );
  }

  if (type === 'bar') {
    const max = Math.max(...data, 1);
    return (
      <svg viewBox="0 0 120 60" className={styles.svg}>
        {data.map((val, i) => {
          const height = (val / max) * 50;
          const x = 10 + i * (100 / data.length);
          return (
            <rect
              key={i}
              x={x}
              y={60 - height}
              width={80 / data.length}
              height={height}
              fill="var(--color-primary)"
              rx="2"
            />
          );
        })}
      </svg>
    );
  }

  if (type === 'line' || type === 'sparkline') {
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 120;
      const y = 60 - ((val - min) / range) * 50;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox="0 0 120 60" className={styles.svg}>
        <polyline
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={type === 'line' ? '2' : '1.5'}
          points={points}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'donut') {
    const total = segments.reduce((acc, s) => acc + s.value, 0);
    let cumulativeValue = 0;
    
    return (
      <svg viewBox="0 0 100 100" className={styles.svgDonut}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-accent-light)" strokeWidth="15" />
        {segments.map((s, i) => {
          cumulativeValue += s.value;
          
          // Simplified for preview: use stroke-dasharray
          // 2 * PI * r = 2 * 3.14 * 40 = 251.2
          const dashArray = (s.value / total) * 251.2;
          const dashOffset = 251.2 - (cumulativeValue / total) * 251.2 + dashArray;

          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={s.color}
              strokeWidth="15"
              strokeDasharray={`${dashArray} 251.2`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
            />
          );
        })}
      </svg>
    );
  }

  return null;
};
