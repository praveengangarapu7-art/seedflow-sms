import { GitMerge, MapPin, Shield, Lock, EyeOff } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { ActionMenu } from '@/components/common/ActionMenu/ActionMenu';
import { Variety } from '@/types/rd';
import styles from './VarietyCard.module.css';

interface VarietyCardProps {
  variety: Variety;
  onClick: (id: string) => void;
  index: number;
  hasRegistration?: boolean;
  onAction?: (action: string, variety: Variety) => void;
}

export function VarietyCard({ variety, onClick, index, hasRegistration = false, onAction }: VarietyCardProps) {
  const getCropCode = (cropName: string): string => {
    const mapping: Record<string, string> = {
      'Cotton': 'CT',
      'Maize': 'MZ',
      'Paddy': 'PD',
      'Sorghum': 'SR',
      'Sunflower': 'SF',
      'Soybean': 'SB',
      'Groundnut': 'GN',
      'Pearl millet': 'PM',
      'Tomato': 'TM',
      'Chilli': 'CH'
    };
    return mapping[cropName] || cropName.substring(0, 2).toUpperCase();
  };

  const cropCode = getCropCode(variety.crop);

  const renderIpIcon = () => {
    if (variety.ipProtection.startsWith('PVP')) {
      return <span title="PVP Protected"><Shield size={14} className={styles.ipIcon} /></span>;
    } else if (variety.ipProtection === 'Patent') {
      return <span title="Patented"><Lock size={14} className={styles.ipIcon} /></span>;
    } else if (variety.ipProtection === 'Trade secret') {
      return <span title="Trade Secret"><EyeOff size={14} className={styles.ipIcon} /></span>;
    }
    return null;
  };

  // Stagger animation delay
  const animationDelay = `${Math.min(index * 30, 240)}ms`;

  const menuItems = [
    { label: 'View details', onClick: () => onClick(variety.id) },
    { label: 'Edit variety', onClick: () => onAction?.('edit', variety) },
    ...(!variety.registrationNumber && !hasRegistration
      ? [{ label: 'Initiate registration', onClick: () => onAction?.('register', variety) }]
      : []),
    ...(variety.status === 'Pre-release'
      ? [{ label: 'Mark as released', onClick: () => onAction?.('release', variety) }]
      : []),
    { label: 'Withdraw', onClick: () => onAction?.('withdraw', variety), variant: 'danger' as const }
  ];

  return (
    <div 
      className={styles.card} 
      style={{ animationDelay }}
      onClick={() => onClick(variety.id)}
    >
      {/* Top Row: ID, Status Badge & Action Menu */}
      <div className={styles.topRow} onClick={(e) => e.stopPropagation()}>
        <span className={styles.id}>{variety.id}</span>
        <div className={styles.topRight}>
          <StatusBadge status={variety.status === 'Pre-release' ? 'Active' : (variety.status === 'Candidate' ? 'Draft' : variety.status)} />
          <div className={styles.actionMenuWrapper}>
            <ActionMenu items={menuItems} />
          </div>
        </div>
      </div>

      {/* Header Area: Circular Badge + Title & Subtitle */}
      <div className={styles.header}>
        <div className={styles.cropBadge}>
          {cropCode}
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.name} title={variety.name}>{variety.name}</h3>
          <span className={styles.subLine}>{variety.crop} · {variety.category}</span>
        </div>
      </div>

      {/* Parent Lines Row (Pedigree) */}
      <div className={styles.pedigreeRow}>
        <span className={styles.pedigreeLabel}>Pedigree:</span>
        <div className={styles.pedigreeFlow}>
          <span className={styles.parentLine}>{variety.parentLines?.male || variety.parentMale || '♂'}</span>
          <GitMerge size={12} className={styles.pedigreeIcon} />
          <span className={styles.parentLine}>{variety.parentLines?.female || variety.parentFemale || '♀'}</span>
        </div>
      </div>

      {/* Agronomic Snapshot Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCell}>
          <span className={styles.statLabel}>Yield potential</span>
          <span className={styles.statValue}>{variety.agronomicSpecs?.yieldPotential || 0} q/ha</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statLabel}>Maturity</span>
          <span className={styles.statValue}>{variety.agronomicSpecs?.daysToMaturity || 0} days</span>
        </div>
      </div>

      {/* Recommended Zones */}
      <div className={styles.zonesRow}>
        <MapPin size={12} className={styles.pinIcon} />
        <div className={styles.chipsWrapper}>
          {variety.recommendedZones?.slice(0, 2).map((zone) => (
            <span key={zone} className={styles.zoneChip}>{zone}</span>
          ))}
          {variety.recommendedZones?.length > 2 && (
            <span className={styles.moreChip}>+{variety.recommendedZones.length - 2} more</span>
          )}
        </div>
      </div>

      {/* Key Traits Row */}
      <div className={styles.traitsRow}>
        {variety.keyTraits?.slice(0, 3).map((trait) => (
          <span key={trait} className={styles.traitChip}>{trait}</span>
        ))}
        {variety.keyTraits?.length > 3 && (
          <span className={styles.moreTraitChip}>+{variety.keyTraits.length - 3}</span>
        )}
      </div>

      {/* Footer Row */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {renderIpIcon()}
          {variety.status === 'Released' && variety.releaseYear && (
            <span className={styles.releaseBadge}>Released {variety.releaseYear}</span>
          )}
        </div>
        <span className={styles.viewLink}>View details →</span>
      </div>
    </div>
  );
}
