import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import styles from './PageHeader.module.css';

interface SecondaryAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

interface PrimaryAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  primaryAction?: PrimaryAction;
  secondaryActions?: SecondaryAction[];
  kpis?: any[];
  backTo?: string;
  className?: string;
  noDivider?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  description,
  primaryAction,
  secondaryActions = [],
  kpis = [],
  backTo,
  className = '',
  noDivider = false,
}: PageHeaderProps) {
  const displaySubtitle = subtitle || description;
  return (
    <div className={`${styles.root} ${className}`}>
      <div className={styles.row}>
        <div className={styles.left}>
          {backTo && (
            <a href={backTo} className={styles.backLink}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <span>Back</span>
            </a>
          )}
          <h1 className={styles.title}>{title}</h1>
          {displaySubtitle && <p className={styles.subtitle}>{displaySubtitle}</p>}
        </div>
        {(primaryAction || secondaryActions.length > 0) && (
          <div className={styles.actions} data-export-ignore="true">
            {secondaryActions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                size="sm"
                leftIcon={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            ))}
            {primaryAction && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={primaryAction.icon}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
              >
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
      
      {kpis.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} style={{ padding: '16px', backgroundColor: 'var(--color-accent-light)', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                  {Icon && <Icon size={16} />}
                  {kpi.label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>{kpi.value}</div>
              </div>
            );
          })}
        </div>
      )}

      {!noDivider && <div className={styles.divider} />}
    </div>
  );
}
