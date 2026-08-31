import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { statusBadgeClass } from '@/pages/production/cropPlanningData';
import styles from '@/pages/production/production.module.css';

export interface CropPlanRow {
  id: string;
  planCode: string;
  farmerName: string;
  farmName: string;
  varietyName: string;
  targetYield?: number;
  sowingDate?: string;
  harvestDate?: string;
  status: string;
}

interface CropPlanningTableProps {
  plans: CropPlanRow[];
  loading?: boolean;
  onView?: (plan: CropPlanRow) => void;
}

type SortKey = 'farmerName' | 'farmName' | 'varietyName' | 'targetYield' | 'sowingDate' | 'harvestDate' | 'status';

export function CropPlanningTable({ plans, loading = false, onView }: CropPlanningTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('sowingDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const sortedPlans = useMemo(() => {
    const copy = [...plans];
    copy.sort((a, b) => {
      const left = (a[sortKey] ?? '').toString().toLowerCase();
      const right = (b[sortKey] ?? '').toString().toLowerCase();
      if (left < right) return sortDirection === 'asc' ? -1 : 1;
      if (left > right) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [sortDirection, sortKey, plans]);

  const totalPages = Math.max(1, Math.ceil(sortedPlans.length / pageSize));
  const pagedPlans = sortedPlans.slice((page - 1) * pageSize, page * pageSize);

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
    return <div style={{ padding: '1rem' }}>Loading crop plans…</div>;
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7f9f7', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('farmerName')}>Farmer Name</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('farmName')}>Farm</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('varietyName')}>Variety</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('targetYield')}>Target Yield</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('sowingDate')}>Sowing Date</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('harvestDate')}>Harvest Date</th>
              <th style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSort('status')}>Status</th>
              <th style={{ padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedPlans.map((plan) => (
              <tr key={plan.id} style={{ borderTop: '1px solid #e8efe8' }}>
                <td style={{ padding: '0.75rem' }}>{plan.farmerName}</td>
                <td style={{ padding: '0.75rem' }}>{plan.farmName}</td>
                <td style={{ padding: '0.75rem' }}>{plan.varietyName}</td>
                <td style={{ padding: '0.75rem' }}>{plan.targetYield != null ? `${plan.targetYield.toLocaleString()} kg` : '—'}</td>
                <td style={{ padding: '0.75rem' }}>{plan.sowingDate ?? '—'}</td>
                <td style={{ padding: '0.75rem' }}>{plan.harvestDate ?? '—'}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span className={`${styles.statusBadge} ${styles[statusBadgeClass(plan.status)] ?? ''}`}>{plan.status}</span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {onView && (
                    <Button size="sm" variant="secondary" leftIcon={Eye} onClick={() => onView(plan)}>
                      View
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <span>
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedPlans.length)} of {sortedPlans.length}
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
