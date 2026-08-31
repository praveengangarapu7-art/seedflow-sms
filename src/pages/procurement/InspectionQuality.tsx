import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, ClipboardList, Timer, CheckCircle2, Sparkles,
  Search, Eye,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { ScoreRing } from '@/components/common/ScoreRing/ScoreRing';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { FileUpload } from '@/components/common/FileUpload/FileUpload';
import { useToast } from '@/components/common/Toast';
import { KpiStrip } from './components/KpiStrip/KpiStrip';
import { mockInspections } from './mockData/inspectionsData';
import { procurementNav } from '@/config/procurementNav';
import type { InspectionItem, InspectionDecision, InspectionPriority } from '@/types/procurement';
import { usePermission } from '@/hooks/usePermission';
import styles from './InspectionQuality.module.css';

const TABS = [
  { key: 'mine',      label: 'My Queue' },
  { key: 'all',       label: 'All Pending' },
  { key: 'completed', label: 'Completed Today' },
  { key: 'rejected',  label: 'Rejected' },
];

const CURRENT_INSPECTOR = 'Mohammed Khan';

const PARAMETERS: Array<{ name: string; spec: string; unit: string }> = [
  { name: 'Moisture content',   spec: '≤ 12%',      unit: '%' },
  { name: 'Genetic purity',     spec: '≥ 98%',      unit: '%' },
  { name: 'Physical purity',    spec: '≥ 98%',      unit: '%' },
  { name: 'Other crop seeds',   spec: '≤ 0.1%',     unit: '%' },
  { name: 'Weed seeds',         spec: '≤ 5/kg',     unit: '/kg' },
  { name: 'Inert matter',       spec: '≤ 2%',       unit: '%' },
  { name: 'Germination',        spec: '≥ 85%',      unit: '%' },
  { name: '1000-seed weight',   spec: 'as labeled', unit: 'g' },
  { name: 'Seed treatment',     spec: 'verified',   unit: '' },
  { name: 'Visual inspection',  spec: 'no defects', unit: '' },
];

function priorityClass(p: InspectionPriority): string {
  if (p === 'Urgent') return styles.priorityUrgent;
  if (p === 'High')   return styles.priorityHigh;
  if (p === 'Medium') return styles.priorityMedium;
  return styles.priorityLow;
}

function buildKpis(items: InspectionItem[]) {
  return [
    { label: 'Pending today',       value: String(items.length), icon: ClipboardList },
    { label: 'Avg inspection time', value: '1.4 days',           icon: Timer },
    { label: 'Pass rate',           value: '94.6%',              icon: CheckCircle2 },
    { label: 'AI assist usage',     value: '87%',                icon: Sparkles },
  ];
}

// ── Inspection Workflow Modal ────────────────────────────────────────
interface WorkflowProps {
  item: InspectionItem;
  onClose: () => void;
}

