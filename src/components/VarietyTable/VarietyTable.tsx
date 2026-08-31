import { useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Eye, Send, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Badge } from '@/components/common/Badge/Badge';
import type { CropVariety } from '@/services/seedLotRealtimeClient';

const STATUS_BADGE_VARIANT: Record<CropVariety['status'], 'neutral' | 'warning' | 'success'> = {
  draft: 'neutral',
  reviewed: 'warning',
  approved: 'success',
};

const STATUS_LABEL: Record<CropVariety['status'], string> = {
  draft: 'Draft',
  reviewed: 'Reviewed',
  approved: 'Approved',
};

export function VarietyStatusBadge({ status }: { status: CropVariety['status'] }) {
  return <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

interface VarietyTableProps {
  varieties: CropVariety[];
  loading?: boolean;
  canApprove: boolean;
  onEdit?: (variety: CropVariety) => void;
  onDelete?: (variety: CropVariety) => void;
  onView?: (variety: CropVariety) => void;
  onSubmitForReview?: (variety: CropVariety) => void;
  onApprove?: (variety: CropVariety) => void;
  onReject?: (variety: CropVariety) => void;
}

export function VarietyTable({
  varieties,
  loading = false,
  canApprove,
  onEdit,
  onDelete,
  onView,
  onSubmitForReview,
  onApprove,
  onReject,
}: VarietyTableProps) {
  const [sortKey, setSortKey] = useState<'name' | 'crop' | 'status'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const sortedVarieties = useMemo(() => {
    const copy = [...varieties];
    copy.sort((a, b) => {
      const left = (a[sortKey] ?? '').toString().toLowerCase();
      const right = (b[sortKey] ?? '').toString().toLowerCase();
      if (left < right) return sortDirection === 'asc' ? -1 : 1;
      if (left > right) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [sortDirection, sortKey, varieties]);

  const totalPages = Math.max(1, Math.ceil(sortedVarieties.length / pageSize));
  const pagedVarieties = sortedVarieties.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: 'name' | 'crop' | 'status') => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading varieties…</div>;
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7f9f7', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('name')}>Name</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('crop')}>Crop</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('status')}>Status</th>
              <th style={{ padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedVarieties.map((variety) => (
              <tr key={variety.id} style={{ borderTop: '1px solid #e8efe8' }}>
                <td style={{ padding: '0.75rem' }}>{variety.name}</td>
                <td style={{ padding: '0.75rem' }}>{variety.crop}</td>
                <td style={{ padding: '0.75rem' }}>
                  <VarietyStatusBadge status={variety.status} />
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {onView && (
                      <Button size="sm" variant="secondary" leftIcon={Eye} onClick={() => onView(variety)}>
                        View
                      </Button>
                    )}
                    {onEdit && variety.status !== 'approved' && (
                      <Button size="sm" variant="accent" leftIcon={Edit3} onClick={() => onEdit(variety)}>
                        Edit
                      </Button>
                    )}
                    {onSubmitForReview && variety.status === 'draft' && (
                      <Button size="sm" variant="secondary" leftIcon={Send} onClick={() => onSubmitForReview(variety)}>
                        Submit for Review
                      </Button>
                    )}
                    {onApprove && canApprove && variety.status !== 'approved' && (
                      <Button size="sm" variant="primary" leftIcon={CheckCircle2} onClick={() => onApprove(variety)}>
                        Approve
                      </Button>
                    )}
                    {onReject && canApprove && variety.status === 'reviewed' && (
                      <Button size="sm" variant="secondary" leftIcon={XCircle} onClick={() => onReject(variety)}>
                        Reject
                      </Button>
                    )}
                    {onDelete && variety.status !== 'approved' && (
                      <Button size="sm" variant="danger" leftIcon={Trash2} onClick={() => onDelete(variety)}>
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
          Showing {sortedVarieties.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedVarieties.length)} of {sortedVarieties.length}
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
