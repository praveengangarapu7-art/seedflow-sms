import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Plus, Minus, Maximize2, GitBranch } from 'lucide-react';
import type { GermplasmAccession } from '@/types/rd';
import styles from './PedigreeViewerModal.module.css';

interface PedigreeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rootAccession: GermplasmAccession | null;
  allAccessions: GermplasmAccession[];
}

interface TreeNode {
  accession: GermplasmAccession;
  male?: TreeNode;
  female?: TreeNode;
  x: number;
  y: number;
  depth: number;
}

const NODE_WIDTH = 150;
const NODE_HEIGHT = 60;
const LEVEL_HEIGHT = 100;
const MAX_DEPTH = 4;

export function PedigreeViewerModal({ isOpen, onClose, rootAccession, allAccessions }: PedigreeViewerModalProps) {
  const [currentRoot, setCurrentRoot] = useState<GermplasmAccession | null>(null);
  
  // Pan and Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync initial root
  useEffect(() => {
    if (isOpen && rootAccession) {
      setCurrentRoot(rootAccession);
      resetView();
    }
  }, [isOpen, rootAccession]);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 450, y: 400 }); // Center bottom
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.max(0.5, Math.min(2.0, zoom - e.deltaY * 0.001));
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Build the tree recursively
  const buildTree = (accId: string, depth: number, x: number, y: number, xOffset: number): TreeNode | undefined => {
    if (depth > MAX_DEPTH) return undefined;
    const acc = allAccessions.find(a => a.id === accId);
    if (!acc) return undefined;

    const node: TreeNode = { accession: acc, depth, x, y };

    if (acc.parentMaleId) {
      node.male = buildTree(acc.parentMaleId, depth + 1, x - xOffset, y - LEVEL_HEIGHT, xOffset / 2);
    }
    if (acc.parentFemaleId) {
      node.female = buildTree(acc.parentFemaleId, depth + 1, x + xOffset, y - LEVEL_HEIGHT, xOffset / 2);
    }

    return node;
  };

  const tree = useMemo(() => {
    if (!currentRoot) return null;
    return buildTree(currentRoot.id, 0, 0, 0, 200);
  }, [currentRoot, allAccessions]);

  if (!isOpen || !currentRoot) return null;

  const hasParents = currentRoot.parentMaleId || currentRoot.parentFemaleId;

  // Render nodes and edges
  const renderTree = (node: TreeNode) => {
    const edges: React.ReactNode[] = [];
    const nodes: React.ReactNode[] = [];

    const traverse = (n: TreeNode) => {
      // Draw edges to parents
      if (n.male) {
        // Line from bottom of parent to top of child, right angle bend
        const pX = n.male.x;
        const pY = n.male.y + NODE_HEIGHT / 2;
        const cX = n.x;
        const cY = n.y - NODE_HEIGHT / 2;
        const midY = pY + (cY - pY) / 2;
        
        edges.push(
          <path 
            key={`edge-m-${n.accession.id}`}
            d={`M ${pX} ${pY} L ${pX} ${midY} L ${cX} ${midY} L ${cX} ${cY}`}
            className={styles.edgeMale}
          />
        );
        traverse(n.male);
      }
      if (n.female) {
        const pX = n.female.x;
        const pY = n.female.y + NODE_HEIGHT / 2;
        const cX = n.x;
        const cY = n.y - NODE_HEIGHT / 2;
        const midY = pY + (cY - pY) / 2;
        
        edges.push(
          <path 
            key={`edge-f-${n.accession.id}`}
            d={`M ${pX} ${pY} L ${pX} ${midY} L ${cX} ${midY} L ${cX} ${cY}`}
            className={styles.edgeFemale}
          />
        );
        traverse(n.female);
      }

      // Draw node
      nodes.push(
        <g 
          key={`node-${n.accession.id}`} 
          transform={`translate(${n.x - NODE_WIDTH/2}, ${n.y - NODE_HEIGHT/2})`}
          className={styles.nodeGroup}
          onClick={() => setCurrentRoot(n.accession)}
        >
          <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx="8" className={styles.nodeRect} />
          <text x="12" y="20" className={styles.nodeNumber}>{n.accession.accessionNumber}</text>
          <text x="12" y="38" className={styles.nodeName}>{n.accession.name}</text>
          <text x="12" y="52" className={styles.nodeCrop}>{n.accession.crop}</text>
        </g>
      );
    };

    traverse(node);
    return { edges, nodes };
  };

  const { edges, nodes } = tree ? renderTree(tree) : { edges: [], nodes: [] };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title={`Pedigree — ${currentRoot.name}`}>
      <div className={styles.container}>
        {!hasParents ? (
          <div className={styles.emptyState}>
            <GitBranch size={48} className={styles.emptyIcon} />
            <p>No pedigree information available for this accession.</p>
            <span className={styles.emptySub}>Add parent references via the Edit form to build a pedigree.</span>
          </div>
        ) : (
          <>
            <div className={styles.controls}>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} title="Zoom In"><Plus size={16} /></button>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} title="Zoom Out"><Minus size={16} /></button>
              <button onClick={resetView} title="Reset View"><Maximize2 size={16} /></button>
            </div>
            
            {currentRoot.id !== rootAccession?.id && (
              <div className={styles.breadcrumb}>
                Viewing ancestor: {currentRoot.name} 
                <button onClick={() => setCurrentRoot(rootAccession)} className={styles.backBtn}>
                  &larr; Back to {rootAccession?.name}
                </button>
              </div>
            )}

            <svg 
              ref={svgRef}
              className={styles.svgArea} 
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {edges}
                {nodes}
              </g>
            </svg>
          </>
        )}
      </div>
    </Modal>
  );
}
