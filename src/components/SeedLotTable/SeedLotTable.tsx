import { useMemo, useState } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Badge } from '@/components/common/Badge/Badge';
import type { SeedLot } from '@/services/api';
import { seedLotCode } from '@/pages/master-data/seedLotData';

export interface SeedLotRow {
  id: string;
  lot: SeedLot;
  varietyName: string;
  sourceOrgName: string;
  parentLotCode?: string;
}

interface SeedLotTableProps {
  rows: SeedLotRow[];
  loading?: boolean;
  onEdit?: (row: SeedLotRow) => void;
  onDelete?: (row: SeedLotRow) => void;
}

type SortKey = 'varietyName' | 'seedClass' | 'sourceOrgName' | 'quantity';

function sortValue(row: SeedLotRow, key: SortKey): string | number {
  switch (key) {
    case 'quantity':
      return row.lot.quantity;
    case 'seedClass':
      return row.lot.seedClass;
    case 'sourceOrgName':
      return row.sourceOrgName;
    case 'varietyName':
    default:
      return row.varietyName;
  }
}

export function SeedLotTable({ rows, loading = false, onEdit, onDelete }: SeedLotTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('varietyName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const leftValue = sortValue(a, sortKey);
      const rightValue = sortValue(b, sortKey);
      const left = typeof leftValue === 'number' ? leftValue : leftValue.toLowerCase();
      const right = typeof rightValue === 'number' ? rightValue : rightValue.toLowerCase();
      if (left < right) return sortDirection === 'asc' ? -1 : 1;
      if (left > right) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [sortDirection, sortKey, rows]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: 'varietyName' | 'seedClass' | 'sourceOrgName' | 'quantity') => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading seed lots…</div>;
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7f9f7', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Lot ID</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('varietyName')}>Variety</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('seedClass')}>Seed Class</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('sourceOrgName')}>Source Organization</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('quantity')}>Quantity (kg)</th>
              <th style={{ padding: '0.75rem' }}>Production Date</th>
              <th style={{ padding: '0.75rem' }}>Parent Lot</th>
              <th style={{ padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.id} style={{ borderTop: '1px solid #e8efe8' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{seedLotCode(row.lot)}</td>
                <td style={{ padding: '0.75rem' }}>{row.varietyName}</td>
                <td style={{ padding: '0.75rem' }}>
                  <Badge variant={row.lot.seedClass === 'Breeder' ? 'info' : 'success'}>{row.lot.seedClass}</Badge>
                </td>
                <td style={{ padding: '0.75rem' }}>{row.sourceOrgName}</td>
                <td style={{ padding: '0.75rem' }}>{row.lot.quantity.toLocaleString()}</td>
                <td style={{ padding: '0.75rem' }}>{row.lot.productionDate || '—'}</td>
                <td style={{ padding: '0.75rem' }}>{row.parentLotCode ?? '—'}</td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {onEdit && (
                      <Button size="sm" variant="accent" leftIcon={Edit3} onClick={() => onEdit(row)}>
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button size="sm" variant="danger" leftIcon={Trash2} onClick={() => onDelete(row)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <span>
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button size="sm" variant="secondary" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
            Previous
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
