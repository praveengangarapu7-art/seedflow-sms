import { useEffect } from 'react';
import LandingNav from './sections/LandingNav/LandingNav';
import LandingHero from './sections/LandingHero/LandingHero';
import AboutSection from './sections/AboutSection/AboutSection';
import ModulesShowcase from './sections/ModulesShowcase/ModulesShowcase';
import HowItWorks from './sections/HowItWorks/HowItWorks';
import IndustriesSection from './sections/IndustriesSection/IndustriesSection';
import LandingCTA from './sections/LandingCTA/LandingCTA';
import LandingFooter from './sections/LandingFooter/LandingFooter';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  useEffect(() => {
    // Setup intersection observer for entry animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            entry.target.classList.add('visible'); // Add global class name for absolute namespace compatibility
            observer.unobserve(entry.target); // Animate once only
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -80px 0px' }
    );

    // Select both global .reveal and any namespaced CSS modules containing 'reveal_'
    const revealElements = document.querySelectorAll('.reveal, [class*="reveal_"]');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className={styles.landingContainer}>
      {/* Background Animated Gradient Mesh */}
      <div className={styles.gradientMesh}>
        <div className={`${styles.blob} ${styles.blob1}`} />
        <div className={`${styles.blob} ${styles.blob2}`} />
      </div>

      {/* Main Sections */}
      <LandingNav />
      <LandingHero />

      {/* Rebuilt 4 Content Sections in correct order */}
      <div id="about">
        <AboutSection />
      </div>
      
      <div id="modules">
        <ModulesShowcase />
      </div>
      
      <div id="how-it-works">
        <HowItWorks />
      </div>

      <div id="industries">
        <IndustriesSection />
      </div>

      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
export { LandingPage };
