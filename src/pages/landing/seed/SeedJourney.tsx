import { useEffect, useState } from 'react';
import { Cog, FlaskConical, Sprout, TestTube, Truck, Warehouse, type LucideIcon } from 'lucide-react';
import styles from './SeedJourney.module.css';

/**
 * Hero centrepiece: one seed lot travelling the seed lifecycle.
 *
 * A glowing maize kernel moves round the six stages a seed company runs
 * (breeder seed → field production → laboratory → processing → warehouse →
 * dealers and farmers) while a plant grows in the centre, and a lot card
 * underneath shows what SeedSphere records at that stage. Visitors can click
 * a stage to jump to it; the tour pauses while the pointer is over it.
 *
 * The figures on the lot card are an illustrative sample lot, labelled as
 * such on the card.
 */

interface Stage {
  key: string;
  label: string;
  module: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  metric: string;
}

const STAGES: Stage[] = [
  {
    key: 'rd',
    label: 'Breeder seed',
    module: 'R&D',
    icon: FlaskConical,
    title: 'Breeder seed released',
    detail: 'Parent lines A × R crossed, DUS data and pedigree on record',
    metric: 'Germplasm → variety',
  },
  {
    key: 'production',
    label: 'Field production',
    module: 'Production Planning',
    icon: Sprout,
    title: 'Sown on contract farms',
    detail: 'Grower agreements, GPS plots, isolation and rogueing inspections',
    metric: 'Field inspection passed',
  },
  {
    key: 'lab',
    label: 'Laboratory',
    module: 'Laboratory',
    icon: TestTube,
    title: 'Tested against standards',
    detail: 'Germination, physical purity, moisture and GOT on a coded sample',
    metric: 'Germination 92% · Purity 99.2%',
  },
  {
    key: 'processing',
    label: 'Processing',
    module: 'Processing',
    icon: Cog,
    title: 'Cleaned, graded, treated',
    detail: 'Drying, grading and seed treatment logged per machine and batch',
    metric: 'Recovery 86% · QR labels printed',
  },
  {
    key: 'warehouse',
    label: 'Warehouse',
    module: 'Warehouse',
    icon: Warehouse,
    title: 'Stored by lot and validity',
    detail: 'Released stock only, temperature logged, first-expiry-first-out picking',
    metric: 'Label validity tracked',
  },
  {
    key: 'market',
    label: 'Dealers & farmers',
    module: 'Distribution',
    icon: Truck,
    title: 'Dispatched and verified',
    detail: 'Every packet traces back to its farm, lab result and processing batch',
    metric: 'QR-verified packets',
  },
];

const C = 260; // centre
const R = 196; // ring radius
const STEP_MS = 2800;

function nodePos(i: number) {
  const a = ((-90 + i * 60) * Math.PI) / 180;
  return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
}

