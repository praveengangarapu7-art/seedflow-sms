import React, { useState } from 'react';
import { 
  ChevronRight, 
  Warehouse, 
  LayoutGrid, 
  Columns3, 
  AlignHorizontalJustifyCenter, 
  Box, 
  MoreVertical 
} from 'lucide-react';
import styles from './LocationTree.module.css';

export interface LocationNode {
  id: string;
  label: string;
  type: 'warehouse' | 'zone' | 'rack' | 'shelf' | 'bin';
  capacity: number;
  occupied: number;
  children?: LocationNode[];
}

interface LocationTreeProps {
  data: LocationNode[];
  selectedId?: string;
  onSelect: (node: LocationNode) => void;
  onAction: (node: LocationNode, action: string) => void;
}

const TreeNode: React.FC<{
  node: LocationNode;
  level: number;
  selectedId?: string;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onSelect: (node: LocationNode) => void;
  onAction: (node: LocationNode, action: string) => void;
}> = ({ node, level, selectedId, expandedIds, toggleExpand, onSelect, onAction }) => {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const getIcon = () => {
    switch (node.type) {
      case 'warehouse': return Warehouse;
      case 'zone': return LayoutGrid;
      case 'rack': return Columns3;
      case 'shelf': return AlignHorizontalJustifyCenter;
      case 'bin': return Box;
      default: return Box;
    }
  };

  const Icon = getIcon();
  const occupancyPct = Math.round((node.occupied / node.capacity) * 100) || 0;

  return (
    <div className={styles.treeNodeContainer}>
      <div 
        className={`${styles.nodeRow} ${isSelected ? styles.selected : ''}`}
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={() => onSelect(node)}
      >
        <div className={styles.nodeMain}>
          <div 
            className={`${styles.chevron} ${isExpanded ? styles.expanded : ''} ${!hasChildren ? styles.hidden : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
          >
            <ChevronRight size={16} />
          </div>
          <Icon className={styles.nodeIcon} size={16} />
          <span className={styles.nodeLabel}>{node.label}</span>
        </div>

        <div className={styles.nodeInfo}>
          <span className={styles.occupancy}>{occupancyPct}%</span>
          <div className={styles.miniBar}>
            <div className={styles.miniFill} style={{ width: `${occupancyPct}%` }} />
          </div>
          <button className={styles.actionBtn} onClick={(e) => {
            e.stopPropagation();
            onAction(node, 'menu');
          }}>
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className={styles.children}>
          {node.children!.map(child => (
            <TreeNode 
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LocationTree: React.FC<LocationTreeProps> = ({ data, selectedId, onSelect, onAction }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([data[0]?.id]));

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={styles.treeContainer}>
      {data.map(node => (
        <TreeNode 
          key={node.id}
          node={node}
          level={0}
          selectedId={selectedId}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
          onSelect={onSelect}
          onAction={onAction}
        />
      ))}
    </div>
  );
};
