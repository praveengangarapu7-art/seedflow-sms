import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { Plus, Clipboard, Calendar, Tag } from 'lucide-react';
import styles from './PlotDetailModal.module.css';

interface PlotCell {
  plotNumber: string;
  row: number;
  col: number;
  entryCode: string;
  replication: number;
  area: number;
  status: 'Planned' | 'Sown' | 'Growing' | 'Harvested' | 'Failed';
}

interface TrialEntry {
  code: string;
  name: string;
  type: 'Candidate' | 'Check' | 'Control';
  germplasmRef?: string;
  source: string;
}

interface PhenotypeObservation {
  id: string;
  date: string;
  observedBy: string;
  growthStage: string;
  method: string;
  measurements: Array<{ trait: string; value: number | string; unit?: string }>;
}

interface PlotDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  plot: PlotCell | null;
  entry: TrialEntry | null;
  locationName: string;
  observations: PhenotypeObservation[];
  onRecordObservation: (plotContext: { plotNumber: string; entryCode: string }) => void;
}

export function PlotDetailModal({
  isOpen,
  onClose,
  plot,
  entry,
  locationName,
  observations,
  onRecordObservation
}: PlotDetailModalProps) {
  if (!plot) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Plot Details — ${plot.plotNumber}`}
      size="md"
    >
      <div className={styles.container}>
        {/* Core Plot & Entry Specs */}
        <div className={styles.grid}>
          <div className={styles.panel}>
            <span className={styles.sectionTitle}>Plot Information</span>
            <div className={styles.detailsList}>
              <div className={styles.detailItem}>
                <span className={styles.label}>Location</span>
                <span className={styles.val}>{locationName}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Grid Position</span>
                <span className={styles.val}>Row {plot.row}, Column {plot.col}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Replication</span>
                <span className={styles.val}>Rep {plot.replication}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Area</span>
                <span className={styles.val}>{plot.area} sqm</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Status</span>
                <StatusBadge status={plot.status === 'Growing' ? 'Active' : plot.status} />
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <span className={styles.sectionTitle}>Genotype / Entry Details</span>
            {entry ? (
              <div className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Entry Code</span>
                  <span className={`${styles.val} ${styles.mono}`}>{entry.code}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Line Name</span>
                  <span className={styles.val} style={{ fontWeight: 600 }}>{entry.name}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Type</span>
                  <span className={styles.chip}>{entry.type}</span>
                </div>
                {entry.germplasmRef && (
                  <div className={styles.detailItem}>
                    <span className={styles.label}>Germplasm Ref</span>
                    <span className={styles.val}>{entry.germplasmRef}</span>
                  </div>
                )}
                <div className={styles.detailItem}>
                  <span className={styles.label}>Source</span>
                  <span className={styles.val}>{entry.source}</span>
                </div>
              </div>
            ) : (
              <p className={styles.noData}>No entry metadata linked to code {plot.entryCode}</p>
            )}
          </div>
        </div>

        {/* Observation History */}
        <div className={styles.observationsSection}>
          <div className={styles.observationsHeader}>
            <span className={styles.sectionTitle}>Observation History ({observations.length})</span>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => {
                onRecordObservation({ plotNumber: plot.plotNumber, entryCode: plot.entryCode });
                onClose();
              }}
            >
              Record Observation
            </Button>
          </div>

          {observations.length > 0 ? (
            <div className={styles.obsList}>
              {observations.map((obs) => (
                <div key={obs.id} className={styles.obsCard}>
                  <div className={styles.obsHeader}>
                    <div className={styles.obsMeta}>
                      <Calendar size={12} className={styles.obsIcon} />
                      <span className={styles.obsDate}>{obs.date}</span>
                      <span className={styles.obsStage}>{obs.growthStage}</span>
                    </div>
                    <span className={styles.obsId}>{obs.id}</span>
                  </div>
                  <div className={styles.obsBody}>
                    <div className={styles.measurements}>
                      {obs.measurements.map((m, idx) => (
                        <div key={idx} className={styles.measurementBadge}>
                          <Tag size={10} style={{ marginRight: 4 }} />
                          <span>{m.trait}: <strong>{m.value}{m.unit ? ` ${m.unit}` : ''}</strong></span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.obsFooter}>
                      <span>Observed by: <strong>{obs.observedBy}</strong></span>
                      <span className={styles.obsMethod}>{obs.method}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Clipboard size={24} className={styles.emptyIcon} />
              <p className={styles.emptyText}>No observations recorded yet for this plot.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
