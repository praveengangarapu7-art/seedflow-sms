import { useState, useEffect, useRef } from 'react';
import { Sparkles, Shield, Smartphone } from 'lucide-react';
import styles from './StatsAndDifferentiators.module.css';

// Custom CountUp Component using requestAnimationFrame + Ease-Out Expo curve
interface CountUpProps {
  end: number;
  decimals?: number;
  duration?: number;
  startTrigger: boolean;
}

function CountUp({ end, decimals = 0, duration = 1500, startTrigger }: CountUpProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!startTrigger) return;
    
    let startTime: number | null = null;
    const startVal = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Premium Ease Out Expo curve
      const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      const currentVal = ease * (end - startVal) + startVal;
      
      setValue(currentVal);

      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setValue(end);
      }
    };

    requestAnimationFrame(animate);
  }, [startTrigger, end, duration]);

  return <>{value.toFixed(decimals)}</>;
}

export default function StatsAndDifferentiators() {
  const [startCounting, setStartCounting] = useState(false);
  const [countFinished, setCountFinished] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStartCounting(true);
          observer.unobserve(entry.target); // Count once
        }
      },
      { threshold: 0.15 }
    );

    if (gridRef.current) {
      observer.observe(gridRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!startCounting) return;

    // Sparkle fade in delay after counting finishes
    const timer = setTimeout(() => {
      setCountFinished(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [startCounting]);

  const differentiators = [
    {
      title: 'AI at every layer',
      description: 'From phenotype prediction to optimal sowing windows, AI augments every decision in your seed pipeline.',
      icon: Sparkles,
      isGold: true
    },
    {
      title: 'Built for India\'s regulations',
      description: 'Native support for PPV&FRA variety rules, ICAR standards, DUS testing structures, and diverse Indian agroclimatic zones.',
      icon: Shield,
      isGold: false
    },
    {
      title: 'Mobile-first field operations',
      description: 'Field research and warehouse staff record crop observations offline and sync when connected. Made for low bandwidth rural zones.',
      icon: Smartphone,
      isGold: false
    }
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Animated Statistics Row */}
        <div ref={gridRef} className={styles.statsGrid}>
          {/* Stat 1 */}
          <div className={styles.statCard}>
            <div className={styles.statNumberWrapper}>
              <CountUp end={5} startTrigger={startCounting} />
              <Sparkles 
                size={22} 
                className={`${styles.sparkleIcon} ${countFinished ? styles.sparkleVisible : ''}`} 
              />
            </div>
            <span className={styles.statLabel}>Modules unified in one system</span>
          </div>

          {/* Stat 2 */}
          <div className={styles.statCard}>
            <div className={styles.statNumberWrapper}>
              <CountUp end={40} startTrigger={startCounting} />
              <span>%</span>
              <Sparkles 
                size={22} 
                className={`${styles.sparkleIcon} ${countFinished ? styles.sparkleVisible : ''}`} 
              />
            </div>
            <span className={styles.statLabel}>Average reduction in process cycle time</span>
          </div>

          {/* Stat 3 */}
          <div className={styles.statCard}>
            <div className={styles.statNumberWrapper}>
              <span style={{ fontSize: '0.85em', marginRight: 2 }}>₹</span>
              <CountUp end={12} startTrigger={startCounting} />
              <span style={{ fontSize: '0.65em', alignSelf: 'flex-end', marginBottom: 6, marginLeft: 2 }}>Cr+</span>
              <Sparkles 
                size={22} 
                className={`${styles.sparkleIcon} ${countFinished ? styles.sparkleVisible : ''}`} 
              />
            </div>
            <span className={styles.statLabel}>Grower savings tracked annually</span>
          </div>

          {/* Stat 4 */}
          <div className={styles.statCard}>
            <div className={styles.statNumberWrapper}>
              <CountUp end={99.8} decimals={1} startTrigger={startCounting} />
              <span>%</span>
              <Sparkles 
                size={22} 
                className={`${styles.sparkleIcon} ${countFinished ? styles.sparkleVisible : ''}`} 
              />
            </div>
            <span className={styles.statLabel}>Traceability accuracy achieved across lots</span>
          </div>
        </div>

        {/* Dynamic Differentiators Column Grid */}
        <div className={styles.diffGrid}>
          {differentiators.map((diff, index) => {
            const Icon = diff.icon;
            return (
              <div 
                key={diff.title} 
                className={`${styles.diffCard} ${styles.reveal}`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                {/* Visual Icon */}
                <div className={`${styles.diffIconWrapper} ${diff.isGold ? styles.diffIconWrapperGold : ''}`}>
                  <Icon size={24} strokeWidth={2.2} />
                </div>

                {/* Card labels */}
                <h3 className={styles.diffTitle}>{diff.title}</h3>
                <p className={styles.diffDesc}>{diff.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
export { StatsAndDifferentiators };
