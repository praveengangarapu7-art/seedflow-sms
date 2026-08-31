import { Card } from '@/components/common/Card/Card';
import { INDIA_STATES } from '../ActiveTrialsMap/indiaStatesData';
import styles from './IndiaMap.module.css';

interface IndiaMapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status?: string;
  observations?: number;
}

interface IndiaMapProps {
  markers: IndiaMapMarker[];
  activeMarkerId?: string | null;
  onMarkerClick?: (marker: IndiaMapMarker) => void;
  title?: string;
  subtitle?: string;
}

const mapCoord = (lat: number, long: number) => {
  // India bounds: lat 8.1 - 37.1 N, long 68.1 - 97.4 E
  // SVG size is 612 wide (x), 696 tall (y)
  const x = ((long - 68.1) / (97.4 - 68.1)) * 612;
  const y = ((37.1 - lat) / (37.1 - 8.1)) * 696;
  return { x, y };
};

export function IndiaMap({
  markers,
  activeMarkerId,
  onMarkerClick,
  title = "Trial locations map",
  subtitle = "Interactive geographical distribution"
}: IndiaMapProps) {
  
  // Status based color classes
  const getMarkerClass = (marker: IndiaMapMarker) => {
    if (activeMarkerId === marker.id) return styles.markerActive;
    
    switch (marker.status) {
      case 'Sown': return styles.markerSown;
      case 'In progress': return styles.markerInProgress;
      case 'Harvested': return styles.markerHarvested;
      case 'Cancelled': return styles.markerCancelled;
      default: return styles.markerDefault;
    }
  };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </div>
      
      <div className={styles.body}>
        <div className={styles.mapContainer}>
          <svg viewBox="0 0 612 696" preserveAspectRatio="xMidYMid meet" className={styles.svg}>
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

            {markers.map((marker) => {
              const { x, y } = mapCoord(marker.latitude, marker.longitude);
              // Radius is slightly proportional to observations count
              const obsCount = marker.observations || 0;
              const radius = 6 + Math.min(obsCount * 0.05, 6);
              const markerClass = getMarkerClass(marker);
              const isActive = activeMarkerId === marker.id;

              return (
                <g
                  key={marker.id}
                  className={`${styles.markerGroup} ${isActive ? styles.markerGroupActive : ''}`}
                  onClick={() => onMarkerClick?.(marker)}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 4}
                    className={styles.markerRipple}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    className={`${styles.marker} ${markerClass}`}
                  />
                  <text
                    x={x}
                    y={y - radius - 5}
                    className={styles.markerLabel}
                    textAnchor="middle"
                  >
                    {marker.name}
                  </text>
                  <title>{marker.name}{marker.status ? ` (${marker.status})` : ''}{obsCount > 0 ? ` · ${obsCount} observations` : ''}</title>
                </g>
              );
            })}
          </svg>
        </div>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotSown}`}></span>
            <span className={styles.legendText}>Sown</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotInProgress}`}></span>
            <span className={styles.legendText}>In progress</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotHarvested}`}></span>
            <span className={styles.legendText}>Harvested</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
