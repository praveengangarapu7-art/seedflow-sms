import { useState } from 'react';
import { Card } from '@/components/common/Card/Card';
import { Badge } from '@/components/common/Badge/Badge';
import { geneticGainData } from '../../mockData/dashboardData';
import styles from './GeneticGainTrendChart.module.css';

interface GeneticGainTrendChartProps {
  onPointClick?: (point: any) => void;
}

export function GeneticGainTrendChart({ onPointClick }: GeneticGainTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Chart dimensions and scales
  const width = 700;
  const height = 240; // increased slightly to give room to rotated labels
  const padding = { top: 20, right: 20, bottom: 60, left: 40 }; // increased bottom padding from 40 to 60 for rotated labels
  
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  
  const yMax = 12; // 0 to 12%
  const yTicks = [0, 2, 4, 6, 8, 10, 12];
  
  const getX = (index: number) => padding.left + (index * (innerWidth / (geneticGainData.length - 1)));
  const getY = (value: number) => padding.top + innerHeight - ((value / yMax) * innerHeight);

  // Generate SVG path for actual
  const actualPath = geneticGainData.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.actualGainPct)}`
  ).join(' ');

  // Generate SVG path for target
  const targetPath = geneticGainData.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.targetGainPct)}`
  ).join(' ');

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Genetic gain trend</h3>
          <p className={styles.subtitle}>Yield improvement per breeding cycle (Click points for details)</p>
        </div>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.legendDotActual}></span>
            <span>Actual</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendLineTarget}></span>
            <span>Target</span>
          </div>
        </div>
      </div>
      
      <div className={styles.body}>
        <div className={styles.chartContainer}>
          <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
            {/* Gridlines & Y-Axis Labels */}
            {yTicks.map(tick => (
              <g key={`y-${tick}`}>
                <line 
                  x1={padding.left} 
                  y1={getY(tick)} 
                  x2={width - padding.right} 
                  y2={getY(tick)} 
                  className={styles.gridLine} 
                />
                <text 
                  x={padding.left - 10} 
                  y={getY(tick)} 
                  className={styles.axisLabel}
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {tick}%
                </text>
              </g>
            ))}

            {/* Target Line */}
            <path d={targetPath} className={styles.targetLine} />

            {/* Actual Line */}
            <path d={actualPath} className={styles.actualLine} />

            {/* Data Points and X-Axis Labels */}
            {geneticGainData.map((d, i) => {
              const x = getX(i);
              const isHovered = hoverIndex === i;
              
              return (
                <g 
                  key={`pt-${i}`}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onClick={() => onPointClick?.(d)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Invisible wide vertical band for easier hover */}
                  <rect 
                    x={x - (innerWidth / (geneticGainData.length - 1)) / 2} 
                    y={padding.top} 
                    width={innerWidth / (geneticGainData.length - 1)} 
                    height={innerHeight} 
                    fill="transparent" 
                  />

                  {/* Hover crosshair line */}
                  {isHovered && (
                    <line 
                      x1={x} y1={padding.top} 
                      x2={x} y2={height - padding.bottom} 
                      className={styles.crosshair} 
                    />
                  )}

                  {/* Actual Data Point */}
                  <circle 
                    cx={x} 
                    cy={getY(d.actualGainPct)} 
                    r={isHovered ? 6 : 4} 
                    className={styles.actualPoint} 
                  />

                  {/* X-Axis Label - Rotated -25 deg for nice spacing without overlap */}
                  <text 
                    x={x} 
                    y={height - padding.bottom + 15} 
                    className={styles.axisLabel}
                    textAnchor="end"
                    transform={`rotate(-25, ${x}, ${height - padding.bottom + 15})`}
                  >
                    {d.cycleLabel}
                  </text>
                  
                  {/* Tooltip text (SVG) */}
                  {isHovered && (
                    <g transform={`translate(${x > width/2 ? x - 70 : x + 15}, ${getY(d.actualGainPct) - 20})`}>
                      <rect x="0" y="0" width="60" height="40" rx="4" fill="white" stroke="var(--color-border)" />
                      <text x="30" y="16" fontSize="11" textAnchor="middle" fill="var(--color-text-secondary)">Actual</text>
                      <text x="30" y="32" fontSize="12" fontWeight="bold" textAnchor="middle" fill="var(--color-primary)">{d.actualGainPct}%</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* KPI Strip */}
        <div className={styles.kpiStrip}>
          <div className={styles.kpiItem}>
            <span className={styles.kpiLabel}>Best improver</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>Maize program</span>
              <Badge variant="success">+12.4%</Badge>
            </div>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.kpiItem}>
            <span className={styles.kpiLabel}>Avg gain (last 3 cycles)</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>+8.1%</span>
            </div>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.kpiItem}>
            <span className={styles.kpiLabel}>Underperforming</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>Cotton program</span>
              <Badge variant="warning">+2.1%</Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
