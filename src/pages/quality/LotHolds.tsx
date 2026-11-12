import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, LockKeyhole, RefreshCw, Unlock } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { qualityNav } from '@/config/qualityNav';
import { usePermission } from '@/hooks/usePermission';
import { fetchLotHolds, fetchLotImpact, fetchSeedLots, placeLotHold, releaseLotHold, type LotHold, type LotImpact, type RealtimeSeedLot } from '@/services/seedLotRealtimeClient';
import { useQualitySession } from './useQualitySession';
import { ErrorCard, Field, Notice, Pill, PromptModal, SeverityBadge, StatusPill, fmtDate, humanize, useQualityAction, useQualityLoad } from './shared';
import styles from './Quality.module.css';

type Tab = 'active' | 'released';

export default function LotHolds() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { addToast } = useToast();
  const { token, error: sessionError } = useQualitySession();
  const { run, busy } = useQualityAction();
  const canPlace = usePermission('place_lot_hold');
  const canRelease = usePermission('release_lot_hold');

  const [tab, setTab] = useState<Tab>('active');
  const holds = useQualityLoad<LotHold[]>(token, (t) => fetchLotHolds(t, { active: tab === 'active' }), [tab]);
  const rows = Array.isArray(holds.data) ? holds.data : [];
  const lots = useQualityLoad<RealtimeSeedLot[]>(token, fetchSeedLots);
  const lotList = Array.isArray(lots.data) ? lots.data : [];

  const [showPlace, setShowPlace] = useState(false);
  const [placeForm, setPlaceForm] = useState({ seedLotId: '', reason: '' });
  const [releasing, setReleasing] = useState<LotHold | null>(null);

  // Impact of one lot — opened from a row, or straight from a complaint via ?lot=
  const [impactLotId, setImpactLotId] = useState<string | null>(params.get('lot'));
  const [impact, setImpact] = useState<LotImpact | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  useEffect(() => {
    if (!token || !impactLotId) {
      setImpact(null);
      return;
    }
    let cancelled = false;
    setImpactLoading(true);
    setImpactError(null);
    fetchLotImpact(token, impactLotId)
      .then((r) => {
        if (cancelled) return;
        // request() degrades to [] when the server is unreachable.
        if (Array.isArray(r) || !r || !('summary' in r)) setImpactError('Impact could not be loaded — the quality service is not reachable.');
        else setImpact(r);
      })
      .catch((err) => !cancelled && setImpactError(err instanceof Error ? err.message : 'Unable to load lot impact'))
      .finally(() => !cancelled && setImpactLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, impactLotId]);

  const closeImpact = () => {
    setImpactLotId(null);
    if (params.has('lot')) {
      params.delete('lot');
      setParams(params, { replace: true });
    }
  };

  const place = async () => {
    if (!token) return;
    if (!placeForm.seedLotId || !placeForm.reason.trim()) {
      addToast('Choose a lot and give the reason for the hold.', 'error');
      return;
    }
    const done = await run(() => placeLotHold(token, placeForm.seedLotId, placeForm.reason.trim()), 'Seed lot placed on quality hold');
    if (done) {
      setShowPlace(false);
      setPlaceForm({ seedLotId: '', reason: '' });
      await holds.reload();
    }
  };

  return (
    <ModuleLayout moduleName="Quality" moduleIcon={ClipboardCheck} navItems={qualityNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Lot Holds</h1>
            <p className={styles.subtitle}>
              A lot on hold cannot be allocated to anyone or packaged. Critical non-conformances and complaints place a hold automatically. A hold that a
              non-conformance caused can only be released after that NCR is closed.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void holds.reload()}>
              Refresh
            </Button>
            {canPlace && (
              <Button leftIcon={LockKeyhole} onClick={() => setShowPlace(true)}>
                Place hold
              </Button>
            )}
          </div>
        </div>

        <ErrorCard message={sessionError ?? holds.error} />

        <div className={styles.filterBar}>
          <button className={`${styles.chip} ${tab === 'active' ? styles.chipActive : ''}`} onClick={() => setTab('active')}>
            Active
          </button>
          <button className={`${styles.chip} ${tab === 'released' ? styles.chipActive : ''}`} onClick={() => setTab('released')}>
            Released
          </button>
        </div>

        <div className={styles.card}>
          {holds.loading ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : rows.length === 0 ? (
            <div className={styles.emptyState}>{tab === 'active' ? 'No lots are on hold.' : 'No holds have been released yet.'}</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Reason</th>
                    <th>Source</th>
                    <th>Placed</th>
                    {tab === 'released' && <th>Released</th>}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <button className={styles.rowButton} onClick={() => setImpactLotId(h.seed_lot_id)}>
                          {h.lot_code}
                        </button>
                        <div className={styles.muted}>
                          {h.crop} / {h.variety}
                        </div>
                      </td>
                      <td>{h.reason}</td>
                      <td>
                        {h.source_type === 'ncr' && h.source_id ? (
                          <button className={styles.rowButton} onClick={() => navigate(`/quality/ncrs/${h.source_id}`)}>
                            NCR
                          </button>
                        ) : h.source_type === 'complaint' && h.source_id ? (
                          <button className={styles.rowButton} onClick={() => navigate(`/quality/complaints/${h.source_id}`)}>
                            Complaint
                          </button>
                        ) : (
                          humanize(h.source_type)
                        )}
                      </td>
                      <td>
                        {fmtDate(h.placed_at)}
                        <div className={styles.muted}>{h.placed_by}</div>
                      </td>
                      {tab === 'released' && (
                        <td>
                          {fmtDate(h.released_at)}
                          <div className={styles.muted}>
                            {h.released_by}: {h.release_notes}
                          </div>
                        </td>
                      )}
                      <td>
                        <div className={styles.actionsRow}>
                          <Button size="sm" variant="secondary" onClick={() => setImpactLotId(h.seed_lot_id)}>
                            Impact
                          </Button>
                          {tab === 'active' && canRelease && (
                            <Button size="sm" leftIcon={Unlock} onClick={() => setReleasing(h)}>
                              Release
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal isOpen={showPlace} onClose={() => setShowPlace(false)} title="Place a seed lot on hold">
          <div className={styles.modalStack}>
            <Field label="Seed lot" htmlFor="hold-lot">
              <select id="hold-lot" className={styles.select} value={placeForm.seedLotId} onChange={(e) => setPlaceForm({ ...placeForm, seedLotId: e.target.value })}>
                <option value="">Choose a lot…</option>
                {lotList.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lot_code} — {l.crop} / {l.variety}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <label className={styles.label} htmlFor="hold-reason">
                Reason
              </label>
              <textarea id="hold-reason" className={styles.textArea} value={placeForm.reason} onChange={(e) => setPlaceForm({ ...placeForm, reason: e.target.value })} />
            </div>
            <Notice tone="warn">Stock already allocated or packaged is not recalled by a hold — it only stops further movement. Use the impact view to see what has already left.</Notice>
            <div className={styles.actionsRow}>
              <Button isLoading={busy} onClick={() => void place()}>
                Place hold
              </Button>
              <Button variant="secondary" onClick={() => setShowPlace(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        <PromptModal
          isOpen={releasing !== null}
          title={`Release hold on ${releasing?.lot_code ?? ''}`}
          label="Why is it safe to release this lot?"
          placeholder="e.g. Re-test passed on 2 independent samples; NCR closed."
          confirmLabel="Release hold"
          busy={busy}
          onClose={() => setReleasing(null)}
          onSubmit={async (notes) => {
            if (!token || !releasing) return;
            const done = await run(() => releaseLotHold(token, releasing.id, notes), 'Hold released');
            if (done) {
              setReleasing(null);
              await holds.reload();
            }
          }}
        />

        <Modal isOpen={impactLotId !== null} onClose={closeImpact} title={impact ? `Impact — ${impact.lot.lot_code}` : 'Lot impact'} size="xl">
          {impactLoading && <div className={styles.emptyState}>Loading…</div>}
          {impactError && <span className={styles.errorText}>{impactError}</span>}
          {impact && (
            <div className={styles.modalStack}>
              {impact.summary.activeHold && <Notice tone="warn">This lot is currently on quality hold.</Notice>}
              {impact.summary.recallRecommended && <Notice tone="bad">A recall has been recommended for this lot by a complaint investigation.</Notice>}
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Lot</span>
                  {impact.lot.crop} / {impact.lot.variety} · {impact.lot.stage}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Quantity</span>
                  {impact.lot.quantity_total} {impact.lot.unit} ({impact.lot.quantity_allocated} allocated)
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Bags packaged</span>
                  {impact.summary.unitsPackaged} in {impact.summary.packagingBatchCount} batch(es)
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Bags out in the field</span>
                  {impact.summary.unitsInField} ({impact.summary.unitsDistributed} distributed · {impact.summary.unitsSold} sold)
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Active allocations</span>
                  {impact.summary.activeAllocationCount}
                </div>
              </div>

              <h3 className={styles.sectionTitle}>Received this lot</h3>
              {impact.summary.recipients.length === 0 ? (
                <div className={styles.muted}>No active allocations.</div>
              ) : (
                <div className={styles.actionsRow}>
                  {impact.summary.recipients.map((r) => (
                    <Pill key={r} tone="info">
                      {r}
                    </Pill>
                  ))}
                </div>
              )}

              <h3 className={styles.sectionTitle}>Packaging batches</h3>
              {impact.packagingBatches.length === 0 ? (
                <div className={styles.muted}>Not packaged.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Batch</th>
                        <th>Bags</th>
                        <th>Packaged</th>
                        <th>Distributed</th>
                        <th>Sold</th>
                        <th>Damaged</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {impact.packagingBatches.map((b) => (
                        <tr key={b.id}>
                          <td>{b.batch_code}</td>
                          <td>
                            {b.unit_count} × {b.unit_size}
                            {b.unit_of_measure}
                          </td>
                          <td>{b.units_packaged}</td>
                          <td>{b.units_distributed}</td>
                          <td>{b.units_sold}</td>
                          <td>{b.units_damaged}</td>
                          <td>
                            <StatusPill status={b.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className={styles.grid2}>
                <div>
                  <h3 className={styles.sectionTitle}>Non-conformances</h3>
                  {impact.nonConformances.length === 0 ? (
                    <div className={styles.muted}>None.</div>
                  ) : (
                    impact.nonConformances.map((n) => (
                      <p key={n.id} style={{ margin: '0.3rem 0' }}>
                        <button className={styles.rowButton} onClick={() => navigate(`/quality/ncrs/${n.id}`)}>
                          {n.ncr_code}
                        </button>{' '}
                        <SeverityBadge severity={n.severity} /> <StatusPill status={n.status} />
                      </p>
                    ))
                  )}
                </div>
                <div>
                  <h3 className={styles.sectionTitle}>Complaints</h3>
                  {impact.complaints.length === 0 ? (
                    <div className={styles.muted}>None.</div>
                  ) : (
                    impact.complaints.map((c) => (
                      <p key={c.id} style={{ margin: '0.3rem 0' }}>
                        <button className={styles.rowButton} onClick={() => navigate(`/quality/complaints/${c.id}`)}>
                          {c.complaint_code}
                        </button>{' '}
                        <SeverityBadge severity={c.severity} /> <StatusPill status={c.status} />
                        {c.recall_recommended && <Pill tone="bad">Recall recommended</Pill>}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ModuleLayout>
  );
}
