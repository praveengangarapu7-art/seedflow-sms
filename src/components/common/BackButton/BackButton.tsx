import { ArrowLeft } from 'lucide-react';
import { useBackNavigation } from './useBackNavigation';
import styles from './BackButton.module.css';

interface BackButtonProps {
  /**
   * 'inline' renders a bare link for TopHeader's left group; 'floating' is
   * the fixed top-left pill used on pages that have no header of their own.
   */
  variant?: 'inline' | 'floating';
  label?: string;
}

export function BackButton({ variant = 'inline', label = 'Back' }: BackButtonProps) {
  const { visible, goBack } = useBackNavigation();

  if (!visible) return null;

  return (
    <button
      type="button"
      className={`${styles.button} ${variant === 'floating' ? styles.floating : styles.inline}`}
      onClick={goBack}
      aria-label="Go back to the previous page"
    >
      <ArrowLeft size={15} />
      {label}
    </button>
  );
}
