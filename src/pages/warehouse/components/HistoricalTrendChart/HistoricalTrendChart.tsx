import React, { useState, useRef, useMemo } from 'react';
import styles from './HistoricalTrendChart.module.css';

interface DataPoint {
  timestamp: string;
  values: Record<string, number>;
}

interface HistoricalTrendChartProps {
  data: DataPoint[];
  zones: string[];
  metric: string;
  unit: string;
  thresholdMin?: number;
  thresholdMax?: number;
}

export const HistoricalTrendChart: React.FC<HistoricalTrendChartProps> = ({
  data,
  zones,
  unit,
  thresholdMin,
  thresholdMax
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const colors: Record<string, string> = {
    'Cold Zone A': '#40513b',
    'Cold Zone B': '#609966',
    'Cold Zone C': '#9dc08b',
    'Controlled Zone': '#edf1d6',
    'Quarantine': '#d97706'
  };

  const chartData = useMemo(() => {
    if (!data.length) return null;

    const allValues = data.flatMap(d => zones.map(z => d.values[z] || 0));
    const minVal = Math.min(...allValues, thresholdMin || Infinity);
    const maxVal = Math.max(...allValues, thresholdMax || -Infinity);
    const padding = (maxVal - minVal) * 0.1 || 1;
    
    const yMin = minVal - padding;
    const yMax = maxVal + padding;
    const yRange = yMax - yMin;

    const paths = zones.map(zone => {
      const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (((d.values[zone] || 0) - yMin) / yRange) * 100;
        return `${x},${y}`;
      }).join(' ');
      return { zone, points, color: colors[zone] || '#40513b' };
    });

    const getThresholdY = (val: number) => 100 - ((val - yMin) / yRange) * 100;

    return { paths, yMin, yMax, getThresholdY };
  }, [data, zones, thresholdMin, thresholdMax]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setHoverX(x);
  };

  const hoverData = useMemo(() => {
    if (hoverX === null || !data.length) return null;
    const index = Math.round((hoverX / 100) * (data.length - 1));
    const safeIndex = Math.max(0, Math.min(data.length - 1, index));
    return {
      index: safeIndex,
      point: data[safeIndex],
      x: (safeIndex / (data.length - 1)) * 100
    };
  }, [hoverX, data]);

  if (!chartData) return null;

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

      <div className={styles.chartWrapper}>
        <div className={styles.yAxis}>
          <span>{chartData.yMax.toFixed(1)}</span>
          <span>{((chartData.yMax + chartData.yMin) / 2).toFixed(1)}</span>
          <span>{chartData.yMin.toFixed(1)}</span>
        </div>
        
        <svg 
          ref={svgRef}
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
          className={styles.svg}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverX(null)}
        >
          {/* Grid lines */}
          <line x1="0" y1="0" x2="100" y2="0" className={styles.gridLine} />
          <line x1="0" y1="50" x2="100" y2="50" className={styles.gridLine} />
          <line x1="0" y1="100" x2="100" y2="100" className={styles.gridLine} />

          {/* Thresholds */}
          {thresholdMax && (
            <line 
              x1="0" y1={chartData.getThresholdY(thresholdMax)} 
              x2="100" y2={chartData.getThresholdY(thresholdMax)} 
              className={styles.thresholdMax} 
              strokeDasharray="1,1" 
            />
          )}
          {thresholdMin && (
            <line 
              x1="0" y1={chartData.getThresholdY(thresholdMin)} 
              x2="100" y2={chartData.getThresholdY(thresholdMin)} 
              className={styles.thresholdMin} 
              strokeDasharray="1,1" 
            />
          )}

          {/* Lines */}
          {chartData.paths.map(p => (
            <polyline
              key={p.zone}
              fill="none"
              stroke={p.color}
              strokeWidth="1.5"
              points={p.points}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={styles.line}
            />
          ))}

          {/* Hover crosshair */}
          {hoverData && (
            <>
              <line 
                x1={hoverData.x} y1="0" 
                x2={hoverData.x} y2="100" 
                className={styles.crosshair} 
              />
              {zones.map(z => {
                const val = hoverData.point.values[z];
                if (val === undefined) return null;
                const y = 100 - ((val - chartData.yMin) / (chartData.yMax - chartData.yMin)) * 100;
                return (
                  <circle 
                    key={z}
                    cx={hoverData.x} cy={y} 
                    r="1" 
                    fill={colors[z]} 
                    stroke="white" 
                    strokeWidth="0.5" 
                  />
                );
              })}
            </>
          )}
        </svg>

        {hoverData && (
          <div className={styles.tooltip} style={{ left: `${hoverData.x}%` }}>
            <div className={styles.tooltipTime}>
              {new Date(hoverData.point.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            {zones.map(z => (
              <div key={z} className={styles.tooltipRow}>
                <span className={styles.tooltipLabel}>{z}:</span>
                <span className={styles.tooltipValue}>{hoverData.point.values[z] || 0}{unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className={styles.xAxis}>
        {data.length > 0 && (
          <>
            <span>{new Date(data[0].timestamp).toLocaleDateString()}</span>
            <span>{new Date(data[Math.floor(data.length / 2)].timestamp).toLocaleDateString()}</span>
            <span>{new Date(data[data.length - 1].timestamp).toLocaleDateString()}</span>
          </>
        )}
      </div>
    </div>
  );
};
