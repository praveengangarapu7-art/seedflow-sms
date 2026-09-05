import { useState } from 'react';
import { 
  FlaskConical, 
  ShoppingCart, 
  Warehouse, 
  Cog, 
  Microscope, 
  ShieldCheck,
  Check, 
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import styles from './ModulesShowcase.module.css';

interface ModuleData {
  id: string;
  title: string;
  tagline: string;
  icon: React.ComponentType<any>;
  isFlagship?: boolean;
  isCog?: boolean;
  bullets: string[];
  linkText: string;
  visualSvg: React.ReactNode;
}

export default function ModulesShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  // Derived from the module list below rather than hardcoded, so adding a
  // module can never leave the arrows wrapping at the wrong index.
  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % modules.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + modules.length) % modules.length);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const handleScrollToTimeline = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetElement = document.getElementById('how-it-works');
    if (targetElement) {
      const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - 72;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const modules: ModuleData[] = [
    {
      id: 'procurement',
      title: 'Procurement',
      tagline: 'Source smarter. Pay confidently. Build supplier trust.',
      icon: ShoppingCart,
      bullets: [
        'Multi-supplier RFQs with side-by-side quote comparison',
        'Purchase orders with approval workflows and budget controls',
        'Goods receipt notes with batch-level inspection logs',
        'Invoice three-way matching to prevent overpayment'
      ],
      linkText: 'Explore procurement workflow',
      visualSvg: (
        <svg viewBox="0 0 200 150" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {/* Card background mockups */}
          <rect x="10" y="20" width="140" height="42" rx="6" fill="var(--color-white)" stroke="var(--color-border-light)" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 4px 10px rgba(14, 84, 103, 0.04))' }} />
          <text x="20" y="38" fill="var(--color-primary)" fontSize="9" fontWeight="800">PO-2026-045</text>
          <text x="20" y="50" fill="var(--color-text-secondary)" fontSize="7" fontWeight="600">Wagad Farms · Foundation Seeds</text>
          
          <rect x="50" y="70" width="140" height="42" rx="6" fill="var(--color-white)" stroke="var(--color-border-light)" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 4px 10px rgba(14, 84, 103, 0.04))' }} />
          <text x="60" y="88" fill="var(--color-primary)" fontSize="9" fontWeight="800">RFQ-2026-018</text>
          <text x="60" y="100" fill="var(--color-text-secondary)" fontSize="7" fontWeight="600">Compare: 3 Grower Quotes</text>
          
          {/* Green checkmark indicator */}
          <circle cx="165" cy="91" r="9" fill="var(--color-success)" />
          <path d="M161.5,91 L164,93.5 L168.5,88.5" fill="none" stroke="var(--color-white)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    },
    {
      id: 'warehouse',
      title: 'Warehouse',
      tagline: 'Inventory visibility, end to end.',
      icon: Warehouse,
      bullets: [
        'Real-time stock levels across multiple warehouses and zones',
        'IoT-based temperature and humidity monitoring for seed integrity',
        'Cycle counting with mobile barcode scanning',
        'Smart location assignment based on lot age and rotation rules'
      ],
      linkText: 'Explore warehouse workflow',
      visualSvg: (
        <svg viewBox="0 0 200 150" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {/* Storage map cells grid */}
          <rect x="20" y="15" width="40" height="32" rx="4" fill="var(--color-white)" stroke="var(--color-border-light)" strokeWidth="1.5" />
          <rect x="25" y="21" width="30" height="6" fill="var(--color-primary)" opacity="0.1" />
          <rect x="25" y="31" width="18" height="6" fill="var(--color-primary)" opacity="0.1" />

          <rect x="70" y="15" width="40" height="32" rx="4" fill="var(--color-white)" stroke="var(--color-border-light)" strokeWidth="1.5" />
          <rect x="75" y="21" width="30" height="6" fill="var(--color-primary)" opacity="0.1" />
          <rect x="75" y="31" width="22" height="6" fill="var(--color-warning)" opacity="0.3" />

          <rect x="120" y="15" width="40" height="32" rx="4" fill="var(--color-white)" stroke="var(--color-border-light)" strokeWidth="1.5" />
          <rect x="125" y="21" width="20" height="6" fill="var(--color-primary)" opacity="0.1" />
          
          <rect x="20" y="58" width="40" height="32" rx="4" fill="var(--color-white)" stroke="var(--color-border-light)" strokeWidth="1.5" />
          <rect x="70" y="58" width="40" height="32" rx="4" fill="var(--color-white)" stroke="var(--color-primary)" strokeWidth="1.5" />
          <rect x="75" y="64" width="30" height="6" fill="var(--color-primary)" opacity="0.8" />
          <rect x="75" y="74" width="24" height="6" fill="var(--color-primary)" opacity="0.6" />

          <rect x="120" y="58" width="40" height="32" rx="4" fill="var(--color-white)" stroke="var(--color-border-light)" strokeWidth="1.5" />

          {/* IoT Pulsing Checkpoint Dots */}
          <circle cx="90" cy="74" r="5" className={styles.pulsingDot} style={{ transformOrigin: '90px 74px' }} />
          <circle cx="90" cy="31" r="5" className={styles.pulsingDot} style={{ animationDelay: '500ms', transformOrigin: '90px 31px' }} />
        </svg>
      )
    },
    {
      id: 'rd',
      title: 'R&D',
      tagline: 'Germplasm to released variety, in one platform.',
      icon: FlaskConical,
      isFlagship: true,
      bullets: [
        'Germplasm catalog with pedigree tracking and trait management',
        'Multi-location trials (MLT) with statistical analysis and G×E interaction',
        'AI-powered phenotyping from images, drone imagery, and IoT sensors',
        'Variety registration with DUS testing and IP filing tracking'
      ],
      linkText: 'Explore breeding workflow',
      visualSvg: (
        <svg viewBox="0 0 200 150" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {/* India trail markers representation */}
          <path d="M50,110 C35,100 25,75 35,50 C45,30 65,20 85,32 C105,45 105,75 85,95 Z" fill="none" stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
          
          {/* Funnel Pedigree mockup */}
          <polygon points="120,30 180,30 170,55 130,55" fill="var(--color-primary)" opacity="0.1" />
          <polygon points="130,58 170,58 162,78 138,78" fill="var(--color-primary)" opacity="0.2" />
          <polygon points="138,81 162,81 156,98 144,98" fill="var(--color-warning)" opacity="0.8" />
          <rect x="144" y="101" width="12" height="15" fill="var(--color-primary)" />

          {/* Markers */}
          <circle cx="48" cy="72" r="3" fill="var(--color-warning)" />
          <circle cx="68" cy="48" r="3" fill="var(--color-primary)" />
          <circle cx="76" cy="84" r="3" fill="var(--color-warning)" />
        </svg>
      )
    },
    {
      id: 'processing',
      title: 'Processing',
      tagline: 'From raw seed to finished lot, with full audit trail.',
      icon: Cog,
      bullets: [
        'Raw seed intake with farmer/field traceability',
        'Cleaning, drying, grading workflows with quality checkpoints',
        'Treatment recipe management (fungicide, insecticide protocols)',
        'Packaging with automatic QR code generation per lot'
      ],
      linkText: 'Explore processing workflow',
      visualSvg: (
        <svg viewBox="0 0 240 150" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {/* Dashed connecting flow beam */}
          <path d="M20,75 L220,75" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" className={styles.flowingLine} />

          {/* Process nodes (Intake -> Cleaning -> Drying -> Treating -> Packing) */}
          <circle cx="30" cy="75" r="14" fill="var(--color-white)" stroke="var(--color-primary)" strokeWidth="2" />
          <text x="30" y="102" fill="var(--color-text-secondary)" fontSize="7.5" fontWeight="800" textAnchor="middle">Intake</text>
          
          <circle cx="75" cy="75" r="14" fill="var(--color-white)" stroke="var(--color-primary)" strokeWidth="2" />
          <text x="75" y="102" fill="var(--color-text-secondary)" fontSize="7.5" fontWeight="800" textAnchor="middle">Clean</text>
          
          <circle cx="120" cy="75" r="14" fill="var(--color-white)" stroke="var(--color-primary)" strokeWidth="2" />
          <text x="120" y="102" fill="var(--color-text-secondary)" fontSize="7.5" fontWeight="800" textAnchor="middle">Dry</text>
          
          <circle cx="165" cy="75" r="14" fill="var(--color-white)" stroke="var(--color-primary)" strokeWidth="2" />
          <text x="165" y="102" fill="var(--color-text-secondary)" fontSize="7.5" fontWeight="800" textAnchor="middle">Treat</text>
          
          {/* Packaging Node with spinning cog */}
          <circle cx="210" cy="75" r="16" fill="var(--color-white)" stroke="var(--color-warning)" strokeWidth="2.5" />
          <text x="210" y="105" fill="var(--color-primary)" fontSize="7.5" fontWeight="850" textAnchor="middle">Pack (QR)</text>
          
          {/* Mini spinning cog outline */}
          <g transform="translate(210, 75)" className={styles.spinningGear}>
            <circle cx="0" cy="0" r="6" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" strokeDasharray="3 2" />
          </g>
        </svg>
      )
    },
    {
      id: 'laboratory',
      title: 'Laboratory',
      tagline: 'Quality testing at every stage of the seed journey.',
      icon: Microscope,
      bullets: [
        'Sample management with barcode-linked test workflows',
        'Germination, physical purity, moisture, and vigor tests',
        'Certifications (ICAR, ISTA standards) with digital seal generation',
        'Quality holds and rejection workflows linked directly to processing'
      ],
      linkText: 'Explore laboratory workflow',
      visualSvg: (
        <svg viewBox="0 0 200 150" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {/* Quality clipboard sheet */}
          <rect x="40" y="15" width="120" height="120" rx="8" fill="var(--color-white)" stroke="var(--color-border-light)" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 6px 15px rgba(14, 84, 103, 0.05))' }} />
          <rect x="85" y="10" width="30" height="10" rx="2" fill="var(--color-primary)" />
          
          {/* Clipboard sheets lines */}
          <rect x="52" y="32" width="70" height="8" rx="2.5" fill="var(--color-primary)" opacity="0.8" />
          
          {/* Checked tests lists */}
          <g transform="translate(52, 54)">
            <circle cx="6" cy="6" r="6" fill="var(--color-success)" />
            <path d="M3.5,6 L5,7.5 L8.5,4" fill="none" stroke="var(--color-white)" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="20" y="3" width="70" height="6" rx="2" fill="var(--color-text-secondary)" opacity="0.25" />
          </g>

          <g transform="translate(52, 74)">
            <circle cx="6" cy="6" r="6" fill="var(--color-success)" />
            <path d="M3.5,6 L5,7.5 L8.5,4" fill="none" stroke="var(--color-white)" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="20" y="3" width="55" height="6" rx="2" fill="var(--color-text-secondary)" opacity="0.25" />
          </g>

          <g transform="translate(52, 94)">
            <circle cx="6" cy="6" r="6" fill="var(--color-success)" />
            <path d="M3.5,6 L5,7.5 L8.5,4" fill="none" stroke="var(--color-white)" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="20" y="3" width="62" height="6" rx="2" fill="var(--color-text-secondary)" opacity="0.25" />
          </g>
        </svg>
      )
    },
    {
      id: 'administration',
      title: 'Administration',
      tagline: 'One console for accounts, oversight and the audit trail.',
      icon: ShieldCheck,
      bullets: [
        'User accounts and role assignment across every module',
        'Complete audit trail of every change, with before and after state',
        'System health: errors, latency, failed operations and anomalies',
        'Data governance, privacy exports and retention policy control'
      ],
      linkText: 'Explore the admin console',
      visualSvg: (
        <svg viewBox="0 0 200 150" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {/* Console panel */}
          <rect x="30" y="20" width="140" height="110" rx="8" fill="var(--color-white)" stroke="var(--color-border-light)" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 6px 15px rgba(14, 84, 103, 0.05))' }} />
          <rect x="30" y="20" width="140" height="18" rx="8" fill="var(--color-primary)" opacity="0.9" />
          <circle cx="41" cy="29" r="2.5" fill="var(--color-white)" opacity="0.85" />
          <circle cx="50" cy="29" r="2.5" fill="var(--color-white)" opacity="0.55" />

          {/* Shield at the centre — the module's own mark */}
          <path
            d="M100,50 L118,57 L118,76 C118,88 110,96 100,100 C90,96 82,88 82,76 L82,57 Z"
            fill="var(--color-primary)"
            opacity="0.12"
            stroke="var(--color-primary)"
            strokeWidth="1.5"
          />
          <path d="M93,75 L98,80 L108,68" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Audit-trail rows */}
          <rect x="44" y="108" width="46" height="5" rx="2.5" fill="var(--color-text-secondary)" opacity="0.25" />
          <rect x="44" y="118" width="30" height="5" rx="2.5" fill="var(--color-text-secondary)" opacity="0.18" />
          <rect x="110" y="108" width="46" height="5" rx="2.5" fill="var(--color-text-secondary)" opacity="0.25" />
          <rect x="110" y="118" width="36" height="5" rx="2.5" fill="var(--color-text-secondary)" opacity="0.18" />
        </svg>
      )
    }
  ];

  return (
    <section id="modules" className={styles.section}>
      <div className={styles.container}>
        
        {/* Section Header */}
        <div className={styles.header}>
          <span className={styles.label}>Platform Capabilities</span>
          <h2 className={styles.title}>Five modules. One unified workflow.</h2>
          <p className={styles.subtitle}>
            Every stage of seed operations runs in SeedSphere. Each module is purpose-built for India's seed industry, with AI augmentation where it matters most.
          </p>
        </div>

        {/* Carousel Outer Wrapper */}
        <div className={styles.carouselContainer}>
          {/* Left Navigation Arrow */}
          <button 
            onClick={handlePrev} 
            className={`${styles.navButton} ${styles.navLeft}`}
            aria-label="Previous Module"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>

          {/* Slider viewport */}
          <div 
            className={styles.sliderViewport}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div 
              className={styles.sliderTrack}
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {modules.map((mod, idx) => {
                const Icon = mod.icon;
                const isEven = idx % 2 === 1;

                return (
                  <div key={mod.id} className={styles.slideWidthWrapper}>
                    <div 
                      className={`${styles.card} ${isEven ? styles.cardEven : ''} reveal`}
                    >
                      {/* Visual SVG illustration column */}
                      <div className={styles.visualColumn}>
                        {mod.visualSvg}
                      </div>

                      {/* Narrative content column */}
                      <div className={styles.contentColumn}>
                        {/* Icon Header */}
                        <div className={styles.iconHeader}>
                          <div className={styles.iconBox}>
                            <Icon size={24} strokeWidth={2} />
                          </div>
                          <h3 className={styles.cardTitle}>
                            {mod.title}
                            {mod.isFlagship && <span className={styles.flagshipBadge}>Flagship</span>}
                          </h3>
                        </div>

                        {/* Taglines */}
                        <p className={styles.cardTagline}>{mod.tagline}</p>

                        {/* Bullets lists */}
                        <div className={styles.bulletsGrid}>
                          {mod.bullets.map((bullet) => (
                            <div key={bullet} className={styles.bulletItem}>
                              <span className={styles.checkmark}>
                                <Check size={16} strokeWidth={3} />
                              </span>
                              <span>{bullet}</span>
                            </div>
                          ))}
                        </div>

                        {/* Smooth scrolls timeline anchor link */}
                        <a href="#how-it-works" onClick={handleScrollToTimeline} className={styles.exploreLink}>
                          {mod.linkText} <ArrowRight size={15} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Navigation Arrow */}
          <button 
            onClick={handleNext} 
            className={`${styles.navButton} ${styles.navRight}`}
            aria-label="Next Module"
          >
            <ChevronRight size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* Quick Navigation Strip */}
        <div className={styles.navigationStripWrapper}>
          <div className={styles.navigationStrip}>
            {modules.map((mod, idx) => {
              const Icon = mod.icon;
              const isActive = idx === activeIndex;

              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`${styles.navStripItem} ${isActive ? styles.navStripActive : ''}`}
                >
                  <Icon size={16} strokeWidth={2.2} />
                  <span className={styles.navStripText}>{mod.title}</span>
                  {isActive && <span className={styles.navStripUnderline} />}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
export { ModulesShowcase };
