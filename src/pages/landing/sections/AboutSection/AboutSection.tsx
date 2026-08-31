import { Brain, ShieldCheck, Award, BarChart3 } from 'lucide-react';
import styles from './AboutSection.module.css';

export default function AboutSection() {
  return (
    <section id="about" className={styles.section}>
      <div className={styles.container}>
        
        {/* Section Header */}
        <div className={styles.header}>
          <span className={styles.label}>About SeedSphere</span>
          <h2 className={styles.title}>Quality assured seeds, traceable from breeding to market.</h2>
          <p className={styles.subtitle}>
            SeedSphere is Qmics' AI-enabled seed quality and compliance platform for the complete seed lifecycle — from variety registration and breeder seed planning to field inspection, processing, testing, certification, warehouse dispatch, and retail traceability.
          </p>
        </div>

        {/* Two Column Showcase (60/40) */}
        <div className={styles.grid}>
          
          {/* Left Column Feature Showcase */}
          <div className={styles.narrative}>
            
            {/* Top Branding Block */}
            <div className={`${styles.brandingBlock} reveal`} style={{ transitionDelay: '0ms' }}>
              <div className={styles.brandingHeader}>
                <span className={styles.brandQmics}>Qmics</span>
                <span className={styles.brandSphere}>SeedSphere</span>
              </div>
              <p className={styles.brandingTagline}>
                Built by Qmics for the future of Indian agriculture.
              </p>
            </div>

            {/* Feature 1: AI-Driven Intelligence */}
            <div className={`${styles.featureItem} reveal`} style={{ transitionDelay: '100ms' }}>
              <div className={styles.iconContainer}>
                <Brain size={20} strokeWidth={2.2} />
              </div>
              <div className={styles.itemContent}>
                <h4 className={styles.itemTitle}>AI-Driven Intelligence</h4>
                <p className={styles.itemDesc}>
                  Leverages computer vision, predictive analytics, and AI scoring to detect disease risk, estimate yield, forecast demand, and reduce quality failures before they escalate.
                </p>
              </div>
            </div>

            {/* Feature 2: End-to-End Traceability */}
            <div className={`${styles.featureItem} reveal`} style={{ transitionDelay: '200ms' }}>
              <div className={styles.iconContainer}>
                <ShieldCheck size={20} strokeWidth={2.2} />
              </div>
              <div className={styles.itemContent}>
                <h4 className={styles.itemTitle}>End-to-End Traceability</h4>
                <p className={styles.itemDesc}>
                  From breeder seed and contract grower field records to certification, storage, dealer movement, and final QR verification — every lot is digitally traced end-to-end.
                </p>
              </div>
            </div>

            {/* Feature 3: Quality You Can Trust */}
            <div className={`${styles.featureItem} reveal`} style={{ transitionDelay: '300ms' }}>
              <div className={styles.iconContainer}>
                <Award size={20} strokeWidth={2.2} />
              </div>
              <div className={styles.itemContent}>
                <h4 className={styles.itemTitle}>Quality You Can Trust</h4>
                <p className={styles.itemDesc}>
                  Integrated lab testing, field inspection validation, and digital certification workflows ensure only compliant and quality-verified seeds reach the market.
                </p>
              </div>
            </div>

            {/* Feature 4: Data That Drives Decisions */}
            <div className={`${styles.featureItem} reveal`} style={{ transitionDelay: '400ms' }}>
              <div className={styles.iconContainer}>
                <BarChart3 size={20} strokeWidth={2.2} />
              </div>
              <div className={styles.itemContent}>
                <h4 className={styles.itemTitle}>Data That Drives Decisions</h4>
                <p className={styles.itemDesc}>
                  Actionable intelligence across production planning, inspection outcomes, lab performance, inventory health, and sales to improve compliance, quality, and decision-making.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column SVG Animated Scanner */}
          <div className={styles.visualContainer}>
            <div className={styles.svgWrapper}>
              <svg 
                viewBox="0 0 400 500" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ overflow: 'visible', width: '100%', height: 'auto' }}
              >
                <defs>
                  {/* Subtle breathing radial glow backing */}
                  <radialGradient id="phoneGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                  </radialGradient>

                  {/* Gold Laser Sweep Gradient */}
                  <linearGradient id="scanLaserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--color-warning)" stopOpacity="0" />
                    <stop offset="50%" stopColor="var(--color-warning)" stopOpacity="1" />
                    <stop offset="100%" stopColor="var(--color-warning)" stopOpacity="0" />
                  </linearGradient>

                  {/* Seed Packet pouch background */}
                  <linearGradient id="packetBg" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-accent-light)" />
                    <stop offset="100%" stopColor="var(--color-white)" />
                  </linearGradient>
                </defs>

                {/* Soft breathing backing glow */}
                <circle cx="200" cy="250" r="230" fill="url(#phoneGlow)" />

                {/* Drifting ambient particles */}
                <circle cx="50" cy="80" r="3.5" className={`${styles.driftingDot} ${styles.dot1}`} />
                <circle cx="340" cy="110" r="4.5" className={`${styles.driftingDot} ${styles.dot2}`} />
                <circle cx="60" cy="420" r="3" className={`${styles.driftingDot} ${styles.dot3}`} />

                {/* Phone device mockup frame */}
                <rect 
                  x="20" 
                  y="10" 
                  width="360" 
                  height="480" 
                  rx="24" 
                  fill="rgba(255, 255, 255, 0.95)" 
                  stroke="var(--color-primary)" 
                  strokeWidth="6" 
                  style={{ filter: 'drop-shadow(0 20px 40px rgba(14, 84, 103, 0.15))' }}
                />

                {/* Speaker grill and camera layout */}
                <rect x="160" y="24" width="80" height="5" rx="2.5" fill="var(--color-primary)" opacity="0.8" />
                <circle cx="255" cy="26.5" r="4" fill="var(--color-primary)" opacity="0.8" />

                {/* Top Mockup Header Bar */}
                <rect x="26" y="44" width="348" height="36" fill="var(--color-accent-light)" />
                <text x="44" y="66" fill="var(--color-primary)" fontSize="13" fontWeight="800" letterSpacing="0.5">SeedSphere · Verify</text>
                <circle cx="344" cy="62" r="5" fill="var(--color-success)" />

                {/* Interactive Inner Area */}
                
                {/* 1. Stylized seed packet pouch illustration */}
                <g transform="translate(60, 100)">
                  {/* Packet base shape */}
                  <rect x="20" y="10" width="240" height="240" rx="14" fill="url(#packetBg)" stroke="rgba(14, 84, 103, 0.15)" strokeWidth="2" />
                  
                  {/* Deco seed shapes inside label */}
                  <path d="M140,55 C120,80 120,105 140,115 C160,105 160,80 140,55 Z" fill="var(--color-primary)" opacity="0.08" />
                  <path d="M110,65 C95,85 95,105 110,113 C125,105 125,85 110,65 Z" fill="var(--color-warning)" opacity="0.06" transform="rotate(-15 110 90)" />

                  {/* Seed package lines */}
                  <rect x="40" y="32" width="160" height="12" rx="4" fill="var(--color-primary)" opacity="0.12" />
                  <rect x="40" y="52" width="100" height="8" rx="3" fill="var(--color-primary)" opacity="0.08" />

                  {/* Stylized QR Code positioning */}
                  <g transform="translate(80, 90)">
                    {/* QR backdrop */}
                    <rect x="0" y="0" width="80" height="80" rx="8" fill="var(--color-white)" stroke="var(--color-primary)" strokeWidth="1.5" />
                    
                    {/* QR Corner Anchor Boxes (standard QR design) */}
                    <rect x="8" y="8" width="18" height="18" fill="var(--color-primary)" />
                    <rect x="12" y="12" width="10" height="10" fill="var(--color-white)" />
                    <rect x="14" y="14" width="6" height="6" fill="var(--color-primary)" />

                    <rect x="54" y="8" width="18" height="18" fill="var(--color-primary)" />
                    <rect x="58" y="12" width="10" height="10" fill="var(--color-white)" />
                    <rect x="60" y="14" width="6" height="6" fill="var(--color-primary)" />

                    <rect x="8" y="54" width="18" height="18" fill="var(--color-primary)" />
                    <rect x="12" y="58" width="10" height="10" fill="var(--color-white)" />
                    <rect x="14" y="60" width="6" height="6" fill="var(--color-primary)" />

                    {/* Faux small grid dots (Randomly placed to look like a scanned QR code) */}
                    <rect x="32" y="8" width="6" height="6" fill="var(--color-primary)" />
                    <rect x="42" y="14" width="6" height="6" fill="var(--color-primary)" />
                    <rect x="32" y="24" width="12" height="6" fill="var(--color-primary)" />
                    <rect x="8" y="32" width="6" height="12" fill="var(--color-primary)" />
                    <rect x="20" y="42" width="6" height="6" fill="var(--color-primary)" />
                    <rect x="32" y="42" width="6" height="6" fill="var(--color-primary)" />
                    <rect x="42" y="32" width="6" height="6" fill="var(--color-primary)" />
                    
                    <rect x="54" y="32" width="6" height="12" fill="var(--color-primary)" />
                    <rect x="54" y="54" width="12" height="6" fill="var(--color-primary)" />
                    <rect x="42" y="54" width="6" height="6" fill="var(--color-primary)" />
                    <rect x="32" y="60" width="18" height="6" fill="var(--color-primary)" />
                    <rect x="60" y="64" width="12" height="8" fill="var(--color-primary)" />
                  </g>
                </g>

                {/* 2. Gold Animated laser scanner sweeps (constrained over QR bounds) */}
                <g transform="translate(130, 180)">
                  <rect 
                    x="0" 
                    y="0" 
                    width="140" 
                    height="4" 
                    fill="url(#scanLaserGrad)" 
                    className={styles.scanLaser} 
                  />
                </g>

                {/* 3. Verified panel looping overlay */}
                <g className={styles.verifiedBadgePanel}>
                  {/* Verified background card */}
                  <rect
                    x="36"
                    y="340"
                    width="328"
                    height="134"
                    rx="12"
                    fill="var(--color-white)"
                    stroke="var(--color-border-light)"
                    strokeWidth="1.5"
                    style={{ filter: 'drop-shadow(0 6px 15px rgba(46, 139, 92, 0.12))' }}
                  />

                  {/* Header Status row */}
                  <rect x="48" y="352" width="304" height="28" rx="6" fill="#E2F3EB" />
                  
                  {/* Green checkmark */}
                  <circle cx="64" cy="366" r="8" fill="var(--color-success)" />
                  <path d="M60.5,366 L63,368.5 L67.5,363.5" fill="none" stroke="var(--color-white)" strokeWidth="2" strokeLinecap="round" />
                  
                  <text x="80" y="371" fill="var(--color-success)" fontSize="11" fontWeight="800" letterSpacing="0.3">VERIFIED SEED LOT · BATCH-2026-1142</text>

                  {/* Info items list (staggered list item renders) */}
                  <g className={styles.staggerLi1}>
                    <circle cx="56" cy="398" r="3" fill="var(--color-primary)" />
                    <text x="68" y="402" fill="var(--color-text-primary)" fontSize="11.5" fontWeight="700">Source: Wagad Farms, Gujarat (ID: F-884)</text>
                  </g>

                  <g className={styles.staggerLi2}>
                    <circle cx="56" cy="418" r="3" fill="var(--color-primary)" />
                    <text x="68" y="422" fill="var(--color-text-primary)" fontSize="11.5" fontWeight="700">Tests: Germination 92.4% · Purity 99.1% · Vigor High</text>
                  </g>

                  <g className={styles.staggerLi3}>
                    <circle cx="56" cy="438" r="3" fill="var(--color-primary)" />
                    <text x="68" y="442" fill="var(--color-text-secondary)" fontSize="11.5" fontWeight="600">ICAR Certified · Lab QC Cleared 14 May 2026</text>
                  </g>
                </g>
              </svg>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
export { AboutSection };
