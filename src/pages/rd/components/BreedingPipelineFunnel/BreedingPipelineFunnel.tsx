import { Card } from '@/components/common/Card/Card';
import { pipelineStages } from '../../mockData/dashboardData';
import styles from './BreedingPipelineFunnel.module.css';

interface BreedingPipelineFunnelProps {
  onSegmentClick?: (stage: any) => void;
}

export function BreedingPipelineFunnel({ onSegmentClick }: BreedingPipelineFunnelProps) {
  const maxCount = Math.max(...pipelineStages.map(s => s.count));
  
  // Calculate widths and positions for each segment.
  // Using a log-ish scale to make small numbers visible.
  const getLogHeight = (count: number) => {
    // scale from 40 to 180 based on count
    if (count === 0) return 40;
    const logRatio = Math.log10(count) / Math.log10(maxCount);
    return 40 + (logRatio * 140);
  };

  const totalWidth = 700;
  const segmentWidth = totalWidth / pipelineStages.length;
  
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Breeding pipeline funnel</h3>
          <p className={styles.subtitle}>Stage-wise variety counts</p>
        </div>
      </div>
      
      <div className={styles.body}>
        <svg viewBox="0 0 700 300" className={styles.svg} role="img" aria-label="Breeding pipeline showing variety counts at each stage">
          <defs>
            <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-accent)" />
            </linearGradient>
          </defs>
          
          {pipelineStages.map((stage, i) => {
            const isLast = i === pipelineStages.length - 1;
            const leftHeight = getLogHeight(stage.count);
            const rightHeight = isLast ? 40 : getLogHeight(pipelineStages[i + 1].count);
            
            const x1 = i * segmentWidth;
            const x2 = (i + 1) * segmentWidth;
            
            // Centered vertically in a 300px height viewport
            // Funnel height is at most 180, centered around y = 140
            const y1Top = 50 + (180 - leftHeight) / 2;
            const y1Bot = 230 - (180 - leftHeight) / 2;
            const y2Top = 50 + (180 - rightHeight) / 2;
            const y2Bot = 230 - (180 - rightHeight) / 2;
            
            const pathData = `M ${x1} ${y1Top} L ${x2} ${y2Top} L ${x2} ${y2Bot} L ${x1} ${y1Bot} Z`;
            
            return (
              <g 
                key={stage.id} 
                className={styles.segmentGroup}
                onClick={() => onSegmentClick?.(stage)}
              >
                <path 
                  d={pathData} 
                  fill={i === 4 ? '#e6bc42' : i === 5 ? '#cca73b' : 'url(#funnelGrad)'} 
                  stroke="white"
                  strokeWidth="2"
                  className={styles.segment}
                />
                <text x={x1 + segmentWidth / 2} y="140" className={styles.countText} textAnchor="middle" dominantBaseline="middle">
                  {stage.count}
                </text>
                <text x={x1 + segmentWidth / 2} y="275" className={styles.labelText} textAnchor="middle">
                  {stage.label}
                </text>
                <title>{stage.label}: {stage.count} ({stage.description})</title>
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
}
