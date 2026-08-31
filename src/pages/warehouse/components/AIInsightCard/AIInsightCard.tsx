import React from 'react';
import { 
  X, 
  Bookmark, 
  AlertTriangle, 
  Info, 
  Zap,
  Tag,
  Package,
  Layers,
  MapPin,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { MiniPreview } from '../MiniPreview/MiniPreview';
import { AIInsight } from '@/types/warehouse';
import styles from './AIInsightCard.module.css';

interface AIInsightCardProps {
  insight: AIInsight;
  onDismiss: (id: string) => void;
  onSave: (id: string) => void;
  onAction: (id: string, action: string) => void;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ 
  insight, 
  onDismiss, 
  onSave, 
  onAction 
}) => {
  const getSeverityIcon = () => {
    switch (insight.severity) {
      case 'critical': return <AlertTriangle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'opportunity': return <Zap size={20} />;
      case 'info': return <Info size={20} />;
      default: return <Sparkles size={20} />;
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'sku': return <Package size={12} />;
      case 'zone': return <MapPin size={12} />;
      case 'batch': return <Layers size={12} />;
      case 'supplier': return <Tag size={12} />;
      default: return <Tag size={12} />;
    }
  };

  return (
    <div className={`${styles.card} ${styles[insight.severity]}`}>
      <div className={styles.header}>
        <div className={styles.categoryInfo}>
          <div className={`${styles.iconCircle} ${styles[insight.severity + 'Icon']}`}>
            {getSeverityIcon()}
          </div>
          <div className={styles.categoryTexts}>
            <span className={styles.categoryName}>{insight.category}</span>
            <span className={styles.timestamp}>{new Date(insight.generatedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <button className={styles.dismissBtn} onClick={() => onDismiss(insight.id)}>
          <X size={16} />
        </button>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.textContent}>
          <h3 className={styles.title}>{insight.title}</h3>
          <p className={styles.description}>{insight.description}</p>
          
          {insight.affectedEntities && insight.affectedEntities.length > 0 && (
            <div className={styles.entities}>
              {insight.affectedEntities.map((entity, idx) => (
                <div key={idx} className={styles.entityChip}>
                  {getEntityIcon(entity.type)}
                  <span>{entity.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {insight.supportingDataType && (
          <div className={styles.vizArea}>
            <MiniPreview 
              type={insight.supportingDataType} 
              value={insight.supportingDataType === 'kpi' ? insight.supportingData : undefined}
              data={Array.isArray(insight.supportingData) ? insight.supportingData : undefined}
            />
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.primaryActions}>
          {insight.recommendedActions?.map((action, idx) => (
            <Button 
              key={idx} 
              variant={idx === 0 ? 'primary' : 'secondary'} 
              size="sm"
              onClick={() => onAction(insight.id, action.label)}
            >
              {action.label}
            </Button>
          ))}
        </div>
        <div className={styles.secondaryActions}>
          <Button 
            variant="ghost" 
            size="sm" 
            leftIcon={Bookmark}
            onClick={() => onSave(insight.id)}
          >
            {insight.saved ? 'Saved' : 'Save'}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            leftIcon={X}
            onClick={() => onDismiss(insight.id)}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
};
