import { useMemo, useState } from 'react';
import { ClipboardList, Eye } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';

export interface FarmRow {
  id: string;
  farmerId: string;
  farmerName: string;
  crop: string;
  area?: number;
  location: string;
  soilType: string;
}

interface FarmTableProps {
  farms: FarmRow[];
  loading?: boolean;
  onView?: (farm: FarmRow) => void;
  onViewInspections?: (farm: FarmRow) => void;
}

type SortKey = 'farmerName' | 'crop' | 'area' | 'location' | 'soilType';

export function FarmTable({ farms, loading = false, onView, onViewInspections }: FarmTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('farmerName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const sortedFarms = useMemo(() => {
    const copy = [...farms];
    copy.sort((a, b) => {
      const left = (a[sortKey] ?? '').toString().toLowerCase();
      const right = (b[sortKey] ?? '').toString().toLowerCase();
      if (left < right) return sortDirection === 'asc' ? -1 : 1;
      if (left > right) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [sortDirection, sortKey, farms]);

  const totalPages = Math.max(1, Math.ceil(sortedFarms.length / pageSize));
  const pagedFarms = sortedFarms.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading farms…</div>;
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7f9f7', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('farmerName')}>Farmer Name</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('crop')}>Crop</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('area')}>Area</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('location')}>Location</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('soilType')}>Soil Type</th>
              <th style={{ padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedFarms.map((farm) => (
              <tr key={farm.id} style={{ borderTop: '1px solid #e8efe8' }}>
                <td style={{ padding: '0.75rem' }}>{farm.farmerName}</td>
                <td style={{ padding: '0.75rem' }}>{farm.crop}</td>
                <td style={{ padding: '0.75rem' }}>{farm.area != null ? `${farm.area} acres` : '—'}</td>
                <td style={{ padding: '0.75rem' }}>{farm.location}</td>
                <td style={{ padding: '0.75rem' }}>{farm.soilType}</td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {onView && (
                      <Button size="sm" variant="secondary" leftIcon={Eye} onClick={() => onView(farm)}>
                        View
                      </Button>
                    )}
                    {onViewInspections && (
                      <Button size="sm" variant="accent" leftIcon={ClipboardList} onClick={() => onViewInspections(farm)}>
                        Inspections
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
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedFarms.length)} of {sortedFarms.length}
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
