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
        <div className={styles.formContainer}>{children}</div>
      </div>
    </div>
  );
}
