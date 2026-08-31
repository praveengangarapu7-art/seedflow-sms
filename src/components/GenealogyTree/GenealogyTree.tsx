import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import {
  SEED_LOT_STAGES,
  type GenealogyResult,
  type RealtimeSeedLot,
  type SeedLotStage,
  type TestingStatus,
} from '@/services/seedLotRealtimeClient';
import styles from './GenealogyTree.module.css';

const STAGE_BADGE_CLASS: Record<SeedLotStage, string> = {
  Breeder: styles.stageBreeder,
  Foundation: styles.stageFoundation,
  Certified: styles.stageCertified,
};

const TESTING_BADGE_CLASS: Record<TestingStatus, string> = {
  not_submitted: styles.testBadgeNotSubmitted,
  testing: styles.testBadgeTesting,
  certified: styles.testBadgeCertified,
  rejected: styles.testBadgeRejected,
};

const TESTING_LABEL: Record<TestingStatus, string> = {
  not_submitted: 'Not Tested',
  testing: 'Testing',
  certified: 'Certified',
  rejected: 'Rejected',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Lot created',
  UPDATE: 'Lot updated',
  DELETE: 'Lot deleted',
  ALLOCATE: 'Quantity allocated',
  RELEASE: 'Allocation released',
  QUANTITY_ALLOCATED: 'Available quantity decreased',
  QUANTITY_RELEASED: 'Available quantity restored',
};

interface LinePath {
  id: string;
  d: string;
  highlighted: boolean;
}

/**
 * The visual genealogy tree — Parent Lot -> Harvest -> Test -> Split ->
 * Current Lot, all annotated onto the same stage-row/connector-line tree:
 * the tree structure itself IS the parent-lot lineage, each node's harvest
 * date and testing-status badge cover Harvest/Test, and a "Split into N"
 * annotation marks a lot with more than one child. "Trace Origin" toggles a
 * highlighted backward path from the selected node to the Breeder-stage
 * root, plus the intermediate audit trail along that path.
 *
 * Deliberately its own component (not inlined into SeedLotGenealogy.tsx or
 * SeedLotDetail.tsx) so the standalone Genealogy page and the seed lot
 * detail page's Genealogy tab render from one implementation instead of
 * two copies drifting apart.
 */
