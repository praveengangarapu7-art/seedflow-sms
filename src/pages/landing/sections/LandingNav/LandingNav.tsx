import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import styles from './LandingNav.module.css';

export default function LandingNav() {
  const [scrollPercent, setScrollPercent] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // solid bg transition after 80px
      setScrolled(window.scrollY > 80);

      // calculate scroll percentage
      const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScrollHeight > 0) {
        const percent = (window.scrollY / totalScrollHeight) * 100;
        setScrollPercent(percent);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Trigger scroll check on mount in case page is already scrolled
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const targetElement = document.getElementById(id);
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
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.navContainer}>
        {/* Brand Logo Image */}
        <Link to="/" className={styles.brand}>
          <img src="/logo.png" alt="SeedSphere Logo" className={styles.logoImg} />
        </Link>

        {/* Center Navigation links (Pricing removed) */}
        <nav className={styles.navLinks}>
          <a href="#about" onClick={(e) => scrollToSection(e, 'about')} className={styles.navLink}>About</a>
          <a href="#modules" onClick={(e) => scrollToSection(e, 'modules')} className={styles.navLink}>Modules</a>
          <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className={styles.navLink}>How it works</a>
          <a href="#industries" onClick={(e) => scrollToSection(e, 'industries')} className={styles.navLink}>Industries</a>
        </nav>

        {/* Right actions — product-wide search sits before the sign-in CTA.
            Search works without an account; results behind login are marked
            and open straight after signing in. */}
        <div className={styles.actions}>
          <GlobalSearch variant="landing" placeholder="Search modules, pages, records…" />
          <Link to="/login" className={styles.getStartedBtn}>Sign in</Link>
        </div>
      </div>

      {/* Progress Bar indicator */}
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBar} style={{ width: `${scrollPercent}%` }} />
      </div>
    </header>
  );
}
