import { Wrench } from 'lucide-react';
import styles from './PlaceholderContent.module.css';

interface PlaceholderContentProps {
  pageTitle: string;
  moduleName: string;
  className?: string;
}

export function PlaceholderContent({ pageTitle, moduleName, className = '' }: PlaceholderContentProps) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      <div className={styles.card}>
        <Wrench size={64} className={styles.icon} />
        <h1 className={styles.title}>{pageTitle}</h1>
        <p className={styles.subtext}>Yet to add the content</p>
        <p className={styles.moduleText}>This page is part of the {moduleName} module</p>
      </div>
    </div>
  );
}
