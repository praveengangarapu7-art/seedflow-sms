import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Factory, Sparkles, AlertCircle, FileText, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { Badge } from '@/components/common/Badge/Badge';
import { processingNav } from '@/config/processingNav';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import defaultBatches from '@/data/processing/batches';
import { ProcessingBatch } from '@/types/processing';
import { usePermission } from '@/hooks/usePermission';
import styles from './BatchDetail.module.css';

const LIFECYCLE_STEPS = [
  { key: 'Planned', label: 'Planned' },
  { key: 'Cleaning', label: 'Cleaning' },
  { key: 'Drying', label: 'Drying' },
  { key: 'Grading', label: 'Grading' },
  { key: 'Treatment', label: 'Treatment' },
  { key: 'Packaging', label: 'Packaging' },
  { key: 'Completed', label: 'Completed' },
];

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { items, update } = useRealtimeMockStore<ProcessingBatch>(defaultBatches);

  const canUpdateStage = usePermission('update_batch_stage');
  const canSendToLab = usePermission('send_sample_to_lab');
  const canPauseResume = usePermission('pause_resume_batch');
  const canApproveDispatch = usePermission('approve_finished_lot_dispatch');
  const canInProcessQC = usePermission('in_process_quality_check');
  const canFinalQC = usePermission('final_quality_inspection');
  const canViewYieldLoss = usePermission('view_batch_yield_loss_tab');
  const canRecall = usePermission('initiate_recall');

  const batch = useMemo(() => {
    return items.find(b => b.id === id) || null;
  }, [items, id]);

  const [activeTab, setActiveTab] = useState('overview');

  const stepIndex = useMemo(() => {
    if (!batch) return 0;
    return LIFECYCLE_STEPS.findIndex(s => s.key === batch.currentStage);
  }, [batch]);

  if (!batch) {
    return (
      <ModuleLayout moduleName="Processing" moduleIcon={Factory} navItems={processingNav}>
        <div style={{ padding: '24px' }}>
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/processing/batches')}>
            Back to Batches
          </Button>
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <h3>Batch not found</h3>
            <p>The batch ID {id} does not exist in the system.</p>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  const handleUpdateStage = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < LIFECYCLE_STEPS.length) {
      const nextStage = LIFECYCLE_STEPS[nextIndex].key as any;
      update(batch.id, {
        currentStage: nextStage,
        progress: nextIndex === LIFECYCLE_STEPS.length - 1 ? 100 : Math.round((nextIndex / (LIFECYCLE_STEPS.length - 1)) * 100),
        status: nextStage === 'Completed' ? 'Completed' : 'In Progress',
      });
      addToast(`Batch transitioned to ${nextStage} stage.`, 'success');
    }
  };

  const handleSimulateRecall = () => {
    addToast('Recall process simulated. Downstream notifications drafted.', 'error');
  };

  const tabsConfig = [
    { key: 'overview', label: 'Overview' },
    { key: 'genealogy', label: 'Genealogy' },
    { key: 'parameters', label: 'Stage Parameters' },
    { key: 'quality', label: 'Quality Checkpoints' },
    { key: 'lab', label: 'Lab Results' },
    ...(canViewYieldLoss ? [{ key: 'yield', label: 'Yield & Loss' }] : []),
  ];

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={Factory} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <Button variant="ghost" leftIcon={ArrowLeft} onClick={() => navigate('/processing/batches')} style={{ marginBottom: '8px', padding: '0' }}>
            Back to Batches
          </Button>
          <h1 className={styles.pageTitle}>Batch Details: {batch.id}</h1>
          <p className={styles.pageSubtitle}>
            {batch.crop} — {batch.variety} · Plant: {batch.plant} · Operator: {batch.operator}
          </p>
        </div>
        <div className={styles.pageActions}>
          {batch.currentStage !== 'Completed' && canUpdateStage && (
            <Button variant="primary" onClick={handleUpdateStage}>
              Advance to Next Stage
            </Button>
          )}
          {batch.status === 'In Progress' && canPauseResume && (
            <Button variant="danger" onClick={() => {
              update(batch.id, { status: 'Quality Hold' });
              addToast('Batch paused.', 'warning');
            }}>
              Pause
            </Button>
          )}
          {batch.currentStage === 'Completed' && canApproveDispatch && (
            <Button variant="primary" onClick={() => addToast('Finished lot approved for dispatch.', 'success')}>
              Approve for Dispatch
            </Button>
          )}
          {canSendToLab && (
            <Button variant="secondary" onClick={() => addToast('Lab sample request submitted.', 'success')}>
              Send Sample to Lab
            </Button>
          )}
          <Button variant="secondary" onClick={() => addToast('Batch report PDF triggered.', 'info')}>
            Print Batch Card
          </Button>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Stepper */}
      <div className={styles.stepperWrapper}>
        <Stepper steps={LIFECYCLE_STEPS} currentStep={stepIndex} />
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <Tabs tabs={tabsConfig} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <div className={styles.contentArea}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className={styles.detailGrid}>
            <div>
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>Batch General Information</h3>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Source Lots:</span>
                  <span className={styles.specVal}>{batch.sourceLots.join(', ')}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Recipe ID:</span>
                  <span className={styles.specVal} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {batch.recipeId} <ArrowUpRight size={14} style={{ cursor: 'pointer' }} onClick={() => navigate('/processing/recipes')} />
                  </span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Target Quality Grade:</span>
                  <span className={styles.specVal}>{batch.targetGrade}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Input Quantity:</span>
                  <span className={styles.specVal}>{batch.inputQuantity.toLocaleString()} kg</span>
                </div>
                {batch.startedDate && (
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Started Date:</span>
                    <span className={styles.specVal}>{new Date(batch.startedDate).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className={styles.aiInsightCard}>
                <div className={styles.aiIconWrap}>
                  <Sparkles size={18} />
                </div>
                <div className={styles.aiTextGroup}>
                  <span className={styles.aiInsightTitle}>AI Processing Insight</span>
                  <span className={styles.aiInsightBody}>
                    Recovery rate for {batch.variety} stands at 84.1% which is 1.2% higher than standard target. Estimated final Lot size: {(batch.inputQuantity * 0.841).toFixed(0)} kg.
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>Status Snapshot</h3>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Batch Status:</span>
                  <span className={styles.specVal}>
                    <Badge variant={batch.status === 'Completed' ? 'success' : batch.status === 'In Progress' ? 'info' : batch.status === 'Quality Hold' ? 'warning' : 'danger'}>{batch.status}</Badge>
                  </span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Current Stage:</span>
                  <span className={styles.specVal}>{batch.currentStage}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Current Progress:</span>
                  <span className={styles.specVal}>{batch.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GENEALOGY TAB */}
        {activeTab === 'genealogy' && (
          <div className={styles.genealogyContainer}>
            <div className={styles.treeNode}>
              <div className={styles.nodeTitle}>Raw Seed Source Lot</div>
              <div className={styles.nodeMeta}>{batch.sourceLots[0]}</div>
              <div className={styles.nodeMeta}>Harvest Season: Kharif 2026</div>
            </div>
            <div className={styles.treeLink} />
            <div className={`${styles.treeNode} ${styles.treeNodeActive}`}>
              <div className={styles.nodeTitle}>Processing Batch (Active)</div>
              <div className={styles.nodeMeta}>{batch.id} - {batch.variety}</div>
              <div className={styles.nodeMeta}>Current: {batch.currentStage}</div>
            </div>
            <div className={styles.treeLink} />
            
            <div className={styles.treeConnectorRow}>
              <div className={styles.treeMultiChildren}>
                <div className={styles.treeNode}>
                  <div className={styles.nodeTitle}>Sub-lot LOT-COT-2026-A</div>
                  <div className={styles.nodeMeta}>Final Tagged Grade: Certified</div>
                  <div className={styles.nodeMeta}>Target size: 4,000 kg</div>
                </div>
                <div className={styles.treeNode}>
                  <div className={styles.nodeTitle}>Sub-lot LOT-COT-2026-B</div>
                  <div className={styles.nodeMeta}>Final Tagged Grade: Foundation</div>
                  <div className={styles.nodeMeta}>Target size: 2,500 kg</div>
                </div>
              </div>
            </div>

            <div className={styles.recallBox}>
              <div>
                <div className={styles.recallTitle}>Recall Readiness Profile</div>
                <div className={styles.recallDesc}>
                  Simulate downstream recalling against distributors if any quality anomalies are detected.
                </div>
              </div>
              {canRecall && (
                <Button variant="danger" leftIcon={AlertCircle} onClick={handleSimulateRecall}>
                  Simulate Recall
                </Button>
              )}
            </div>
          </div>
        )}

        {/* STAGE PARAMETERS TAB */}
        {activeTab === 'parameters' && (
          <div>
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>Cleaning Parameters</h3>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Air Flow Rate:</span>
                <span className={styles.specVal}>42 m³/min</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Mesh Screen Size:</span>
                <span className={styles.specVal}>4.5 mm</span>
              </div>
            </div>
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>Drying Parameters</h3>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Drying Temp Target:</span>
                <span className={styles.specVal}>40°C</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Target Moisture:</span>
                <span className={styles.specVal}>8.5%</span>
              </div>
            </div>
          </div>
        )}

        {/* QUALITY CHECKPOINTS TAB */}
        {activeTab === 'quality' && (
          <div className={styles.detailGrid}>
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>Pre-processing QC</h3>
              {batch.qualityCheckpoints.pre ? (
                <>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Inspector:</span>
                    <span className={styles.specVal}>{batch.qualityCheckpoints.pre.inspectorName}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Moisture % / Purity %:</span>
                    <span className={styles.specVal}>{batch.qualityCheckpoints.pre.moisture}% / {batch.qualityCheckpoints.pre.purity}%</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Decision:</span>
                    <span className={styles.specVal} style={{ color: '#137333', fontWeight: 'bold' }}>Passed</span>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: '13px', color: '#5A6E76' }}>No pre-processing check logged.</p>
              )}
            </div>

            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>In-process QC</h3>
              {batch.qualityCheckpoints.inProcess ? (
                <>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Inspector:</span>
                    <span className={styles.specVal}>{batch.qualityCheckpoints.inProcess.inspectorName}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Decision:</span>
                    <span className={styles.specVal} style={{ color: '#137333', fontWeight: 'bold' }}>Passed</span>
                  </div>
                </>
              ) : (
                <div>
                  <p style={{ fontSize: '13px', color: '#5A6E76' }}>No in-process check logged yet.</p>
                  {canInProcessQC && (
                    <Button variant="secondary" size="sm" onClick={() => addToast('In-process QC check recorded.', 'success')} style={{ marginTop: '8px' }}>
                      + Record in-process check
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>Final QC</h3>
              <div>
                <p style={{ fontSize: '13px', color: '#5A6E76' }}>No final inspection check logged yet.</p>
                {canFinalQC && (
                  <Button variant="secondary" size="sm" onClick={() => addToast('Final QC inspection recorded.', 'success')} style={{ marginTop: '8px' }}>
                    + Record final inspection
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LAB RESULTS TAB */}
        {activeTab === 'lab' && (
          <div>
            {batch.labResults.length > 0 ? (
              batch.labResults.map(res => (
                <div key={res.sampleId} className={styles.infoCard}>
                  <h3 className={styles.cardTitle}>Sample ID: {res.sampleId}</h3>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Test Status:</span>
                    <span className={styles.specVal}>{res.status}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Germination / Moisture:</span>
                    <span className={styles.specVal}>{res.germination}% / {res.moisture}%</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Vigor Level:</span>
                    <span className={styles.specVal}>{res.vigor}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <FileText size={40} style={{ color: '#94A3AB', marginBottom: '8px' }} />
                <p style={{ fontSize: '13px', color: '#5A6E76', margin: '0' }}>No lab results linked to this batch.</p>
                {canSendToLab && (
                  <Button variant="secondary" size="sm" onClick={() => addToast('Sample submitted to laboratory module.', 'success')} style={{ marginTop: '12px' }}>
                    Submit First Sample
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* YIELD & LOSS TAB */}
        {activeTab === 'yield' && (
          <div className={styles.sankeyContainer}>
            <div className={styles.sankeyBarGroup}>
              <div className={styles.sankeyLabelRow}>
                <span>Input Quantity</span>
                <span>{batch.inputQuantity.toLocaleString()} kg</span>
              </div>
              <div className={styles.sankeyProgress}>
                <div className={styles.sankeyFill} style={{ width: '100%' }} />
              </div>
            </div>

            <div className={styles.sankeyBarGroup}>
              <div className={styles.sankeyLabelRow}>
                <span>Grading & Sieve Losses</span>
                <span>{batch.losses.grading.toLocaleString()} kg</span>
              </div>
              <div className={styles.sankeyProgress}>
                <div className={styles.sankeyLoss} style={{ width: `${(batch.losses.grading / batch.inputQuantity) * 100}%` }} />
              </div>
            </div>

            <div className={styles.sankeyBarGroup}>
              <div className={styles.sankeyLabelRow}>
                <span>Cleaning Trash Removed</span>
                <span>{batch.losses.cleaning.toLocaleString()} kg</span>
              </div>
              <div className={styles.sankeyProgress}>
                <div className={styles.sankeyLoss} style={{ width: `${(batch.losses.cleaning / batch.inputQuantity) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

      </div>
    </ModuleLayout>
  );
}
