import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  computeDemandForecast,
  fetchInventoryOptimization,
  generatePurchaseOrder,
  listPurchaseOrders,
  login,
  updatePurchaseOrderStatus,
  type DemandForecastEntry,
  type InventoryOptimizationEntry,
  type PlanningItemInput,
  type PurchaseOrderRow,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedDemandPlanning.module.css';

// Mirrors demandPlanning.service.ts's STATUS_APPROVER_ROLES / VALID_TRANSITIONS exactly —
// duplicated here only to drive which action buttons are shown; the server is still the
// enforcement point, so a stale copy here would just hide/show a button, never bypass a rule.
const STATUS_APPROVER_ROLES: Record<string, string[]> = {
  sent: ['Admin', 'Producer', 'Warehouse Manager'],
  acknowledged: ['Admin', 'Breeder'],
  fulfilled: ['Admin', 'Breeder'],
  cancelled: ['Admin', 'Producer', 'Warehouse Manager'],
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['acknowledged', 'cancelled'],
  acknowledged: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
};

function poStatusClass(status: string): string {
  const key = `status${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

type PlanningRow = PlanningItemInput & { key: string };

function newPlanningRow(): PlanningRow {
  return { key: crypto.randomUUID(), crop: '', variety: '', season: '', targetArea: undefined, sowingDate: '' };
}

export default function SeedDemandPlanning() {
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);

  const [connectError, setConnectError] = useState<string | null>(null);

  // --- Demand forecast ---
  const [rows, setRows] = useState<PlanningRow[]>([newPlanningRow()]);
  const [horizonMonths, setHorizonMonths] = useState(6);
  const [forecastEntries, setForecastEntries] = useState<DemandForecastEntry[] | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecasting, setForecasting] = useState(false);

  // --- Inventory optimization ---
  const [inventory, setInventory] = useState<InventoryOptimizationEntry[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // --- Purchase orders ---
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [poForm, setPoForm] = useState({ crop: '', variety: '', quantity: '' });
  const [poFormError, setPoFormError] = useState<string | null>(null);
  const [poSubmitting, setPoSubmitting] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const loadInventory = useCallback(async (accessToken: string) => {
    setInventoryLoading(true);
    try {
      setInventory(await fetchInventoryOptimization(accessToken));
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to load inventory optimization data', 'error');
    } finally {
      setInventoryLoading(false);
    }
  }, [addToast]);

  const loadOrders = useCallback(async (accessToken: string, status: string) => {
    setOrdersLoading(true);
    try {
      setOrders(await listPurchaseOrders(accessToken, { status: status || undefined }));
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to load purchase orders', 'error');
    } finally {
      setOrdersLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setConnectError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setRole(account.role);
        await Promise.all([loadInventory(accessToken), loadOrders(accessToken, orderStatusFilter)]);
      } catch (err) {
        if (!cancelled) setConnectError(err instanceof Error ? err.message : 'Unable to connect to the demand planning service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  useEffect(() => {
    if (token) void loadOrders(token, orderStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderStatusFilter]);

  const updateRow = (key: string, patch: Partial<PlanningRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const handleForecast = async (event: React.FormEvent) => {
    event.preventDefault();
    setForecastError(null);

    if (!token) {
      setForecastError('Not connected to the demand planning service.');
      return;
    }
    const items: PlanningItemInput[] = rows
      .filter((r) => r.crop.trim() && r.variety.trim() && r.sowingDate)
      .map((r) => ({ crop: r.crop.trim(), variety: r.variety.trim(), season: r.season.trim(), targetArea: r.targetArea, sowingDate: r.sowingDate }));

    if (items.length === 0) {
      setForecastError('Add at least one row with crop, variety and a sowing date.');
      return;
    }

    setForecasting(true);
    try {
      const result = await computeDemandForecast(token, items, horizonMonths);
      setForecastEntries(result.entries);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to compute demand forecast';
      setForecastError(message);
      addToast(message, 'error');
    } finally {
      setForecasting(false);
    }
  };

  const handleGeneratePo = async (event: React.FormEvent) => {
    event.preventDefault();
    setPoFormError(null);

    if (!token) {
      setPoFormError('Not connected to the demand planning service.');
      return;
    }
    if (!poForm.crop.trim() || !poForm.variety.trim()) {
      setPoFormError('Crop and variety are required.');
      return;
    }
    const quantity = Number(poForm.quantity);
    if (!poForm.quantity || Number.isNaN(quantity) || quantity <= 0) {
      setPoFormError('Quantity must be a positive number.');
      return;
    }

    setPoSubmitting(true);
    try {
      await generatePurchaseOrder(token, { crop: poForm.crop.trim(), variety: poForm.variety.trim(), quantity });
      addToast('Purchase order generated.', 'success');
      setPoForm({ crop: '', variety: '', quantity: '' });
      await Promise.all([loadOrders(token, orderStatusFilter), loadInventory(token)]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate a purchase order';
      setPoFormError(message);
      addToast(message, 'error');
    } finally {
      setPoSubmitting(false);
    }
  };

  const handleTransition = async (order: PurchaseOrderRow, targetStatus: string) => {
    if (!token) return;
    setBusyOrderId(order.id);
    try {
      await updatePurchaseOrderStatus(token, order.id, targetStatus);
      addToast(`${order.po_number} moved to ${targetStatus}.`, 'success');
      await Promise.all([loadOrders(token, orderStatusFilter), loadInventory(token)]);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to update purchase order status', 'error');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Demand Forecasting &amp; Resource Allocation</h1>
          <p className={styles.subtitle}>
            Project seed demand from planned sowing, compare it against real Certified inventory, and raise purchase
            orders to close the gap.
          </p>
        </div>
        <div className={styles.controls}>
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
        </div>
      </div>

      {connectError ? <div className={styles.card}><span className={styles.errorText}>{connectError}</span></div> : null}

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Demand Forecast</h2>
        <p className={styles.sectionSubtitle}>
          Add planned sowing by crop, variety and season — items are grouped and compared against horizon months
          ahead of today.
        </p>

        <form onSubmit={handleForecast}>
          {forecastError ? <div className={styles.errorText} style={{ marginBottom: '0.75rem' }}>{forecastError}</div> : null}

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Crop</th>
                <th>Variety</th>
                <th>Season</th>
                <th>Target Area (acres)</th>
                <th>Sowing Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td><input className={styles.planningInput} value={row.crop} onChange={(e) => updateRow(row.key, { crop: e.target.value })} placeholder="e.g. Paddy" /></td>
                  <td><input className={styles.planningInput} value={row.variety} onChange={(e) => updateRow(row.key, { variety: e.target.value })} placeholder="e.g. IR-64" /></td>
                  <td><input className={styles.planningInput} value={row.season} onChange={(e) => updateRow(row.key, { season: e.target.value })} placeholder="e.g. Kharif 2026" /></td>
                  <td>
                    <input
                      className={styles.planningInput}
                      type="number"
                      min="0"
                      step="0.1"
                      value={row.targetArea ?? ''}
                      onChange={(e) => updateRow(row.key, { targetArea: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="e.g. 10"
                    />
                  </td>
                  <td><input className={styles.planningInput} type="date" value={row.sowingDate} onChange={(e) => updateRow(row.key, { sowingDate: e.target.value })} /></td>
                  <td>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={14} />}
                      onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== row.key) : prev))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.controls} style={{ marginTop: '0.85rem' }}>
            <Button type="button" variant="secondary" size="sm" leftIcon={Plus} onClick={() => setRows((prev) => [...prev, newPlanningRow()])}>
              Add Row
            </Button>
            <label className={styles.subtitle} style={{ margin: 0 }}>
              Horizon:&nbsp;
              <input
                className={styles.input}
                style={{ width: '5rem', display: 'inline-block' }}
                type="number"
                min="1"
                max="24"
                value={horizonMonths}
                onChange={(e) => setHorizonMonths(Number(e.target.value) || 6)}
              />
              &nbsp;months
            </label>
            <Button type="submit" leftIcon={Send} isLoading={forecasting}>
              Generate Forecast
            </Button>
          </div>
        </form>

        {forecastEntries ? (
          forecastEntries.length === 0 ? (
            <div className={styles.emptyState}>No planning items fall within the selected horizon.</div>
          ) : (
            <table className={styles.table} style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Crop / Variety</th>
                  <th>Season</th>
                  <th>Months Ahead</th>
                  <th>Urgency</th>
                  <th>Area</th>
                  <th>Required</th>
                  <th>Available</th>
                  <th>Gap</th>
                </tr>
              </thead>
              <tbody>
                {forecastEntries.map((entry, idx) => (
                  <tr key={`${entry.crop}-${entry.variety}-${idx}`}>
                    <td>{entry.crop} — {entry.variety}</td>
                    <td>{entry.season}</td>
                    <td>{entry.monthsAhead}</td>
                    <td><span className={`${styles.badge} ${entry.urgency === 'urgent' ? styles.badgeUrgent : styles.badgePlanned}`}>{entry.urgency}</span></td>
                    <td>{entry.totalAreaAcres.toLocaleString()} acres</td>
                    <td>{entry.requiredQuantity.toLocaleString()} {entry.unit}</td>
                    <td>{entry.availableQuantity.toLocaleString()} {entry.unit}</td>
                    <td>
                      <span className={`${styles.badge} ${entry.gapQuantity > 0 ? styles.badgeGap : styles.badgeNoGap}`}>
                        {entry.gapQuantity > 0 ? `${entry.gapQuantity.toLocaleString()} ${entry.unit} short` : 'Covered'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}
      </div>

      <div className={styles.card}>
        <div className={styles.controls} style={{ marginBottom: '0.5rem' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Inventory Optimization</h2>
          <Button variant="secondary" size="sm" leftIcon={RefreshCw} isLoading={inventoryLoading} onClick={() => token && void loadInventory(token)} style={{ marginLeft: 'auto' }}>
            Refresh
          </Button>
        </div>
        <p className={styles.sectionSubtitle}>Live Certified-stage stock per crop/variety, with any open purchase orders already covering it.</p>

        {inventory.length === 0 && !inventoryLoading ? (
          <div className={styles.emptyState}>No Certified-stage inventory or open purchase orders yet.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Lot Code</th>
                <th>Crop / Variety</th>
                <th>Available</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Open Purchase Orders</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((entry, idx) => (
                <tr key={`${entry.seedLotId ?? 'none'}-${idx}`}>
                  <td>{entry.lotCode ?? '—'}</td>
                  <td>{entry.crop} — {entry.variety}</td>
                  <td>{entry.quantityAvailable.toLocaleString()} kg</td>
                  <td>{entry.lowStockThreshold.toLocaleString()} kg</td>
                  <td>
                    <span className={`${styles.badge} ${entry.isLowStock ? styles.badgeGap : styles.badgeNoGap}`}>
                      {entry.isLowStock ? 'Low Stock' : 'Healthy'}
                    </span>
                  </td>
                  <td>
                    {entry.openPurchaseOrders.length === 0
                      ? '—'
                      : entry.openPurchaseOrders.map((po) => `${po.poNumber} (${po.status}, ${po.quantityRequested.toLocaleString()}kg)`).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Generate a Purchase Order</h2>
        <p className={styles.sectionSubtitle}>Raises a PO to the registered breeder for this crop/variety, with a 60-day lead time and a 10% safety margin applied automatically.</p>
        <form onSubmit={handleGeneratePo}>
          {poFormError ? <div className={styles.errorText} style={{ marginBottom: '0.75rem' }}>{poFormError}</div> : null}
          <div className={styles.controls}>
            <Input value={poForm.crop} onChange={(e) => setPoForm((f) => ({ ...f, crop: e.target.value }))} placeholder="Crop, e.g. Paddy" />
            <Input value={poForm.variety} onChange={(e) => setPoForm((f) => ({ ...f, variety: e.target.value }))} placeholder="Variety, e.g. IR-64" />
            <Input type="number" min="0" step="0.1" value={poForm.quantity} onChange={(e) => setPoForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="Quantity (kg)" />
            <Button type="submit" leftIcon={Plus} isLoading={poSubmitting}>Generate PO</Button>
          </div>
        </form>
      </div>

      <div className={styles.card}>
        <div className={styles.controls} style={{ marginBottom: '0.5rem' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Purchase Orders</h2>
          <select className={styles.select} value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {orders.length === 0 && !ordersLoading ? (
          <div className={styles.emptyState}>No purchase orders yet.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Crop / Variety</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Expected Delivery</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const nextStatuses = VALID_TRANSITIONS[order.status] ?? [];
                const overdue = order.expected_delivery_date
                  ? new Date(order.expected_delivery_date) < new Date() && !['fulfilled', 'cancelled'].includes(order.status)
                  : false;
                return (
                  <tr key={order.id}>
                    <td>{order.po_number}</td>
                    <td>{order.crop} — {order.variety}</td>
                    <td>{Number(order.quantity_requested).toLocaleString()} {order.unit}</td>
                    <td><span className={`${styles.badge} ${poStatusClass(order.status)}`}>{order.status}</span></td>
                    <td className={overdue ? styles.overdue : undefined}>
                      {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : '—'}
                      {overdue ? ' (overdue)' : ''}
                    </td>
                    <td>
                      <div className={styles.actionsRow}>
                        {nextStatuses.length === 0 ? (
                          <span className={styles.sectionSubtitle} style={{ margin: 0 }}>No further action</span>
                        ) : (
                          nextStatuses.map((next) => {
                            const allowed = (STATUS_APPROVER_ROLES[next] ?? []).includes(role);
                            return (
                              <Button
                                key={next}
                                size="sm"
                                variant={next === 'cancelled' ? 'danger' : 'secondary'}
                                disabled={!allowed}
                                isLoading={busyOrderId === order.id}
                                onClick={() => void handleTransition(order, next)}
                                title={allowed ? undefined : `Requires one of: ${(STATUS_APPROVER_ROLES[next] ?? []).join(', ')}`}
                              >
                                Move to {next}
                              </Button>
                            );
                          })
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
