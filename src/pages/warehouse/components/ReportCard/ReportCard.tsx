import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Bookmark } from 'lucide-react';
import { Badge } from '@/components/common/Badge/Badge';
import { MiniPreview } from '../MiniPreview/MiniPreview';
import { ReportDefinition } from '@/types/warehouse';
import styles from './ReportCard.module.css';

interface ReportCardProps {
  report: ReportDefinition;
  onClick: () => void;
  onToggleSave: (id: string) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onClick, onToggleSave }) => {
  // @ts-ignore
  const Icon = LucideIcons[report.iconName] || LucideIcons.FileText;

  const getCategoryVariant = (category: string) => {
    switch (category) {
      case 'Inventory': return 'info';
      case 'Operational': return 'active';
      case 'Financial': return 'warning';
      case 'Compliance': return 'success';
      case 'Quality': return 'neutral';
      case 'AI insights': return 'success'; // special color handled in CSS
      default: return 'neutral';
    }
  };

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.topRow}>
        <div className={styles.iconBadge}>
          <Icon size={18} />
        </div>
        <Badge 
          variant={getCategoryVariant(report.category) as any}
          className={report.category === 'AI insights' ? styles.aiBadge : ''}
        >
          {report.category}
        </Badge>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{report.title}</h3>
        <p className={styles.description}>{report.description}</p>
      </div>

      <div className={styles.previewArea}>
        <MiniPreview 
          type={report.miniPreviewType} 
          value={report.miniPreviewValue}
          data={report.miniPreviewData}
          segments={report.miniPreviewSegments}
        />
      </div>

      <div className={styles.footer}>
        <span className={styles.lastGenerated}>
          {report.lastGenerated || 'Generated 2h ago'}
        </span>
        <div className={styles.actions}>
          <button 
            className={`${styles.saveBtn} ${report.saved ? styles.saved : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(report.id);
            }}
          >
            <Bookmark size={16} fill={report.saved ? 'currentColor' : 'none'} />
          </button>
          <span className={styles.viewLink}>View report →</span>
        </div>
      </div>
    </div>
  );
};
