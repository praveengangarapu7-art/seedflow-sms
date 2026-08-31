import { Card } from '@/components/common/Card/Card';
import { trialLocations } from '../../mockData/dashboardData';
import { INDIA_STATES } from './indiaStatesData';
import styles from './ActiveTrialsMap.module.css';

interface ActiveTrialsMapProps {
  onLocationClick?: (loc: any) => void;
}

const mapCoord = (lat: number, long: number) => {
  // India bounds: lat 8.1 - 37.1 N, long 68.1 - 97.4 E
  // SVG size is 612 wide (x), 696 tall (y)
  const x = ((long - 68.1) / (97.4 - 68.1)) * 612;
  const y = ((37.1 - lat) / (37.1 - 8.1)) * 696;
  return { x, y };
};

export function ActiveTrialsMap({ onLocationClick }: ActiveTrialsMapProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Active trials map</h3>
          <p className={styles.subtitle}>Location-wise distribution (Click to view details)</p>
        </div>
      </div>
      
      <div className={styles.body}>
        <div className={styles.mapContainer}>
          <svg viewBox="0 0 612 696" preserveAspectRatio="xMidYMid meet" className={styles.svg}>
            {/* Render all 36 state paths dynamically */}
            <g className={styles.statesGroup}>
              {INDIA_STATES.map((state) => (
                <path
                  key={state.id}
                  id={state.id}
                  d={state.d}
                  className={styles.indiaState}
                >
                  <title>{state.name}</title>
                </path>
              ))}
            </g>

            {/* Render interactive trial location markers */}
            {trialLocations.map((loc) => {
              const { x, y } = mapCoord(loc.latitude, loc.longitude);
              // Radius proportional to active trials count
              const radius = 6 + (loc.activeTrials || 0) * 1.5;
              return (
                <g
                  key={loc.id}
                  className={styles.markerGroup}
                  onClick={() => onLocationClick?.(loc)}
                >
                  {/* Subtle pulsing background circle for marker highlight */}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 4}
                    className={styles.markerRipple}
                  />
                  {/* Main interactive location circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    className={styles.marker}
                  />
                  {/* Sleek coordinate marker label */}
                  <text
                    x={x}
                    y={y - radius - 5}
                    className={styles.markerLabel}
                    textAnchor="middle"
                  >
                    {loc.name}
                  </text>
                  <title>{loc.name}: {loc.activeTrials} active trials</title>
                </g>
              );
            })}
          </svg>
        </div>
        <div className={styles.legend}>
          <span className={styles.legendDot}></span>
          <span className={styles.legendText}>Active trial location · Size = trial count</span>
        </div>
      </div>
    </Card>
  );
}
