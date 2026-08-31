import { useState, useMemo, type ReactNode, type RefCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronsUpDown, ChevronUp, ChevronDown, Inbox } from 'lucide-react';
import { Pagination } from './Pagination';
import styles from './DataTable.module.css';

export interface DataTableColumn<T> {
  key: string;
  header?: string;
  label?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  rowKey: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  emptyState?: EmptyStateConfig;
  loading?: boolean;
  pagination?: {
    total: number;
    pageSize: number;
    currentPage: number;
    onPageChange: (page: number) => void;
  };
  mobileCardRender?: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  rowKey,
  onRowClick,
  emptyState,
  loading = false,
  pagination,
  mobileCardRender,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function getKey(row: T): string {
    if (typeof rowKey === 'function') return rowKey(row);
    return String(row[rowKey as keyof T] ?? '');
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const allSelected = sortedData.length > 0 && sortedData.every((r) => selectedRows.includes(getKey(r)));
  const someSelected = !allSelected && sortedData.some((r) => selectedRows.includes(getKey(r)));

  const indeterminateRef: RefCallback<HTMLInputElement> = (el) => {
    if (el) el.indeterminate = someSelected;
  };

  function handleSelectAll(checked: boolean) {
    onSelectionChange?.(checked ? sortedData.map(getKey) : []);
  }

  function handleSelectRow(id: string, checked: boolean) {
    onSelectionChange?.(
      checked ? [...selectedRows, id] : selectedRows.filter((r) => r !== id)
    );
  }

  function renderCell(row: T, col: DataTableColumn<T>): ReactNode {
    if (col.render) return col.render(row);
    const val = (row as Record<string, unknown>)[col.key];
    return val != null ? String(val) : '';
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.skeletonRows}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonCell} />
                <div className={styles.skeletonCell} />
                <div className={styles.skeletonCell} />
                <div className={styles.skeletonCell} />
                <div className={styles.skeletonCell} />
              </div>
            ))}
          </div>
        ) : sortedData.length === 0 ? (
          <div className={styles.emptyState}>
            {emptyState
              ? <><emptyState.icon size={48} className={styles.emptyIcon} /><div className={styles.emptyTitle}>{emptyState.title}</div><div className={styles.emptyDesc}>{emptyState.description}</div></>
              : <><Inbox size={48} className={styles.emptyIcon} /><div className={styles.emptyTitle}>No data found</div><div className={styles.emptyDesc}>Try adjusting your search or filters</div></>
            }
          </div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <table className={styles.table} aria-label="Data table">
              <thead>
                <tr>
                  {selectable && (
                    <th className={styles.th} style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        ref={indeterminateRef}
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        aria-label="Select all"
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`${styles.th} ${col.sortable ? styles.thSortable : ''}`}
                      style={{ width: col.width, textAlign: col.align }}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    >
                      <span className={styles.thContent}>
                        {col.header || col.label}
                        {col.sortable && (
                          <span className={styles.sortIcon}>
                            {sortKey === col.key
                              ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                              : <ChevronsUpDown size={12} />}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => {
                  const id = getKey(row);
                  return (
                    <tr
                      key={id}
                      className={`${styles.tr} ${selectedRows.includes(id) ? styles.trSelected : ''} ${onRowClick ? styles.trClickable : ''}`}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={selectedRows.includes(id)}
                            onChange={(e) => handleSelectRow(id, e.target.checked)}
                            aria-label={`Select ${id}`}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={styles.td}
                          style={{ width: col.width, textAlign: col.align }}
                        >
                          {renderCell(row, col)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Mobile card view ── */}
            {mobileCardRender && (
              <div className={styles.mobileCards}>
                {sortedData.map((row) => (
                  <div
                    key={getKey(row)}
                    className={styles.mobileCard}
                    onClick={() => onRowClick?.(row)}
                  >
                    {mobileCardRender(row)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {pagination && pagination.total > 0 && (
        <Pagination {...pagination} />
      )}
    </div>
  );
}
