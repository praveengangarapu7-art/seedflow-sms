import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import OrbitalDiagram from '../OrbitalDiagram/OrbitalDiagram';
import styles from './LandingHero.module.css';

export default function LandingHero() {
  const handleScrollToModules = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetElement = document.getElementById('modules');
    if (targetElement) {
      const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - 72;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className={styles.heroSection}>
      {/* Left Text details */}
      <div className={styles.leftColumn}>
        {/* Animated Badge Pill */}
        <div className={`${styles.badgePill} ${styles.fadeInUp}`} style={{ animationDelay: '0ms' }}>
          <span className={styles.badgeDot} />
          <span>AI-Powered Seed Industry Operating System</span>
        </div>

        {/* Serif-Feel Large Headline */}
        <h1 className={styles.headline}>
          <span className={`${styles.line} ${styles.fadeInUp}`} style={{ animationDelay: '150ms' }}>
            Seed-to-Sales Operations,
          </span>
          <span className={`${styles.line} ${styles.fadeInUp}`} style={{ animationDelay: '270ms' }}>
            Delivered with{' '}
            <span className={styles.goldText}>
              Intelligence.
              <svg className={styles.underlineSvg} viewBox="0 0 100 12" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <path 
                  d="M4 8 C30 2, 70 2, 96 8" 
                  stroke="var(--color-warning)" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                />
              </svg>
            </span>
          </span>
        </h1>

        {/* Decriptive Marketing copy */}
        <p className={`${styles.description} ${styles.fadeInUp}`} style={{ animationDelay: '500ms' }}>
          SeedSphere unifies <span className={styles.highlightText}>R&D</span>,{' '}
          <span className={styles.highlightText}>procurement</span>,{' '}
          <span className={styles.highlightText}>warehouse</span>,{' '}
          <span className={styles.highlightText}>processing</span>, and{' '}
          <span className={styles.highlightText}>laboratory</span> operations into one AI-augmented platform. 
          From germplasm catalog to packed seed dispatch — every step visible, optimized, and audited.
        </p>

        {/* CTA Buttons */}
        <div className={`${styles.ctaRow} ${styles.fadeInUp}`} style={{ animationDelay: '700ms' }}>
          <Link to="/signup" className={styles.primaryBtn}>
            Get started <ArrowRight size={18} />
          </Link>
          <a href="#modules" onClick={handleScrollToModules} className={styles.secondaryBtn}>
            Explore Modules
          </a>
        </div>

        {/* Subtitle Checkmarks */}
        <div className={`${styles.featuresRow} ${styles.fadeInUp}`} style={{ animationDelay: '900ms' }}>
          <div className={styles.featureChip}>
            <span className={styles.checkmark}>✓</span>
            <span>End-to-end traceability</span>
          </div>
          <div className={styles.featureChip}>
            <span className={styles.checkmark}>✓</span>
            <span>AI-driven insights</span>
          </div>
          <div className={styles.featureChip}>
            <span className={styles.checkmark}>✓</span>
            <span>Built for Indian agriculture</span>
          </div>
        </div>
      </div>

      {/* Right Visual centerpiece */}
      <div className={`${styles.rightColumn} ${styles.fadeInUp}`} style={{ animationDelay: '300ms' }}>
        <OrbitalDiagram />
      </div>
    </section>
  );
}
