import { useMemo, useState } from 'react';
import { Edit3, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import type { FarmerRow } from '@/services/seedLotRealtimeClient';

interface FarmerTableProps {
  farmers: FarmerRow[];
  loading?: boolean;
  organizationNames?: Record<string, string>;
  onEdit?: (farmer: FarmerRow) => void;
  onDelete?: (farmer: FarmerRow) => void;
  onView?: (farmer: FarmerRow) => void;
}

export function FarmerTable({
  farmers,
  loading = false,
  organizationNames = {},
  onEdit,
  onDelete,
  onView,
}: FarmerTableProps) {
  const [sortKey, setSortKey] = useState<'name' | 'region' | 'location'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const sortedFarmers = useMemo(() => {
    const copy = [...farmers];
    copy.sort((a, b) => {
      const left = (a[sortKey] ?? '').toString().toLowerCase();
      const right = (b[sortKey] ?? '').toString().toLowerCase();
      if (left < right) return sortDirection === 'asc' ? -1 : 1;
      if (left > right) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [sortDirection, sortKey, farmers]);

  const totalPages = Math.max(1, Math.ceil(sortedFarmers.length / pageSize));
  const pagedFarmers = sortedFarmers.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: 'name' | 'region' | 'location') => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading farmers…</div>;
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7f9f7', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('name')}>Name</th>
              <th style={{ padding: '0.75rem' }}>Email</th>
              <th style={{ padding: '0.75rem' }}>Phone</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('region')}>Region</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('location')}>Location</th>
              <th style={{ padding: '0.75rem' }}>Organization</th>
              <th style={{ padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedFarmers.map((farmer) => (
              <tr key={farmer.id} style={{ borderTop: '1px solid #e8efe8' }}>
                <td style={{ padding: '0.75rem' }}>{farmer.name}</td>
                <td style={{ padding: '0.75rem' }}>{farmer.email ?? '—'}</td>
                <td style={{ padding: '0.75rem' }}>{farmer.phone ?? '—'}</td>
                <td style={{ padding: '0.75rem' }}>{farmer.region}</td>
                <td style={{ padding: '0.75rem' }}>{farmer.location ?? '—'}</td>
                <td style={{ padding: '0.75rem' }}>
                  {farmer.organization_id ? organizationNames[farmer.organization_id] ?? farmer.organization_id : '—'}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {onView && (
                      <Button size="sm" variant="secondary" leftIcon={Eye} onClick={() => onView(farmer)}>
                        View
                      </Button>
                    )}
                    {onEdit && (
                      <Button size="sm" variant="accent" leftIcon={Edit3} onClick={() => onEdit(farmer)}>
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button size="sm" variant="danger" leftIcon={Trash2} onClick={() => onDelete(farmer)}>
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
          Showing {sortedFarmers.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedFarmers.length)} of {sortedFarmers.length}
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