function arcPath(i: number) {
  const a = nodePos(i);
  const b = nodePos((i + 1) % 6);
  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`;
}

/** Flat-topped maize kernel, centred on 0,0 and about 2r tall. */
function Kernel({ r, fill = '#E3A92B', germ = '#F7DD97' }: { r: number; fill?: string; germ?: string }) {
  return (
    <g>
      <path
        d={`M0 ${r * 1.15} C ${r * 0.95} ${r * 0.55} ${r * 1.05} ${-r * 0.75} ${r * 0.55} ${-r} Q 0 ${-r * 1.18} ${-r * 0.55} ${-r} C ${-r * 1.05} ${-r * 0.75} ${-r * 0.95} ${r * 0.55} 0 ${r * 1.15} Z`}
        fill={fill}
      />
      <ellipse cx="0" cy={r * 0.15} rx={r * 0.32} ry={r * 0.55} fill={germ} />
    </g>
  );
}

export default function SeedJourney() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const stage = ((step % 6) + 6) % 6;
  const growth = Math.min(stage, 3); // the plant is fully grown from processing on

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setStep((s) => s + 1), STEP_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const jumpTo = (i: number) => {
    // Always move forward round the ring so the seed never spins backwards.
    setStep((s) => s + (((i - (s % 6)) + 6) % 6));
  };

  const current = STAGES[stage];

  return (
    <div
      className={styles.wrap}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <svg viewBox="0 0 520 520" className={styles.svg} role="img" aria-label="A seed lot moving through the seed lifecycle in SeedSphere">
        <defs>
          <radialGradient id="sj-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F5C451" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#F5C451" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sj-core" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EAF3F5" />
          </radialGradient>
          <linearGradient id="sj-soil" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8B6238" />
            <stop offset="100%" stopColor="#5E3F22" />
          </linearGradient>
          <linearGradient id="sj-leaf" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#3FA06B" />
            <stop offset="100%" stopColor="#1F7A4C" />
          </linearGradient>
        </defs>

        {/* inner disc */}
        <circle cx={C} cy={C} r="150" fill="url(#sj-core)" className={styles.disc} />
        <circle cx={C} cy={C} r="150" fill="none" stroke="rgba(14,84,103,0.10)" strokeWidth="1" />

        {/* ring track and completed segments */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(14,84,103,0.18)" strokeWidth="2" strokeDasharray="3 7" />
        {STAGES.map((_, i) => (
          <path
            key={`seg-${i}`}
            d={arcPath(i)}
            fill="none"
            stroke="#D9A521"
            strokeWidth="3"
            strokeLinecap="round"
            className={styles.segment}
            style={{ opacity: i < stage ? 0.9 : 0 }}
          />
        ))}

        {/* ---- the growing plant ---- */}
        <g className={styles.plant} data-growth={growth} data-stage={stage}>
          {/* soil */}
          <path d="M178 336 Q260 312 342 336 L342 352 Q260 366 178 352 Z" fill="url(#sj-soil)" />
          <g fill="#A57B4B" opacity="0.7">
            <circle cx="205" cy="340" r="2" />
            <circle cx="232" cy="346" r="1.6" />
            <circle cx="292" cy="345" r="1.8" />
            <circle cx="318" cy="339" r="1.5" />
          </g>
          {/* roots */}
          <g className={styles.roots} stroke="#C9A26C" strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M260 336 q-8 10 -16 14" />
            <path d="M260 336 q2 12 -2 18" />
            <path d="M260 336 q9 9 17 12" />
          </g>
          {/* seed in the soil */}
          <g className={styles.seedInSoil} transform="translate(260 330) rotate(-12)">
            <circle r="16" fill="url(#sj-glow)" className={styles.seedGlow} />
            <Kernel r={7} />
          </g>
          {/* stem */}
          <path className={styles.stem} d="M260 330 C 257 300, 263 262, 260 204" stroke="#2F8A5A" strokeWidth="5" strokeLinecap="round" fill="none" pathLength={100} />
          {/* leaves */}
          <path className={`${styles.leaf} ${styles.leaf1}`} d="M259 300 C 236 296, 214 284, 198 262 C 222 270, 244 280, 259 292 Z" fill="url(#sj-leaf)" />
          <path className={`${styles.leaf} ${styles.leaf2}`} d="M261 286 C 284 282, 306 270, 322 248 C 298 256, 276 266, 261 278 Z" fill="url(#sj-leaf)" />
          <path className={`${styles.leaf} ${styles.leaf3}`} d="M259 260 C 240 254, 224 240, 214 220 C 232 228, 248 238, 259 252 Z" fill="url(#sj-leaf)" />
          <path className={`${styles.leaf} ${styles.leaf4}`} d="M261 246 C 280 240, 296 226, 306 206 C 288 214, 272 224, 261 238 Z" fill="url(#sj-leaf)" />
          {/* maize ear with husk */}
          <g transform="translate(268 252) rotate(22)">
          <g className={styles.ear}>
            <path d="M0 -4 C 10 -2, 12 20, 4 34 C 0 38, -4 30, -2 20 Z" fill="#8CC79A" />
            <rect x="-6" y="-26" width="12" height="34" rx="6" fill="#E9B43A" />
            <g fill="#F7D57A">
              {[-20, -14, -8, -2, 4].map((y) => (
                <g key={y}>
                  <circle cx="-2.6" cy={y} r="1.7" />
                  <circle cx="2.6" cy={y + 3} r="1.7" />
                </g>
              ))}
            </g>
            <path d="M-3 -4 C -14 0, -12 22, -4 32" stroke="#6FB07F" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
          </g>
          {/* tassel */}
          <g className={styles.tassel} stroke="#C79A4E" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M260 206 l-12 -18" />
            <path d="M260 206 l0 -22" />
            <path d="M260 206 l12 -18" />
            <path d="M260 206 l-20 -8" />
            <path d="M260 206 l20 -8" />
          </g>
          {/* harvest sparkle */}
          <g className={styles.sparkles} fill="#F5C451">
            <circle cx="292" cy="226" r="2.4" />
            <circle cx="236" cy="214" r="1.8" />
            <circle cx="300" cy="262" r="1.6" />
          </g>
        </g>

        {/* ---- stage nodes ---- */}
        {STAGES.map((s, i) => {
          const p = nodePos(i);
          const Icon = s.icon;
          const active = i === stage;
          const done = i < stage;
          const labelBelow = p.y >= C;
          return (
            <g
              key={s.key}
              className={`${styles.node} ${active ? styles.nodeActive : ''} ${done ? styles.nodeDone : ''}`}
              onClick={() => jumpTo(i)}
              role="button"
              tabIndex={0}
              aria-label={`${s.label}: ${s.title}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') jumpTo(i);
              }}
            >
              <circle cx={p.x} cy={p.y} r="40" className={styles.nodeHalo} />
              <circle cx={p.x} cy={p.y} r="30" className={styles.nodeCircle} />
              <Icon x={p.x - 12} y={p.y - 12} width={24} height={24} className={styles.nodeIcon} />
              <text x={p.x} y={labelBelow ? p.y + 50 : p.y - 42} textAnchor="middle" className={styles.nodeLabel}>
                {s.label}
              </text>
            </g>
          );
        })}

        {/* ---- the travelling seed ---- */}
        <g className={styles.traveller} style={{ transform: `rotate(${step * 60}deg)` }}>
          <g transform={`translate(${C} ${C - R})`}>
            <circle r="18" fill="url(#sj-glow)" className={styles.travellerGlow} />
            <g className={styles.travellerSpin}>
              <Kernel r={8} />
            </g>
          </g>
        </g>
      </svg>

      <div className={styles.card} aria-live="polite">
        <div className={styles.cardTop}>
          <span className={styles.cardModule}>
            <current.icon size={14} /> {current.module}
          </span>
          <span className={styles.cardLot}>Sample lot · SL-MZ-104 · Maize hybrid</span>
        </div>
        <div key={stage} className={styles.cardBody}>
          <strong>{current.title}</strong>
          <span>{current.detail}</span>
          <em>{current.metric}</em>
        </div>
        <div className={styles.dots}>
          {STAGES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-label={`Show ${s.label}`}
              className={i === stage ? styles.dotActive : i < stage ? styles.dotDone : styles.dot}
              onClick={() => jumpTo(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
