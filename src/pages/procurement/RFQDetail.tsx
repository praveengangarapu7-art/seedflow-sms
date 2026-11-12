import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, ChevronRight, Send, Calendar, X, Sparkles, MessageSquare, Mail, FileQuestion,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { Modal } from '@/components/common/Modal/Modal';
import { ScoreRing } from '@/components/common/ScoreRing/ScoreRing';
import { useToast } from '@/components/common/Toast';
import { awardRFQ, nowStamp, currentUserName, updateRFQ, useRFQs, type RfqMessage } from './procurementStore';
import { formatIndianCurrency } from '@/utils/formatters';
import { procurementNav } from '@/config/procurementNav';
import type { RFQBid } from '@/types/procurement';
import { usePermission } from '@/hooks/usePermission';
import styles from './RFQDetail.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
import { RecordEditModal } from '@/components/common/RecordEditModal/RecordEditModal';
type DetailTab = 'overview' | 'comparison' | 'communications';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'overview',       label: 'Overview' },
  { key: 'comparison',     label: 'Bid comparison' },
  { key: 'communications', label: 'Communications' },
];

// Mock supplier scores keyed by supplierId — used for AI recommendation
function supplierRating(supplierId: string): number {
  // deterministic pseudo-rating: 80–98
  let h = 0;
  for (let i = 0; i < supplierId.length; i++) h = (h * 31 + supplierId.charCodeAt(i)) >>> 0;
  return 80 + (h % 19);
}

