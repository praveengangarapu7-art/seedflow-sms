import { Eye } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { healthScoreClass } from '@/pages/production/fieldInspectionData';
import styles from '@/pages/production/production.module.css';

export interface FieldInspectionRow {
  id: string;
  inspectionCode: string;
  farmId: string;
  farmName: string;
  cropStage: string;
  inspectorName: string;
  healthScore: number;
  diseaseDetected: boolean;
  diseaseName?: string;
  inspectionDate?: string;
}

export interface FieldInspectionGroup {
  farmId: string;
  farmName: string;
  inspections: FieldInspectionRow[];
}

interface FieldInspectionTableProps {
  groups: FieldInspectionGroup[];
  loading?: boolean;
  onView?: (row: FieldInspectionRow) => void;
}

export function FieldInspectionTable({ groups, loading = false, onView }: FieldInspectionTableProps) {
  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading inspections…</div>;
  }

  return (
    <div>
      {groups.map((group) => (
        <div key={group.farmId} className={styles.groupCard}>
          <div className={styles.groupHeader}>
            <h3 className={styles.groupTitle}>{group.farmName}</h3>
            <span className={styles.groupMeta}>
              {group.inspections.length} inspection{group.inspections.length === 1 ? '' : 's'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7f9f7', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                  <th style={{ padding: '0.75rem' }}>Crop Stage</th>
                  <th style={{ padding: '0.75rem' }}>Health Score</th>
                  <th style={{ padding: '0.75rem' }}>Disease</th>
                  <th style={{ padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.inspections.map((row) => (
                  <tr
                    key={row.id}
                    style={{ borderTop: '1px solid #e8efe8', cursor: onView ? 'pointer' : 'default' }}
                    onClick={() => onView?.(row)}
                  >
                    <td style={{ padding: '0.75rem' }}>{row.inspectionDate ?? '—'}</td>
                    <td style={{ padding: '0.75rem' }}>{row.cropStage}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`${styles.healthBadge} ${styles[healthScoreClass(row.healthScore)] ?? ''}`}>
                        {row.healthScore}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {row.diseaseDetected ? (
                        <span className={styles.diseaseTag}>{row.diseaseName ?? 'Detected'}</span>
                      ) : (
                        <span className={styles.noneTag}>None</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {onView && (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={Eye}
                          onClick={(e) => {
                            e.stopPropagation();
                            onView(row);
                          }}
                        >
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
