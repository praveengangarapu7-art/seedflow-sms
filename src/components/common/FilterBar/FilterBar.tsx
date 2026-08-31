import { Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from './FilterBar.module.css';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  label: string;
  key: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface BulkAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: FilterConfig[];
  selectedCount?: number;
  bulkActions?: BulkAction[];
  className?: string;
}

export function FilterBar({
  searchPlaceholder = 'Search…',
  searchValue,
  onSearchChange,
  filters = [],
  selectedCount = 0,
  bulkActions = [],
  className = '',
}: FilterBarProps) {
  return (
    <div className={`${styles.root} ${className}`}>
      {selectedCount > 0 && bulkActions.length > 0 && (
        <div className={styles.selectionBar}>
          <span className={styles.selectionText}>
            {selectedCount} selected
          </span>
          {bulkActions.map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.label} className={styles.bulkBtn} onClick={action.onClick}>
                {Icon && <Icon size={13} />}
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.row}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search"
          />
        </div>

        {filters.map((filter) => (
          <select
            key={filter.key}
            className={styles.select}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            aria-label={filter.label}
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
