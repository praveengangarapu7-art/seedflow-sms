import styles from './BrandPanel.module.css';

export function BrandPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <img src="/logo.png" alt="SeedSphere" className={styles.brandImage} />
        </div>

        <p className={styles.tagline}>
          Smart seed management for modern agribusiness
        </p>

        <div className={styles.illustration}>
          <svg
            className={styles.illustrationSvg}
            viewBox="0 0 260 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Ground line */}
            <line x1="20" y1="180" x2="240" y2="180" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

            {/* Seedling 1 — small */}
            <line x1="60" y1="180" x2="60" y2="140" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M60 155 Q45 140 30 145" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M60 148 Q75 133 85 138" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Seedling 2 — medium */}
            <line x1="130" y1="180" x2="130" y2="100" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M130 140 Q108 118 90 125" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M130 125 Q152 103 170 110" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M130 108 Q115 90 120 75" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />

            {/* Seedling 3 — small */}
            <line x1="200" y1="180" x2="200" y2="148" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M200 163 Q185 148 172 153" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M200 156 Q215 141 228 146" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Seeds in ground */}
            <ellipse cx="60" cy="182" rx="6" ry="4" fill="white" opacity="0.5" />
            <ellipse cx="130" cy="182" rx="6" ry="4" fill="white" opacity="0.5" />
            <ellipse cx="200" cy="182" rx="6" ry="4" fill="white" opacity="0.5" />

            {/* Dots / growth marks */}
            <circle cx="130" cy="100" r="4" fill="white" opacity="0.7" />
            <circle cx="60" cy="140" r="3" fill="white" opacity="0.6" />
            <circle cx="200" cy="148" r="3" fill="white" opacity="0.6" />
          </svg>
        </div>
      </div>

      <div className={styles.footer}>
        Trusted by 500+ seed companies across India
      </div>
    </div>
  );
}
