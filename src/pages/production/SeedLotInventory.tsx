import { useCallback, useEffect, useRef, useState } from 'react';
import { FlaskConical, GitBranch, RefreshCw, Send, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  allocateSeedLot,
  connectInventorySocket,
  DEMO_ACCOUNTS,
  fetchAllocationHistory,
  fetchSeedLots,
  login,
  type AllocationHistoryEntry,
  type InventorySocketEvent,
  type RealtimeSeedLot,
  type RealtimeUser,
} from '@/services/seedLotRealtimeClient';
import { seedCropPlans } from './cropPlanningData';
import styles from './SeedLotInventory.module.css';

interface ActivityEntry {
  id: string;
  action: 'ALLOCATE' | 'RELEASE';
  lotCode: string;
  crop: string;
  quantity: number;
  unit: string;
  allocatedTo: string;
  performedByEmail: string;
  cropPlanId: string | null;
  at: string;
}

interface AlertEntry {
  id: string;
  lotCode: string;
  crop: string;
  quantityAvailable: number;
  lowStockThreshold: number;
  unit: string;
  at: string;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

function availabilityTier(lot: RealtimeSeedLot): 'Good' | 'Watch' | 'Low' {
  if (lot.is_low_stock) return 'Low';
  if (lot.quantity_available <= lot.low_stock_threshold * 1.5) return 'Watch';
  return 'Good';
}

function availabilityClass(tier: 'Good' | 'Watch' | 'Low'): string {
  return { Good: styles.availabilityGood, Watch: styles.availabilityWatch, Low: styles.availabilityLow }[tier];
}

export default function SeedLotInventory() {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [accountIndex, setAccountIndex] = useState(2); // Producer by default
  const [currentUser, setCurrentUser] = useState<RealtimeUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);
  const [pulsingLotIds, setPulsingLotIds] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<AllocationHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [formLotId, setFormLotId] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formAllocatedTo, setFormAllocatedTo] = useState('');
  const [formCropPlanId, setFormCropPlanId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  const handleSocketEvent = useCallback(
    (event: InventorySocketEvent) => {
      if (event.event === 'INVENTORY_UPDATE') {
        const { seedLot, allocation, performedBy, action } = event.payload;

        setLots((prev) => prev.map((lot) => (lot.id === seedLot.id ? seedLot : lot)));
        setPulsingLotIds((prev) => new Set(prev).add(seedLot.id));
        setTimeout(() => {
          setPulsingLotIds((prev) => {
            const next = new Set(prev);
            next.delete(seedLot.id);
            return next;
          });
        }, 1400);

        // PACKAGE events update the lot's quantities (handled above) but
        // aren't an allocation — this feed only tracks allocate/release.
        if (action !== 'PACKAGE' && allocation) {
          setActivity((prev) => [
            {
              id: allocation.id + allocation.updated_at,
              action,
              lotCode: seedLot.lot_code,
              crop: seedLot.crop,
              quantity: allocation.quantity,
              unit: seedLot.unit,
              allocatedTo: allocation.allocated_to,
              performedByEmail: performedBy.email,
              cropPlanId: allocation.crop_plan_id,
              at: event.at,
            },
            ...prev,
          ].slice(0, 15));
        }
      }

      if (event.event === 'LOW_STOCK_ALERT') {
        const { lotCode, crop, quantityAvailable, lowStockThreshold, unit } = event.payload;
        setAlerts((prev) => [
          { id: `${event.payload.seedLotId}-${event.at}`, lotCode, crop, quantityAvailable, lowStockThreshold, unit, at: event.at },
          ...prev,
        ].slice(0, 10));
        addToast(`Low stock: ${lotCode} (${crop}) — ${quantityAvailable}${unit} left`, 'error');
      }
    },
    [addToast],
  );

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');
      try {
        const { user, accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setCurrentUser(user);
        setToken(accessToken);

        const initialLots = await fetchSeedLots(accessToken);
        if (cancelled) return;
        setLots(initialLots);

        socketRef.current?.close();
        const socket = connectInventorySocket(accessToken, {
          onOpen: () => !cancelled && setConnectionStatus('connected'),
          onClose: () => !cancelled && setConnectionStatus('disconnected'),
          onEvent: handleSocketEvent,
        });
        socketRef.current = socket;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to connect to the inventory service');
          setConnectionStatus('disconnected');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      socketRef.current?.close();
    };
  }, [accountIndex, handleSocketEvent]);

  const handleRefresh = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const refreshedLots = await fetchSeedLots(token);
      setLots(refreshedLots);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to refresh inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLot = async (lotId: string) => {
    setSelectedLotId(lotId);
    if (!token) return;
    setHistoryLoading(true);
    setHistoryEntries(null);
    try {
      const entries = await fetchAllocationHistory(token, lotId);
      setHistoryEntries(entries);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to load allocation history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSimulateAllocate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError('Not connected to the inventory service.');
      return;
    }
    if (!formLotId) {
      setFormError('Select a seed lot.');
      return;
    }
    const quantity = Number(formQuantity);
    if (!formQuantity || Number.isNaN(quantity) || quantity <= 0) {
      setFormError('Quantity must be a positive number.');
      return;
    }
    if (!formAllocatedTo.trim()) {
      setFormError('Enter who this allocation is for (e.g. a farm id).');
      return;
    }

    setFormSubmitting(true);
    try {
      await allocateSeedLot(token, formLotId, {
        quantity,
        allocatedTo: formAllocatedTo.trim(),
        cropPlanId: formCropPlanId || undefined,
      });
      addToast('Allocation submitted — watch the table update live via the broadcast.', 'success');
      setFormQuantity('');
      setFormAllocatedTo('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit allocation';
      setFormError(message);
      addToast(message, 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const lowStockCount = lots.filter((lot) => lot.is_low_stock).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Real-Time Seed Lot Inventory</h1>
          <p className={styles.subtitle}>
            Live quantities streamed over WebSocket from the seed lot allocation service — no refresh needed.
          </p>
        </div>
        <div className={styles.controls}>
          <span className={styles.connectionBadge}>
            {connectionStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span
              className={`${styles.dot} ${
                connectionStatus === 'connected'
                  ? styles.dotConnected
                  : connectionStatus === 'connecting'
                    ? styles.dotConnecting
                    : styles.dotDisconnected
              }`}
            />
            {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
          </span>
          <select
            className={styles.select}
            value={accountIndex}
            onChange={(e) => setAccountIndex(Number(e.target.value))}
          >
            {DEMO_ACCOUNTS.map((account, index) => (
              <option key={account.email} value={index}>
                Viewing as: {account.role}
              </option>
            ))}
          </select>
          <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void handleRefresh()} isLoading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <div className={styles.card} style={{ marginBottom: '1rem' }}><span className={styles.errorText}>{error}</span></div> : null}

      <div className={styles.summaryRow}>
        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Seed Lots</span>
          <span className={styles.summaryValue}>{lots.length}</span>
        </div>
        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Low Stock</span>
          <span className={styles.summaryValue}>{lowStockCount}</span>
        </div>
        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Signed in as</span>
          <span className={styles.summaryValue} style={{ fontSize: '1rem' }}>
            {currentUser ? `${currentUser.name} (${currentUser.role})` : '—'}
          </span>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Live Inventory</h2>

          {lots.length === 0 && !loading ? (
            <div className={styles.emptyState}>No seed lots visible to this account yet.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Lot Code</th>
                  <th>Stage</th>
                  <th>Crop / Variety</th>
                  <th>Total</th>
                  <th>Allocated</th>
                  <th>Available</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => {
                  const tier = availabilityTier(lot);
                  return (
                    <tr
                      key={lot.id}
                      className={`${styles.tableRow} ${selectedLotId === lot.id ? styles.tableRowSelected : ''} ${
                        pulsingLotIds.has(lot.id) ? styles.pulse : ''
                      }`}
                      onClick={() => void handleSelectLot(lot.id)}
                    >
                      <td>{lot.lot_code}</td>
                      <td>{lot.stage}</td>
                      <td>{lot.crop} — {lot.variety}</td>
                      <td>{lot.quantity_total.toLocaleString()} {lot.unit}</td>
                      <td>{lot.quantity_allocated.toLocaleString()} {lot.unit}</td>
                      <td>
                        <span className={`${styles.availabilityBadge} ${availabilityClass(tier)}`}>
                          {lot.quantity_available.toLocaleString()} {lot.unit}
                        </span>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={GitBranch}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/seed-lot-genealogy/${lot.id}`);
                          }}
                        >
                          Genealogy
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={FlaskConical}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/seed-lot-detail/${lot.id}`);
                          }}
                        >
                          Testing
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {selectedLotId ? (
            <div className={styles.historyPanel}>
              <h2 className={styles.sectionTitle}>
                Allocation History — {lots.find((l) => l.id === selectedLotId)?.lot_code ?? selectedLotId}
              </h2>
              {historyLoading ? (
                <div className={styles.emptyState}>Loading history…</div>
              ) : historyEntries && historyEntries.length > 0 ? (
                historyEntries.map((entry) => (
                  <div key={entry.id} className={styles.historyEntry}>
                    <span className={entry.status === 'released' ? styles.tagRelease : styles.tagAllocate}>
                      {entry.status === 'released' ? 'Released' : 'Allocated'}
                    </span>{' '}
                    {entry.quantity.toLocaleString()} to <strong>{entry.allocated_to}</strong>
                    {entry.crop_plan_id ? <> for crop plan <strong>{entry.crop_plan_id}</strong></> : null}
                    <div className={styles.activityMeta}>
                      {entry.performed_by_name ?? entry.performed_by} ({entry.performed_by_role ?? 'unknown role'}) ·{' '}
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>No allocation history recorded for this lot yet.</div>
              )}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Simulate Allocation</h2>
            <p className={styles.subtitle} style={{ marginBottom: '0.5rem' }}>
              Mimics a crop plan requesting seed — submit here, watch the table and feed update live.
            </p>
            <form className={styles.form} onSubmit={handleSimulateAllocate}>
              {formError ? <span className={styles.errorText}>{formError}</span> : null}

              <div className={styles.field}>
                <label className={styles.label} htmlFor="formLotId">Seed Lot</label>
                <select id="formLotId" className={styles.select} value={formLotId} onChange={(e) => setFormLotId(e.target.value)}>
                  <option value="">Select a seed lot</option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lot_code} — {lot.crop} ({lot.quantity_available.toLocaleString()} {lot.unit} available)
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="formQuantity">Quantity</label>
                  <Input
                    id="formQuantity"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="e.g. 250"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="formAllocatedTo">Allocated To</label>
                  <Input
                    id="formAllocatedTo"
                    value={formAllocatedTo}
                    onChange={(e) => setFormAllocatedTo(e.target.value)}
                    placeholder="e.g. farm-1"
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="formCropPlanId">Crop Plan (optional)</label>
                <select
                  id="formCropPlanId"
                  className={styles.select}
                  value={formCropPlanId}
                  onChange={(e) => setFormCropPlanId(e.target.value)}
                >
                  <option value="">Not linked to a crop plan</option>
                  {seedCropPlans.map((plan) => (
                    <option key={plan.id} value={plan.planCode}>
                      {plan.planCode} — {plan.crop} ({plan.season})
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" leftIcon={Send} isLoading={formSubmitting}>
                Allocate
              </Button>
            </form>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Active Alerts</h2>
            {alerts.length === 0 ? (
              <div className={styles.emptyState}>No low-stock alerts yet.</div>
            ) : (
              <div className={styles.alertList}>
                {alerts.map((alert) => (
                  <div key={alert.id} className={styles.alertItem}>
                    <p className={styles.alertTitle}>{alert.lotCode} — {alert.crop}</p>
                    <span className={styles.alertMeta}>
                      {alert.quantityAvailable.toLocaleString()}{alert.unit} left (threshold {alert.lowStockThreshold}
                      {alert.unit}) · {new Date(alert.at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            {activity.length === 0 ? (
              <div className={styles.emptyState}>No allocation activity yet this session.</div>
            ) : (
              <div className={styles.activityList}>
                {activity.map((entry) => (
                  <div key={entry.id} className={styles.activityItem}>
                    <span className={entry.action === 'ALLOCATE' ? styles.tagAllocate : styles.tagRelease}>
                      {entry.action === 'ALLOCATE' ? 'Allocated' : 'Released'}
                    </span>{' '}
                    {entry.quantity.toLocaleString()}{entry.unit} {entry.action === 'ALLOCATE' ? 'to' : 'from'}{' '}
                    <strong>{entry.allocatedTo}</strong> — {entry.lotCode} ({entry.crop})
                    {entry.cropPlanId ? <> · plan {entry.cropPlanId}</> : null}
                    <div className={styles.activityMeta}>
                      {entry.performedByEmail} · {new Date(entry.at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
