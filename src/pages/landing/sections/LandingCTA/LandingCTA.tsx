import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import styles from './LandingCTA.module.css';

export default function LandingCTA() {
  return (
    <section className={styles.ctaSection}>
      {/* Dynamic SVG sphere outline revolving in the background */}
      <svg className={styles.bgSphereSvg} viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
        <circle cx="300" cy="300" r="280" fill="none" stroke="var(--color-white)" strokeWidth="2" strokeDasharray="10 10" />
        <circle cx="300" cy="300" r="230" fill="none" stroke="var(--color-white)" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="300" cy="300" r="160" fill="none" stroke="var(--color-white)" strokeWidth="1" />
      </svg>

      {/* Main container content */}
      <div className={styles.container}>
        <h2 className={styles.title}>Ready to transform your seed operations?</h2>
        <p className={styles.subtitle}>
          Join the seed companies bringing data-driven discipline, absolute compliance, and AI-powered insights to Indian agriculture.
        </p>

        {/* Dynamic Buttons actions */}
        <div className={styles.actions}>
          <Link to="/signup" className={styles.primaryBtn}>
            Start free trial <ArrowRight size={18} />
          </Link>
          <Link to="/login" className={styles.secondaryBtn}>
            Book a demo
          </Link>
        </div>
      </div>
    </section>
  );
}
export { LandingCTA };
