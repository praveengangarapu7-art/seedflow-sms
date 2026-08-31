import React, { useState } from 'react';
import { Calendar, User, Eye, X, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { PhenotypeObservation } from '@/types/rd';
import styles from './ObservationDetailModal.module.css';

interface ObservationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  observation: PhenotypeObservation | null;
  onApprove?: (id: string) => void;
}

export const ObservationDetailModal: React.FC<ObservationDetailModalProps> = ({
  isOpen,
  onClose,
  observation,
  onApprove
}) => {
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  if (!observation) return null;

  const isPendingReview = (observation as any).reviewed === false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Observation Details — ${observation.id}`}
      size="md"
    >
      <div className={styles.container}>
        {isPendingReview && (
          <div className={styles.pendingReviewBanner}>
            <span>⚠️ This observation is currently pending supervisor review.</span>
            {onApprove && (
              <Button 
                variant="primary" 
                size="sm" 
                leftIcon={ShieldCheck}
                onClick={() => {
                  onApprove(observation.id);
                  onClose();
                }}
              >
                Approve Now
              </Button>
            )}
          </div>
        )}

        <div className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.methodBadge}>{observation.method}</span>
            <span className={styles.stageChip}>{observation.growthStage}</span>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <Calendar size={14} />
              <span>{observation.date}</span>
            </div>
            <div className={styles.metaItem}>
              <User size={14} />
              <span>{observation.observedBy}</span>
            </div>
          </div>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.gridItem}>
            <span className={styles.label}>Trial Experiment</span>
            <strong className={styles.val}>{observation.trialId}</strong>
          </div>
          <div className={styles.gridItem}>
            <span className={styles.label}>Location ID</span>
            <strong className={styles.val}>{observation.locationId}</strong>
          </div>
          <div className={styles.gridItem}>
            <span className={styles.label}>Plot Cell</span>
            <strong className={styles.val}>{observation.plotNumber}</strong>
          </div>
          <div className={styles.gridItem}>
            <span className={styles.label}>Genotype Entry Code</span>
            <strong className={styles.monoVal}>{observation.entryCode}</strong>
          </div>
        </div>

        <div className={styles.traitsSection}>
          <h4 className={styles.sectionTitle}>Measured Trait Values</h4>
          <div className={styles.traitsList}>
            {observation.measurements.map((m, idx) => (
              <div key={idx} className={styles.traitRow}>
                <div className={styles.traitMeta}>
                  <span className={styles.traitName}>{m.trait}</span>
                  {m.protocol && <span className={styles.traitProtocol}>Protocol: {m.protocol}</span>}
                </div>
                <div className={styles.traitValues}>
                  <strong className={styles.traitVal}>
                    {m.value} {m.unit || ''}
                  </strong>
                  {m.aiConfidence !== undefined && (
                    <span className={styles.aiConfidenceBadge}>
                      AI Confidence: {m.aiConfidence}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {observation.photos && observation.photos.length > 0 && (
          <div className={styles.photosSection}>
            <h4 className={styles.sectionTitle}>Captured Media</h4>
            <div className={styles.photosGrid}>
              {observation.photos.map((photoUrl, idx) => (
                <div 
                  key={idx} 
                  className={styles.photoCard} 
                  style={{ backgroundImage: `url(${photoUrl})` }}
                  onClick={() => setLightboxPhoto(photoUrl)}
                >
                  <div className={styles.photoOverlay}>
                    <Eye size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.notesSection}>
          <h4 className={styles.sectionTitle}>Observation Notes</h4>
          <p className={styles.notesContent}>
            {observation.notes || 'No observer notes recorded.'}
          </p>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {lightboxPhoto && (
        <div className={styles.lightbox} onClick={() => setLightboxPhoto(null)}>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={() => setLightboxPhoto(null)}>
              <X size={24} />
            </button>
            <img src={lightboxPhoto} alt="Full resolution" className={styles.lightboxImg} />
          </div>
        </div>
      )}
    </Modal>
  );
};