function InspectionWorkflowModal({ item, onClose }: WorkflowProps) {
  const { addToast } = useToast();
  const [params, setParams] = useState(() =>
    PARAMETERS.map((p) => ({ name: p.name, spec: p.spec, unit: p.unit, value: '', method: 'Manual', notes: '' }))
  );
  const [decision, setDecision] = useState<InspectionDecision | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [signedOff, setSignedOff] = useState(false);
  const [photos, setPhotos] = useState<Array<{ name: string; size: number }>>([]);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  function setParam(idx: number, field: 'value' | 'method' | 'notes', val: string) {
    setParams((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  }

  function paramPass(p: { value: string; spec: string }): boolean | null {
    if (!p.value) return null;
    const m = p.spec.match(/([≤≥])\s*([\d.]+)/);
    if (!m) return true;
    const val = Number(p.value);
    if (Number.isNaN(val)) return null;
    return m[1] === '≤' ? val <= Number(m[2]) : val >= Number(m[2]);
  }

  function runAi() {
    setAiRunning(true);
    setAiDone(false);
    setTimeout(() => { setAiRunning(false); setAiDone(true); }, 2000);
  }

  function handleSubmit() {
    if (!decision || !signedOff) return;
    addToast(`Inspection submitted: ${decision} for ${item.id}`, 'success');
    onClose();
  }

  const canSubmit = decision !== null && signedOff && (decision === 'Accept' || decisionNotes.trim().length > 0);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Quality inspection — ${item.id}`}
      size="xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Save & continue later</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!canSubmit}>Submit inspection</Button>
        </div>
      }
    >
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Item details</p>
        <div className={styles.itemDetailGrid}>
          <div className={styles.itemDetailRow}>
            <span className={styles.itemDetailKey}>Item</span>
            <span className={styles.itemDetailVal}>{item.lineItems[0]?.description ?? '—'}</span>
          </div>
          <div className={styles.itemDetailRow}>
            <span className={styles.itemDetailKey}>Quantity</span>
            <span className={styles.itemDetailVal}>{item.lineItems[0]?.receivedQty ?? 0} {item.lineItems[0]?.unit ?? ''}</span>
          </div>
          <div className={styles.itemDetailRow}>
            <span className={styles.itemDetailKey}>Supplier</span>
            <span className={styles.itemDetailVal}>{item.supplier}</span>
          </div>
          <div className={styles.itemDetailRow}>
            <span className={styles.itemDetailKey}>PO Reference</span>
            <span className={styles.itemDetailVal} style={{ color: 'var(--color-primary)' }}>{item.poReference}</span>
          </div>
          <div className={styles.itemDetailRow}>
            <span className={styles.itemDetailKey}>Received</span>
            <span className={styles.itemDetailVal}>{item.receivedDate}</span>
          </div>
          <div className={styles.itemDetailRow}>
            <span className={styles.itemDetailKey}>Sample size</span>
            <span className={styles.itemDetailVal}>Min 10 random bags from different stacks</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>AI pre-screen</p>
        <div className={styles.aiPanel}>
          <div className={styles.aiPanelHeader}>
            <span className={styles.aiPanelTitle}><Sparkles size={14} /> AI quality assessment</span>
            <Button variant="ghost" size="sm" onClick={runAi} disabled={aiRunning}>
              {aiRunning ? 'Analyzing…' : aiDone ? 'Re-run AI check' : 'Run AI quality check'}
            </Button>
          </div>
          {aiDone && (
            <div className={styles.aiPanelGrid}>
              <div className={styles.aiPanelStat}>
                <span className={styles.aiPanelStatKey}>Image grade</span>
                <span className={styles.aiPanelStatVal}>R1</span>
              </div>
              <div className={styles.aiPanelStat}>
                <span className={styles.aiPanelStatKey}>Visual purity</span>
                <span className={styles.aiPanelStatVal}>98.4%</span>
              </div>
              <div className={styles.aiPanelStat}>
                <span className={styles.aiPanelStatKey}>Confidence</span>
                <span className={styles.aiPanelStatVal}>94%</span>
              </div>
            </div>
          )}
          {!aiDone && !aiRunning && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
              Click "Run AI quality check" to analyze sample photos. AI takes ~30s vs ~30min manual.
            </p>
          )}
          {aiRunning && (
            <p style={{ fontSize: 12, color: 'var(--color-primary)', margin: 0 }}>
              Analyzing sample photos with computer vision…
            </p>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Quality checklist</p>
        <table className={styles.checklist}>
          <thead>
            <tr>
              <th>Parameter</th>
              <th style={{ width: 90 }}>Spec</th>
              <th style={{ width: 100 }}>Measured</th>
              <th style={{ width: 80 }}>Result</th>
              <th style={{ width: 130 }}>Method</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p, i) => {
              const result = paramPass(p);
              return (
                <tr key={i}>
                  <td>{p.name}</td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.spec}</td>
                  <td>
                    <input
                      className={styles.checklistInput}
                      placeholder={p.unit}
                      value={p.value}
                      onChange={(e) => setParam(i, 'value', e.target.value)}
                    />
                  </td>
                  <td>
                    {result === null
                      ? <span className={styles.pendingBadge}>—</span>
                      : result
                        ? <span className={styles.passBadge}>Pass</span>
                        : <span className={styles.failBadge}>Fail</span>}
                  </td>
                  <td>
                    <select
                      className={styles.checklistSelect}
                      value={p.method}
                      onChange={(e) => setParam(i, 'method', e.target.value)}
                    >
                      <option>Manual</option>
                      <option>Instrument</option>
                      <option>Lab test</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className={styles.checklistInput}
                      placeholder="Optional"
                      value={p.notes}
                      onChange={(e) => setParam(i, 'notes', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Photo evidence</p>
        <FileUpload
          label="Upload inspection photos"
          accept="image/*"
          multiple
          uploadedFiles={photos}
          onFilesAdded={(files) => setPhotos((prev) => [...prev, ...files.map((f) => ({ name: f.name, size: f.size }))])}
          onRemoveFile={(idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
        />
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Final decision</p>
        <div className={styles.decisionRow}>
          {(['Accept', 'Partial Accept', 'Reject', 'Hold'] as InspectionDecision[]).map((d) => (
            <div
              key={d}
              className={`${styles.decisionOption} ${decision === d ? styles.decisionOptionActive : ''}`}
              onClick={() => setDecision(d)}
            >
              <span className={styles.decisionLabel}>{d}</span>
              <span className={styles.decisionDesc}>
                {d === 'Accept' && 'All parameters pass'}
                {d === 'Partial Accept' && 'Some quantity rejected'}
                {d === 'Reject' && 'Entire lot fails'}
                {d === 'Hold' && 'More testing required'}
              </span>
            </div>
          ))}
        </div>
        {decision && decision !== 'Accept' && (
          <textarea
            className={styles.textarea}
            placeholder={
              decision === 'Reject'         ? 'Rejection reason (required)' :
              decision === 'Partial Accept' ? 'Accepted quantity & rejection reason' :
                                              'Reason for hold & expected resolution date'
            }
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
          />
        )}
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Sign-off</p>
        <div className={styles.signoffBox}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>Inspector:</strong> {item.assignedTo ?? CURRENT_INSPECTOR}
            <span style={{ marginLeft: 16 }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>Date:</strong> 29 Apr 2026
            </span>
          </div>
          <label className={styles.signoffCheck}>
            <input
              type="checkbox"
              checked={signedOff}
              onChange={(e) => setSignedOff(e.target.checked)}
            />
            <span>I confirm the above inspection results are accurate and have been performed in accordance with company quality standards.</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function InspectionQuality() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('mine');
  const [activeItem, setActiveItem] = useState<InspectionItem | null>(null);
  const canInspect = usePermission('conduct_inspection');

  const tabFiltered = useMemo(() => {
    if (activeTab === 'mine')      return mockInspections.filter((i) => i.assignedTo === CURRENT_INSPECTOR);
    if (activeTab === 'all')       return mockInspections;
    if (activeTab === 'completed') return [];
    if (activeTab === 'rejected')  return [];
    return mockInspections;
  }, [activeTab]);

  const tabs = [
    { ...TABS[0], count: mockInspections.filter((i) => i.assignedTo === CURRENT_INSPECTOR).length },
    { ...TABS[1], count: mockInspections.length },
    { ...TABS[2], count: 0 },
    { ...TABS[3], count: 0 },
  ];

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <PageHeader
        title="Inspection & quality"
        subtitle="Quality inspector workspace"
      />

      <KpiStrip items={buildKpis(mockInspections)} />

      <div className={styles.tabs}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {tabFiltered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            activeTab === 'completed' ? 'No inspections completed today yet' :
            activeTab === 'rejected'  ? 'No recent rejections' :
                                        'No items in this queue'
          }
          description="Items appearing here will require inspection and sign-off."
        />
      ) : (
        <div className={styles.queue}>
          {tabFiltered.map((item) => {
            const li = item.lineItems[0];
            return (
              <div key={item.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={`${styles.priorityBadge} ${priorityClass(item.priority)}`}>{item.priority}</span>
                  <span className={styles.cardId}>{item.id}</span>
                  <span className={styles.cardItem}>· {li?.description ?? '—'}</span>
                </div>

                <div className={styles.cardGrid}>
                  <div className={styles.cardGridItem}>
                    <span className={styles.cardGridKey}>Supplier:</span>
                    <span className={styles.cardGridVal}>{item.supplier}</span>
                  </div>
                  <div className={styles.cardGridItem}>
                    <span className={styles.cardGridKey}>Quantity:</span>
                    <span className={styles.cardGridVal}>{li?.receivedQty ?? 0} {li?.unit ?? ''}</span>
                  </div>
                  <div className={styles.cardGridItem}>
                    <span className={styles.cardGridKey}>Received:</span>
                    <span className={styles.cardGridVal}>{item.receivedDate}</span>
                  </div>
                  <div className={styles.cardGridItem}>
                    <span className={styles.cardGridKey}>PO:</span>
                    <span className={styles.cardGridVal} style={{ color: 'var(--color-primary)' }}>{item.poReference}</span>
                  </div>
                </div>

                {item.aiQualityScore !== undefined && (
                  <div className={styles.aiBanner}>
                    <ScoreRing score={item.aiQualityScore} size="sm" />
                    <div>
                      <div className={styles.aiTag}><Sparkles size={11} /> AI Pre-screen</div>
                      <div className={styles.aiInfo}>
                        Score: <strong>{item.aiQualityScore}</strong> · Grade: <strong>R1</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.cardActions}>
                  {canInspect && (
                    <Button variant="primary" size="sm" leftIcon={Search} onClick={() => setActiveItem(item)}>
                      Inspect now
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" leftIcon={Eye} onClick={() => navigate(`/procurement/grn/${item.id}`)}>
                    View GRN
                  </Button>
                  {canInspect && <Button variant="ghost" size="sm">Reassign</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeItem && (
        <InspectionWorkflowModal item={activeItem} onClose={() => setActiveItem(null)} />
      )}
    </ModuleLayout>
  );
}
