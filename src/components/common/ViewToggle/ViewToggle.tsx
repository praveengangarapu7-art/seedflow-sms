import { LayoutGrid, Table2 } from 'lucide-react';
import styles from './ViewToggle.module.css';

interface ViewToggleProps {
  view: 'table' | 'grid';
  onChange: (view: 'table' | 'grid') => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className={styles.root}>
      <button
        type="button"
        className={`${styles.btn} ${view === 'grid' ? styles.btnActive : styles.btnInactive}`}
        onClick={() => onChange('grid')}
        aria-label="Grid view"
        aria-pressed={view === 'grid'}
      >
        <LayoutGrid size={16} />
      </button>
      <button
        type="button"
        className={`${styles.btn} ${view === 'table' ? styles.btnActive : styles.btnInactive}`}
        onClick={() => onChange('table')}
        aria-label="Table view"
        aria-pressed={view === 'table'}
      >
        <Table2 size={16} />
      </button>
    </div>
  );
}
