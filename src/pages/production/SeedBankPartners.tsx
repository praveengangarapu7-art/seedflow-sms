import { useCallback, useEffect, useState } from 'react';
import { Award, Handshake, Package, RefreshCw, Scale, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import {
  DEMO_ACCOUNTS,
  approvePartnerLink,
  cancelPartnerOrder,
  confirmPartnerOrder,
  createPartnerOrder,
  disputePartnerOrder,
  fetchOrganizations,
  fetchPartnerCatalog,
  fetchPartnerLinks,
  fetchPartnerRating,
  fetchPartnerRatings,
  fetchQualityComparison,
  fetchSeedLots,
  login,
  reactivatePartnerLink,
  receivePartnerOrder,
  rejectPartnerLink,
  rejectPartnerOrder,
  requestPartnerLink,
  shipPartnerOrder,
  suspendPartnerLink,
  syncPartnerInventory,
  updateSeedLotAvailability,
  fetchPartnerOrders,
  type OrganizationRow,
  type PartnerCatalogEntry,
  type PartnerLink,
  type PartnerOrder,
  type PartnerPerformanceRating,
  type QualityComparisonEntry,
  type RealtimeSeedLot,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedBankPartners.module.css';

const CAN_MANAGE_LINKS_ROLES = new Set(['Admin']);
const CAN_ORDER_ROLES = new Set(['Admin', 'Producer', 'Warehouse Manager']);
const CAN_FULFILL_ROLES = new Set(['Admin', 'Warehouse Manager']);

function statusBadgeClass(status: string): string {
  const key = `status${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

export default function SeedBankPartners() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);

  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [myOrgId, setMyOrgId] = useState('');
  const [partnerOrgId, setPartnerOrgId] = useState('');

  const [links, setLinks] = useState<PartnerLink[]>([]);
  const [catalog, setCatalog] = useState<PartnerCatalogEntry[]>([]);
  const [myFoundationLots, setMyFoundationLots] = useState<RealtimeSeedLot[]>([]);
  const [buyerOrders, setBuyerOrders] = useState<PartnerOrder[]>([]);
  const [partnerOrders, setPartnerOrders] = useState<PartnerOrder[]>([]);
  const [ratingsForPartner, setRatingsForPartner] = useState<PartnerPerformanceRating[]>([]);
  const [myRating, setMyRating] = useState<PartnerPerformanceRating | null>(null);

  const [qualityCrop, setQualityCrop] = useState('');
  const [qualityVariety, setQualityVariety] = useState('');
  const [qualityResults, setQualityResults] = useState<QualityComparisonEntry[] | null>(null);

  const [orderQuantities, setOrderQuantities] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [receiveInputs, setReceiveInputs] = useState<Record<string, { qualityRating: number; onTime: boolean }>>({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? id;

  const loadAll = useCallback(async (accessToken: string, buyerId: string, partnerId: string) => {
    setError(null);
    try {
      const [linkList, myLots, bOrders, pOrders, partnerRatings, rating] = await Promise.all([
        fetchPartnerLinks(accessToken, buyerId),
        fetchSeedLots(accessToken),
        fetchPartnerOrders(accessToken, { buyerOrgId: buyerId }),
        fetchPartnerOrders(accessToken, { partnerOrgId: buyerId }),
        partnerId ? fetchPartnerRatings(accessToken, partnerId) : Promise.resolve([]),
        partnerId ? fetchPartnerRating(accessToken, partnerId, buyerId) : Promise.resolve(null),
      ]);
      setLinks(linkList);
      setMyFoundationLots(myLots.filter((l) => l.organization_id === buyerId && l.stage === 'Foundation'));
      setBuyerOrders(bOrders);
      setPartnerOrders(pOrders);
      setRatingsForPartner(partnerRatings);
      setMyRating(rating);

      if (partnerId) {
        const catalogEntries = await fetchPartnerCatalog(accessToken, partnerId);
        setCatalog(catalogEntries);
      } else {
        setCatalog([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load partner data');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      setQualityResults(null);
      try {
        const { user, accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setRole(account.role);

        const orgList = await fetchOrganizations(accessToken);
        if (cancelled) return;
        setOrgs(orgList);

        const resolvedMyOrgId = user.organizationId ?? orgList[0]?.id ?? '';
        const resolvedPartnerOrgId = orgList.find((o) => o.id !== resolvedMyOrgId)?.id ?? '';
        setMyOrgId(resolvedMyOrgId);
        setPartnerOrgId(resolvedPartnerOrgId);
        if (resolvedMyOrgId) await loadAll(accessToken, resolvedMyOrgId, resolvedPartnerOrgId);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the partner integration service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const handleRefresh = () => {
    if (token && myOrgId) void loadAll(token, myOrgId, partnerOrgId);
  };

  const handleMyOrgChange = (id: string) => {
    setMyOrgId(id);
    if (token) void loadAll(token, id, partnerOrgId);
  };

  const handlePartnerOrgChange = (id: string) => {
    setPartnerOrgId(id);
    if (token && myOrgId) void loadAll(token, myOrgId, id);
  };

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestLink = () =>
    withBusy(async () => {
      if (!token) return;
      await requestPartnerLink(token, myOrgId, partnerOrgId);
      setMessage(`Partner link requested with ${orgName(partnerOrgId)}.`);
      await loadAll(token, myOrgId, partnerOrgId);
    });

  const handleLinkAction = (linkId: string, action: 'approve' | 'reject' | 'suspend' | 'reactivate') =>
    withBusy(async () => {
      if (!token) return;
      const fn = { approve: approvePartnerLink, reject: rejectPartnerLink, suspend: suspendPartnerLink, reactivate: reactivatePartnerLink }[action];
      await fn(token, linkId);
      setMessage(`Partner link ${action}d.`);
      await loadAll(token, myOrgId, partnerOrgId);
    });

  const handleSync = () =>
    withBusy(async () => {
      if (!token || !partnerOrgId) return;
      const result = await syncPartnerInventory(token, partnerOrgId, myOrgId);
      setCatalog(result.catalog);
      setMessage(`Synced ${result.syncLog.lots_synced} lot(s), ${result.syncLog.total_available_quantity.toLocaleString()} total units available.`);
    });

  const handleQualityCompare = () =>
    withBusy(async () => {
      if (!token || !qualityCrop.trim()) {
        setError('Enter a crop to compare quality across partner offerings.');
        return;
      }
      const results = await fetchQualityComparison(token, qualityCrop.trim(), qualityVariety.trim() || undefined);
      setQualityResults(results);
    });

  const handleToggleAvailability = (lot: RealtimeSeedLot) =>
    withBusy(async () => {
      if (!token) return;
      await updateSeedLotAvailability(token, lot.id, !lot.available_for_partner_order);
      setMessage(`${lot.lot_code} ${lot.available_for_partner_order ? 'removed from' : 'added to'} the partner catalog.`);
      const myLots = await fetchSeedLots(token);
      setMyFoundationLots(myLots.filter((l) => l.organization_id === myOrgId && l.stage === 'Foundation'));
    });

  const handleOrder = (lot: PartnerCatalogEntry) =>
    withBusy(async () => {
      if (!token) return;
      const quantity = Number(orderQuantities[lot.id]);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setError('Enter a valid quantity to order.');
        return;
      }
      const order = await createPartnerOrder(token, { buyerOrgId: myOrgId, partnerOrgId, seedLotId: lot.id, quantity });
      setMessage(`Order ${order.order_number} placed (${order.status}).`);
      await loadAll(token, myOrgId, partnerOrgId);
    });

  const handleOrderAction = (orderId: string, action: 'confirm' | 'reject' | 'ship' | 'receive' | 'dispute' | 'cancel') =>
    withBusy(async () => {
      if (!token) return;
      if (action === 'confirm') await confirmPartnerOrder(token, orderId);
      else if (action === 'ship') await shipPartnerOrder(token, orderId);
      else if (action === 'cancel') await cancelPartnerOrder(token, orderId);
      else if (action === 'reject') {
        const reason = reasons[orderId]?.trim();
        if (!reason) {
          setError('Enter a reason before rejecting this order.');
          return;
        }
        await rejectPartnerOrder(token, orderId, reason);
      } else if (action === 'dispute') {
        const reason = reasons[orderId]?.trim();
        if (!reason) {
          setError('Enter a reason before disputing this order.');
          return;
        }
        await disputePartnerOrder(token, orderId, reason);
      } else if (action === 'receive') {
        const input = receiveInputs[orderId] ?? { qualityRating: 5, onTime: true };
        await receivePartnerOrder(token, orderId, input);
      }
      setMessage(`Order ${action}ed.`);
      await loadAll(token, myOrgId, partnerOrgId);
    });

  const canManageLinks = CAN_MANAGE_LINKS_ROLES.has(role);
  const canOrder = CAN_ORDER_ROLES.has(role);
  const canFulfill = CAN_FULFILL_ROLES.has(role);
  const activeLinkExists = links.some(
    (l) => l.requesting_org_id === myOrgId && l.partner_org_id === partnerOrgId && l.status === 'active',
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Third-Party Seed Bank Integration</h1>
          <p className={styles.subtitle}>
            Browse Foundation-stage lots from partner organizations, place and fulfill cross-org orders end to end, compare
            quality across partners, and track partner reliability from real order outcomes.
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
          <select className={styles.select} value={myOrgId} onChange={(e) => handleMyOrgChange(e.target.value)}>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                My Org: {org.name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={partnerOrgId} onChange={(e) => handlePartnerOrgChange(e.target.value)}>
            <option value="">Select a partner org</option>
            {orgs.filter((o) => o.id !== myOrgId).map((org) => (
              <option key={org.id} value={org.id}>
                Partner: {org.name}
              </option>
            ))}
          </select>
          <Button variant="secondary" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {message ? <div className={styles.card}><span className={styles.successText}>{message}</span></div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <KpiCard title="Active Partner Links" value={String(links.filter((l) => l.status === 'active').length)} icon={Handshake} />
        <KpiCard title="Partner Catalog Lots" value={String(catalog.length)} icon={Package} />
        <KpiCard title="Orders Placed" value={String(buyerOrders.length)} icon={ShoppingCart} />
        <KpiCard
          title={`Rating: ${partnerOrgId ? orgName(partnerOrgId) : '—'}`}
          value={myRating?.overall_score != null ? `${myRating.overall_score}/100` : 'No history yet'}
          icon={Award}
        />
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Partner Links</h2>
              {canManageLinks && partnerOrgId ? (
                <Button size="sm" isLoading={busy} disabled={!partnerOrgId} onClick={() => void handleRequestLink()}>
                  Request Link to {orgName(partnerOrgId)}
                </Button>
              ) : null}
            </div>
            <p className={styles.sectionSubtitle}>
              An active link (approved by an Admin) must exist before {orgName(myOrgId) || 'your org'} can order from a partner's catalog.
            </p>
            {links.length === 0 ? (
              <div className={styles.emptyState}>No partner links yet for this organization.</div>
            ) : (
              links.map((link) => (
                <div key={link.id} className={styles.row}>
                  <div>
                    <strong>{orgName(link.requesting_org_id)}</strong> → <strong>{orgName(link.partner_org_id)}</strong>
                    <span className={`${styles.statusBadge} ${statusBadgeClass(link.status)}`} style={{ marginLeft: '0.5rem' }}>
                      {link.status}
                    </span>
                    <div className={styles.rowMeta}>Requested by {link.requested_by} on {new Date(link.requested_at).toLocaleDateString()}</div>
                  </div>
                  {canManageLinks ? (
                    <div className={styles.rowActions}>
                      {link.status === 'pending' && (
                        <>
                          <Button size="sm" isLoading={busy} onClick={() => void handleLinkAction(link.id, 'approve')}>Approve</Button>
                          <Button size="sm" variant="danger" isLoading={busy} onClick={() => void handleLinkAction(link.id, 'reject')}>Reject</Button>
                        </>
                      )}
                      {link.status === 'active' && (
                        <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handleLinkAction(link.id, 'suspend')}>Suspend</Button>
                      )}
                      {link.status === 'suspended' && (
                        <Button size="sm" isLoading={busy} onClick={() => void handleLinkAction(link.id, 'reactivate')}>Reactivate</Button>
                      )}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Partner Catalog{partnerOrgId ? `: ${orgName(partnerOrgId)}` : ''}</h2>
              <Button size="sm" variant="secondary" leftIcon={RefreshCw} isLoading={busy} disabled={!partnerOrgId} onClick={() => void handleSync()}>
                Sync Now
              </Button>
            </div>
            <p className={styles.sectionSubtitle}>Foundation-stage lots this partner has opted in to sell to other organizations.</p>
            {!partnerOrgId ? (
              <div className={styles.emptyState}>Select a partner organization above.</div>
            ) : !activeLinkExists ? (
              <div className={styles.emptyState}>Browsing is open, but an active link is required before you can order.</div>
            ) : null}
            {catalog.length === 0 ? (
              <div className={styles.emptyState}>No lots currently available in this partner's catalog.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr><th>Lot</th><th>Crop / Variety</th><th>Available</th><th>Qty</th><th></th></tr>
                </thead>
                <tbody>
                  {catalog.map((lot) => (
                    <tr key={lot.id}>
                      <td>{lot.lot_code}</td>
                      <td>{lot.crop} / {lot.variety}</td>
                      <td>{lot.quantity_available.toLocaleString()} {lot.unit}</td>
                      <td>
                        <input
                          className={styles.numberInput}
                          type="number"
                          min={1}
                          value={orderQuantities[lot.id] ?? ''}
                          onChange={(e) => setOrderQuantities((prev) => ({ ...prev, [lot.id]: e.target.value }))}
                        />
                      </td>
                      <td>
                        <Button size="sm" isLoading={busy} disabled={!canOrder} onClick={() => void handleOrder(lot)}>Order</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Quality Metric Comparison</h2>
            <p className={styles.sectionSubtitle}>Compare germination/purity/viability across every partner org offering the same crop.</p>
            <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
              <input className={styles.textInput} placeholder="Crop (required)" value={qualityCrop} onChange={(e) => setQualityCrop(e.target.value)} />
              <input className={styles.textInput} placeholder="Variety (optional)" value={qualityVariety} onChange={(e) => setQualityVariety(e.target.value)} />
              <Button size="sm" leftIcon={Scale} isLoading={busy} onClick={() => void handleQualityCompare()}>Compare</Button>
            </div>
            {qualityResults === null ? (
              <div className={styles.emptyState}>Enter a crop to compare quality across partner offerings.</div>
            ) : qualityResults.length === 0 ? (
              <div className={styles.emptyState}>No partner-catalog lots found for that crop/variety.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr><th>Organization</th><th>Lot</th><th>Germination</th><th>Purity</th><th>Viability</th><th>Available</th></tr>
                </thead>
                <tbody>
                  {qualityResults.map((r) => (
                    <tr key={r.seedLotId}>
                      <td>{r.organizationName}</td>
                      <td>{r.lotCode}</td>
                      <td>{r.germination.averagePercent != null ? `${r.germination.averagePercent}%` : '—'}</td>
                      <td>{r.purity.averagePercent != null ? `${r.purity.averagePercent}%` : '—'}</td>
                      <td>{r.viability.averagePercent != null ? `${r.viability.averagePercent}%` : '—'}</td>
                      <td>{r.quantityAvailable.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>My Foundation Lots — Partner Catalog Opt-In</h2>
            <p className={styles.sectionSubtitle}>Toggle whether your own Foundation-stage lots are listed for other organizations to order.</p>
            {myFoundationLots.length === 0 ? (
              <div className={styles.emptyState}>No Foundation-stage lots owned by this organization.</div>
            ) : (
              myFoundationLots.map((lot) => {
                const available = lot.available_for_partner_order;
                return (
                  <div key={lot.id} className={styles.row}>
                    <div>
                      <strong>{lot.lot_code}</strong>
                      <div className={styles.rowMeta}>{lot.crop} / {lot.variety} — {lot.quantity_available.toLocaleString()} {lot.unit} available</div>
                    </div>
                    <Button size="sm" variant={available ? 'secondary' : 'primary'} isLoading={busy} onClick={() => void handleToggleAvailability(lot)}>
                      {available ? 'Listed — Remove' : 'List in Catalog'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>My Orders (as Buyer)</h2>
            {buyerOrders.length === 0 ? (
              <div className={styles.emptyState}>No orders placed yet.</div>
            ) : (
              buyerOrders.map((order) => (
                <div key={order.id} className={styles.row}>
                  <div>
                    <strong>{order.order_number}</strong>
                    <span className={`${styles.statusBadge} ${statusBadgeClass(order.status)}`} style={{ marginLeft: '0.5rem' }}>{order.status}</span>
                    <div className={styles.rowMeta}>
                      {order.crop} / {order.variety} — {order.quantity_requested} {order.unit} from {orgName(order.partner_org_id)}
                    </div>
                    {order.status === 'shipped' && (
                      <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                        <select
                          className={styles.select}
                          value={receiveInputs[order.id]?.qualityRating ?? 5}
                          onChange={(e) =>
                            setReceiveInputs((prev) => ({ ...prev, [order.id]: { qualityRating: Number(e.target.value), onTime: prev[order.id]?.onTime ?? true } }))
                          }
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>Quality: {n}/5</option>
                          ))}
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={receiveInputs[order.id]?.onTime ?? true}
                            onChange={(e) =>
                              setReceiveInputs((prev) => ({ ...prev, [order.id]: { qualityRating: prev[order.id]?.qualityRating ?? 5, onTime: e.target.checked } }))
                            }
                          />
                          On time
                        </label>
                        <Button size="sm" isLoading={busy} onClick={() => void handleOrderAction(order.id, 'receive')}>Mark Received</Button>
                      </div>
                    )}
                    {order.status === 'received' && (
                      <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                        <input
                          className={styles.textInput}
                          placeholder="Dispute reason…"
                          value={reasons[order.id] ?? ''}
                          onChange={(e) => setReasons((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        />
                        <Button size="sm" variant="danger" isLoading={busy} onClick={() => void handleOrderAction(order.id, 'dispute')}>Dispute</Button>
                      </div>
                    )}
                  </div>
                  {['requested', 'confirmed'].includes(order.status) && (
                    <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handleOrderAction(order.id, 'cancel')}>Cancel</Button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Orders to Fulfill (as Partner)</h2>
            {partnerOrders.length === 0 ? (
              <div className={styles.emptyState}>No incoming orders for this organization.</div>
            ) : (
              partnerOrders.map((order) => (
                <div key={order.id} className={styles.row}>
                  <div>
                    <strong>{order.order_number}</strong>
                    <span className={`${styles.statusBadge} ${statusBadgeClass(order.status)}`} style={{ marginLeft: '0.5rem' }}>{order.status}</span>
                    <div className={styles.rowMeta}>
                      {order.crop} / {order.variety} — {order.quantity_requested} {order.unit} for {orgName(order.buyer_org_id)}
                    </div>
                    {order.status === 'requested' && canFulfill && (
                      <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                        <input
                          className={styles.textInput}
                          placeholder="Rejection reason…"
                          value={reasons[order.id] ?? ''}
                          onChange={(e) => setReasons((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        />
                        <Button size="sm" variant="danger" isLoading={busy} onClick={() => void handleOrderAction(order.id, 'reject')}>Reject</Button>
                      </div>
                    )}
                  </div>
                  <div className={styles.rowActions}>
                    {order.status === 'requested' && canFulfill && (
                      <Button size="sm" isLoading={busy} onClick={() => void handleOrderAction(order.id, 'confirm')}>Confirm</Button>
                    )}
                    {order.status === 'confirmed' && canFulfill && (
                      <Button size="sm" isLoading={busy} onClick={() => void handleOrderAction(order.id, 'ship')}>Ship</Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Partner Reputation{partnerOrgId ? `: ${orgName(partnerOrgId)}` : ''}</h2>
            <p className={styles.sectionSubtitle}>Computed from real order outcomes — fulfillment rate, delivery timeliness, and buyer-reported quality.</p>
            {!partnerOrgId ? (
              <div className={styles.emptyState}>Select a partner organization above.</div>
            ) : ratingsForPartner.length === 0 ? (
              <div className={styles.emptyState}>No completed orders yet — a rating appears once at least one order is received or disputed.</div>
            ) : (
              ratingsForPartner.map((r) => (
                <div key={r.id} className={styles.row}>
                  <div>
                    <strong>Rated by {orgName(r.buyer_org_id)}</strong>
                    <div className={styles.rowMeta}>
                      {r.fulfilled_orders}/{r.total_orders} fulfilled · {r.on_time_orders} on-time · avg quality {r.avg_quality_rating ?? '—'}/5
                    </div>
                  </div>
                  <span className={styles.scoreValue}>{r.overall_score != null ? `${r.overall_score}/100` : '—'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
