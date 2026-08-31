import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { statusBadgeClass } from '@/pages/production/cropPlanningData';
import type { InspectionRecord } from '@/services/api';
import styles from '@/pages/production/production.module.css';

interface InspectionTableProps {
  inspections: InspectionRecord[];
  loading?: boolean;
  approvingId?: string | null;
  onApprove?: (inspection: InspectionRecord) => void;
}

type SortKey = 'inspectionCode' | 'crop' | 'inspectionDate' | 'status';

export function InspectionTable({ inspections, loading = false, approvingId = null, onApprove }: InspectionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('inspectionDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedInspections = useMemo(() => {
    const copy = [...inspections];
    copy.sort((a, b) => {
      const left = (a[sortKey] ?? '').toString().toLowerCase();
      const right = (b[sortKey] ?? '').toString().toLowerCase();
      if (left < right) return sortDirection === 'asc' ? -1 : 1;
      if (left > right) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [sortDirection, sortKey, inspections]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading inspections…</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f7f9f7', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('inspectionCode')}>Inspection Code</th>
            <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('crop')}>Crop</th>
            <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('inspectionDate')}>Date</th>
            <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('status')}>Status</th>
            <th style={{ padding: '0.75rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedInspections.map((inspection) => (
            <tr key={inspection.id} style={{ borderTop: '1px solid #e8efe8' }}>
              <td style={{ padding: '0.75rem' }}>{inspection.inspectionCode}</td>
              <td style={{ padding: '0.75rem' }}>{inspection.crop}</td>
              <td style={{ padding: '0.75rem' }}>{inspection.inspectionDate ?? '—'}</td>
              <td style={{ padding: '0.75rem' }}>
                <span className={`${styles.statusBadge} ${styles[statusBadgeClass(inspection.status)] ?? ''}`}>{inspection.status}</span>
              </td>
              <td style={{ padding: '0.75rem' }}>
                {onApprove && inspection.status === 'Pending' ? (
                  <Button
                    size="sm"
                    variant="accent"
                    leftIcon={CheckCircle2}
                    isLoading={approvingId === inspection.id}
                    onClick={() => onApprove(inspection)}
                  >
                    Approve
                  </Button>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
