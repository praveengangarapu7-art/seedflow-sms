import { Card } from '@/components/common/Card/Card';
import { Badge } from '@/components/common/Badge/Badge';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { MapPin, GitBranch, Atom } from 'lucide-react';
import type { GermplasmAccession } from '@/types/rd';
import styles from './AccessionCard.module.css';

interface AccessionCardProps {
  accession: GermplasmAccession;
  onClick: (id: string) => void;
  index?: number;
}

const getCropCode = (crop: string) => {
  const map: Record<string, string> = {
    'Cotton': 'CT', 'Maize': 'MZ', 'Paddy': 'PD', 'Sorghum': 'SR', 
    'Sunflower': 'SF', 'Soybean': 'SB', 'Groundnut': 'GN', 'Pearl millet': 'PM',
    'Tomato': 'TM', 'Chilli': 'CH'
  };
  return map[crop] || crop.substring(0, 2).toUpperCase();
};

export function AccessionCard({ accession, onClick, index = 0 }: AccessionCardProps) {
  const hasPedigree = !!(accession.parentMaleId || accession.parentFemaleId);
  const visibleTraits = accession.traits.slice(0, 3);
  const hiddenTraitsCount = accession.traits.length - 3;
  
  // Stagger animation up to 300ms total
  const animationDelay = `${Math.min(index * 50, 300)}ms`;

  return (
    <Card 
      className={styles.card} 
      onClick={() => onClick(accession.id)}
      style={{ animationDelay }}
    >
      <div className={styles.topRow}>
        <StatusBadge status={accession.status} />
        <Badge variant="neutral">{accession.type}</Badge>
      </div>

      <div className={styles.header}>
        <div className={styles.cropBadge}>
          {getCropCode(accession.crop)}
        </div>
        <div className={styles.titleInfo}>
          <h3 className={styles.name} title={accession.name}>{accession.name}</h3>
          <span className={styles.accNumber}>{accession.accessionNumber}</span>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCell}>
          <span className={styles.statLabel}>Crop</span>
          <span className={styles.statValue}>{accession.crop}</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statLabel}>Species</span>
          <span className={styles.statValueItalic} title={accession.species}>{accession.species}</span>
        </div>
      </div>

      <div className={styles.originRow}>
        <MapPin size={12} className={styles.originIcon} />
        <span className={styles.originText}>
          {accession.origin.state ? `${accession.origin.state}, ` : ''}{accession.origin.country}
        </span>
      </div>

      <div className={styles.traitsArea}>
        {visibleTraits.map((t, i) => (
          <span key={i} className={styles.traitChip} title={`${t.name}: ${t.value} ${t.unit || ''}`}>
            {t.name}
          </span>
        ))}
        {hiddenTraitsCount > 0 && (
          <span className={styles.traitChipHidden}>+{hiddenTraitsCount} more</span>
        )}
        {accession.traits.length === 0 && (
          <span className={styles.noTraits}>No traits recorded</span>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerIcons}>
          {hasPedigree && (
            <div className={styles.iconTooltip}>
              <GitBranch size={16} className={styles.featureIcon} />
              <span className={styles.tooltipText}>Pedigree available</span>
            </div>
          )}
          {accession.hasGenomicData && (
            <div className={styles.iconTooltip}>
              <Atom size={16} className={styles.featureIcon} />
              <span className={styles.tooltipText}>Genomic data available</span>
            </div>
          )}
        </div>
        <span className={styles.viewLink}>View profile &rarr;</span>
      </div>
    </Card>
  );
}
