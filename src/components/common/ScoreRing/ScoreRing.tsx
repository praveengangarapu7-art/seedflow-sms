import styles from './ScoreRing.module.css';

interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const SIZE_MAP = { sm: 48, md: 72, lg: 96 } as const;
const STROKE_MAP = { sm: 4, md: 6, lg: 8 } as const;
const FONT_MAP = { sm: 12, md: 16, lg: 20 } as const;

function getColor(score: number): string {
  if (score >= 90) return 'var(--color-primary)';
  if (score >= 75) return 'var(--color-secondary, #2D7A8F)';
  if (score >= 60) return 'var(--color-warning, #e6bc42)';
  return 'var(--color-danger)';
}

export function ScoreRing({
  score,
  maxScore = 100,
  size = 'md',
  label,
}: ScoreRingProps) {
  const px = SIZE_MAP[size];
  const strokeWidth = STROKE_MAP[size];
  const fontSize = FONT_MAP[size];
  const r = px / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * r;
  const clampedScore = Math.min(Math.max(score, 0), maxScore);
  const progress = clampedScore / maxScore;
  const dashOffset = circumference * (1 - progress);
  const fillColor = getColor((clampedScore / maxScore) * 100);

  return (
    <div className={styles.root}>
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        className={styles.svg}
      >
        {/* Track */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          fill="none"
          stroke="var(--color-border-light)"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${px / 2} ${px / 2})`}
        />
        {/* Score text */}
        <text
          x={px / 2}
          y={px / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight="700"
          fill="var(--color-text-primary)"
        >
          {Math.round(clampedScore)}
        </text>
      </svg>
      {label && (
        <span className={styles.label} style={{ fontSize: fontSize - 4 }}>
          {label}
        </span>
      )}
    </div>
  );
}
