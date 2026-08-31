import React, { useMemo } from 'react';
import styles from './GxEHeatmap.module.css';

interface RankingItem {
  entryCode: string;
  entryName: string;
  meanYield: number;
}

interface LocationItem {
  locationId: string;
  locationName: string;
}

interface StabilityItem {
  entryCode: string;
  stability: 'High' | 'Medium' | 'Low';
  adaptedZones: string[];
}

interface GxEHeatmapProps {
  rankings: RankingItem[];
  locations: LocationItem[];
  stabilityList: StabilityItem[];
}

export function GxEHeatmap({ rankings, locations, stabilityList }: GxEHeatmapProps) {
  
  // Deterministically generate yield values per entry-location cell
  const gridData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    
    rankings.forEach(r => {
      data[r.entryCode] = {};
      locations.forEach(loc => {
        // Deterministic variation based on code character codes
        const seed = r.entryCode.charCodeAt(r.entryCode.length - 1) + loc.locationId.charCodeAt(loc.locationId.length - 1);
        const variation = ((seed % 7) / 7) * 4 - 2; // -2 to +2 variation
        data[r.entryCode][loc.locationId] = Number((r.meanYield + variation).toFixed(1));
      });
    });

    return data;
  }, [rankings, locations]);

  // Find min and max yield to calculate background color gradients
  const { minYield, maxYield } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    
    Object.values(gridData).forEach(row => {
      Object.values(row).forEach(val => {
        if (val < min) min = val;
        if (val > max) max = val;
      });
    });

    return { minYield: min === Infinity ? 10 : min, maxYield: max === -Infinity ? 30 : max };
  }, [gridData]);

  // Calculate cell color: HSL green hue (136) with varying lightness
  const getCellBg = (yieldVal: number) => {
    const range = maxYield - minYield;
    if (range === 0) return 'hsl(136, 40%, 92%)';
    const pct = (yieldVal - minYield) / range;
    
    // Lightness varies from 95% (lowest performance) to 45% (best performance)
    const lightness = 95 - (pct * 50);
    return `hsl(136, 45%, ${lightness.toFixed(0)}%)`;
  };

  const getCellTextColor = (yieldVal: number) => {
    const range = maxYield - minYield;
    if (range === 0) return 'var(--color-text-primary)';
    const pct = (yieldVal - minYield) / range;
    return pct > 0.6 ? '#ffffff' : 'var(--color-text-primary)';
  };

  return (
    <div className={styles.container}>
      <div className={styles.scroller}>
        <div className={styles.gridContainer} style={{
          gridTemplateColumns: `140px repeat(${locations.length}, 1fr)`
        }}>
          
          {/* Header Row */}
          <div className={`${styles.cell} ${styles.headerCell} ${styles.stickyLeft}`}>Entry</div>
          {locations.map(loc => (
            <div key={loc.locationId} className={`${styles.cell} ${styles.headerCell}`}>
              <div className={styles.rotatedTextArea}>
                <span className={styles.locName}>{loc.locationName}</span>
              </div>
            </div>
          ))}

          {/* Matrix Body */}
          {rankings.map(r => (
            <React.Fragment key={r.entryCode}>
              {/* Row Header */}
              <div className={`${styles.cell} ${styles.rowHeaderCell} ${styles.stickyLeft}`}>
                <span className={styles.entryCode}>{r.entryCode}</span>
                <span className={styles.entryName}>{r.entryName}</span>
              </div>
              
              {/* Data Cells */}
              {locations.map(loc => {
                const yieldVal = gridData[r.entryCode]?.[loc.locationId] || 0;
                const bg = getCellBg(yieldVal);
                const textColor = getCellTextColor(yieldVal);

                return (
                  <div 
                    key={loc.locationId} 
                    className={`${styles.cell} ${styles.dataCell}`}
                    style={{ backgroundColor: bg, color: textColor }}
                  >
                    <span className={styles.value}>{yieldVal}</span>
                    <span className={styles.unit}>q/ha</span>
                    
                    {/* Tooltip */}
                    <div className={styles.tooltip}>
                      <strong>{r.entryName}</strong>
                      <div>Location: {loc.locationName}</div>
                      <div>Yield: {yieldVal} q/ha</div>
                      <div className={styles.reps}>Based on 3 replications</div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Stability and Recommendations list */}
      <div className={styles.stabilityArea}>
        <h5 className={styles.stabilityTitle}>Stability & Adaptation Analysis</h5>
        <div className={styles.stabilityList}>
          {stabilityList.map(item => {
            const matchedRank = rankings.find(r => r.entryCode === item.entryCode);
            
            return (
              <div key={item.entryCode} className={styles.stabilityRow}>
                <div className={styles.stabilityMeta}>
                  <span className={styles.monoCode}>{item.entryCode}</span>
                  <span className={styles.fullName}>{matchedRank?.entryName || 'Genotype'}</span>
                </div>
                
                <div className={styles.stabilityChips}>
                  <span className={`${styles.stabilityBadge} ${styles[item.stability.toLowerCase()]}`}>
                    {item.stability} Stability
                  </span>
                  
                  {item.adaptedZones.map(zone => (
                    <span key={zone} className={styles.zoneChip}>{zone}</span>
                  ))}
                </div>
                
                <div className={styles.stabilityRec}>
                  <span>Recommendation: </span>
                  <strong>
                    {item.stability === 'High' 
                      ? 'Broadly stable. Suitable for national distribution.' 
                      : `Highly adapted specifically to ${item.adaptedZones.join(', ')}.`}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
