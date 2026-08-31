import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { AlertTriangle, FileSpreadsheet, Package, PlusCircle, Printer, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { Modal } from '@/components/common/Modal/Modal';
import {
  DEMO_ACCOUNTS,
  batchAllocateSeedLots,
  bulkCreateSeedLots,
  bulkDeleteSeedLots,
  bulkPrintLabels,
  bulkQuickAction,
  bulkUpdateSeedLots,
  connectInventorySocket,
  fetchSeedLotSearchFilterOptions,
  fetchSeedLots,
  importSeedLotsFromCsv,
  login,
  type BatchAllocationResult,
  type BatchResult,
  type CreateSeedLotPayload,
  type CsvImportResult,
  type PrintLabelItemResult,
  type QuickActionItemResult,
  type QuickActionType,
  type RealtimeSeedLot,
} from '@/services/seedLotRealtimeClient';
import styles from './BatchOperations.module.css';

const WRITE_ROLES = new Set(['Admin', 'Breeder', 'Producer']);
const ALLOCATE_ROLES = new Set(['Admin', 'Breeder', 'Producer', 'Warehouse Manager']);
const PRINT_LABEL_ROLES = new Set(['Admin', 'Breeder', 'Producer', 'Warehouse Manager']);
type Tab = 'create' | 'quickActions' | 'update' | 'delete' | 'csv' | 'allocate';

interface QuickActionProgress {
  actionId: string;
  action: string;
  total: number;
  succeeded: number;
  failed: number;
  results: (QuickActionItemResult | PrintLabelItemResult)[];
}

function newActionId(): string {
  return `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SAMPLE_CSV = `lotCode,crop,variety,quantityTotal,unit,notes
SL-CSV-SAMPLE-A,Paddy,GoldenPaddy,500,kg,Imported via CSV
SL-CSV-SAMPLE-B,Maize,SilverMaize,300,kg,Imported via CSV`;

function badgeClass(status: string): string {
  const key = `badge${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

interface CreateRow {
  lotCode: string;
  crop: string;
  variety: string;
  quantityTotal: string;
}

interface UpdateRow {
  id: string;
  quantityTotal: string;
  notes: string;
}

interface AllocateRow {
  seedLotId: string;
  quantity: string;
  allocatedTo: string;
  cropPlanId: string;
}

function emptyCreateRow(): CreateRow {
  return { lotCode: '', crop: '', variety: '', quantityTotal: '' };
}

function emptyUpdateRow(): UpdateRow {
  return { id: '', quantityTotal: '', notes: '' };
}

function emptyAllocateRow(): AllocateRow {
  return { seedLotId: '', quantity: '', allocatedTo: '', cropPlanId: '' };
}

export default function BatchOperations() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);
  const [tab, setTab] = useState<Tab>('create');

  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);

  const [createRows, setCreateRows] = useState<CreateRow[]>([emptyCreateRow()]);
  const [createResult, setCreateResult] = useState<BatchResult<RealtimeSeedLot> | null>(null);

  const [updateRows, setUpdateRows] = useState<UpdateRow[]>([emptyUpdateRow()]);
  const [updateResult, setUpdateResult] = useState<BatchResult<RealtimeSeedLot> | null>(null);

  const [deleteIds, setDeleteIds] = useState<Set<string>>(new Set());
  const [deleteResult, setDeleteResult] = useState<BatchResult<{ id: string }> | null>(null);

  const [csvText, setCsvText] = useState('');
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null);

  const [allocateRows, setAllocateRows] = useState<AllocateRow[]>([emptyAllocateRow()]);
  const [allocateResult, setAllocateResult] = useState<BatchAllocationResult | null>(null);

  // Quick Actions (Batch Operations for Seed Lots): select lots by checkbox,
  // then run one named action against all of them at once.
  const [quickSelected, setQuickSelected] = useState<Set<string>>(new Set());
  const [zoneOptions, setZoneOptions] = useState<string[]>([]);
  const [zoneInput, setZoneInput] = useState('');
  const [quickProgress, setQuickProgress] = useState<QuickActionProgress | null>(null);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [labelQrCodes, setLabelQrCodes] = useState<{ lotCode: string; crop?: string; variety?: string; qrDataUrl: string }[]>([]);
  const activeActionIdRef = useRef<string | null>(null);

  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadLots = useCallback(async (accessToken: string) => {
    setError(null);
    try {
      setLots(await fetchSeedLots(accessToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load seed lots');
    }
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
        setRole(account.role);
        await loadLots(accessToken);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the seed lot service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const handleRefresh = () => {
    if (token) void loadLots(token);
  };

  useEffect(() => {
    if (!token) return;
    fetchSeedLotSearchFilterOptions(token)
      .then((options) => setZoneOptions(options.storageZones.filter(Boolean)))
      .catch(() => setZoneOptions([]));
  }, [token]);

  // Live progress feed for Quick Actions: each item the batch endpoint
  // processes is broadcast as it completes, tagged with the actionId this
  // run started with, so the progress bar advances one lot at a time
  // instead of jumping straight from 0% to the final result.
  useEffect(() => {
    if (!token) return;
    const socket = connectInventorySocket(token, {
      onEvent: (event) => {
        if (event.event !== 'SEED_LOT_BATCH_PROGRESS') return;
        const { payload } = event;
        if (!payload.actionId || payload.actionId !== activeActionIdRef.current) return;
        setQuickProgress((prev) => {
          if (!prev || prev.actionId !== payload.actionId) return prev;
          const result = { index: payload.index, seedLotId: payload.seedLotId, status: payload.status, lotCode: payload.lotCode, crop: payload.crop, variety: payload.variety, error: payload.error };
          return {
            ...prev,
            succeeded: prev.succeeded + (payload.status === 'succeeded' ? 1 : 0),
            failed: prev.failed + (payload.status === 'failed' ? 1 : 0),
            results: [...prev.results, result],
          };
        });
      },
    });
    return () => socket.close();
  }, [token]);

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

  const canWrite = WRITE_ROLES.has(role);
  const canAllocate = ALLOCATE_ROLES.has(role);

  const handleBulkCreate = () =>
    withBusy(async () => {
      if (!token) return;
      const items: CreateSeedLotPayload[] = createRows.map((r) => ({
        lotCode: r.lotCode.trim(),
        crop: r.crop.trim(),
        variety: r.variety.trim(),
        quantityTotal: Number(r.quantityTotal),
      }));
      const result = await bulkCreateSeedLots(token, items);
      setCreateResult(result);
      setMessage(`Bulk create: ${result.succeeded}/${result.total} succeeded.`);
      await loadLots(token);
    });

  const handleBulkUpdate = () =>
    withBusy(async () => {
      if (!token) return;
      const items = updateRows
        .filter((r) => r.id)
        .map((r) => ({
          id: r.id,
          updates: {
            ...(r.quantityTotal ? { quantityTotal: Number(r.quantityTotal) } : {}),
            ...(r.notes ? { notes: r.notes.trim() } : {}),
          },
        }));
      if (items.length === 0) {
        setError('Select at least one seed lot to update.');
        return;
      }
      const result = await bulkUpdateSeedLots(token, items);
      setUpdateResult(result);
      setMessage(`Bulk update: ${result.succeeded}/${result.total} succeeded.`);
      await loadLots(token);
    });

  const handleBulkDelete = () =>
    withBusy(async () => {
      if (!token) return;
      if (deleteIds.size === 0) {
        setError('Select at least one seed lot to delete.');
        return;
      }
      const result = await bulkDeleteSeedLots(token, [...deleteIds]);
      setDeleteResult(result);
      setMessage(`Bulk delete: ${result.succeeded}/${result.total} succeeded.`);
      setDeleteIds(new Set());
      await loadLots(token);
    });

  const handleCsvImport = () =>
    withBusy(async () => {
      if (!token) return;
      if (!csvText.trim()) {
        setError('Paste or load CSV text first.');
        return;
      }
      const result = await importSeedLotsFromCsv(token, csvText);
      setCsvResult(result);
      setMessage(`CSV import: ${result.succeeded}/${result.total} row(s) created.`);
      await loadLots(token);
    });

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ''));
      setMessage(`Loaded ${file.name} — review below, then click Import.`);
    };
    reader.readAsText(file);
  };

  const handleBatchAllocate = () =>
    withBusy(async () => {
      if (!token) return;
      const requests = allocateRows
        .filter((r) => r.seedLotId && r.quantity && r.allocatedTo)
        .map((r) => ({
          seedLotId: r.seedLotId,
          quantity: Number(r.quantity),
          allocatedTo: r.allocatedTo.trim(),
          cropPlanId: r.cropPlanId.trim() || undefined,
        }));
      if (requests.length === 0) {
        setError('Add at least one complete allocation request.');
        return;
      }
      const result = await batchAllocateSeedLots(token, requests);
      setAllocateResult(result);
      setMessage(`Batch allocation: ${result.allocated} allocated, ${result.skipped} skipped, ${result.failed} failed.`);
      await loadLots(token);
    });

  const toggleQuickSelected = (id: string) => {
    setQuickSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runQuickAction = (action: QuickActionType, label: string) =>
    withBusy(async () => {
      if (!token) return;
      const ids = [...quickSelected];
      if (ids.length === 0) {
        setError('Select at least one seed lot first.');
        return;
      }
      if (action === 'move_zone' && !zoneInput.trim()) {
        setError('Enter or choose a storage zone to move to.');
        return;
      }
      const actionId = newActionId();
      activeActionIdRef.current = actionId;
      setQuickProgress({ actionId, action: label, total: ids.length, succeeded: 0, failed: 0, results: [] });
      const result = await bulkQuickAction(token, action, ids, { zone: zoneInput.trim() || undefined, actionId });
      setQuickProgress({ actionId, action: label, total: result.total, succeeded: result.succeeded, failed: result.failed, results: result.results });
      setMessage(`${label}: ${result.succeeded}/${result.total} succeeded.`);
      setQuickSelected(new Set());
      await loadLots(token);
    });

  const handlePrintLabels = () =>
    withBusy(async () => {
      if (!token) return;
      const ids = [...quickSelected];
      if (ids.length === 0) {
        setError('Select at least one seed lot first.');
        return;
      }
      const actionId = newActionId();
      activeActionIdRef.current = actionId;
      setQuickProgress({ actionId, action: 'Print Labels', total: ids.length, succeeded: 0, failed: 0, results: [] });
      const result = await bulkPrintLabels(token, ids, actionId);
      setQuickProgress({ actionId, action: 'Print Labels', total: result.total, succeeded: result.succeeded, failed: result.failed, results: result.results });
      setMessage(`Print labels: ${result.succeeded}/${result.total} ready.`);

      const printable = result.results.filter((r): r is PrintLabelItemResult & { lotCode: string } => r.status === 'succeeded' && !!r.lotCode);
      const qrCodes = await Promise.all(
        printable.map(async (r) => ({
          lotCode: r.lotCode,
          crop: r.crop,
          variety: r.variety,
          qrDataUrl: await QRCode.toDataURL(r.lotCode, { width: 180, margin: 1 }),
        })),
      );
      setLabelQrCodes(qrCodes);
      setLabelModalOpen(true);
    });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Batch Operations for Seed Lots</h1>
          <p className={styles.subtitle}>
            Bulk create, edit, and delete seed lots with per-row validation, import lot registrations from a CSV
            file, and allocate from multiple lots to multiple crop plans in one request — each item succeeds or
            fails independently, and same-lot allocation conflicts are resolved first-come-first-served.
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
          <Button variant="secondary" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {message ? <div className={styles.card}><span className={styles.successText}>{message}</span></div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <KpiCard title="Seed Lots" value={String(lots.length)} icon={FileSpreadsheet} />
        <KpiCard title="Active" value={String(lots.filter((l) => l.status === 'active').length)} icon={PlusCircle} />
        <KpiCard title="Low Stock" value={String(lots.filter((l) => l.is_low_stock).length)} icon={AlertTriangle} />
      </div>

      <div className={styles.tabBar}>
        {(['create', 'quickActions', 'update', 'delete', 'csv', 'allocate'] as Tab[]).map((t) => (
          <button key={t} className={`${styles.tabButton} ${tab === t ? styles.tabButtonActive : ''}`} onClick={() => setTab(t)}>
            {t === 'create'
              ? 'Bulk Create'
              : t === 'quickActions'
                ? 'Quick Actions'
                : t === 'update'
                  ? 'Bulk Update'
                  : t === 'delete'
                    ? 'Bulk Delete'
                    : t === 'csv'
                      ? 'CSV Import'
                      : 'Batch Allocation'}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Bulk Create Seed Lots</h2>
          <p className={styles.sectionSubtitle}>Each row is validated and created independently — one invalid row never blocks the rest.</p>
          {!canWrite && <p className={styles.errorText}>Your role ({role}) cannot create seed lots.</p>}
          {createRows.map((r, i) => (
            <div key={i} className={styles.itemRow}>
              <input className={styles.textInput} placeholder="Lot code" value={r.lotCode} onChange={(e) => setCreateRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, lotCode: e.target.value } : row)))} />
              <input className={styles.textInput} placeholder="Crop" value={r.crop} onChange={(e) => setCreateRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, crop: e.target.value } : row)))} />
              <input className={styles.textInput} placeholder="Variety" value={r.variety} onChange={(e) => setCreateRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, variety: e.target.value } : row)))} />
              <input className={styles.textInput} type="number" placeholder="Quantity" value={r.quantityTotal} onChange={(e) => setCreateRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, quantityTotal: e.target.value } : row)))} />
              <button className={styles.removeButton} onClick={() => setCreateRows((rows) => rows.filter((_, idx) => idx !== i))} title="Remove row">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className={styles.formRow} style={{ marginTop: '0.75rem' }}>
            <Button size="sm" variant="secondary" leftIcon={PlusCircle} onClick={() => setCreateRows((rows) => [...rows, emptyCreateRow()])}>Add Row</Button>
            <Button size="sm" isLoading={busy} disabled={!canWrite} onClick={() => void handleBulkCreate()}>Submit Batch ({createRows.length})</Button>
          </div>
          {createResult && <BatchResultsTable result={createResult} kind="create" />}
        </div>
      )}

      {tab === 'quickActions' && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <p className={styles.sectionSubtitle}>
            Select lots below, then choose one action to apply to all of them at once. Every action — including
            Print Labels, which never changes the lot itself — is written to the audit trail.
          </p>
          {!canWrite && <p className={styles.errorText}>Your role ({role}) cannot move, approve, or expire seed lots (Print Labels is still available).</p>}

          {lots.length === 0 ? (
            <div className={styles.emptyState}>No seed lots available.</div>
          ) : (
            lots.map((l) => (
              <div key={l.id} className={styles.row}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={quickSelected.has(l.id)} onChange={() => toggleQuickSelected(l.id)} />
                  <span>
                    <strong>{l.lot_code}</strong>
                    <div className={styles.rowMeta}>
                      {l.crop} / {l.variety} · status: {l.status}
                      {l.storage_zone ? ` · zone: ${l.storage_zone}` : ''}
                      {l.approved_for_sale ? ' · approved for sale' : ''}
                    </div>
                  </span>
                </label>
              </div>
            ))
          )}

          <div className={styles.formRow} style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
            <input
              className={styles.textInput}
              list="quick-action-zones"
              placeholder="Storage zone (e.g. Zone C)"
              value={zoneInput}
              onChange={(e) => setZoneInput(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <datalist id="quick-action-zones">
              {zoneOptions.map((z) => <option key={z} value={z} />)}
            </datalist>
            <Button
              size="sm"
              leftIcon={Package}
              isLoading={busy}
              disabled={!canWrite || quickSelected.size === 0}
              onClick={() => void runQuickAction('move_zone', `Move to ${zoneInput.trim() || 'zone'}`)}
            >
              Move to Storage Zone ({quickSelected.size})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={ShieldCheck}
              isLoading={busy}
              disabled={!canWrite || quickSelected.size === 0}
              onClick={() => void runQuickAction('approve_for_sale', 'Approve for Sale')}
            >
              Approve for Sale ({quickSelected.size})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={AlertTriangle}
              isLoading={busy}
              disabled={!canWrite || quickSelected.size === 0}
              onClick={() => void runQuickAction('mark_expired', 'Mark as Expired')}
            >
              Mark as Expired ({quickSelected.size})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={Printer}
              isLoading={busy}
              disabled={!PRINT_LABEL_ROLES.has(role) || quickSelected.size === 0}
              onClick={() => void handlePrintLabels()}
            >
              Print Labels ({quickSelected.size})
            </Button>
          </div>

          {quickProgress && (
            <div style={{ marginTop: '1.25rem' }}>
              <div className={styles.summaryBar}>
                <div className={styles.summaryStat}><strong>{quickProgress.action}</strong>Action</div>
                <div className={styles.summaryStat}><strong>{quickProgress.succeeded + quickProgress.failed}/{quickProgress.total}</strong>Processed</div>
                <div className={styles.summaryStat}><strong>{quickProgress.succeeded}</strong>Succeeded</div>
                <div className={styles.summaryStat}><strong>{quickProgress.failed}</strong>Failed</div>
              </div>
              <div className={styles.progressTrack} role="progressbar" aria-valuenow={Math.round(((quickProgress.succeeded + quickProgress.failed) / Math.max(quickProgress.total, 1)) * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${Math.round(((quickProgress.succeeded + quickProgress.failed) / Math.max(quickProgress.total, 1)) * 100)}%` }}
                />
              </div>
              {quickProgress.results.map((r) => (
                <div key={r.index} className={styles.row}>
                  <div>
                    {r.lotCode ?? r.seedLotId}
                    <span className={`${styles.badge} ${badgeClass(r.status)}`} style={{ marginLeft: '0.5rem' }}>{r.status}</span>
                    {r.error && <div className={styles.rowMeta}>{r.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={labelModalOpen} onClose={() => setLabelModalOpen(false)} title="Seed Lot Labels" size="lg">
        <div className={styles.labelPrintArea}>
          {labelQrCodes.length === 0 ? (
            <div className={styles.emptyState}>No labels to print.</div>
          ) : (
            <div className={styles.labelGrid}>
              {labelQrCodes.map((label) => (
                <div key={label.lotCode} className={styles.labelCard}>
                  <img src={label.qrDataUrl} alt={`QR code for ${label.lotCode}`} className={styles.labelQr} />
                  <strong>{label.lotCode}</strong>
                  <div className={styles.rowMeta}>{label.crop} / {label.variety}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.formRow} style={{ marginTop: '1rem' }}>
          <Button size="sm" onClick={() => window.print()} disabled={labelQrCodes.length === 0}>Print</Button>
        </div>
      </Modal>

      {tab === 'update' && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Bulk Update Seed Lots</h2>
          <p className={styles.sectionSubtitle}>Select existing lots and the fields to change — blank fields are left untouched.</p>
          {!canWrite && <p className={styles.errorText}>Your role ({role}) cannot update seed lots.</p>}
          {updateRows.map((r, i) => (
            <div key={i} className={styles.itemRow}>
              <select className={styles.select} value={r.id} onChange={(e) => setUpdateRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, id: e.target.value } : row)))}>
                <option value="">Select a seed lot</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>{l.lot_code} ({l.crop}/{l.variety})</option>
                ))}
              </select>
              <input className={styles.textInput} type="number" placeholder="New quantity (optional)" value={r.quantityTotal} onChange={(e) => setUpdateRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, quantityTotal: e.target.value } : row)))} />
              <input className={styles.textInput} placeholder="New notes (optional)" value={r.notes} onChange={(e) => setUpdateRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, notes: e.target.value } : row)))} />
              <div />
              <button className={styles.removeButton} onClick={() => setUpdateRows((rows) => rows.filter((_, idx) => idx !== i))} title="Remove row">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className={styles.formRow} style={{ marginTop: '0.75rem' }}>
            <Button size="sm" variant="secondary" leftIcon={PlusCircle} onClick={() => setUpdateRows((rows) => [...rows, emptyUpdateRow()])}>Add Row</Button>
            <Button size="sm" isLoading={busy} disabled={!canWrite} onClick={() => void handleBulkUpdate()}>Submit Batch ({updateRows.length})</Button>
          </div>
          {updateResult && <BatchResultsTable result={updateResult} kind="update" />}
        </div>
      )}

      {tab === 'delete' && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Bulk Delete Seed Lots</h2>
          <p className={styles.sectionSubtitle}>Each lot is checked independently — lots with child lots or allocation history are safely rejected, not force-deleted.</p>
          {!canWrite && <p className={styles.errorText}>Your role ({role}) cannot delete seed lots.</p>}
          {lots.length === 0 ? (
            <div className={styles.emptyState}>No seed lots to delete.</div>
          ) : (
            lots.map((l) => (
              <div key={l.id} className={styles.row}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={deleteIds.has(l.id)}
                    onChange={(e) =>
                      setDeleteIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(l.id);
                        else next.delete(l.id);
                        return next;
                      })
                    }
                  />
                  <span>
                    <strong>{l.lot_code}</strong>
                    <div className={styles.rowMeta}>{l.crop} / {l.variety} · {l.stage} · {l.quantity_available}{l.unit} available</div>
                  </span>
                </label>
              </div>
            ))
          )}
          <div className={styles.formRow} style={{ marginTop: '0.75rem' }}>
            <Button size="sm" isLoading={busy} disabled={!canWrite} onClick={() => void handleBulkDelete()}>Delete Selected ({deleteIds.size})</Button>
          </div>
          {deleteResult && <BatchResultsTable result={deleteResult} kind="delete" />}
        </div>
      )}

      {tab === 'csv' && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>CSV Import</h2>
          <p className={styles.sectionSubtitle}>
            Required columns: lotCode, crop, variety, quantityTotal. Optional: parentLotId, stage, unit, sourceFarmId,
            notes, lowStockThreshold, productionDate, organizationId. Each row is created independently.
          </p>
          {!canWrite && <p className={styles.errorText}>Your role ({role}) cannot import seed lots.</p>}
          <div className={styles.formRow}>
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleCsvFile(e.target.files[0])}
            />
            <Button size="sm" variant="secondary" leftIcon={Upload} onClick={() => csvFileInputRef.current?.click()}>
              Choose CSV File
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCsvText(SAMPLE_CSV)}>Load Sample CSV</Button>
          </div>
          <textarea className={styles.textArea} placeholder="lotCode,crop,variety,quantityTotal&#10;SL-1,Paddy,GoldenPaddy,500" value={csvText} onChange={(e) => setCsvText(e.target.value)} />
          <Button size="sm" isLoading={busy} disabled={!canWrite} onClick={() => void handleCsvImport()}>Import CSV</Button>
          {csvResult && (
            <div style={{ marginTop: '1rem' }}>
              <div className={styles.summaryBar}>
                <div className={styles.summaryStat}><strong>{csvResult.total}</strong>Rows</div>
                <div className={styles.summaryStat}><strong>{csvResult.succeeded}</strong>Created</div>
                <div className={styles.summaryStat}><strong>{csvResult.failed}</strong>Failed</div>
              </div>
              {csvResult.results.map((r) => (
                <div key={r.index} className={styles.row}>
                  <div>
                    Row {r.rowNumber}
                    <span className={`${styles.badge} ${badgeClass(r.status)}`} style={{ marginLeft: '0.5rem' }}>{r.status}</span>
                    {r.data && <div className={styles.rowMeta}>{r.data.lot_code} — {r.data.crop}/{r.data.variety}</div>}
                    {r.error && <div className={styles.rowMeta}>{r.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'allocate' && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Batch Allocation (Multiple Lots to Multiple Crop Plans)</h2>
          <p className={styles.sectionSubtitle}>
            When two requests target the same lot and together exceed what's available, the earlier request in the list
            wins and the later one is skipped with a clear reason — no silent over-allocation.
          </p>
          {!canAllocate && <p className={styles.errorText}>Your role ({role}) cannot allocate seed lots.</p>}
          {allocateRows.map((r, i) => (
            <div key={i} className={styles.itemRow}>
              <select className={styles.select} value={r.seedLotId} onChange={(e) => setAllocateRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, seedLotId: e.target.value } : row)))}>
                <option value="">Select a seed lot</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>{l.lot_code} ({l.quantity_available}{l.unit} available)</option>
                ))}
              </select>
              <input className={styles.textInput} type="number" placeholder="Quantity" value={r.quantity} onChange={(e) => setAllocateRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, quantity: e.target.value } : row)))} />
              <input className={styles.textInput} placeholder="Allocated to / crop plan" value={r.allocatedTo} onChange={(e) => setAllocateRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, allocatedTo: e.target.value } : row)))} />
              <input className={styles.textInput} placeholder="Crop plan id (optional)" value={r.cropPlanId} onChange={(e) => setAllocateRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, cropPlanId: e.target.value } : row)))} />
              <button className={styles.removeButton} onClick={() => setAllocateRows((rows) => rows.filter((_, idx) => idx !== i))} title="Remove row">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className={styles.formRow} style={{ marginTop: '0.75rem' }}>
            <Button size="sm" variant="secondary" leftIcon={PlusCircle} onClick={() => setAllocateRows((rows) => [...rows, emptyAllocateRow()])}>Add Row</Button>
            <Button size="sm" isLoading={busy} disabled={!canAllocate} onClick={() => void handleBatchAllocate()}>Submit Batch ({allocateRows.length})</Button>
          </div>
          {allocateResult && (
            <div style={{ marginTop: '1rem' }}>
              <div className={styles.summaryBar}>
                <div className={styles.summaryStat}><strong>{allocateResult.total}</strong>Requests</div>
                <div className={styles.summaryStat}><strong>{allocateResult.allocated}</strong>Allocated</div>
                <div className={styles.summaryStat}><strong>{allocateResult.skipped}</strong>Skipped (conflict)</div>
                <div className={styles.summaryStat}><strong>{allocateResult.failed}</strong>Failed</div>
              </div>
              {allocateResult.results.map((r) => {
                const lot = lots.find((l) => l.id === r.seedLotId);
                return (
                  <div key={r.index} className={styles.row}>
                    <div>
                      {lot?.lot_code ?? r.seedLotId}
                      <span className={`${styles.badge} ${badgeClass(r.status)}`} style={{ marginLeft: '0.5rem' }}>{r.status}</span>
                      {r.reason && <div className={styles.rowMeta}>{r.reason.replace(/_/g, ' ')}</div>}
                      {r.error && <div className={styles.rowMeta}>{r.error}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BatchResultsTable({
  result,
  kind,
}: {
  result: BatchResult<RealtimeSeedLot> | BatchResult<{ id: string }>;
  kind: 'create' | 'update' | 'delete';
}) {
  return (
    <div style={{ marginTop: '1rem' }}>
      <div className={styles.summaryBar}>
        <div className={styles.summaryStat}><strong>{result.total}</strong>Items</div>
        <div className={styles.summaryStat}><strong>{result.succeeded}</strong>Succeeded</div>
        <div className={styles.summaryStat}><strong>{result.failed}</strong>Failed</div>
      </div>
      {result.results.map((r) => {
        const label = kind === 'delete' ? (r.data as { id: string } | undefined)?.id : (() => {
          const lot = r.data as RealtimeSeedLot | undefined;
          return lot ? `${lot.lot_code} — ${lot.crop}/${lot.variety}` : undefined;
        })();
        return (
          <div key={r.index} className={styles.row}>
            <div>
              Item {r.index + 1}
              <span className={`${styles.badge} ${badgeClass(r.status)}`} style={{ marginLeft: '0.5rem' }}>{r.status}</span>
              {label && <div className={styles.rowMeta}>{label}</div>}
              {r.error && <div className={styles.rowMeta}>{r.error}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
