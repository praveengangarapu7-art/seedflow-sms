import React, { useMemo } from 'react';
import { EnergyConsumption } from '@/types/warehouse';
import styles from './EnergyChart.module.css';

interface EnergyChartProps {
  data: EnergyConsumption[];
}

export const EnergyChart: React.FC<EnergyChartProps> = ({ data }) => {
  const zones = useMemo(() => Array.from(new Set(data.map(d => d.zone))), [data]);
  
  const colors: Record<string, string> = {
    'Cold Zone A': '#40513b',
    'Cold Zone B': '#609966',
    'Cold Zone C': '#9dc08b',
    'Controlled Zone': '#edf1d6',
    'Quarantine': '#d97706'
  };

  const chartData = useMemo(() => {
    const dates = Array.from(new Set(data.map(d => d.date))).sort();
    const maxDayTotal = dates.reduce((max, date) => {
      const dayTotal = data.filter(d => d.date === date).reduce((sum, d) => sum + d.kwh, 0);
      return Math.max(max, dayTotal);
    }, 0);

    const bars = dates.map(date => {
      const dayData = data.filter(d => d.date === date);
      let currentHeight = 0;
      const segments = zones.map(zone => {
        const zoneKwh = dayData.find(d => d.zone === zone)?.kwh || 0;
        const height = (zoneKwh / (maxDayTotal || 1)) * 100;
        const segment = { zone, height, y: 100 - currentHeight - height, color: colors[zone] };
        currentHeight += height;
        return segment;
      });
      return { date, segments };
    });

    return { bars, maxDayTotal };
  }, [data, zones]);

  return (
    <div className={styles.container}>
      <div className={styles.legend}>
        {zones.map(z => (
          <div key={z} className={styles.legendItem}>
            <div className={styles.colorDot} style={{ backgroundColor: colors[z] }} />
            <span>{z}</span>
          </div>
        ))}
      </div>

      <div className={styles.chartArea}>
        <div className={styles.yAxis}>
          <span>{Math.round(chartData.maxDayTotal)} kWh</span>
          <span>0</span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.svg}>
          {chartData.bars.map((bar, i) => (
            <g key={bar.date}>
              {bar.segments.map(seg => (
                <rect
                  key={seg.zone}
                  x={(i / chartData.bars.length) * 100 + 0.5}
                  y={seg.y}
                  width={(100 / chartData.bars.length) - 1}
                  height={seg.height}
                  fill={seg.color}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>
      
      <div className={styles.xAxis}>
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
};
