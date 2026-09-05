import type { ReactNode } from 'react';
import { BrandPanel } from '@/components/auth/BrandPanel/BrandPanel';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.root}>
      <div className={styles.left}>
        <BrandPanel />
      </div>
      <div className={styles.right}>
        <div className={styles.formContainer}>
          {/* Below 900px the brand panel is hidden, which used to take the
              product's identity with it and leave a bare form on a white page.
              This compact seed strip carries the theme onto small screens. */}
          <div className={styles.mobileBrand} aria-hidden="true">
            <img src="/logo.png" alt="" className={styles.mobileBrandLogo} />
            <svg viewBox="0 0 120 26" className={styles.mobileBrandSprout} fill="none">
              <line x1="4" y1="21" x2="116" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
              <ellipse cx="26" cy="22" rx="5" ry="3.4" fill="var(--color-warning)" opacity="0.9" />
              <path d="M60 21 C 60 14 59 9 60 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
              <path d="M60 13 C 53 12 47 8 44 3 C 50 5 57 9 60 13 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
              <path d="M60 9 C 67 8 73 4 76 -1 C 70 1 63 5 60 9 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
              <ellipse cx="96" cy="22" rx="5" ry="3.4" fill="var(--color-warning)" opacity="0.9" />
            </svg>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