export default function RFQDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [confirmAward, setConfirmAward] = useState<RFQBid | null>(null);
  const canAward = usePermission('award_rfq');

  // Weighted scoring sliders (must sum to 100)
  const [pricePct, setPricePct]       = useState(60);
  const [deliveryPct, setDeliveryPct] = useState(30);
  const [qualityPct, setQualityPct]   = useState(10);

  const totalPct = pricePct + deliveryPct + qualityPct;

  const [rfqs] = useRFQs();
  const [dialog, setDialog] = useState<'deadline' | 'message' | 'cancel' | null>(null);
  const rfq = rfqs.find((r) => r.id === id);
  const messages: RfqMessage[] = ((rfq as unknown as { messages?: RfqMessage[] })?.messages) ?? [];
  const addMessage = (text: string) => {
    if (!rfq) return;
    updateRFQ(rfq.id, { messages: [...messages, { time: nowStamp(), user: currentUserName(), text }] } as never);
  };

  if (!rfq) {
    return (
      <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
        <div className={styles.notFound}>
          <p style={{ fontSize: 18, fontWeight: 700 }}>RFQ not found</p>
          <Button variant="primary" size="sm" onClick={() => navigate('/procurement/rfq')}>
            Back to RFQs
          </Button>
        </div>
      </ModuleLayout>
    );
  }

  const lowestBidTotal = rfq.bids.length ? Math.min(...rfq.bids.map((b) => b.total)) : 0;
  const fastestDelivery = rfq.bids.length ? Math.min(...rfq.bids.map((b) => b.deliveryDays)) : 0;

  // Composite score per bid (weighted)
  const compositeScores = useMemo(() => {
    if (!rfq.bids.length) return new Map<string, number>();
    const map = new Map<string, number>();
    const minTotal   = Math.min(...rfq.bids.map((b) => b.total));
    const maxTotal   = Math.max(...rfq.bids.map((b) => b.total));
    const minDays    = Math.min(...rfq.bids.map((b) => b.deliveryDays));
    const maxDays    = Math.max(...rfq.bids.map((b) => b.deliveryDays));

    rfq.bids.forEach((b) => {
      // Lower price/days = better. Quality higher = better.
      const priceN    = maxTotal === minTotal ? 100 : 100 - ((b.total - minTotal) / (maxTotal - minTotal)) * 100;
      const deliveryN = maxDays === minDays ? 100 : 100 - ((b.deliveryDays - minDays) / (maxDays - minDays)) * 100;
      const qualityN  = supplierRating(b.supplierId);
      const composite = (priceN * pricePct + deliveryN * deliveryPct + qualityN * qualityPct) / totalPct;
      map.set(b.supplierId, Math.round(composite));
    });
    return map;
  }, [rfq.bids, pricePct, deliveryPct, qualityPct, totalPct]);

  // AI recommended supplier (highest composite at default weights)
  const recommended: RFQBid | null = useMemo(() => {
    if (!rfq.bids.length) return null;
    return rfq.bids.reduce<RFQBid>((best, b) => {
      const sBest = compositeScores.get(best.supplierId) ?? 0;
      const sB    = compositeScores.get(b.supplierId)    ?? 0;
      return sB > sBest ? b : best;
    }, rfq.bids[0]);
  }, [rfq.bids, compositeScores]);

  function handleAward(bid: RFQBid) {
    setConfirmAward(null);
    if (!rfq) return;
    const po = awardRFQ(rfq, bid);
    addToast(`RFQ awarded to ${bid.supplierName}. ${po.id} created and sent for approval.`, 'success');
    setTimeout(() => navigate(`/procurement/orders/${po.id}`), 600);
  }

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={() => navigate('/procurement/rfq')}>
          RFQs
        </button>
        <ChevronRight size={13} />
        <span>{rfq.id}</span>
      </div>

      <RecordAiPanel recordType="procurement.rfq" record={rfq} label={rfq.id} />
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.rfqId}>{rfq.id}</p>
            <h1 className={styles.rfqTitle}>{rfq.title}</h1>
          </div>
          <div className={styles.headerActions}>
            <StatusBadge status={rfq.status} type="rfq" />
            <Button variant="ghost" size="sm" leftIcon={Send} onClick={() => {
              const pending = Math.max(0, rfq.suppliersInvited - rfq.bids.length);
              addMessage(`Reminder sent to ${pending || rfq.suppliersInvited} supplier(s) to submit bids before ${rfq.deadline || 'the deadline'}`);
              addToast(`Reminder sent to ${pending || rfq.suppliersInvited} supplier(s)`, 'success');
            }}>Send reminder</Button>
            <Button variant="ghost" size="sm" leftIcon={Calendar} onClick={() => setDialog('deadline')}>Extend deadline</Button>
            {rfq.status !== 'Closed' && <Button variant="ghost" size="sm" leftIcon={X} onClick={() => setDialog('cancel')}>Cancel RFQ</Button>}
          </div>
        </div>

        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Department</span>
            <span className={styles.metaVal}>{rfq.department}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Created</span>
            <span className={styles.metaVal}>{rfq.createdDate}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Deadline</span>
            <span className={styles.metaVal}>{rfq.deadline}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Expected delivery</span>
            <span className={styles.metaVal}>{rfq.expectedDelivery}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Payment terms</span>
            <span className={styles.metaVal}>{rfq.paymentTerms}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaKey}>Responses</span>
            <span className={styles.metaVal}>{rfq.responsesReceived} of {rfq.suppliersInvited}</span>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <Tabs tabs={TABS} activeTab={activeTab} onChange={(k) => setActiveTab(k as DetailTab)} />
      </div>

      <div className={styles.tabContent}>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <>
            <p className={styles.cardTitle}>Line items</p>
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Specifications</th>
                </tr>
              </thead>
              <tbody>
                {rfq.lineItems.map((li, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{li.description}</td>
                    <td>{li.quantity}</td>
                    <td>{li.unit}</td>
                    <td>{li.specs ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.cardTitle} style={{ marginTop: 24 }}>Invited suppliers ({rfq.suppliersInvited})</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {rfq.invitedSuppliers.length > 0
                ? rfq.invitedSuppliers.join(', ')
                : 'No suppliers invited yet — RFQ is in draft.'}
            </p>
          </>
        )}

        {/* Bid Comparison tab */}
        {activeTab === 'comparison' && (
          rfq.bids.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
              No bids received yet.
            </div>
          ) : (
            <>
              {recommended && (
                <div className={styles.recommendBanner}>
                  <Sparkles size={20} className={styles.recommendIcon} />
                  <p className={styles.recommendText}>
                    <strong>Recommended: {recommended.supplierName}</strong> — best balance of price ({formatIndianCurrency(recommended.total)}),
                    delivery ({recommended.deliveryDays} days), and supplier rating ({supplierRating(recommended.supplierId)}).
                  </p>
                </div>
              )}

              <p className={styles.cardTitle}>Side-by-side comparison</p>
              <div className={styles.matrixWrap}>
                <table className={styles.matrix}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 160 }}>Metric</th>
                      {rfq.bids.map((b) => (
                        <th key={b.supplierId}>
                          <div className={styles.supplierHeader}>
                            <ScoreRing score={supplierRating(b.supplierId)} size="sm" />
                            <span className={styles.supplierHeaderName}>{b.supplierName}</span>
                            <span className={styles.supplierHeaderMeta}>Submitted {b.submittedDate}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Unit price</td>
                      {rfq.bids.map((b) => (
                        <td key={b.supplierId}>₹{b.unitPrice.toLocaleString('en-IN')}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Delivery time</td>
                      {rfq.bids.map((b) => (
                        <td key={b.supplierId} className={b.deliveryDays === fastestDelivery ? styles.lowestBid : ''}>
                          {b.deliveryDays} days
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Payment terms</td>
                      {rfq.bids.map((b) => (
                        <td key={b.supplierId}>{b.terms}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Notes</td>
                      {rfq.bids.map((b) => (
                        <td key={b.supplierId} style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {b.notes ?? '—'}
                        </td>
                      ))}
                    </tr>
                    <tr className={styles.totalRow}>
                      <td>Total bid amount</td>
                      {rfq.bids.map((b) => (
                        <td key={b.supplierId} className={b.total === lowestBidTotal ? styles.lowestBid : ''}>
                          {formatIndianCurrency(b.total)}
                        </td>
                      ))}
                    </tr>
                    <tr className={styles.scoreRow}>
                      <td>Composite score</td>
                      {rfq.bids.map((b) => (
                        <td key={b.supplierId}>
                          <span className={styles.compositeScore}>
                            {compositeScores.get(b.supplierId) ?? 0}
                          </span>
                        </td>
                      ))}
                    </tr>
                    {canAward && (
                      <tr className={styles.actionRow}>
                        <td></td>
                        {rfq.bids.map((b) => (
                          <td key={b.supplierId}>
                            <Button variant="primary" size="sm" onClick={() => setConfirmAward(b)}>
                              Award to {b.supplierName.split(' ')[0]}
                            </Button>
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className={styles.weightPanel}>
                <p className={styles.weightTitle}>
                  <Sparkles size={13} /> Weighted scoring
                </p>
                <div className={styles.weightGrid}>
                  <div className={styles.weightItem}>
                    <div className={styles.weightLabel}>
                      <span className={styles.weightLabelKey}>Price weight</span>
                      <span className={styles.weightLabelVal}>{pricePct}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={pricePct}
                      className={styles.weightSlider}
                      onChange={(e) => setPricePct(Number(e.target.value))} />
                  </div>
                  <div className={styles.weightItem}>
                    <div className={styles.weightLabel}>
                      <span className={styles.weightLabelKey}>Delivery weight</span>
                      <span className={styles.weightLabelVal}>{deliveryPct}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={deliveryPct}
                      className={styles.weightSlider}
                      onChange={(e) => setDeliveryPct(Number(e.target.value))} />
                  </div>
                  <div className={styles.weightItem}>
                    <div className={styles.weightLabel}>
                      <span className={styles.weightLabelKey}>Quality rating weight</span>
                      <span className={styles.weightLabelVal}>{qualityPct}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={qualityPct}
                      className={styles.weightSlider}
                      onChange={(e) => setQualityPct(Number(e.target.value))} />
                  </div>
                </div>
                {totalPct !== 100 && (
                  <p className={styles.weightWarning}>Weights sum to {totalPct}% (normalized for scoring).</p>
                )}
              </div>
            </>
          )
        )}

        {/* Communications tab */}
        {activeTab === 'communications' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p className={styles.cardTitle} style={{ marginBottom: 0 }}>Communication timeline</p>
              <Button variant="primary" size="sm" leftIcon={MessageSquare} onClick={() => setDialog('message')}>Send message</Button>
            </div>
            <div className={styles.commTimeline}>
              {[
                { time: rfq.createdDate, user: rfq.createdBy, text: `RFQ ${rfq.id} created`, icon: FileQuestion },
                { time: rfq.createdDate, user: 'System', text: `Sent to ${rfq.suppliersInvited} suppliers via email`, icon: Mail },
                ...rfq.bids.map((b) => ({
                  time: b.submittedDate, user: b.supplierName,
                  text: `Bid submitted: ${formatIndianCurrency(b.total)}, ${b.deliveryDays} days delivery${b.notes ? ` — "${b.notes}"` : ''}`,
                  icon: MessageSquare,
                })),
                ...messages.map((m) => ({ time: m.time, user: m.user, text: m.text, icon: Mail })),
              ].map((c, i) => {
                const Icon = c.icon;
                return (
                  <div key={i} className={styles.commItem}>
                    <div className={styles.commIcon}><Icon size={15} /></div>
                    <div className={styles.commBody}>
                      <div className={styles.commHeader}>
                        <span className={styles.commUser}>{c.user}</span>
                        <span className={styles.commTime}>{c.time}</span>
                      </div>
                      <p className={styles.commText}>{c.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      <RecordEditModal
        isOpen={dialog === 'deadline'}
        title={`Extend deadline — ${rfq.id}`}
        fields={[{ key: 'deadline', label: 'New deadline', type: 'date', required: true }, { key: 'note', label: 'Note to suppliers', type: 'textarea' }]}
        values={{}}
        onClose={() => setDialog(null)}
        onSave={(v) => {
          const d = new Date(`${v.deadline}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          updateRFQ(rfq.id, { deadline: d });
          addMessage(`Deadline extended to ${d}${v.note ? ` — ${v.note}` : ''}`);
          addToast(`Deadline extended to ${d}`, 'success');
          setDialog(null);
        }}
      />
      <RecordEditModal
        isOpen={dialog === 'message'}
        title="Message to invited suppliers"
        fields={[{ key: 'text', label: 'Message', type: 'textarea', required: true }]}
        values={{}}
        submitLabel="Send"
        onClose={() => setDialog(null)}
        onSave={(v) => { addMessage(String(v.text)); addToast('Message sent to invited suppliers', 'success'); setDialog(null); }}
      />
      <RecordEditModal
        isOpen={dialog === 'cancel'}
        title={`Cancel ${rfq.id}`}
        fields={[{ key: 'reason', label: 'Reason', type: 'textarea', required: true }]}
        values={{}}
        submitLabel="Cancel RFQ"
        danger
        onClose={() => setDialog(null)}
        onSave={(v) => {
          updateRFQ(rfq.id, { status: 'Closed' });
          addMessage(`RFQ cancelled: ${v.reason}`);
          addToast(`${rfq.id} cancelled`, 'warning');
          setDialog(null);
        }}
      />

      {/* Award confirmation modal */}
      {confirmAward && (
        <Modal
          isOpen
          onClose={() => setConfirmAward(null)}
          title="Confirm award"
          size="sm"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmAward(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => handleAward(confirmAward)}>Confirm award</Button>
            </div>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
            Award <strong>{rfq.id}</strong> to <strong>{confirmAward.supplierName}</strong>?
          </p>
          <div style={{ background: 'var(--color-accent-light)', borderRadius: 6, padding: 12, fontSize: 13 }}>
            <p style={{ margin: 0, marginBottom: 6 }}><strong>Total amount:</strong> {formatIndianCurrency(confirmAward.total)}</p>
            <p style={{ margin: 0, marginBottom: 6 }}><strong>Delivery:</strong> {confirmAward.deliveryDays} days</p>
            <p style={{ margin: 0 }}><strong>Payment terms:</strong> {confirmAward.terms}</p>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-warning)', marginTop: 12 }}>
            This will create a PO automatically and notify the supplier.
          </p>
        </Modal>
      )}
    </ModuleLayout>
  );
}
