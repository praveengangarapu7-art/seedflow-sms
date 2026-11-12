import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FlaskConical, PackageCheck, ScanLine, Sprout, Truck, Warehouse } from 'lucide-react';
import styles from './SeedBand.module.css';

/**
 * The band under the hero: a scrolling feed of what happens to seed lots
 * inside SeedSphere, a strip of the seed crops it is built for, and
 * count-up numbers describing the platform itself.
 */

const EVENTS = [
  { icon: FlaskConical, text: 'SL-MZ-104 · Maize hybrid · Germination 92%', tag: 'Certified' },
  { icon: Sprout, text: 'Paddy MTU 1010 · Field inspection · Isolation verified', tag: 'Passed' },
  { icon: ScanLine, text: 'Bt Cotton · GOT genetic purity 99.1%', tag: 'Released' },
  { icon: PackageCheck, text: 'Soybean JS 20-34 · 2,400 bags QR-labelled', tag: 'Packed' },
  { icon: Warehouse, text: 'Wheat HD 2967 · Godown 6 · Validity 270 days', tag: 'Stored' },
  { icon: Truck, text: 'Bajra hybrid · 18 dealers · Nagpur region', tag: 'Dispatched' },
  { icon: CheckCircle2, text: 'Tomato F1 · Seed treatment recipe applied', tag: 'Treated' },
];

const CROPS: { name: string; kind: 'maize' | 'grain' | 'round' | 'cotton' | 'oil' }[] = [
  { name: 'Hybrid maize', kind: 'maize' },
  { name: 'Paddy', kind: 'grain' },
  { name: 'Cotton', kind: 'cotton' },
  { name: 'Soybean', kind: 'round' },
  { name: 'Wheat', kind: 'grain' },
  { name: 'Bajra', kind: 'round' },
  { name: 'Sunflower', kind: 'oil' },
  { name: 'Mustard', kind: 'round' },
  { name: 'Groundnut', kind: 'oil' },
  { name: 'Pulses', kind: 'round' },
  { name: 'Tomato', kind: 'round' },
  { name: 'Chilli', kind: 'oil' },
  { name: 'Okra', kind: 'round' },
];

function CropGlyph({ kind }: { kind: (typeof CROPS)[number]['kind'] }) {
  switch (kind) {
    case 'maize':
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 18 C17 13 17 4 13.5 2.6 Q10 1.4 6.5 2.6 C3 4 3 13 10 18 Z" fill="#E3A92B" />
          <ellipse cx="10" cy="9.6" rx="2.4" ry="4" fill="#F7DD97" />
        </svg>
      );
    case 'grain':
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <ellipse cx="10" cy="10" rx="3.6" ry="8" fill="#C79A4E" transform="rotate(25 10 10)" />
          <path d="M6.6 3 L13.4 17" stroke="#8A6324" strokeWidth="0.9" />
        </svg>
      );
    case 'cotton':
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="7" cy="9" r="4.4" fill="#F4F1EA" stroke="#D9D2C2" />
          <circle cx="13" cy="9" r="4.4" fill="#F4F1EA" stroke="#D9D2C2" />
          <circle cx="10" cy="13" r="4.4" fill="#FBF9F4" stroke="#D9D2C2" />
        </svg>
      );
    case 'oil':
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 1.5 C15 5 14 14 10 18.5 C6 14 5 5 10 1.5 Z" fill="#2E2B2A" />
          <path d="M8.6 4 L8 16 M10 3 L10 17 M11.4 4 L12 16" stroke="#EDE7DA" strokeWidth="0.7" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <ellipse cx="10" cy="10" rx="7" ry="6" fill="#E6CF8E" />
          <ellipse cx="12.6" cy="10" rx="1" ry="2.2" fill="#8A6A2E" />
        </svg>
      );
  }
}

const STATS = [
  { value: 8, suffix: '', label: 'Integrated modules', sub: 'R&D to dispatch' },
  { value: 6, suffix: '', label: 'Lifecycle stages', sub: 'one seed-lot ID across all' },
  { value: 22, suffix: '', label: 'Role-based workspaces', sub: 'from field inspector to plant head' },
  { value: 100, suffix: '%', label: 'Lot-level traceability', sub: 'packet back to farm and lab' },
];

function CountUp({ to, suffix, start }: { to: number; suffix: string; start: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setN(to);
      return;
    }
    const t0 = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, to]);
  return (
    <>
      {n}
      {suffix}
    </>
  );
}

export default function SeedBand() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className={styles.band} aria-label="SeedSphere for the seed industry">
      <div className={styles.feed}>
        <span className={styles.feedLabel}>
          <span className={styles.liveDot} /> Seed lots in motion
        </span>
        <div className={styles.marquee}>
          <div className={styles.track}>
            {[...EVENTS, ...EVENTS].map((e, i) => {
              const Icon = e.icon;
              return (
                <span key={i} className={styles.event} aria-hidden={i >= EVENTS.length}>
                  <Icon size={15} />
                  {e.text}
                  <b>{e.tag}</b>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.crops}>
        <div className={`${styles.track} ${styles.trackReverse}`}>
          {[...CROPS, ...CROPS].map((c, i) => (
            <span key={i} className={styles.crop} aria-hidden={i >= CROPS.length}>
              <CropGlyph kind={c.kind} />
              {c.name}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.stats} ref={statsRef}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.statValue}>
              <CountUp to={s.value} suffix={s.suffix} start={seen} />
            </span>
            <span className={styles.statLabel}>{s.label}</span>
            <span className={styles.statSub}>{s.sub}</span>
          </div>
        ))}
      </div>
      <p className={styles.note}>Lot activity shown is sample data.</p>
    </section>
  );
}