export function GenealogyTree({ genealogy }: { genealogy: GenealogyResult }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(genealogy.focusLotId);
  const [traceMode, setTraceMode] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [linePaths, setLinePaths] = useState<LinePath[]>([]);

  const ancestorIds = useMemo(() => new Set(genealogy.ancestorPath.map((lot) => lot.id)), [genealogy]);

  const childCountByParent = useMemo(() => {
    const counts = new Map<string, number>();
    genealogy.nodes.forEach((node) => {
      if (!node.parent_lot_id) return;
      counts.set(node.parent_lot_id, (counts.get(node.parent_lot_id) ?? 0) + 1);
    });
    return counts;
  }, [genealogy]);

  const nodesByStage = useMemo(() => {
    const groups: Record<SeedLotStage, RealtimeSeedLot[]> = { Breeder: [], Foundation: [], Certified: [] };
    genealogy.nodes.forEach((node) => {
      groups[node.stage]?.push(node);
    });
    (Object.keys(groups) as SeedLotStage[]).forEach((stage) => {
      groups[stage].sort((a, b) => a.lot_code.localeCompare(b.lot_code));
    });
    return groups;
  }, [genealogy]);

  const recomputeLines = useCallback(() => {
    if (!containerRef.current) {
      setLinePaths([]);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const paths: LinePath[] = [];

    genealogy.nodes.forEach((node) => {
      if (!node.parent_lot_id) return;
      const parentEl = nodeRefs.current.get(node.parent_lot_id);
      const childEl = nodeRefs.current.get(node.id);
      if (!parentEl || !childEl) return;

      const p = parentEl.getBoundingClientRect();
      const c = childEl.getBoundingClientRect();
      const x1 = p.left + p.width / 2 - containerRect.left;
      const y1 = p.bottom - containerRect.top;
      const x2 = c.left + c.width / 2 - containerRect.left;
      const y2 = c.top - containerRect.top;
      const midY = (y1 + y2) / 2;

      paths.push({
        id: node.id,
        d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
        highlighted: traceMode && ancestorIds.has(node.id) && ancestorIds.has(node.parent_lot_id),
      });
    });

    setLinePaths(paths);
  }, [genealogy, traceMode, ancestorIds]);

  useLayoutEffect(() => {
    recomputeLines();
    window.addEventListener('resize', recomputeLines);
    const observer = new ResizeObserver(recomputeLines);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', recomputeLines);
      observer.disconnect();
    };
  }, [recomputeLines]);

  const selectedNode = genealogy.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedAllocations = selectedNodeId ? genealogy.allocationsByLot[selectedNodeId] ?? [] : [];
  const selectedTestSubmissions = selectedNodeId ? genealogy.testSubmissionsByLot[selectedNodeId] ?? [] : [];

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Lineage Tree</h2>
        <div className={styles.legend}>
          {SEED_LOT_STAGES.map((stage) => (
            <span key={stage} className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{ background: stage === 'Breeder' ? '#2a78d6' : stage === 'Foundation' ? '#eb6834' : '#1baf7a' }}
              />
              {stage}
            </span>
          ))}
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: '#e0a531' }} />
            On backward trace
          </span>
        </div>

        <div className={styles.treeScroll}>
          <div ref={containerRef} className={styles.treeContainer}>
            <svg className={styles.connectorSvg}>
              {linePaths.map((path) => (
                <path key={path.id} d={path.d} className={path.highlighted ? styles.connectorPathHighlighted : styles.connectorPath} />
              ))}
            </svg>

            {SEED_LOT_STAGES.map((stage) => (
              <div key={stage} className={styles.stageRow}>
                {nodesByStage[stage].map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const isOnTrace = traceMode && ancestorIds.has(node.id);
                  const allocationCount = genealogy.allocationsByLot[node.id]?.length ?? 0;
                  const splitCount = childCountByParent.get(node.id) ?? 0;
                  return (
                    <div
                      key={node.id}
                      ref={(el) => {
                        if (el) nodeRefs.current.set(node.id, el);
                        else nodeRefs.current.delete(node.id);
                      }}
                      className={`${styles.node} ${isSelected ? styles.nodeSelected : ''} ${isOnTrace ? styles.nodeOnTrace : ''}`}
                      onClick={() => setSelectedNodeId(node.id)}
                    >
                      <span className={`${styles.nodeStageBadge} ${STAGE_BADGE_CLASS[node.stage]}`}>{node.stage}</span>
                      <div className={styles.nodeLotCode}>{node.lot_code}</div>
                      <div className={styles.nodeQty}>
                        <span>Total: {node.quantity_total.toLocaleString()} {node.unit}</span>
                        <span>Available: {node.quantity_available.toLocaleString()} {node.unit}</span>
                      </div>
                      <div className={styles.nodeHarvest}>Harvested {new Date(node.production_date).toLocaleDateString()}</div>
                      <div className={styles.nodeMetaRow}>
                        <span className={`${styles.testBadge} ${TESTING_BADGE_CLASS[node.testing_status]}`}>
                          {TESTING_LABEL[node.testing_status]}
                        </span>
                        {node.id === genealogy.focusLotId ? <span className={styles.nodeAllocCount}>Current Lot</span> : null}
                      </div>
                      {allocationCount > 0 || splitCount > 0 ? (
                        <div className={styles.nodeMetaRow}>
                          {allocationCount > 0 ? (
                            <span className={styles.nodeAllocCount}>{allocationCount} allocation{allocationCount === 1 ? '' : 's'}</span>
                          ) : null}
                          {splitCount > 1 ? <span className={styles.nodeSplitCount}>Split into {splitCount} lots</span> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>{selectedNode ? selectedNode.lot_code : 'Lot Details'}</h2>
          {selectedNode ? (
            <>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Stage</span>
                  <div className={styles.detailValue}>{selectedNode.stage}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Crop / Variety</span>
                  <div className={styles.detailValue}>{selectedNode.crop} — {selectedNode.variety}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Harvested</span>
                  <div className={styles.detailValue}>{new Date(selectedNode.production_date).toLocaleDateString()}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Testing Status</span>
                  <div className={styles.detailValue}>
                    <span className={`${styles.testBadge} ${TESTING_BADGE_CLASS[selectedNode.testing_status]}`}>
                      {TESTING_LABEL[selectedNode.testing_status]}
                    </span>
                  </div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Available</span>
                  <div className={styles.detailValue}>
                    {selectedNode.quantity_available.toLocaleString()} / {selectedNode.quantity_total.toLocaleString()} {selectedNode.unit}
                  </div>
                </div>
              </div>

              <h3 className={styles.sectionTitle} style={{ fontSize: '0.95rem' }}>Test Results</h3>
              {selectedTestSubmissions.length === 0 ? (
                <div className={styles.emptyState}>No lab test submissions for this lot yet.</div>
              ) : (
                selectedTestSubmissions.map((submission) => (
                  <div key={submission.id} className={styles.testSubmissionRow}>
                    <strong>{submission.lab_organization_name}</strong> · {submission.status.replace('_', ' ')}
                    <div>
                      {submission.results.map((result) => (
                        <span key={result.test_type} className={styles.testResultChip}>
                          {result.passed ? (
                            <CheckCircle2 size={12} color="#187a43" />
                          ) : (
                            <XCircle size={12} color="#a3352b" />
                          )}
                          {result.test_type}: {result.result_value}%
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}

              <h3 className={styles.sectionTitle} style={{ fontSize: '0.95rem' }}>Allocation Chain</h3>
              {selectedAllocations.length === 0 ? (
                <div className={styles.emptyState}>No allocations recorded for this lot.</div>
              ) : (
                selectedAllocations.map((allocation) => (
                  <div key={allocation.id} className={styles.allocationRow}>
                    <strong>{allocation.quantity.toLocaleString()}</strong> to <strong>{allocation.allocated_to}</strong>
                    {allocation.crop_plan_id ? <> · plan {allocation.crop_plan_id}</> : null}
                    <div className={styles.transactionMeta}>
                      {allocation.status} · {allocation.performed_by} · {new Date(allocation.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}

              {selectedNode.id !== genealogy.root.id ? (
                <div style={{ marginTop: '1rem' }}>
                  <Button
                    variant={traceMode ? 'primary' : 'secondary'}
                    onClick={() => {
                      setTraceMode((prev) => !prev);
                      setSelectedNodeId(selectedNode.id);
                    }}
                  >
                    {traceMode ? 'Hide Trace' : 'Trace Origin'}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles.emptyState}>Click a node in the tree to see its details.</div>
          )}
        </div>

        {traceMode ? (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Backward Trace to Breeder Source</h2>
            <div className={styles.traceList}>
              {genealogy.ancestorPath.map((lot, index) => (
                <div key={lot.id} className={styles.traceStep}>
                  {index > 0 ? <span className={styles.traceArrow}>→</span> : null}
                  <span className={`${styles.nodeStageBadge} ${STAGE_BADGE_CLASS[lot.stage]}`}>{lot.stage}</span>
                  <strong>{lot.lot_code}</strong>
                </div>
              ))}
            </div>

            <h3 className={styles.sectionTitle} style={{ fontSize: '0.95rem', marginTop: '1rem' }}>
              Intermediate Transactions
            </h3>
            <div className={styles.transactionList}>
              {genealogy.transactions.map((tx) => (
                <div key={tx.id} className={styles.transactionEntry}>
                  {ACTION_LABELS[tx.action] ?? tx.action}
                  <div className={styles.transactionMeta}>
                    {tx.performed_by} · {new Date(tx.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
