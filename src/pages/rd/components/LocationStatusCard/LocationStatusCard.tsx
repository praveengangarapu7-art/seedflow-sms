import { Card } from '@/components/common/Card/Card';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { Badge } from '@/components/common/Badge/Badge';
import { Phone, Calendar, Clipboard, Droplets, ArrowRight } from 'lucide-react';
import styles from './LocationStatusCard.module.css';

interface LocationStatusCardProps {
  location: {
    id: string;
    name: string;
    state: string;
    agroClimaticZone: string;
    soilType: string;
    rainfall: number;
    fieldStaff: string;
    contactPhone?: string;
    status: 'Planned' | 'Sown' | 'In progress' | 'Harvested' | 'Cancelled';
    sownDate?: string;
    observations: number;
    pendingObservations: number;
    lastUpdateAt?: string;
    plotMap: any[];
  };
  isActive?: boolean;
  onViewPlotMap?: (locationId: string) => void;
}

export function LocationStatusCard({ location, isActive, onViewPlotMap }: LocationStatusCardProps) {
  
  // Calculate days since sowing
  const getDaysSinceSowing = () => {
    if (!location.sownDate) return null;
    const sown = new Date(location.sownDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - sown.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
  };

  // Calculate plot progress (e.g. % harvested)
  const getPlotProgress = () => {
    if (!location.plotMap || location.plotMap.length === 0) return 0;
    const harvestedCount = location.plotMap.filter(p => p.status === 'Harvested').length;
    return Math.round((harvestedCount / location.plotMap.length) * 100);
  };

  const progress = getPlotProgress();
  const days = getDaysSinceSowing();

  return (
    <Card className={`${styles.card} ${isActive ? styles.cardActive : ''}`}>
      <div className={styles.header}>
        <div className={styles.headerTitleArea}>
          <h4 className={styles.name}>{location.name}</h4>
          <div className={styles.badgeRow}>
            <Badge variant="neutral" className={styles.badge}>{location.state}</Badge>
            <Badge variant="info" className={styles.badge}>{location.agroClimaticZone}</Badge>
          </div>
        </div>
        <StatusBadge status={location.status === 'In progress' ? 'Active' : location.status} />
      </div>

      <div className={styles.body}>
        <div className={styles.grid}>
          <div className={styles.stat}>
            <Calendar className={styles.icon} size={14} />
            <div>
              <span className={styles.statLabel}>Sown Date</span>
              <span className={styles.statValue}>{location.sownDate || 'Not sown yet'}</span>
              {days && <span className={styles.statSub}>{days} ago</span>}
            </div>
          </div>
          
          <div className={styles.stat}>
            <Clipboard className={styles.icon} size={14} />
            <div>
              <span className={styles.statLabel}>Observations</span>
              <span className={styles.statValue}>
                {location.observations} recorded
              </span>
              <span className={styles.statSub}>{location.pendingObservations} pending</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {location.plotMap && location.plotMap.length > 0 && (
          <div className={styles.progressSection}>
            <div className={styles.progressLabelRow}>
              <span className={styles.progressLabel}>Harvesting Progress</span>
              <span className={styles.progressPct}>{progress}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Environmental conditions */}
        <div className={styles.environmentalRow}>
          <div className={styles.envItem}>
            <Droplets className={styles.envIcon} size={12} />
            <span>Soil: <strong>{location.soilType}</strong></span>
          </div>
          <div className={styles.envItem}>
            <span className={styles.envText}>Rainfall: <strong>{location.rainfall} mm</strong></span>
          </div>
        </div>

        {/* Field Staff section */}
        <div className={styles.staffRow}>
          <div className={styles.staffInfo}>
            <div className={styles.avatar}>
              {location.fieldStaff.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className={styles.staffName}>{location.fieldStaff}</div>
              <div className={styles.staffTitle}>Field Coordinator</div>
            </div>
          </div>
          {location.contactPhone && (
            <a 
              href={`tel:${location.contactPhone}`} 
              className={styles.phoneLink}
              title={`Call ${location.fieldStaff}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Phone size={14} />
            </a>
          )}
        </div>

        {location.lastUpdateAt && (
          <div className={styles.syncRow}>
            <span>Last sync: {location.lastUpdateAt}</span>
          </div>
        )}
      </div>

      <div className={styles.divider} />
      
      <button 
        className={styles.actionBtn}
        onClick={() => onViewPlotMap?.(location.id)}
      >
        <span>View plot map</span>
        <ArrowRight size={14} className={styles.arrow} />
      </button>
    </Card>
  );
}
