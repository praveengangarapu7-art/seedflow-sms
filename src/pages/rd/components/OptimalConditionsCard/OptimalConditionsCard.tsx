import React from 'react';
import styles from './OptimalConditionsCard.module.css';

interface OptimalConditionsCardProps {
  crop: string;
}

export function OptimalConditionsCard({ crop }: OptimalConditionsCardProps) {
  // Crop specific optimal parameters based on Indian agriculture
  const specs = React.useMemo(() => {
    const defaultSpecs = {
      tempMin: 20,
      tempMax: 30,
      tempOptMin: 22,
      tempOptMax: 28,
      rainMin: 400,
      rainMax: 900,
      rainOptMin: 550,
      rainOptMax: 750,
      soil: 'Well-drained fertile loam',
      sowingWindow: 'Mid-June to Early July (Kharif)',
      maturityDays: '110 - 130 days',
      phRange: '6.0 - 7.5'
    };

    switch (crop.toLowerCase()) {
      case 'cotton':
        return {
          tempMin: 15,
          tempMax: 40,
          tempOptMin: 21,
          tempOptMax: 32,
          rainMin: 300,
          rainMax: 1200,
          rainOptMin: 500,
          rainOptMax: 800,
          soil: 'Deep black clayey (Regur) or deep loams',
          sowingWindow: 'Late May to Mid-June',
          maturityDays: '150 - 180 days',
          phRange: '6.0 - 8.0'
        };
      case 'maize':
        return {
          tempMin: 12,
          tempMax: 38,
          tempOptMin: 18,
          tempOptMax: 27,
          rainMin: 350,
          rainMax: 1000,
          rainOptMin: 500,
          rainOptMax: 750,
          soil: 'Rich loam to sandy loam with good drainage',
          sowingWindow: 'Early June to late June (Kharif)',
          maturityDays: '90 - 110 days',
          phRange: '5.5 - 7.5'
        };
      case 'paddy':
      case 'rice':
        return {
          tempMin: 18,
          tempMax: 42,
          tempOptMin: 25,
          tempOptMax: 35,
          rainMin: 800,
          rainMax: 2500,
          rainOptMin: 1200,
          rainOptMax: 1800,
          soil: 'Heavy clay or clayey loam that retains water',
          sowingWindow: 'Mid-June to Mid-July (Kharif)',
          maturityDays: '120 - 145 days',
          phRange: '5.0 - 6.5'
        };
      case 'sunflower':
        return {
          tempMin: 10,
          tempMax: 35,
          tempOptMin: 15,
          tempOptMax: 25,
          rainMin: 250,
          rainMax: 800,
          rainOptMin: 400,
          rainOptMax: 600,
          soil: 'Deep, rich, black soils or alluvial loam',
          sowingWindow: 'July to August (Kharif) / Oct to Nov (Rabi)',
          maturityDays: '90 - 105 days',
          phRange: '6.5 - 8.0'
        };
      default:
        return defaultSpecs;
    }
  }, [crop]);

  // Helper to calculate percentage offset on progress bar
  const getPercentage = (val: number, min: number, max: number) => {
    return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  };

  const tempOptStart = getPercentage(specs.tempOptMin, specs.tempMin, specs.tempMax);
  const tempOptWidth = getPercentage(specs.tempOptMax, specs.tempMin, specs.tempMax) - tempOptStart;

  const rainOptStart = getPercentage(specs.rainOptMin, specs.rainMin, specs.rainMax);
  const rainOptWidth = getPercentage(specs.rainOptMax, specs.rainMin, specs.rainMax) - rainOptStart;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerTitle}>
          <span className={styles.icon}>🎯</span>
          <div>
            <h4 className={styles.title}>Optimal Growth Conditions</h4>
            <p className={styles.subtitle}>AI-modeled environmental sweet spots for maximizing {crop} yield</p>
          </div>
        </div>
        <span className={styles.cropBadge}>{crop}</span>
      </div>

      <div className={styles.grid}>
        {/* Left Side: Range Sliders */}
        <div className={styles.rangesColumn}>
          {/* Temperature Parameter */}
          <div className={styles.parameterRow}>
            <div className={styles.paramMeta}>
              <span className={styles.paramLabel}>Temperature Range</span>
              <span className={styles.paramVal}>{specs.tempOptMin}°C – {specs.tempOptMax}°C</span>
            </div>
            <div className={styles.trackContainer}>
              <div className={styles.track}>
                <div 
                  className={styles.optimalZone} 
                  style={{ left: `${tempOptStart}%`, width: `${tempOptWidth}%` }}
                />
              </div>
              <div className={styles.ticks}>
                <span>{specs.tempMin}°C</span>
                <span className={styles.optimalTick}>Sweet Spot</span>
                <span>{specs.tempMax}°C</span>
              </div>
            </div>
          </div>

          {/* Rainfall Parameter */}
          <div className={styles.parameterRow}>
            <div className={styles.paramMeta}>
              <span className={styles.paramLabel}>Seasonal Rainfall</span>
              <span className={styles.paramVal}>{specs.rainOptMin}mm – {specs.rainOptMax}mm</span>
            </div>
            <div className={styles.trackContainer}>
              <div className={styles.track}>
                <div 
                  className={styles.optimalZone} 
                  style={{ left: `${rainOptStart}%`, width: `${rainOptWidth}%` }}
                />
              </div>
              <div className={styles.ticks}>
                <span>{specs.rainMin}mm</span>
                <span className={styles.optimalTick}>Sweet Spot</span>
                <span>{specs.rainMax}mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Textual Requirements (Soil, Sowing window, pH) */}
        <div className={styles.detailsColumn}>
          <div className={styles.detailItem}>
            <span className={styles.detailIcon}>🌱</span>
            <div className={styles.detailText}>
              <strong className={styles.detailLabel}>Ideal Soil Texture</strong>
              <p className={styles.detailValue}>{specs.soil}</p>
            </div>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailIcon}>📅</span>
            <div className={styles.detailText}>
              <strong className={styles.detailLabel}>Optimal Sowing Window</strong>
              <p className={styles.detailValue}>{specs.sowingWindow}</p>
            </div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailIcon}>🧪</span>
              <div className={styles.detailText}>
                <strong className={styles.detailLabel}>Soil pH Range</strong>
                <p className={styles.detailValue}>{specs.phRange}</p>
              </div>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailIcon}>⏳</span>
              <div className={styles.detailText}>
                <strong className={styles.detailLabel}>Days to Maturity</strong>
                <p className={styles.detailValue}>{specs.maturityDays}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
