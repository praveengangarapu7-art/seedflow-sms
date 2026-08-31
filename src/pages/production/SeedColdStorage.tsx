import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, PackageMinus, PlusCircle, Thermometer } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  assignBatchToStorage,
  connectInventorySocket,
  createStorageLocation,
  fetchExpirationStatuses,
  fetchFifoPickOrder,
  fetchMovementHistory,
  fetchOrganizations,
  fetchPackagingBatches,
  fetchStorageCosts,
  fetchStorageLocations,
  login,
  moveBatchStorage,
  recordStorageConditionLog,
  removeBatchFromStorage,
  type ExpirationEntry,
  type FifoPickEntry,
  type InventorySocketEvent,
  type OrganizationRow,
  type PackagingBatchRow,
  type StorageAssignmentRow,
  type StorageCostEntry,
  type StorageLocationRow,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedColdStorage.module.css';

function statusClass(status: string): string {
  return (
    {
      active: styles.statusActive,
      moved: styles.statusMoved,
      removed: styles.statusRemoved,
      inactive: styles.statusInactive,
      ok: styles.statusOk,
      warning: styles.statusWarning,
      critical: styles.statusCritical,
      expired: styles.statusExpired,
    }[status] ?? styles.statusActive
  );
}

export default function SeedColdStorage() {
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(4); // Warehouse Manager by default
  const [token, setToken] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [locations, setLocations] = useState<StorageLocationRow[]>([]);
  const [batches, setBatches] = useState<PackagingBatchRow[]>([]);
  const [expirations, setExpirations] = useState<ExpirationEntry[]>([]);
  const [costs, setCosts] = useState<StorageCostEntry[]>([]);

  const [zoneFilter, setZoneFilter] = useState('all');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [movementHistory, setMovementHistory] = useState<StorageAssignmentRow[]>([]);

  const [fifoCrop, setFifoCrop] = useState('Paddy');
  const [fifoVariety, setFifoVariety] = useState('Paddy-1010');
  const [fifoResults, setFifoResults] = useState<FifoPickEntry[] | null>(null);

  const [locOrgId, setLocOrgId] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locZone, setLocZone] = useState('');
  const [locShelf, setLocShelf] = useState('');
  const [locCapacity, setLocCapacity] = useState('100');
  const [locTemp, setLocTemp] = useState('20');
  const [locHumidity, setLocHumidity] = useState('50');
  const [locRate, setLocRate] = useState('0.03');

  const [condTemp, setCondTemp] = useState('20');
  const [condHumidity, setCondHumidity] = useState('50');
  const [condLocationId, setCondLocationId] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  const refreshAll = useCallback(async (accessToken: string) => {
    const [locationsResult, batchesResult, expirationsResult, costsResult] = await Promise.all([
      fetchStorageLocations(accessToken),
      fetchPackagingBatches(accessToken),
      fetchExpirationStatuses(accessToken),
      fetchStorageCosts(accessToken),
    ]);
    setLocations(locationsResult);
    setBatches(batchesResult);
    setExpirations(expirationsResult);
    setCosts(costsResult);
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

        const orgs = await fetchOrganizations(accessToken);
        if (cancelled) return;
        setOrganizations(orgs);
        setLocOrgId((current) => current || orgs.find((o) => o.type === 'warehouse')?.id || '');

        await refreshAll(accessToken);

        socketRef.current?.close();
        socketRef.current = connectInventorySocket(accessToken, {
          onEvent: (event: InventorySocketEvent) => {
            if (event.event === 'STORAGE_ASSIGNMENT_CHANGED') {
              setNotifications((prev) => [`Batch ${event.payload.action.toLowerCase()} by ${event.payload.performedBy}`, ...prev].slice(0, 5));
              void refreshAll(accessToken);
            }
            if (event.event === 'STORAGE_CONDITION_ALERT') {
              setNotifications((prev) => [
                `Condition alert at ${event.payload.locationCode}: ${event.payload.recordedTemperatureC}°C / ${event.payload.recordedHumidityPercent}% (target ${event.payload.targetTemperatureC}°C / ${event.payload.targetHumidityPercent}%)`,
                ...prev,
              ].slice(0, 5));
            }
            if (event.event === 'EXPIRATION_ALERT') {
              void fetchExpirationStatuses(accessToken).then(setExpirations);
            }
          },
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the storage service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  useEffect(() => {
    if (token && selectedBatchId) {
      void fetchMovementHistory(token, selectedBatchId).then(setMovementHistory);
    } else {
      setMovementHistory([]);
    }
  }, [token, selectedBatchId]);

  const handleCreateLocation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    if (!locOrgId || !locCode.trim() || !locZone.trim()) {
      setError('Organization, code, and zone are required.');
      return;
    }
    setBusy(true);
    try {
      const location = await createStorageLocation(token, {
        organizationId: locOrgId,
        code: locCode.trim(),
        warehouseZone: locZone.trim(),
        shelf: locShelf.trim() || undefined,
        capacityUnits: Number(locCapacity),
        targetTemperatureC: Number(locTemp),
        targetHumidityPercent: Number(locHumidity),
        dailyRatePerUnit: Number(locRate) || 0,
      });
      addToast(`Storage location ${location.code} created`, 'success');
      setLocCode('');
      setLocShelf('');
      await refreshAll(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create storage location';
      setError(message);
      addToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!token || !selectedBatchId || !selectedLocationId) return;
    setBusy(true);
    try {
      await assignBatchToStorage(token, selectedBatchId, selectedLocationId);
      addToast('Batch assigned to storage', 'success');
      await refreshAll(token);
      const history = await fetchMovementHistory(token, selectedBatchId);
      setMovementHistory(history);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to assign batch', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async () => {
    if (!token || !selectedBatchId || !selectedLocationId) return;
    setBusy(true);
    try {
      await moveBatchStorage(token, selectedBatchId, selectedLocationId);
      addToast('Batch moved', 'success');
      await refreshAll(token);
      const history = await fetchMovementHistory(token, selectedBatchId);
      setMovementHistory(history);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to move batch', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!token || !selectedBatchId) return;
    setBusy(true);
    try {
      await removeBatchFromStorage(token, selectedBatchId);
      addToast('Batch removed from storage', 'success');
      await refreshAll(token);
      const history = await fetchMovementHistory(token, selectedBatchId);
      setMovementHistory(history);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to remove batch', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleFifoLookup = async () => {
    if (!token) return;
    try {
      const results = await fetchFifoPickOrder(token, fifoCrop, fifoVariety);
      setFifoResults(results);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to load FIFO order', 'error');
    }
  };

  const handleRecordCondition = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !condLocationId) return;
    setBusy(true);
    try {
      await recordStorageConditionLog(token, condLocationId, {
        temperature: Number(condTemp),
        humidity: Number(condHumidity),
      });
      addToast('Condition log recorded', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to record condition log', 'error');
    } finally {
      setBusy(false);
    }
  };

  const criticalCount = expirations.filter((e) => e.status === 'critical' || e.status === 'expired').length;
  const totalCost = Math.round(costs.reduce((sum, c) => sum + c.accruedCost, 0) * 100) / 100;
  const activeAssignments = costs.filter((c) => c.status === 'active').length;

  // "Admin Dashboard shows all lots by storage zone": every zone currently
  // in use, plus a client-side filter over the locations and expiring-lots
  // tables below — no separate dashboard page, this one already serves
  // Admin (and every other role) via the account switcher above.
  const zoneOptions = Array.from(new Set(locations.map((l) => l.warehouse_zone))).sort();
  const filteredLocations = zoneFilter === 'all' ? locations : locations.filter((l) => l.warehouse_zone === zoneFilter);
  const filteredExpirations =
    zoneFilter === 'all' ? expirations : expirations.filter((e) => e.currentLocationZone === zoneFilter);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Warehouse Cold Storage &amp; Shelf-Life</h1>
          <p className={styles.subtitle}>
            Storage locations, condition monitoring, expiration alerts, FIFO rotation, and per-lot storage costs.
          </p>
        </div>
        <div className={styles.controls}>
          <select className={styles.select} value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
            <option value="all">All Zones</option>
            {zoneOptions.map((zone) => (
              <option key={zone} value={zone}>
                Zone: {zone}
              </option>
            ))}
          </select>
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
      {criticalCount > 0 ? (
        <div className={styles.alertBanner}>
          {criticalCount} batch{criticalCount === 1 ? '' : 'es'} expired or expiring within 7 days — see Expiration Alerts below.
        </div>
      ) : null}

      <div className={styles.kpiRow}>
        <KpiCard title="Storage Locations" value={String(locations.length)} icon={Thermometer} />
        <KpiCard title="Batches In Storage" value={String(activeAssignments)} icon={PackageMinus} />
        <KpiCard title="Expiring Soon" value={String(criticalCount)} icon={ArrowRightLeft} />
        <KpiCard title="Accrued Storage Cost" value={`$${totalCost.toLocaleString()}`} icon={PlusCircle} />
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Storage Locations</h2>
            {filteredLocations.length === 0 ? (
              <div className={styles.emptyState}>
                {locations.length === 0 ? 'No storage locations yet.' : 'No storage locations in this zone.'}
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Zone</th>
                    <th>Shelf</th>
                    <th>Target</th>
                    <th>Capacity</th>
                    <th>Rate/unit/day</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((location) => {
                    const usedUnits = costs
                      .filter((c) => c.locationCode === location.code && c.status === 'active')
                      .reduce((sum, c) => sum + c.unitCount, 0);
                    const pct = Math.min(100, Math.round((usedUnits / location.capacity_units) * 100));
                    return (
                      <tr
                        key={location.id}
                        className={styles.tableRow}
                        onClick={() => {
                          setSelectedLocationId(location.id);
                          setCondLocationId(location.id);
                        }}
                      >
                        <td>{location.code}</td>
                        <td>{location.warehouse_zone}</td>
                        <td>{location.shelf ?? '—'}</td>
                        <td>{location.target_temperature_c}°C / {location.target_humidity_percent}%</td>
                        <td>
                          <span className={styles.capacityBar}>
                            <span
                              className={`${styles.capacityFill} ${pct > 80 ? styles.capacityFillHigh : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          {usedUnits}/{location.capacity_units}
                        </td>
                        <td>${location.daily_rate_per_unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Manage Batch Storage</h2>
            <p className={styles.sectionSubtitle}>Select a packaging batch and a location, then assign, move, or remove.</p>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="batchSelect">Packaging Batch</label>
                <select id="batchSelect" className={styles.select} value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}>
                  <option value="">Select a batch</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.batch_code}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="locationSelect">Storage Location</label>
                <select id="locationSelect" className={styles.select} value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
                  <option value="">Select a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.code} — {location.warehouse_zone}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.actionsRow}>
              <Button size="sm" isLoading={busy} disabled={!selectedBatchId || !selectedLocationId} onClick={() => void handleAssign()}>
                Assign
              </Button>
              <Button size="sm" variant="secondary" isLoading={busy} disabled={!selectedBatchId || !selectedLocationId} onClick={() => void handleMove()}>
                Move
              </Button>
              <Button size="sm" variant="secondary" isLoading={busy} disabled={!selectedBatchId} onClick={() => void handleRemove()}>
                Remove From Storage
              </Button>
            </div>

            {movementHistory.length > 0 ? (
              <>
                <h3 className={styles.sectionTitle} style={{ fontSize: '0.95rem', marginTop: '1rem' }}>Movement History</h3>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Stored At</th>
                      <th>Ended At</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td><span className={`${styles.statusBadge} ${statusClass(entry.status)}`}>{entry.status}</span></td>
                        <td>{new Date(entry.stored_at).toLocaleString()}</td>
                        <td>{entry.ended_at ? new Date(entry.ended_at).toLocaleString() : '—'}</td>
                        <td>{entry.performed_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Expiration Alerts</h2>
            <p className={styles.sectionSubtitle}>
              Computed live from each batch's packaged date + shelf life — grouped by zone above via the filter, so this is the "all lots by storage zone" view for whoever is monitoring shelf life.
            </p>
            {filteredExpirations.length === 0 ? (
              <div className={styles.emptyState}>
                {expirations.length === 0 ? 'No packaging batches to track.' : 'No lots stored in this zone.'}
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Lot</th>
                    <th>Days Remaining</th>
                    <th>Status</th>
                    <th>Zone</th>
                    <th>Shelf</th>
                    <th>Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpirations.map((entry) => (
                    <tr key={entry.packagingBatchId}>
                      <td>{entry.batchCode}</td>
                      <td>{entry.lotCode} ({entry.crop} — {entry.variety})</td>
                      <td>{entry.daysRemaining}</td>
                      <td><span className={`${styles.statusBadge} ${statusClass(entry.status)}`}>{entry.status}</span></td>
                      <td>{entry.currentLocationZone ?? 'Not stored'}</td>
                      <td>{entry.currentLocationShelf ?? '—'}</td>
                      <td>{entry.currentLocationTemperatureC != null ? `${entry.currentLocationTemperatureC}°C` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>FIFO Pick Order</h2>
            <p className={styles.sectionSubtitle}>Oldest packaged batch first — the recommended pull order for a variety.</p>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="fifoCrop">Crop</label>
                <Input id="fifoCrop" value={fifoCrop} onChange={(e) => setFifoCrop(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="fifoVariety">Variety</label>
                <Input id="fifoVariety" value={fifoVariety} onChange={(e) => setFifoVariety(e.target.value)} />
              </div>
            </div>
            <Button size="sm" onClick={() => void handleFifoLookup()}>Look Up FIFO Order</Button>
            {fifoResults ? (
              fifoResults.length === 0 ? (
                <div className={styles.emptyState}>No stored batches for this crop/variety.</div>
              ) : (
                <table className={styles.table} style={{ marginTop: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Batch</th>
                      <th>Days In Storage</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fifoResults.map((entry, index) => (
                      <tr key={entry.packagingBatchId}>
                        <td>{index + 1}</td>
                        <td>{entry.batchCode} ({entry.totalQuantity} {entry.unitOfMeasure})</td>
                        <td>{entry.daysInStorage}</td>
                        <td>{entry.currentLocationCode ?? 'Not stored'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : null}
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Create Storage Location</h2>
            <form className={styles.form} onSubmit={handleCreateLocation}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="locOrgId">Warehouse Organization</label>
                <select id="locOrgId" className={styles.select} value={locOrgId} onChange={(e) => setLocOrgId(e.target.value)}>
                  <option value="">Select an organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name} ({org.type})</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="locCode">Location Code</label>
                <Input id="locCode" value={locCode} onChange={(e) => setLocCode(e.target.value)} placeholder="e.g. WH-COLD-A2" />
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="locZone">Warehouse Zone</label>
                  <Input id="locZone" value={locZone} onChange={(e) => setLocZone(e.target.value)} placeholder="e.g. Zone A" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="locShelf">Shelf</label>
                  <Input id="locShelf" value={locShelf} onChange={(e) => setLocShelf(e.target.value)} placeholder="e.g. Shelf 4" />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="locCapacity">Capacity (units)</label>
                  <Input id="locCapacity" type="number" min="1" value={locCapacity} onChange={(e) => setLocCapacity(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="locRate">Daily Rate/Unit ($)</label>
                  <Input id="locRate" type="number" min="0" step="0.01" value={locRate} onChange={(e) => setLocRate(e.target.value)} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="locTemp">Target Temp (°C)</label>
                  <Input id="locTemp" type="number" value={locTemp} onChange={(e) => setLocTemp(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="locHumidity">Target Humidity (%)</label>
                  <Input id="locHumidity" type="number" min="0" max="100" value={locHumidity} onChange={(e) => setLocHumidity(e.target.value)} />
                </div>
              </div>
              <Button type="submit" leftIcon={PlusCircle} isLoading={busy}>Create Location</Button>
            </form>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Record Condition Reading</h2>
            <form className={styles.form} onSubmit={handleRecordCondition}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="condLocationId">Storage Location</label>
                <select id="condLocationId" className={styles.select} value={condLocationId} onChange={(e) => setCondLocationId(e.target.value)}>
                  <option value="">Select a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.code}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="condTemp">Temperature (°C)</label>
                  <Input id="condTemp" type="number" value={condTemp} onChange={(e) => setCondTemp(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="condHumidity">Humidity (%)</label>
                  <Input id="condHumidity" type="number" min="0" max="100" value={condHumidity} onChange={(e) => setCondHumidity(e.target.value)} />
                </div>
              </div>
              <Button type="submit" leftIcon={Thermometer} isLoading={busy} disabled={!condLocationId}>Record Reading</Button>
            </form>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Storage Costs</h2>
            {costs.length === 0 ? (
              <div className={styles.emptyState}>No storage stays recorded yet.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Location</th>
                    <th>Days</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((cost, index) => (
                    <tr key={`${cost.packagingBatchId}-${index}`}>
                      <td>{cost.batchCode}</td>
                      <td>{cost.locationCode}</td>
                      <td>{cost.daysStored}</td>
                      <td>${cost.accruedCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
