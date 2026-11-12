import { useState } from 'react';
import { CustomFieldsPanel } from '@/components/customFields/CustomFieldsPanel';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, ChevronRight, Edit, Printer, X, Sparkles, Image as ImageIcon,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { ScoreRing } from '@/components/common/ScoreRing/ScoreRing';
import { updateGRN, useGRNs } from './procurementStore';
import { procurementNav } from '@/config/procurementNav';
import { usePermission } from '@/hooks/usePermission';
import styles from './GRNDetail.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
import { useToast } from '@/components/common/Toast';
import { printDocument } from '@/utils/fileExport';
import { RecordEditModal } from '@/components/common/RecordEditModal/RecordEditModal';
type DetailTab = 'overview' | 'quality' | 'photos' | 'activity';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'quality',  label: 'Quality Inspection' },
  { key: 'photos',   label: 'Photos' },
  { key: 'activity', label: 'Activity Log' },
];

export default function GRNDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const { addToast } = useToast();
  const [grns] = useGRNs();
  const [dialog, setDialog] = useState<'edit' | 'reject' | null>(null);
  const canEdit = usePermission('edit_grn');
  const canApproveInspection = usePermission('approve_inspection');
  const grn = grns.find((g) => g.id === id);

  if (!grn) {
    return (
      <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
        <div className={styles.notFound}>
          <p style={{ fontSize: 18, fontWeight: 700 }}>GRN not found</p>
          <Button variant="primary" size="sm" onClick={() => navigate('/procurement/grn')}>
            Back to GRNs
          </Button>
        </div>
      </ModuleLayout>
    );
  }

  const isPending = grn.status === 'Pending Inspection';

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <CustomFieldsPanel entityType="grn" entityId={grn.id} />
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={() => navigate('/procurement/grn')}>GRNs</button>
        <ChevronRight size={13} />
        <span>{grn.id}</span>
      </div>

      <RecordAiPanel recordType="procurement.grn" record={grn} label={grn.id} />
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.grnId}>{grn.id}</h1>
            <p className={styles.grnSupplier}>{grn.supplier}</p>
          </div>
          <div className={styles.headerActions}>
            <StatusBadge status={grn.status} type="grn" />
            {canEdit && <Button variant="ghost" size="sm" leftIcon={Edit} onClick={() => setDialog('edit')}>Edit</Button>}
            <Button variant="ghost" size="sm" leftIcon={Printer} onClick={() => printDocument(`Goods Receipt Note ${grn.id}`, [
              { fields: [['PO reference', grn.poReference], ['Supplier', grn.supplier], ['Received', grn.receivedDate], ['Status', grn.status], ['Inspector', grn.inspector ?? '—'], ['Vehicle', grn.vehicleEntry.vehicleNumber], ['Driver', grn.vehicleEntry.driverName], ['Gross / tare / net (kg)', `${grn.vehicleEntry.grossWeight} / ${grn.vehicleEntry.tareWeight} / ${grn.vehicleEntry.netWeight}`]] },
              { heading: 'Items', table: { columns: ['Description', 'Ordered', 'Received', 'Damaged', 'Accepted', 'Unit'], rows: grn.lineItems.map((l) => [l.description, l.orderedQty, l.receivedQty, l.damagedQty, l.acceptedQty, l.unit]) } },
              ...(grn.notes ? [{ heading: 'Notes', text: grn.notes }] : []),
            ])}>Print</Button>
            {isPending && canApproveInspection && <Button variant="ghost" size="sm" leftIcon={X} onClick={() => setDialog('reject')}>Reject</Button>}
          </div>
        </div>

        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>PO Reference</span>
            <span className={styles.metaVal} style={{ color: 'var(--color-primary)' }}>{grn.poReference}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Received Date</span>
            <span className={styles.metaVal}>{grn.receivedDate}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Inspector</span>
            <span className={styles.metaVal}>{grn.inspector ?? 'Unassigned'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Items</span>
            <span className={styles.metaVal}>{grn.items}</span>
          </div>
          {grn.aiQualityScore !== undefined && (
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>AI Score</span>
              <span className={styles.metaVal} style={{ color: 'var(--color-primary)' }}>{grn.aiQualityScore}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.tabs}>
        <Tabs tabs={TABS} activeTab={activeTab} onChange={(k) => setActiveTab(k as DetailTab)} />
      </div>

      <div className={styles.tabContent}>

        {activeTab === 'overview' && (
          <>
            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Vehicle entry</p>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Vehicle</span>
                  <span className={styles.infoVal}>{grn.vehicleEntry.vehicleNumber}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Driver</span>
                  <span className={styles.infoVal}>{grn.vehicleEntry.driverName}{grn.vehicleEntry.driverPhone ? ` (${grn.vehicleEntry.driverPhone})` : ''}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Entry time</span>
                  <span className={styles.infoVal}>{grn.vehicleEntry.entryTime}</span>
                </div>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Weighbridge</p>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Gross weight</span>
                  <span className={styles.infoVal}>{grn.vehicleEntry.grossWeight.toLocaleString('en-IN')} kg</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Tare weight</span>
                  <span className={styles.infoVal}>{grn.vehicleEntry.tareWeight.toLocaleString('en-IN')} kg</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Net weight</span>
                  <span className={styles.infoVal} style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                    {grn.vehicleEntry.netWeight.toLocaleString('en-IN')} kg
                  </span>
                </div>
              </div>
            </div>

            <p className={styles.cardTitle}>Line items</p>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th className={styles.tdCenter}>Ordered</th>
                  <th className={styles.tdCenter}>Received</th>
                  <th className={styles.tdCenter}>Damaged</th>
                  <th className={styles.tdCenter}>Accepted</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {grn.lineItems.map((li, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{li.description}</td>
                    <td className={styles.tdCenter}>{li.orderedQty}</td>
                    <td className={styles.tdCenter}>{li.receivedQty}</td>
                    <td className={styles.tdCenter}>{li.damagedQty}</td>
                    <td className={styles.tdCenter} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{li.acceptedQty}</td>
                    <td>{li.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {grn.notes && (
              <>
                <p className={styles.cardTitle} style={{ marginTop: 20 }}>Notes</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{grn.notes}</p>
              </>
            )}
          </>
        )}

        {activeTab === 'quality' && (
          grn.qualityChecks ? (
            <>
              <div className={styles.qualityHeader}>
                <ScoreRing score={grn.aiQualityScore ?? 0} size="lg" />
                <div className={styles.qualityHeaderInfo}>
                  <span className={styles.qualityGradeLabel}>AI Grade</span>
                  <span className={styles.qualityGradeVal}>{grn.qualityChecks.aiImageGrade ?? '—'}</span>
                  <span className={styles.aiTag}><Sparkles size={12} /> AI confidence: {grn.qualityChecks.aiConfidence ?? 0}%</span>
                </div>
              </div>

              <p className={styles.cardTitle}>Quality parameters</p>
              <table className={styles.paramTable}>
                <thead>
                  <tr><th>Parameter</th><th>Measured</th><th>Spec</th><th>Result</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Moisture content</td>
                    <td>{grn.qualityChecks.moisture}%</td>
                    <td>{grn.qualityChecks.moistureSpec.min}% – {grn.qualityChecks.moistureSpec.max}%</td>
                    <td>
                      <span className={grn.qualityChecks.moisturePass ? styles.passBadge : styles.failBadge}>
                        {grn.qualityChecks.moisturePass ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Impurity</td>
                    <td>{grn.qualityChecks.impurity}%</td>
                    <td>{grn.qualityChecks.impuritySpec.min}% – {grn.qualityChecks.impuritySpec.max}%</td>
                    <td>
                      <span className={grn.qualityChecks.impurityPass ? styles.passBadge : styles.failBadge}>
                        {grn.qualityChecks.impurityPass ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className={styles.cardTitle} style={{ marginTop: 20 }}>Visual inspection</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {grn.qualityChecks.visualInspection}
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
              Quality inspection has not been performed yet.
            </div>
          )
        )}

        {activeTab === 'photos' && (
          <>
            <p className={styles.cardTitle}>Inspection photos</p>
            <div className={styles.photoGrid}>
              {(grn.qualityChecks?.photos ?? ['Sample 1', 'Sample 2', 'Bag close-up', 'Lot stack']).map((p, i) => (
                <div key={i} className={styles.photoTile}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <ImageIcon size={24} />
                    <span>{p}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'activity' && (
          <>
            <p className={styles.cardTitle}>Activity log</p>
            <div className={styles.activityList}>
              {grn.activityLog.map((a, i) => (
                <div key={i} className={styles.activityItem}>
                  <span className={styles.activityTime}>{a.time}</span>
                  <div className={styles.activityBody}>
                    <span className={styles.activityUser}>{a.user}</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}> — {a.action}</span>
                    {a.details && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{a.details}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
      <RecordEditModal
        isOpen={dialog === 'edit'}
        title={`Edit ${grn.id}`}
        fields={[
          { key: 'inspector', label: 'Inspector' },
          { key: 'vehicleNumber', label: 'Vehicle number' },
          { key: 'driverName', label: 'Driver name' },
          { key: 'notes', label: 'Notes', type: 'textarea' },
        ]}
        values={{ inspector: grn.inspector, notes: grn.notes, ...grn.vehicleEntry }}
        onClose={() => setDialog(null)}
        onSave={(v) => {
          updateGRN(grn.id, { inspector: String(v.inspector) || undefined, notes: String(v.notes), vehicleEntry: { ...grn.vehicleEntry, vehicleNumber: String(v.vehicleNumber), driverName: String(v.driverName) } }, 'GRN details edited');
          addToast('GRN updated', 'success');
          setDialog(null);
        }}
      />
      <RecordEditModal
        isOpen={dialog === 'reject'}
        title={`Reject ${grn.id}`}
        fields={[{ key: 'reason', label: 'Reason for rejection', type: 'textarea', required: true }]}
        values={{}}
        submitLabel="Reject GRN"
        danger
        onClose={() => setDialog(null)}
        onSave={(v) => {
          updateGRN(grn.id, { status: 'Rejected', notes: [grn.notes, `Rejected: ${v.reason}`].filter(Boolean).join(' — ') }, `Rejected: ${v.reason}`);
          addToast(`${grn.id} rejected`, 'warning');
          setDialog(null);
        }}
      />
    </ModuleLayout>
  );
}
