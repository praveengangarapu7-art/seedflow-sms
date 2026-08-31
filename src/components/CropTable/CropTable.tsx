import { useMemo, useState } from 'react';
import { Edit3, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import type { CropRow } from '@/services/seedLotRealtimeClient';

interface CropTableProps {
  crops: CropRow[];
  loading?: boolean;
  /** Crop names (case-sensitive, matching crops.name) known to have at least one approved variety. */
  cropsWithApprovedVariety?: Set<string>;
  onEdit?: (crop: CropRow) => void;
  onDelete?: (crop: CropRow) => void;
  onView?: (crop: CropRow) => void;
}

export function CropTable({
  crops,
  loading = false,
  cropsWithApprovedVariety,
  onEdit,
  onDelete,
  onView,
}: CropTableProps) {
  const [sortKey, setSortKey] = useState<'name' | 'category' | 'season'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const sortedCrops = useMemo(() => {
    const copy = [...crops];
    copy.sort((a, b) => {
      const left = (a[sortKey] ?? '').toString().toLowerCase();
      const right = (b[sortKey] ?? '').toString().toLowerCase();
      if (left < right) return sortDirection === 'asc' ? -1 : 1;
      if (left > right) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [sortDirection, sortKey, crops]);

  const totalPages = Math.max(1, Math.ceil(sortedCrops.length / pageSize));
  const pagedCrops = sortedCrops.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: 'name' | 'category' | 'season') => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading crops…</div>;
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7f9f7', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('name')}>Name</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('category')}>Category</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('season')}>Season</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              {cropsWithApprovedVariety ? <th style={{ padding: '0.75rem' }}>Approved Variety</th> : null}
              <th style={{ padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedCrops.map((crop) => (
              <tr key={crop.id} style={{ borderTop: '1px solid #e8efe8' }}>
                <td style={{ padding: '0.75rem' }}>{crop.name}</td>
                <td style={{ padding: '0.75rem' }}>{crop.category}</td>
                <td style={{ padding: '0.75rem' }}>{crop.season}</td>
                <td style={{ padding: '0.75rem' }}>{crop.active ? 'Active' : 'Inactive'}</td>
                {cropsWithApprovedVariety ? (
                  <td style={{ padding: '0.75rem' }}>
                    {cropsWithApprovedVariety.has(crop.name) ? (
                      'Yes'
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#b8860b' }}>
                        <AlertTriangle size={14} /> None yet
                      </span>
                    )}
                  </td>
                ) : null}
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {onView && (
                      <Button size="sm" variant="secondary" leftIcon={Eye} onClick={() => onView(crop)}>
                        View
                      </Button>
                    )}
                    {onEdit && (
                      <Button size="sm" variant="accent" leftIcon={Edit3} onClick={() => onEdit(crop)}>
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button size="sm" variant="danger" leftIcon={Trash2} onClick={() => onDelete(crop)}>
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
          Showing {sortedCrops.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedCrops.length)} of {sortedCrops.length}
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
