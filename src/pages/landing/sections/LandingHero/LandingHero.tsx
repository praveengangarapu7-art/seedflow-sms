import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SeedJourney from '../../seed/SeedJourney';
import styles from './LandingHero.module.css';

/** Crops cycled in the headline, so the first line says who SeedSphere is for. */
const CROP_WORDS = ['hybrid maize', 'paddy', 'cotton', 'soybean', 'wheat', 'vegetable', 'pulse'];

function RotatingCrop() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % CROP_WORDS.length), 2200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className={styles.rotator} aria-live="off">
      <span key={i} className={styles.rotatorWord}>
        {CROP_WORDS[i]}
      </span>
    </span>
  );
}

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
          <span>The operating system for the seed industry</span>
        </div>

        {/* Classic serif headline */}
        <h1 className={styles.headline}>
          <span className={`${styles.line} ${styles.fadeInUp}`} style={{ animationDelay: '150ms' }}>
            From breeder seed
          </span>
          <span className={`${styles.line} ${styles.fadeInUp}`} style={{ animationDelay: '270ms' }}>
            to the farmer&apos;s{' '}
            <span className={styles.goldText}>
              field.
              <svg className={styles.underlineSvg} viewBox="0 0 100 12" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <path
                  className={styles.underlinePath}
                  d="M4 8 C30 2, 70 2, 96 8"
                  stroke="var(--color-warning)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </span>
        </h1>

        <p className={`${styles.forLine} ${styles.fadeInUp}`} style={{ animationDelay: '400ms' }}>
          Built for <RotatingCrop /> seed companies.
        </p>

        {/* Description */}
        <p className={`${styles.description} ${styles.fadeInUp}`} style={{ animationDelay: '500ms' }}>
          SeedSphere runs <span className={styles.highlightText}>R&amp;D</span>,{' '}
          <span className={styles.highlightText}>production</span>,{' '}
          <span className={styles.highlightText}>procurement</span>,{' '}
          <span className={styles.highlightText}>laboratory</span>,{' '}
          <span className={styles.highlightText}>processing</span> and{' '}
          <span className={styles.highlightText}>warehouse</span> on one seed-lot ID, with AI that flags
          germination and quality risk before a single packet is dispatched.
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
            <span>Lot-level traceability</span>
          </div>
          <div className={styles.featureChip}>
            <span className={styles.checkmark}>✓</span>
            <span>Certification-ready lab workflows</span>
          </div>
          <div className={styles.featureChip}>
            <span className={styles.checkmark}>✓</span>
            <span>AI quality forecasts</span>
          </div>
        </div>
      </div>

      {/* Right Visual centerpiece */}
      <div className={`${styles.rightColumn} ${styles.fadeInUp}`} style={{ animationDelay: '300ms' }}>
        <SeedJourney />
      </div>
    </section>
  );
}
