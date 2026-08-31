import { useCallback, useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, PlusCircle, Send, Star, Truck, UserPlus, XCircle } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  approveSeedRequest,
  connectInventorySocket,
  createFarmer,
  createSeedRequest,
  deliverSeedRequest,
  fetchDistributionLists,
  fetchFarmers,
  fetchSeedLots,
  fetchSeedRequests,
  fetchVarietyEffectiveness,
  fulfillSeedRequest,
  login,
  rejectSeedRequest,
  submitPerformanceRating,
  type DistributionListEntry,
  type FarmerRow,
  type InventorySocketEvent,
  type RealtimeSeedLot,
  type SeedRequestRow,
  type VarietyEffectivenessEntry,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedFarmerProgram.module.css';

function statusClass(status: string): string {
  return (
    {
      requested: styles.statusRequested,
      approved: styles.statusApproved,
      allocated: styles.statusAllocated,
      delivered: styles.statusDelivered,
      rejected: styles.statusRejected,
      cancelled: styles.statusCancelled,
    }[status] ?? styles.statusRequested
  );
}

// "allocated" is the real inventory-reserved state — the Farmer Portal
// (Extend #9) shows it to farmers as "Ready for Pickup", so the staff
// dashboard uses the same label rather than the raw DB status name.
function statusLabel(status: string): string {
  if (status === 'allocated') return 'Ready for Pickup';
  return status;
}

