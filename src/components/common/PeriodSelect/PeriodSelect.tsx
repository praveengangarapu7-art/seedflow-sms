import { PERIOD_OPTIONS, type PeriodValue } from '@/utils/periodFilter';
import styles from './PeriodSelect.module.css';

interface PeriodSelectProps {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  /** Defaults to the standard six choices; pass a subset where a page needs one. */
  options?: { label: string; value: string }[];
  ariaLabel?: string;
  className?: string;
}

/**
 * The period selector every module page carries in its header.
 *
 * One component rather than a copy per page, so the control looks and behaves
 * identically whether the page uses the shared PageHeader or draws its own
 * header row — which most Warehouse pages do.
 */
export function PeriodSelect({
  value,
  onChange,
  options = PERIOD_OPTIONS,
  ariaLabel = 'Period filter',
  className = '',
}: PeriodSelectProps) {
  return (
    <select
      className={`${styles.select} ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value as PeriodValue)}
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
