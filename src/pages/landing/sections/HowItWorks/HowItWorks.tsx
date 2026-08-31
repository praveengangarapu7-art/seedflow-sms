import { useState, useEffect, useRef } from 'react';
import { QrCode, RotateCcw } from 'lucide-react';
import styles from './HowItWorks.module.css';

interface Step {
  number: number;
  label: string;
  sub: string;
  x: number;
  y: number;
  cardPos: { left: string; top: string };
  svgIcon: React.ReactNode;
}

export default function HowItWorks() {
  const [progress, setProgress] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<any>(null);

  const steps: Step[] = [
    {
      number: 1,
      label: 'Variety registration',
      sub: 'Master variety, breeder, and seed identity setup.',
      x: 50,
      y: 125,
      cardPos: { left: 'calc(5% - 30px)', top: '165px' },
      svgIcon: (
        <>
          <path d="M-10,6 L10,6 M-4,6 C-4,0 4,0 4,6 M-2,2 C-2,-3 -6,-5 -8,-5 M2,2 C2,-3 6,-5 8,-5" fill="none" strokeWidth="2" strokeLinecap="round" />
        </>
      )
    },
    {
      number: 2,
      label: 'Seed production planning',
      sub: 'Seasonal targets, allocation, forecasting, and budgets.',
      x: 200,
      y: 75,
      cardPos: { left: 'calc(20% - 110px)', top: '-40px' },
      svgIcon: (
        <>
          <rect x="-8" y="-10" width="16" height="20" rx="2" fill="none" strokeWidth="1.8" />
          <line x1="-4" y1="-4" x2="4" y2="-4" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="-4" y1="1" x2="2" y2="1" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="-4" y1="5" x2="3" y2="5" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )
    },
    {
      number: 3,
      label: 'Farmer registration',
      sub: 'KYC, land details, GPS plot mapping, and grower approval.',
      x: 350,
      y: 175,
      cardPos: { left: 'calc(35% - 110px)', top: '215px' },
      svgIcon: (
        <>
          <path d="M-10,6 L-10,-2 L0,-9 L10,-2 L10,6 Z" fill="none" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="-4" y="0" width="8" height="6" fill="none" strokeWidth="1.5" />
        </>
      )
    },
    {
      number: 4,
      label: 'Field monitoring',
      sub: 'GIS validation, crop lifecycle tracking, and AI crop health alerts.',
      x: 500,
      y: 75,
      cardPos: { left: 'calc(50% - 110px)', top: '-40px' },
      svgIcon: (
        <>
          <path d="M-3,-9 L3,-9 M-1.5,-9 L-1.5,-3 L-8,7 L8,7 L1.5,-3 L1.5,-9" fill="none" strokeWidth="1.8" strokeLinejoin="round" />
        </>
      )
    },
    {
      number: 5,
      label: 'Inspection & harvest',
      sub: 'Digital field inspections, defect logging, harvest authorization.',
      x: 650,
      y: 175,
      cardPos: { left: 'calc(65% - 110px)', top: '215px' },
      svgIcon: (
        <>
          <circle cx="0" cy="0" r="7" fill="none" strokeWidth="1.8" strokeDasharray="3 2" />
          <circle cx="0" cy="0" r="2" fill="none" strokeWidth="1.5" />
        </>
      )
    },
    {
      number: 6,
      label: 'Processing & lab testing',
      sub: 'Drying, cleaning, grading, QC, germination, purity, and vigor results.',
      x: 800,
      y: 75,
      cardPos: { left: 'calc(80% - 110px)', top: '-40px' },
      svgIcon: (
        <>
          <circle cx="-2" cy="-3" r="4" fill="none" strokeWidth="1.8" />
          <path d="M1,-1 L6,4 M-4,3 L2,3 M-1,3 L-1,8 L4,8" fill="none" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )
    },
    {
      number: 7,
      label: 'Certification & QR tagging',
      sub: 'Approval, digital certificate issuance, batch traceability ID, and QR label print.',
      x: 950,
      y: 125,
      cardPos: { left: 'calc(95% - 190px)', top: '165px' },
      svgIcon: (
        <>
          <rect x="-8" y="-9" width="16" height="18" rx="2" fill="none" strokeWidth="1.8" />
          <rect x="-4" y="-5" width="8" height="8" fill="none" strokeWidth="1.5" />
          <line x1="-3" y1="5" x2="3" y2="5" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )
    }
  ];

  // Helper coordinate lookup to translate seed smoothly across grid segments
  const getSeedCoordinate = (prog: number) => {
    const coords = [
      { x: 50, y: 125 },
      { x: 200, y: 75 },
      { x: 350, y: 175 },
      { x: 500, y: 75 },
      { x: 650, y: 175 },
      { x: 800, y: 75 },
      { x: 950, y: 125 }
    ];

    const segmentLen = 100 / (coords.length - 1); // 16.66% per segment
    const index = Math.floor(prog / segmentLen);

    if (index >= coords.length - 1) {
      return coords[coords.length - 1];
    }

    const c1 = coords[index];
    const c2 = coords[index + 1];

    // Segment progress (0 to 1)
    const t = (prog - index * segmentLen) / segmentLen;
    // Cubic ease interpolation for smooth Y transition curve
    const easeT = t * t * (3 - 2 * t);

    const x = c1.x + (c2.x - c1.x) * t;
    const y = c1.y + (c2.y - c1.y) * easeT;

    return { x, y };
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.unobserve(entry.target); // observe once
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const runJourney = () => {
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);

    let curr = 0;
    // 12 seconds total duration -> 100 steps in 12000ms -> 120ms per step
    intervalRef.current = setInterval(() => {
      curr += 0.8;
      if (curr >= 100) {
        curr = 100;
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      setProgress(curr);
    }, 96);
  };

  useEffect(() => {
    if (isIntersecting) {
      runJourney();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isIntersecting]);

  const handleReplay = (e: React.MouseEvent) => {
    e.preventDefault();
    runJourney();
  };

  // Compute live coordinates
  const { x: seedX, y: seedY } = getSeedCoordinate(progress);

  // SVG paths
  const pathD = "M 50,125 C 125,125 125,75 200,75 C 275,75 275,175 350,175 C 425,175 425,75 500,75 C 575,75 575,175 650,175 C 725,175 725,75 800,75 C 875,75 875,125 950,125";
  const pathTotalLength = 1200; // estimated
  const strokeDashoffset = pathTotalLength - (progress / 100) * pathTotalLength;

  return (
    <section ref={sectionRef} id="how-it-works" className={styles.section}>
      <div className={styles.container}>
        
        {/* Section Header */}
        <div className={styles.header}>
          <span className={styles.label}>The Seed Journey</span>
          <h2 className={styles.title}>Follow a seed through SeedSphere.</h2>
          <p className={styles.subtitle}>
            Watch how a single seed lot flows from variety registration and field planning to inspection, processing, quality testing, digital certification, and final retail traceability.
          </p>
        </div>

        {/* Journey Doodle Board */}
        <div className={styles.journeyBoard}>
          
          {/* Desktop view containing the smooth horizontal curves */}
          <div className={styles.desktopWrapper}>
            <div style={{ position: 'relative', width: '1000px', margin: '0 auto' }}>
              <svg className={styles.svgTimeline}>
                {/* Winding gray background path */}
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke="rgba(14, 84, 103, 0.08)" 
                  strokeWidth="2.5" 
                  strokeDasharray="6 6" 
                />

                {/* Winding animated progressive drawing path */}
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke="var(--color-primary)" 
                  strokeWidth="3" 
                  strokeDasharray={pathTotalLength} 
                  strokeDashoffset={strokeDashoffset} 
                  style={{ transition: 'stroke-dashoffset 100ms linear' }}
                />

                {/* 7 Stage Nodes */}
                {steps.map((step) => {
                  const segmentSize = 100 / (steps.length - 1);
                  const isNodeActive = progress >= (step.number - 1) * segmentSize;
                  const isNodePast = progress === 100 || progress > step.number * segmentSize;
                  
                  return (
                    <g 
                      key={step.number} 
                      className={`${styles.stageNode} ${isNodeActive ? styles.stageActive : ''} ${isNodePast ? styles.stagePast : ''}`}
                    >
                      {/* Outer pulse backing */}
                      {isNodeActive && !isNodePast && (
                        <circle cx={step.number === 4 ? 500 : step.x} cy={step.y} r="32" className={styles.pulseCircle} />
                      )}
                      {/* Node back circle */}
                      <circle cx={step.number === 4 ? 500 : step.x} cy={step.y} r="24" className={styles.stageBackCircle} />
                      {/* Custom SVGs */}
                      <g 
                        className={styles.stageIcon}
                        transform={`translate(${step.number === 4 ? 500 : step.x}, ${step.y})${isNodeActive && !isNodePast ? ' scale(1.1)' : ''}`}
                      >
                        {step.svgIcon}
                      </g>
                    </g>
                  );
                })}

                {/* Bouncing Traveling Seed Character Doodle */}
                {progress > 0 && progress < 100 && (
                  <g transform={`translate(${seedX}, ${seedY})`} className={styles.travelingSeed}>
                    <g className={styles.seedBounce}>
                      {/* Stylized premium seed kernel / grain */}
                      <path d="M0,-14 C-7,-10 -9,0 -6,7 C-3,13 0,15 0,15 C0,15 3,13 6,7 C9,0 7,-10 0,-14 Z" className={styles.seedBody} />
                      <path d="M0,-9 L0,11" className={styles.seedSpine} />
                      <path d="M0,-8 Q4,-3 0,2" className={styles.seedAccent} />
                    </g>
                  </g>
                )}
              </svg>

              {/* Absolutely positioned Info Cards floating dynamically above/below nodes */}
              {steps.map((step) => {
                const segmentSize = 100 / (steps.length - 1);
                const isCardVisible = progress >= (step.number - 1) * segmentSize;
                
                return (
                  <div 
                    key={`card-${step.number}`}
                    className={`${styles.infoCard} ${isCardVisible ? styles.infoCardVisible : ''}`}
                    style={{ left: step.cardPos.left, top: step.cardPos.top }}
                  >
                    <h4 className={styles.infoTitle}>{step.label}</h4>
                    <p className={styles.infoSub}>{step.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile view containing stacked timeline list */}
          <div className={styles.mobileWrapper}>
            <div className={styles.mobileLine}>
              <div 
                className={styles.mobileProgressBeam} 
                style={{ height: `${progress}%` }}
              />
            </div>

            {steps.map((step) => {
              const segmentSize = 100 / (steps.length - 1);
              const isNodeActive = progress >= (step.number - 1) * segmentSize;
              const isNodePast = progress === 100 || progress > step.number * segmentSize;

              let mobileClass = '';
              if (isNodeActive) mobileClass = styles.mobileNodeActive;
              if (isNodePast) mobileClass = styles.mobileNodePast;

              return (
                <div key={`mob-${step.number}`} className={`${styles.mobileNode} ${mobileClass}`}>
                  <div className={styles.mobileBadge}>{step.number}</div>
                  <div className={styles.mobileCard}>
                    <h4 className={styles.mobileTitle}>{step.label}</h4>
                    <p className={styles.mobileDesc}>{step.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Replay action */}
        <div className={styles.controlsRow}>
          <a href="#" onClick={handleReplay} className={styles.replayLink}>
            <RotateCcw size={16} /> Replay seed journey
          </a>
        </div>

        {/* QR Trust Callout Card */}
        <div className={`${styles.trustCard} reveal`}>
          <div className={styles.trustIconBox}>
            <QrCode size={28} strokeWidth={2.2} />
          </div>
          <div className={styles.trustContent}>
            <h3 className={styles.trustTitle}>The QR code is the proof.</h3>
            <p className={styles.trustBody}>
              Every step you just watched is permanently linked to the QR code printed on the seed packet. A farmer in the field can scan it, see the lot's lab results, and verify what they're planting — closing the loop between seed company and end user.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
export { HowItWorks };