export default function SeedFarmerProgram() {
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(2); // Producer by default
  const [token, setToken] = useState<string | null>(null);

  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [seedLots, setSeedLots] = useState<RealtimeSeedLot[]>([]);
  const [requests, setRequests] = useState<SeedRequestRow[]>([]);
  const [distributionLists, setDistributionLists] = useState<DistributionListEntry[]>([]);
  const [effectiveness, setEffectiveness] = useState<VarietyEffectivenessEntry[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [fulfillLotId, setFulfillLotId] = useState('');

  const [farmerName, setFarmerName] = useState('');
  const [farmerRegion, setFarmerRegion] = useState('');
  const [farmerLocation, setFarmerLocation] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [farmerEmail, setFarmerEmail] = useState('');
  const [farmerSubmitting, setFarmerSubmitting] = useState(false);

  const [reqFarmerId, setReqFarmerId] = useState('');
  const [reqCrop, setReqCrop] = useState('Paddy');
  const [reqVariety, setReqVariety] = useState('Paddy-1010');
  const [reqQuantity, setReqQuantity] = useState('50');
  const [reqSubmitting, setReqSubmitting] = useState(false);

  const [rateFarmerId, setRateFarmerId] = useState('');
  const [rateRequestId, setRateRequestId] = useState('');
  const [rateGermination, setRateGermination] = useState('4');
  const [rateYield, setRateYield] = useState('4');
  const [rateOverall, setRateOverall] = useState('4');
  const [rateHarvested, setRateHarvested] = useState('');
  const [rateFeedback, setRateFeedback] = useState('');
  const [rateSubmitting, setRateSubmitting] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  const farmerName_ = useCallback((id: string) => farmers.find((f) => f.id === id)?.name ?? id.slice(0, 8), [farmers]);

  const refreshAll = useCallback(async (accessToken: string) => {
    const [farmersResult, requestsResult, distributionResult, effectivenessResult] = await Promise.all([
      fetchFarmers(accessToken),
      fetchSeedRequests(accessToken),
      fetchDistributionLists(accessToken),
      fetchVarietyEffectiveness(accessToken),
    ]);
    setFarmers(farmersResult);
    setRequests(requestsResult);
    setDistributionLists(distributionResult);
    setEffectiveness(effectivenessResult);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);

        const lots = await fetchSeedLots(accessToken);
        if (cancelled) return;
        setSeedLots(lots);
        await refreshAll(accessToken);

        socketRef.current?.close();
        const socket = connectInventorySocket(accessToken, {
          onEvent: (event: InventorySocketEvent) => {
            if (event.event !== 'SEED_REQUEST_CREATED' && event.event !== 'SEED_REQUEST_STATUS_CHANGED') return;
            const label =
              event.event === 'SEED_REQUEST_CREATED'
                ? `New seed request: ${event.payload.crop} ${event.payload.variety}`
                : `Seed request status changed to ${event.payload.status}`;
            setNotifications((prev) => [label, ...prev].slice(0, 5));
            void refreshAll(accessToken);
          },
        });
        socketRef.current = socket;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the farmer program service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const handleCreateFarmer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!farmerName.trim() || !farmerRegion.trim() || !farmerEmail.trim()) {
      addToast('Name, region, and email are required', 'error');
      return;
    }
    setFarmerSubmitting(true);
    try {
      await createFarmer(token, {
        name: farmerName.trim(),
        region: farmerRegion.trim(),
        email: farmerEmail.trim(),
        location: farmerLocation.trim() || undefined,
        phone: farmerPhone.trim() || undefined,
      });
      addToast('Farmer registered', 'success');
      setFarmerName('');
      setFarmerRegion('');
      setFarmerLocation('');
      setFarmerPhone('');
      setFarmerEmail('');
      await refreshAll(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to register farmer', 'error');
    } finally {
      setFarmerSubmitting(false);
    }
  };

  const handleCreateRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!reqFarmerId) {
      addToast('Select a farmer', 'error');
      return;
    }
    setReqSubmitting(true);
    try {
      await createSeedRequest(token, { farmerId: reqFarmerId, crop: reqCrop, variety: reqVariety, quantity: Number(reqQuantity) });
      addToast('Seed request submitted', 'success');
      await refreshAll(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to submit request', 'error');
    } finally {
      setReqSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      // If the farmer picked a specific lot via the Farmer Portal's cart
      // flow, pass it through so approval can allocate it immediately
      // (see approveRequest's doc comment on the backend) — one click
      // straight to "Ready for Pickup" instead of a separate Fulfill step.
      const request = requests.find((r) => r.id === id);
      const updated = await approveSeedRequest(token, id, request?.requested_seed_lot_id ?? undefined);
      addToast(updated.status === 'allocated' ? 'Request approved — ready for pickup' : 'Request approved', 'success');
      await refreshAll(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to approve request', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    const reason = window.prompt('Rejection reason?');
    if (!reason) return;
    setBusyId(id);
    try {
      await rejectSeedRequest(token, id, reason);
      addToast('Request rejected', 'success');
      await refreshAll(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to reject request', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleFulfill = async (id: string) => {
    if (!token || !fulfillLotId) {
      addToast('Select a seed lot to fulfill from', 'error');
      return;
    }
    setBusyId(id);
    try {
      await fulfillSeedRequest(token, id, fulfillLotId);
      addToast('Request fulfilled (allocated)', 'success');
      setFulfillingId(null);
      setFulfillLotId('');
      await refreshAll(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to fulfill request', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeliver = async (id: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      await deliverSeedRequest(token, id);
      addToast('Marked as delivered', 'success');
      await refreshAll(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to mark delivered', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitRating = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!rateFarmerId) {
      addToast('Select a farmer', 'error');
      return;
    }
    const selectedRequest = requests.find((r) => r.id === rateRequestId);
    if (!selectedRequest) {
      addToast('Select the delivered request this rating is for', 'error');
      return;
    }
    setRateSubmitting(true);
    try {
      await submitPerformanceRating(token, {
        farmerId: rateFarmerId,
        seedRequestId: selectedRequest.id,
        crop: selectedRequest.crop,
        variety: selectedRequest.variety,
        germinationRating: Number(rateGermination),
        yieldRating: Number(rateYield),
        overallRating: Number(rateOverall),
        harvestedQuantity: rateHarvested ? Number(rateHarvested) : undefined,
        feedbackText: rateFeedback.trim() || undefined,
      });
      addToast('Performance rating submitted', 'success');
      setRateFeedback('');
      setRateHarvested('');
      await refreshAll(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to submit rating', 'error');
    } finally {
      setRateSubmitting(false);
    }
  };

  const deliveredRequests = requests.filter((r) => r.status === 'delivered' && (!rateFarmerId || r.farmer_id === rateFarmerId));
  const totalFarmers = farmers.length;
  const totalRequests = requests.length;
  const topVariety = effectiveness[0];
  const avgSatisfaction =
    effectiveness.length > 0
      ? Math.round(
          (effectiveness.reduce((sum, e) => sum + (e.avgOverallRating ?? 0), 0) / effectiveness.filter((e) => e.avgOverallRating != null).length) * 10,
        ) / 10
      : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Farmer Seed Allocation &amp; Distribution</h1>
          <p className={styles.subtitle}>
            Farmers request seed by variety, distribution partners fulfill and deliver, and post-harvest feedback drives real
            adoption and effectiveness metrics.
          </p>
        </div>
        <div className={styles.controls}>
          <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
            {DEMO_ACCOUNTS.map((account, index) => (
              <option key={account.email} value={index}>
                Viewing as: {account.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {notifications.length > 0 ? <div className={styles.notificationBanner}>Live: {notifications[0]}</div> : null}

      <div className={styles.kpiRow}>
        <KpiCard title="Registered Farmers" value={String(totalFarmers)} icon={UserPlus} />
        <KpiCard title="Total Seed Requests" value={String(totalRequests)} icon={Send} />
        <KpiCard
          title="Top Adopted Variety"
          value={topVariety ? topVariety.variety : '—'}
          subValue={topVariety ? `${topVariety.adoptionRate}% adoption` : undefined}
          icon={Star}
        />
        <KpiCard title="Avg. Satisfaction" value={avgSatisfaction != null ? `${avgSatisfaction}/5` : '—'} icon={CheckCircle2} />
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Seed Requests</h2>
            <p className={styles.sectionSubtitle}>Approve → Fulfill (allocate real inventory) → Deliver.</p>
            {requests.length === 0 ? (
              <div className={styles.emptyState}>No seed requests yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Farmer</th>
                      <th>Crop / Variety</th>
                      <th>Qty</th>
                      <th>Region</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req.id}>
                        <td>{farmerName_(req.farmer_id)}</td>
                        <td>{req.crop} — {req.variety}</td>
                        <td>{req.quantity_requested} {req.unit}</td>
                        <td>{req.region}</td>
                        <td><span className={`${styles.statusBadge} ${statusClass(req.status)}`}>{statusLabel(req.status)}</span></td>
                        <td>
                          <div className={styles.rowActions}>
                            {req.status === 'requested' ? (
                              <>
                                <Button size="sm" leftIcon={CheckCircle2} isLoading={busyId === req.id} onClick={() => void handleApprove(req.id)}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="secondary" leftIcon={XCircle} onClick={() => void handleReject(req.id)}>
                                  Reject
                                </Button>
                              </>
                            ) : null}
                            {req.status === 'approved' && fulfillingId === req.id ? (
                              <>
                                <select className={styles.select} value={fulfillLotId} onChange={(e) => setFulfillLotId(e.target.value)}>
                                  <option value="">Select seed lot</option>
                                  {seedLots
                                    .filter((lot) => lot.stage === 'Certified' && lot.crop === req.crop && lot.variety === req.variety)
                                    .map((lot) => (
                                      <option key={lot.id} value={lot.id}>
                                        {lot.lot_code} ({lot.quantity_available} {lot.unit} avail.)
                                      </option>
                                    ))}
                                </select>
                                <Button size="sm" isLoading={busyId === req.id} onClick={() => void handleFulfill(req.id)}>
                                  Confirm
                                </Button>
                              </>
                            ) : req.status === 'approved' ? (
                              <Button size="sm" leftIcon={PlusCircle} onClick={() => { setFulfillingId(req.id); setFulfillLotId(''); }}>
                                Fulfill
                              </Button>
                            ) : null}
                            {req.status === 'allocated' ? (
                              <Button size="sm" leftIcon={Truck} isLoading={busyId === req.id} onClick={() => void handleDeliver(req.id)}>
                                Mark Delivered
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Regional Distribution Lists</h2>
            <p className={styles.sectionSubtitle}>Allocated requests still awaiting physical delivery, grouped by region.</p>
            {distributionLists.length === 0 ? (
              <div className={styles.emptyState}>Nothing pending delivery right now.</div>
            ) : (
              distributionLists.map((entry) => (
                <div key={entry.region} className={styles.regionBlock}>
                  <div className={styles.regionHeader}>
                    <span className={styles.regionTitle}>{entry.region}</span>
                    <span className={styles.regionMeta}>{entry.totalQuantity} kg total</span>
                  </div>
                  {entry.requests.map((req) => (
                    <div key={req.id} className={styles.regionMeta}>
                      {req.farmer_name} · {req.variety} · {req.quantity_requested} {req.unit}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Variety Effectiveness</h2>
            <p className={styles.sectionSubtitle}>Adoption, reporting, and repeat-request rates — all computed from real delivery and feedback data.</p>
            {effectiveness.length === 0 ? (
              <div className={styles.emptyState}>No delivered requests or ratings recorded yet.</div>
            ) : (
              <>
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={effectiveness} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8efe8" />
                      <XAxis dataKey="variety" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip formatter={(value: any) => [`${value}%`, 'Adoption rate']} />
                      <Bar dataKey="adoptionRate" fill="#2a78d6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Variety</th>
                        <th>Served</th>
                        <th>Adoption</th>
                        <th>Reporting</th>
                        <th>Repeat</th>
                        <th>Avg Overall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveness.map((e) => (
                        <tr key={`${e.crop}-${e.variety}`}>
                          <td>{e.crop} — {e.variety}</td>
                          <td>{e.totalFarmersServed}</td>
                          <td>{e.adoptionRate}%</td>
                          <td>{e.reportingRate}%</td>
                          <td>{e.repeatRequestRate}%</td>
                          <td>{e.avgOverallRating ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Register Farmer</h2>
            <form className={styles.form} onSubmit={handleCreateFarmer}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="farmerName">Name</label>
                <Input id="farmerName" value={farmerName} onChange={(e) => setFarmerName(e.target.value)} placeholder="e.g. Ganesh Patil" />
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="farmerRegion">Region</label>
                  <Input id="farmerRegion" value={farmerRegion} onChange={(e) => setFarmerRegion(e.target.value)} placeholder="e.g. Guntur" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="farmerPhone">Phone</label>
                  <Input id="farmerPhone" value={farmerPhone} onChange={(e) => setFarmerPhone(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="farmerEmail">Email</label>
                <Input id="farmerEmail" type="email" value={farmerEmail} onChange={(e) => setFarmerEmail(e.target.value)} placeholder="e.g. ganesh.patil@farmers.seedsphere.com" />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="farmerLocation">Location</label>
                <Input id="farmerLocation" value={farmerLocation} onChange={(e) => setFarmerLocation(e.target.value)} placeholder="Optional" />
              </div>
              <Button type="submit" leftIcon={UserPlus} isLoading={farmerSubmitting}>Register Farmer</Button>
            </form>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Request Seed Lot</h2>
            <form className={styles.form} onSubmit={handleCreateRequest}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reqFarmerId">Farmer</label>
                <select id="reqFarmerId" className={styles.select} value={reqFarmerId} onChange={(e) => setReqFarmerId(e.target.value)}>
                  <option value="">Select a farmer</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} — {f.region}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="reqCrop">Crop</label>
                  <Input id="reqCrop" value={reqCrop} onChange={(e) => setReqCrop(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="reqVariety">Variety</label>
                  <Input id="reqVariety" value={reqVariety} onChange={(e) => setReqVariety(e.target.value)} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reqQuantity">Quantity (kg)</label>
                <Input id="reqQuantity" type="number" min="1" value={reqQuantity} onChange={(e) => setReqQuantity(e.target.value)} />
              </div>
              <Button type="submit" leftIcon={Send} isLoading={reqSubmitting}>Submit Request</Button>
            </form>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Rate Seed Performance</h2>
            <p className={styles.sectionSubtitle}>Post-harvest feedback, recorded for a delivered request.</p>
            <form className={styles.form} onSubmit={handleSubmitRating}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="rateFarmerId">Farmer</label>
                <select
                  id="rateFarmerId"
                  className={styles.select}
                  value={rateFarmerId}
                  onChange={(e) => {
                    setRateFarmerId(e.target.value);
                    setRateRequestId('');
                  }}
                >
                  <option value="">Select a farmer</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="rateRequestId">Delivered Request</label>
                <select id="rateRequestId" className={styles.select} value={rateRequestId} onChange={(e) => setRateRequestId(e.target.value)}>
                  <option value="">Select a delivered request</option>
                  {deliveredRequests.map((r) => (
                    <option key={r.id} value={r.id}>{r.crop} — {r.variety} ({r.quantity_requested}{r.unit})</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="rateGermination">Germination (1-5)</label>
                  <Input id="rateGermination" type="number" min="1" max="5" value={rateGermination} onChange={(e) => setRateGermination(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="rateYield">Yield (1-5)</label>
                  <Input id="rateYield" type="number" min="1" max="5" value={rateYield} onChange={(e) => setRateYield(e.target.value)} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="rateOverall">Overall (1-5)</label>
                  <Input id="rateOverall" type="number" min="1" max="5" value={rateOverall} onChange={(e) => setRateOverall(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="rateHarvested">Harvested Qty (kg)</label>
                  <Input id="rateHarvested" type="number" min="0" value={rateHarvested} onChange={(e) => setRateHarvested(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="rateFeedback">Feedback</label>
                <textarea id="rateFeedback" className={styles.textarea} value={rateFeedback} onChange={(e) => setRateFeedback(e.target.value)} placeholder="Optional notes on germination/yield" />
              </div>
              <Button type="submit" leftIcon={Star} isLoading={rateSubmitting}>Submit Rating</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
