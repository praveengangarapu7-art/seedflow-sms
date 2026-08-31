import { Search, X } from 'lucide-react';
import styles from './InventoryFilters.module.css';

export interface InventoryFilterState {
  search: string;
  warehouse: string;
  category: string;
  status: string;
  stockLevel: string;
  abcClass: string;
}

export const DEFAULT_FILTERS: InventoryFilterState = {
  search: '',
  warehouse: 'all',
  category: 'all',
  status: 'all',
  stockLevel: 'all',
  abcClass: 'all',
};

interface InventoryFiltersProps {
  value: InventoryFilterState;
  onChange: (next: InventoryFilterState) => void;
  warehouses: string[];
  categories: string[];
  statuses: string[];
}

export function InventoryFilters({ value, onChange, warehouses, categories, statuses }: InventoryFiltersProps) {
  const set = <K extends keyof InventoryFilterState>(k: K, v: InventoryFilterState[K]) => {
    onChange({ ...value, [k]: v });
  };

  const isFiltered =
    value.search !== '' ||
    value.warehouse !== 'all' ||
    value.category !== 'all' ||
    value.status !== 'all' ||
    value.stockLevel !== 'all' ||
    value.abcClass !== 'all';

  return (
    <div className={styles.bar}>
      <div className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="text"
          className={styles.search}
          placeholder="Search by SKU, item name, batch number, lot..."
          value={value.search}
          onChange={(e) => set('search', e.target.value)}
          aria-label="Search inventory"
        />
      </div>

      <select className={styles.select} value={value.warehouse} onChange={(e) => set('warehouse', e.target.value)} aria-label="Warehouse">
        <option value="all">All warehouses</option>
        {warehouses.map((w) => <option key={w} value={w}>{w}</option>)}
      </select>

      <select className={styles.select} value={value.category} onChange={(e) => set('category', e.target.value)} aria-label="Category">
        <option value="all">All categories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <select className={styles.select} value={value.status} onChange={(e) => set('status', e.target.value)} aria-label="Status">
        <option value="all">All statuses</option>
        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <select className={styles.select} value={value.stockLevel} onChange={(e) => set('stockLevel', e.target.value)} aria-label="Stock level">
        <option value="all">All stock levels</option>
        <option value="out">Out</option>
        <option value="low">Low (≤ reorder)</option>
        <option value="healthy">Healthy</option>
        <option value="excess">Excess</option>
      </select>

      <select className={styles.select} value={value.abcClass} onChange={(e) => set('abcClass', e.target.value)} aria-label="ABC class">
        <option value="all">All classes</option>
        <option value="A">A (high)</option>
        <option value="B">B (medium)</option>
        <option value="C">C (low)</option>
      </select>

      {isFiltered && (
        <button className={styles.clearBtn} onClick={() => onChange(DEFAULT_FILTERS)}>
          <X size={12} /> Clear
        </button>
      )}
    </div>
  );
}
