import { Link } from 'react-router-dom';
import { Globe, Github, Linkedin, Twitter } from 'lucide-react';
import styles from './LandingFooter.module.css';

export default function LandingFooter() {
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
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Main 4-column directory structure */}
        <div className={styles.grid}>
          {/* Brand details */}
          <div className={styles.brandCol}>
            <Link to="/" className={styles.brand}>
              <Globe className={styles.sphereIcon} />
              <span className={styles.wordmark}>SeedSphere</span>
            </Link>
            <p className={styles.tagline}>
              AI-Powered Seed Industry Operating System. Delivering end-to-end traceability, absolute regulatory compliance, and agronomy intelligence.
            </p>
          </div>

          {/* Product module links */}
          <div>
            <h4 className={styles.columnTitle}>Modules</h4>
            <ul className={styles.linksList}>
              <li><a href="#modules" onClick={(e) => scrollToSection(e, 'modules')} className={styles.link}>Research & R&D</a></li>
              <li><a href="#modules" onClick={(e) => scrollToSection(e, 'modules')} className={styles.link}>Procurement</a></li>
              <li><a href="#modules" onClick={(e) => scrollToSection(e, 'modules')} className={styles.link}>Warehouse stock</a></li>
              <li><a href="#modules" onClick={(e) => scrollToSection(e, 'modules')} className={styles.link}>Seed processing</a></li>
              <li><a href="#modules" onClick={(e) => scrollToSection(e, 'modules')} className={styles.link}>Laboratory QA</a></li>
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className={styles.columnTitle}>Company</h4>
            <ul className={styles.linksList}>
              <li><a href="#about" onClick={(e) => scrollToSection(e, 'about')} className={styles.link}>About Platform</a></li>
              <li><a href="#about" onClick={(e) => scrollToSection(e, 'about')} className={styles.link}>Pricing plans</a></li>
              <li><Link to="/login" className={styles.link}>Customer login</Link></li>
              <li><Link to="/signup" className={styles.link}>Growers network</Link></li>
              <li><a href="#about" onClick={(e) => scrollToSection(e, 'about')} className={styles.link}>Contact support</a></li>
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h4 className={styles.columnTitle}>Resources</h4>
            <ul className={styles.linksList}>
              <li><a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className={styles.link}>Workflow docs</a></li>
              <li><a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className={styles.link}>PPV&FRA guides</a></li>
              <li><a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className={styles.link}>DUS testing protocols</a></li>
              <li><a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className={styles.link}>Security & audits</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Stats Horizontal Strip */}
        <div className={styles.statsStrip}>
          <div className={styles.statItem}>
            <span className={styles.statVal}>2.5 Cr+</span>
            <span className={styles.statLbl}>seeds tracked this season</span>
          </div>

          <div className={styles.statItem}>
            <span className={styles.statVal}>160+</span>
            <span className={styles.statLbl}>quality checkpoints per lot</span>
          </div>

          <div className={styles.statItem}>
            <span className={styles.statVal}>12+</span>
            <span className={styles.statLbl}>Indian states covered</span>
          </div>

          <div className={styles.statItem}>
            <span className={styles.statVal}>Qmics</span>
            <span className={styles.statLbl}>product warranty</span>
          </div>
        </div>

        {/* Bottom row copyrights */}
        <div className={styles.bottomRow}>
          <div className={styles.copyright}>
            © {new Date().getFullYear()} SeedSphere. A QMICS product. All rights reserved.
          </div>

          {/* Social connections */}
          <div className={styles.socials}>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
              <Github size={20} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
              <Linkedin size={20} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
              <Twitter size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
export { LandingFooter };
