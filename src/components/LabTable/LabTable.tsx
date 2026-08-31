import { useMemo, useState } from 'react';
import { Edit3, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import type { OrganizationRow } from '@/services/seedLotRealtimeClient';

interface LabTableProps {
  labs: OrganizationRow[];
  loading?: boolean;
  onEdit?: (lab: OrganizationRow) => void;
  onDelete?: (lab: OrganizationRow) => void;
  onView?: (lab: OrganizationRow) => void;
}

export function LabTable({ labs, loading = false, onEdit, onDelete, onView }: LabTableProps) {
  const [sortKey, setSortKey] = useState<'name' | 'location' | 'contact_person'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const sortedLabs = useMemo(() => {
    const copy = [...labs];
    copy.sort((a, b) => {
      const left = (a[sortKey] ?? '').toString().toLowerCase();
      const right = (b[sortKey] ?? '').toString().toLowerCase();
      if (left < right) return sortDirection === 'asc' ? -1 : 1;
      if (left > right) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [sortDirection, sortKey, labs]);

  const totalPages = Math.max(1, Math.ceil(sortedLabs.length / pageSize));
  const pagedLabs = sortedLabs.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: 'name' | 'location' | 'contact_person') => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading labs…</div>;
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7f9f7', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('name')}>Name</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('location')}>Location</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('contact_person')}>Contact Person</th>
              <th style={{ padding: '0.75rem' }}>Certification Type</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              <th style={{ padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedLabs.map((lab) => (
              <tr key={lab.id} style={{ borderTop: '1px solid #e8efe8' }}>
                <td style={{ padding: '0.75rem' }}>{lab.name}</td>
                <td style={{ padding: '0.75rem' }}>{lab.location ?? '—'}</td>
                <td style={{ padding: '0.75rem' }}>{lab.contact_person ?? '—'}</td>
                <td style={{ padding: '0.75rem' }}>
                  {lab.certification_type ?? <span style={{ color: '#c0392b' }}>Missing</span>}
                </td>
                <td style={{ padding: '0.75rem' }}>{lab.active ? 'Active' : 'Inactive'}</td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {onView && (
                      <Button size="sm" variant="secondary" leftIcon={Eye} onClick={() => onView(lab)}>
                        View
                      </Button>
                    )}
                    {onEdit && (
                      <Button size="sm" variant="accent" leftIcon={Edit3} onClick={() => onEdit(lab)}>
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button size="sm" variant="danger" leftIcon={Trash2} onClick={() => onDelete(lab)}>
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
          Showing {sortedLabs.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedLabs.length)} of {sortedLabs.length}
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
