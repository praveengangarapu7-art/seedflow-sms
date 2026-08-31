import type { HTMLAttributes } from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'active' | 'coming-soon' | 'success' | 'warning' | 'info' | 'neutral' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'neutral', className = '', children, ...rest }: BadgeProps) {
  const classes = [styles.badge, styles[variant], className].filter(Boolean).join(' ');
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
