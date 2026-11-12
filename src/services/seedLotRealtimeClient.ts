// Talks directly to the seedflow-server backend (server/) built in earlier
// phases. Deliberately isolated from src/services/api.ts and AuthContext —
// that backend has its own JWT/RBAC system, unrelated to this app's mocked
// login, so this client manages its own short-lived session.

import { resolveDemoResponse } from './demoData';


// --- Demo mode ------------------------------------------------------------
// Flipped the first time a request falls back to the offline demo dataset.
// The app deliberately shows no error when the backend is unreachable, so
// this flag is the one honest signal that what is on screen is demo data
// rather than a real deployment's records — DemoModeBadge renders it.

let demoMode = false;

// Demo data is a development convenience. It is OFF unless VITE_DEMO_MODE=true,
// so a production deployment shows real errors instead of invented records.
const DEMO_FALLBACK_ENABLED = (import.meta.env.VITE_DEMO_MODE as string | undefined) === 'true';
const demoModeListeners = new Set<(active: boolean) => void>();

function enterDemoMode(): void {
  if (demoMode) return;
  demoMode = true;
  demoModeListeners.forEach((listener) => listener(true));
}

export function isDemoMode(): boolean {
  return demoMode;
}

/** Subscribe to demo-mode changes; returns an unsubscribe function. */
export function onDemoModeChange(listener: (active: boolean) => void): () => void {
  demoModeListeners.add(listener);
  return () => demoModeListeners.delete(listener);
}

// Reads the same VITE_API_BASE_URL convention already used by
// src/config/api.config.ts (and .env.local) elsewhere in the app, instead of
// a hardcoded localhost URL — this client previously ignored that env var
// entirely, which meant every request silently failed (surfacing as "You're
// offline") the moment the frontend was served from anywhere other than the
// exact machine running the backend on port 5000 (a deployed preview, a
// client review on a different host, etc). The localhost:5000 fallback is
// unchanged, so plain local dev with no env override still behaves exactly
// as before.
const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000/api/v1';
const BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

/** http(s)://host:port/api/v1 -> ws(s)://host:port/ws, or an explicit VITE_WS_BASE_URL override. */
function deriveWsBaseUrl(apiBaseUrl: string): string {
  const withoutApiSuffix = apiBaseUrl.replace(/\/api\/v1\/?$/, '');
  return `${withoutApiSuffix.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')}/ws`;
}

const WS_BASE_URL = (import.meta.env.VITE_WS_BASE_URL as string | undefined) ?? deriveWsBaseUrl(rawApiBaseUrl);

export interface RealtimeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
}

export const SEED_LOT_STAGES = ['Breeder', 'Foundation', 'Certified'] as const;
export type SeedLotStage = (typeof SEED_LOT_STAGES)[number];

// Lab-testing/certification outcome — a separate axis from `stage` above
// (breeding-pipeline rank) and `status` below (inventory lifecycle). Driven
// entirely by the lab-testing workflow (see submitSampleBatch/
// recordLabTestResult below): not_submitted -> testing -> certified | rejected.
export const TESTING_STATUSES = ['not_submitted', 'testing', 'certified', 'rejected'] as const;
export type TestingStatus = (typeof TESTING_STATUSES)[number];

export interface RealtimeSeedLot {
  id: string;
  lot_code: string;
  crop: string;
  variety: string;
  parent_lot_id: string | null;
  stage: SeedLotStage;
  quantity_total: number;
  quantity_allocated: number;
  quantity_available: number;
  is_low_stock: boolean;
  low_stock_threshold: number;
  unit: string;
  status: string;
  organization_id: string | null;
  available_for_partner_order: boolean;
  testing_status: TestingStatus;
  production_date: string;
  storage_zone: string | null;
  approved_for_sale: boolean;
}

export interface RealtimeAllocation {
  id: string;
  seed_lot_id: string;
  allocated_to: string;
  quantity: number;
  status: string;
  performed_by: string;
  crop_plan_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AllocationHistoryEntry extends RealtimeAllocation {
  performed_by_name: string | null;
  performed_by_role: string | null;
}

export const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@seedsphere.com', password: 'Admin123!' },
  { role: 'Breeder', email: 'breeder@seedsphere.com', password: 'Breeder123!' },
  { role: 'Producer', email: 'producer@seedsphere.com', password: 'Producer123!' },
  { role: 'Inspector', email: 'inspector@seedsphere.com', password: 'Inspector123!' },
  { role: 'Warehouse Manager', email: 'warehouse@seedsphere.com', password: 'Warehouse123!' },
] as const;

export class SeedLotApiError extends Error {
  recoverySuggestion?: string;
  isOffline?: boolean;
  queuedForSync?: boolean;
  servedFromCache?: boolean;

  constructor(
    message: string,
    extra?: Partial<Pick<SeedLotApiError, 'recoverySuggestion' | 'isOffline' | 'queuedForSync' | 'servedFromCache'>>,
  ) {
    super(message);
    Object.assign(this, extra);
  }
}

// --- Offline-first resilience layer -----------------------------------
// This wraps every call made through this client (every real-backend page
// built this session goes through `request()` below), so graceful
// degradation and offline queueing apply app-wide from one place rather
// than needing to be retrofitted into each page individually.

const OFFLINE_QUEUE_KEY = 'seedflow_offline_queue_v1';
const CACHE_PREFIX = 'seedflow_cache_v1:';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface OfflineQueueEntry {
  id: string;
  path: string;
  method: string;
  body?: string;
  queuedAt: number;
}

function readOfflineQueue(): OfflineQueueEntry[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineQueueEntry[]) : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(queue: OfflineQueueEntry[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage unavailable (private browsing, quota) — queueing is a
    // best-effort convenience, never something to crash the app over.
  }
}

export function getOfflineQueueSize(): number {
  return readOfflineQueue().length;
}

export function getOfflineQueueEntries(): OfflineQueueEntry[] {
  return readOfflineQueue();
}

function cacheGetKey(path: string): string {
  return `${CACHE_PREFIX}${path}`;
}

function cacheStore(path: string, data: unknown): void {
  try {
    localStorage.setItem(cacheGetKey(path), JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {
    // Best-effort — a full/unavailable localStorage just disables caching.
  }
}

function cacheRead<T>(path: string): { data: T; cachedAt: number } | null {
  try {
    const raw = localStorage.getItem(cacheGetKey(path));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; cachedAt: number };
    if (Date.now() - parsed.cachedAt > CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function friendlyMessageForStatus(status: number, serverMessage?: string): string {
  // The backend already produces specific, actionable messages (validation
  // errors, ownership checks, business-rule conflicts) — prefer those over
  // a generic one, since they're the more useful "recovery suggestion" in
  // most cases already.
  if (serverMessage) return serverMessage;
  if (status === 401) return 'Your session has expired — please log in again.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return 'That item could not be found — it may have been removed or moved.';
  if (status >= 500) return 'The server ran into a problem on its end. Please try again in a moment.';
  return 'Something went wrong. Please try again.';
}

let lastKnownToken: string | null = null;

async function replayQueuedEntry(entry: OfflineQueueEntry): Promise<void> {
  const response = await fetch(`${BASE_URL}${entry.path}`, {
    method: entry.method,
    headers: {
      'Content-Type': 'application/json',
      ...(lastKnownToken ? { Authorization: `Bearer ${lastKnownToken}` } : {}),
    },
    body: entry.body,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok || payload?.success === false) {
    throw new SeedLotApiError(payload?.message ?? `Sync failed with status ${response.status}`);
  }
}

/**
 * Replays every queued mutation in the order it was made. A request that
 * fails for a real (non-network) reason — e.g. the underlying record was
 * since deleted — is dropped rather than retried forever; one that fails
 * because we're still offline is kept for the next sync attempt.
 */
export async function syncOfflineQueue(): Promise<{ succeeded: number; failed: number; stillOffline: number }> {
  const queue = readOfflineQueue();
  let succeeded = 0;
  let failed = 0;
  let stillOffline = 0;
  const remaining: OfflineQueueEntry[] = [];

  for (const entry of queue) {
    try {
      await replayQueuedEntry(entry);
      succeeded += 1;
    } catch (err) {
      if (err instanceof TypeError) {
        stillOffline += 1;
        remaining.push(entry);
      } else {
        failed += 1;
      }
    }
  }

  writeOfflineQueue(remaining);
  return { succeeded, failed, stillOffline };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void syncOfflineQueue();
  });
}

async function request<T>(path: string, token: string | null, options: RequestInit = {}, retried = false): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  if (token) lastKnownToken = token;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch (err) {
    // fetch only throws TypeError for network-level failures (DNS, refused
    // connection, offline) — anything else (HTTP error status) resolves
    // normally and is handled below instead.
    if (err instanceof TypeError) {
      if (DEMO_FALLBACK_ENABLED) enterDemoMode();
      // Graceful degradation, in preference order:
      //   1. real data this browser cached earlier (freshest truth),
      //   2. the demo dataset (self-consistent, clearly labelled),
      //   3. an empty list for reads / an optimistic echo for writes.
      // Crucially this never throws, so an unreachable backend renders a
      // populated, working app instead of putting an error banner on every
      // page at once. Writes are still queued for replay, so nothing the
      // user did is lost once the server comes back.
      const cached = cacheRead<T>(path);
      if (cached) return cached.data;

      const demo = DEMO_FALLBACK_ENABLED
        ? resolveDemoResponse(path, method, options.body as string | undefined)
        : undefined;
      if (demo !== undefined) return demo as T;

      if (method === 'GET') {
        if (!DEMO_FALLBACK_ENABLED) {
          throw new Error('Could not reach the SeedSphere server. Check your connection and try again.');
        }
        // An unmapped read degrades to "nothing here yet", which every page
        // in this app already renders as a friendly empty state.
        return [] as unknown as T;
      }

      writeOfflineQueue([
        ...readOfflineQueue(),
        { id: crypto.randomUUID(), path, method, body: options.body as string | undefined, queuedAt: Date.now() },
      ]);
      // Optimistic echo of what was submitted, so the UI can complete its
      // flow. The real write is queued and replays when connectivity returns.
      let echoed: Record<string, unknown> = {};
      try {
        echoed = options.body ? (JSON.parse(options.body as string) as Record<string, unknown>) : {};
      } catch {
        echoed = {};
      }
      return {
        id: `demo-${crypto.randomUUID()}`,
        ...echoed,
        status: (echoed.status as string) ?? 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as T;
    }
    throw err;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (response.status === 401 && token && !retried) {
    const fresh = await renewToken(token);
    if (fresh) return request<T>(path, fresh, options, true);
  }

  if (!response.ok || payload?.success === false) {
    throw new SeedLotApiError(friendlyMessageForStatus(response.status, payload?.message));
  }

  if (method === 'GET') cacheStore(path, payload.data);
  return payload.data as T;
}

/**
 * A GET that intentionally serves cached data (rather than treating it as
 * an error) when the network is down — used where a stale-but-visible view
 * is clearly better than an error screen (e.g. browsing a variety catalog
 * offline in the field). Returns { data, fromCache, cachedAt }.
 */
export async function requestWithCacheFallback<T>(
  path: string,
  token: string | null,
): Promise<{ data: T; fromCache: boolean; cachedAt: number | null }> {
  try {
    const data = await request<T>(path, token);
    return { data, fromCache: false, cachedAt: null };
  } catch (err) {
    if (err instanceof SeedLotApiError && err.servedFromCache) {
      const cached = cacheRead<T>(path);
      if (cached) return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
    }
    throw err;
  }
}

// --- Session reuse --------------------------------------------------------
// Every real-backend page bootstraps its own session with login(). Without
// reuse, browsing a dozen pages fires a dozen logins and trips the server's
// login rate limit (40 per 15 min), after which pages fall into demo data.
// Sessions are therefore shared per account for most of the token's 15-minute
// life, and a request that comes back 401 (expired token) re-logs in once and
// retries transparently, so a page left open past expiry keeps working.

const SESSION_REUSE_MS = 12 * 60 * 1000;
const sessionCache = new Map<string, { at: number; promise: Promise<{ user: RealtimeUser; accessToken: string }> }>();
const tokenOwner = new Map<string, { email: string; password: string }>();

// Mirrored to sessionStorage so a page reload (or a deep link opened in the
// same tab) reuses the session instead of logging in again.
const SESSION_STORE_KEY = 'seedflow_backend_sessions_v1';

type StoredSession = { at: number; user: RealtimeUser; accessToken: string };

function readStoredSessions(): Record<string, StoredSession> {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_STORE_KEY) ?? '{}') as Record<string, StoredSession>;
  } catch {
    return {};
  }
}

function writeStoredSession(key: string, value: StoredSession | null): void {
  try {
    const all = readStoredSessions();
    if (value) all[key] = value;
    else delete all[key];
    sessionStorage.setItem(SESSION_STORE_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable: in-memory reuse still applies.
  }
}

export async function login(email: string, password: string): Promise<{ user: RealtimeUser; accessToken: string }> {
  const key = email.toLowerCase();
  const cached = sessionCache.get(key);
  if (cached && Date.now() - cached.at < SESSION_REUSE_MS) return cached.promise;

  const stored = readStoredSessions()[key];
  if (stored && Date.now() - stored.at < SESSION_REUSE_MS && stored.accessToken) {
    const restored = Promise.resolve({ user: stored.user, accessToken: stored.accessToken });
    tokenOwner.set(stored.accessToken, { email, password });
    sessionCache.set(key, { at: stored.at, promise: restored });
    return restored;
  }

  const promise = request<{ user: RealtimeUser; accessToken: string }>('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).then((session) => {
    if (session?.accessToken) {
      tokenOwner.set(session.accessToken, { email, password });
      // Demo-mode sessions (server unreachable) are not persisted, so the
      // next load tries the real server again.
      if (!isDemoMode()) writeStoredSession(key, { at: Date.now(), user: session.user, accessToken: session.accessToken });
    }
    return session;
  });
  sessionCache.set(key, { at: Date.now(), promise });
  promise.catch(() => sessionCache.delete(key));
  return promise;
}

/** Fresh token for the account that owned an expired one, or null if unknown. */
async function renewToken(expired: string): Promise<string | null> {
  const owner = tokenOwner.get(expired);
  if (!owner) return null;
  sessionCache.delete(owner.email.toLowerCase());
  writeStoredSession(owner.email.toLowerCase(), null);
  try {
    const { accessToken } = await login(owner.email, owner.password);
    return accessToken && accessToken !== expired ? accessToken : null;
  } catch {
    return null;
  }
}

export async function fetchSeedLots(token: string): Promise<RealtimeSeedLot[]> {
  return request('/production/seed-lots', token);
}

export async function fetchSeedLotById(token: string, id: string): Promise<RealtimeSeedLot> {
  return request(`/production/seed-lots/${id}`, token);
}

export interface AllocatePayload {
  quantity: number;
  allocatedTo: string;
  cropPlanId?: string;
}

export async function allocateSeedLot(
  token: string,
  seedLotId: string,
  payload: AllocatePayload,
): Promise<{ allocation: RealtimeAllocation; seedLot: RealtimeSeedLot }> {
  return request(`/production/seed-lots/${seedLotId}/allocate`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAllocationHistory(token: string, seedLotId: string): Promise<AllocationHistoryEntry[]> {
  return request(`/production/seed-lots/${seedLotId}/allocation-history`, token);
}

export interface GenealogyTransaction {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  before_state: unknown;
  after_state: unknown;
  metadata: unknown;
  created_at: string;
}

export interface GenealogyTestResultSummary {
  test_type: string;
  result_value: number;
  threshold_used: number;
  passed: boolean;
}

export interface GenealogyTestSubmission {
  id: string;
  status: string;
  lab_organization_name: string;
  requested_tests: string[];
  results: GenealogyTestResultSummary[];
}

export interface GenealogyResult {
  focusLotId: string;
  root: RealtimeSeedLot;
  ancestorPath: RealtimeSeedLot[];
  nodes: RealtimeSeedLot[];
  allocationsByLot: Record<string, RealtimeAllocation[]>;
  transactions: GenealogyTransaction[];
  testSubmissionsByLot: Record<string, GenealogyTestSubmission[]>;
}

export async function fetchGenealogy(token: string, seedLotId: string): Promise<GenealogyResult> {
  return request(`/production/seed-lots/${seedLotId}/genealogy`, token);
}

export interface UtilizationEntry {
  seedLotId: string;
  lotCode: string;
  crop: string;
  stage: SeedLotStage;
  quantityTotal: number;
  quantityAllocated: number;
  quantityAvailable: number;
  utilizationPercent: number;
}

export interface YieldOutcomeEntry {
  seedLotId: string;
  lotCode: string;
  crop: string;
  totalSown: number;
  totalHarvested: number;
  yieldRatio: number | null;
  unit: string;
  recordCount: number;
}

export interface GerminationRateEntry {
  variety: string;
  totalSampleSize: number;
  totalGerminated: number;
  germinationRatePercent: number;
  testCount: number;
}

export interface BreedingEffectivenessEntry {
  parentLotId: string;
  parentLotCode: string;
  parentStage: SeedLotStage;
  childStage: SeedLotStage;
  parentQuantityAllocated: number;
  childrenQuantityTotal: number;
  multiplicationRatio: number | null;
  childLotCodes: string[];
}

export interface ProductionAnalyticsDashboard {
  utilization: UtilizationEntry[];
  yieldOutcomes: YieldOutcomeEntry[];
  germinationRates: GerminationRateEntry[];
  breedingEffectiveness: BreedingEffectivenessEntry[];
}

export async function fetchAnalyticsDashboard(token: string): Promise<ProductionAnalyticsDashboard> {
  return request('/production/analytics/dashboard', token);
}

export interface RecordHarvestYieldPayload {
  seedLotId: string;
  cropPlanId?: string;
  sownQuantity: number;
  harvestedQuantity: number;
}

export async function recordHarvestYield(token: string, payload: RecordHarvestYieldPayload): Promise<unknown> {
  return request('/production/analytics/harvest-yields', token, { method: 'POST', body: JSON.stringify(payload) });
}

export interface RecordGerminationTestPayload {
  seedLotId: string;
  sampleSize: number;
  germinatedCount: number;
}

export async function recordGerminationTest(token: string, payload: RecordGerminationTestPayload): Promise<unknown> {
  return request('/production/analytics/germination-tests', token, { method: 'POST', body: JSON.stringify(payload) });
}

export interface InventoryUpdateEvent {
  event: 'INVENTORY_UPDATE';
  payload: {
    action: 'ALLOCATE' | 'RELEASE' | 'PACKAGE';
    seedLot: RealtimeSeedLot;
    allocation?: RealtimeAllocation;
    performedBy: { email: string; role: string };
  };
  at: string;
}

export interface LowStockAlertEvent {
  event: 'LOW_STOCK_ALERT';
  payload: {
    seedLotId: string;
    lotCode: string;
    crop: string;
    organizationId: string | null;
    quantityAvailable: number;
    lowStockThreshold: number;
    unit: string;
  };
  at: string;
}

export interface ConnectedEvent {
  event: 'CONNECTED';
  payload: { message: string; connectedClients: number };
  at: string;
}

export interface WorkflowStartedEvent {
  event: 'WORKFLOW_STARTED';
  payload: { workflowId: string; seedLotId: string; startedBy: string };
  at: string;
}

export interface WorkflowStageApprovedEvent {
  event: 'WORKFLOW_STAGE_APPROVED';
  payload: { workflowId: string; stageKey: WorkflowStageKey; approvedBy: string; workflowStatus: string };
  at: string;
}

export interface WorkflowStageRejectedEvent {
  event: 'WORKFLOW_STAGE_REJECTED';
  payload: { workflowId: string; stageKey: WorkflowStageKey; rejectedBy: string; reason: string };
  at: string;
}

export interface WorkflowCancelledEvent {
  event: 'WORKFLOW_CANCELLED';
  payload: { workflowId: string; cancelledBy: string };
  at: string;
}

export interface PurchaseOrderCreatedEvent {
  event: 'PURCHASE_ORDER_CREATED';
  payload: { id: string; poNumber: string; crop: string; variety: string; quantity: number; organizationId: string };
  at: string;
}

export interface PurchaseOrderStatusChangedEvent {
  event: 'PURCHASE_ORDER_STATUS_CHANGED';
  payload: { id: string; poNumber: string; status: string; changedBy: string };
  at: string;
}

export interface SeedRequestCreatedEvent {
  event: 'SEED_REQUEST_CREATED';
  payload: { id: string; farmerId: string; crop: string; variety: string };
  at: string;
}

export interface SeedRequestStatusChangedEvent {
  event: 'SEED_REQUEST_STATUS_CHANGED';
  payload: { id: string; status: string; farmerId: string };
  at: string;
}

export interface PackagingBatchCreatedEvent {
  event: 'PACKAGING_BATCH_CREATED';
  payload: { id: string; batchCode: string; seedLotId: string; unitCount: number };
  at: string;
}

export interface StorageAssignmentChangedEvent {
  event: 'STORAGE_ASSIGNMENT_CHANGED';
  payload: { packagingBatchId: string; storageLocationId: string; action: 'ASSIGNED' | 'MOVED' | 'REMOVED'; performedBy: string };
  at: string;
}

export interface StorageConditionAlertEvent {
  event: 'STORAGE_CONDITION_ALERT';
  payload: {
    storageLocationId: string;
    locationCode: string;
    recordedTemperatureC: number;
    recordedHumidityPercent: number;
    targetTemperatureC: number;
    targetHumidityPercent: number;
    temperatureDeviation: number;
    humidityDeviation: number;
    recordedBy: string;
  };
  at: string;
}

export interface ExpirationAlertEvent {
  event: 'EXPIRATION_ALERT';
  payload: { entries: ExpirationEntry[]; scannedAt: string };
  at: string;
}

export interface SeedLotTestingStatusChangedEvent {
  event: 'SEED_LOT_TESTING_STATUS_CHANGED';
  payload: { seedLotId: string; lotCode: string; testingStatus: TestingStatus; submissionId: string };
  at: string;
}

// Emitted once per item as a Batch Operations quick action / print-labels
// run processes — the frontend's progress bar listens for these tagged with
// its own actionId rather than polling the final batch response.
export interface SeedLotBatchProgressEvent {
  event: 'SEED_LOT_BATCH_PROGRESS';
  payload: {
    actionId: string | null;
    action: string;
    total: number;
    index: number;
    seedLotId: string;
    status: 'succeeded' | 'failed';
    lotCode?: string;
    crop?: string;
    variety?: string;
    error?: string;
  };
  at: string;
}

export type InventorySocketEvent =
  | InventoryUpdateEvent
  | LowStockAlertEvent
  | ConnectedEvent
  | WorkflowStartedEvent
  | WorkflowStageApprovedEvent
  | WorkflowStageRejectedEvent
  | WorkflowCancelledEvent
  | PurchaseOrderCreatedEvent
  | PurchaseOrderStatusChangedEvent
  | SeedRequestCreatedEvent
  | SeedRequestStatusChangedEvent
  | PackagingBatchCreatedEvent
  | StorageAssignmentChangedEvent
  | StorageConditionAlertEvent
  | ExpirationAlertEvent
  | SeedLotTestingStatusChangedEvent
  | SeedLotBatchProgressEvent;

export function connectInventorySocket(
  token: string,
  handlers: { onEvent: (event: InventorySocketEvent) => void; onOpen?: () => void; onClose?: () => void },
): WebSocket {
  let socket: WebSocket;
  try {
    socket = new WebSocket(`${WS_BASE_URL}?token=${encodeURIComponent(token)}`);
  } catch {
    // A malformed WS URL (bad VITE_WS_BASE_URL) throws synchronously, which
    // inside a useEffect would surface as a crashed page. Live updates are a
    // progressive enhancement, never load-bearing, so hand back an inert stub
    // that satisfies the one method callers use (close) and stay silent.
    if (DEMO_FALLBACK_ENABLED) enterDemoMode();
    return { close() {} } as unknown as WebSocket;
  }

  socket.onopen = () => handlers.onOpen?.();
  socket.onclose = () => handlers.onClose?.();
  // Without a handler the browser logs an unhandled socket error on every
  // failed connect; when the backend is simply absent that is expected, not
  // something to report.
  socket.onerror = () => {};
  socket.onmessage = (message) => {
    try {
      handlers.onEvent(JSON.parse(message.data as string));
    } catch {
      // ignore malformed frames
    }
  };

  return socket;
}

export interface RateSummary {
  averagePercent: number | null;
  testCount: number;
}

export interface PhytosanitaryCertificateRow {
  id: string;
  seed_lot_id: string;
  certificate_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  issued_by: string;
  notes: string | null;
  created_at: string;
}

export interface QualityMetricsSummary {
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  stage: SeedLotStage;
  purity: RateSummary;
  viability: RateSummary;
  germination: RateSummary;
  phytosanitary: PhytosanitaryCertificateRow[];
}

export interface QualityCertificateRow {
  id: string;
  seed_lot_id: string;
  version: number;
  status: string;
  snapshot: QualityMetricsSummary;
  generated_by: string;
  signed_by: string | null;
  signature_role: string | null;
  signed_at: string | null;
  created_at: string;
}

export interface ComplianceChainResult {
  focus: QualityMetricsSummary;
  ancestorChain: QualityMetricsSummary[];
}

export async function fetchQualityMetrics(token: string, seedLotId: string): Promise<QualityMetricsSummary> {
  return request(`/production/seed-lots/${seedLotId}/quality-metrics`, token);
}

export async function fetchComplianceChain(token: string, seedLotId: string): Promise<ComplianceChainResult> {
  return request(`/production/seed-lots/${seedLotId}/compliance-chain`, token);
}

export async function fetchCertificates(token: string, seedLotId: string): Promise<QualityCertificateRow[]> {
  return request(`/production/seed-lots/${seedLotId}/certificates`, token);
}

export async function generateQualityCertificate(token: string, seedLotId: string): Promise<QualityCertificateRow> {
  return request(`/production/seed-lots/${seedLotId}/certificates`, token, { method: 'POST' });
}

export async function signQualityCertificate(token: string, certificateId: string): Promise<QualityCertificateRow> {
  return request(`/production/compliance/certificates/${certificateId}/sign`, token, { method: 'POST' });
}

export interface RecordPurityTestPayload {
  seedLotId: string;
  sampleWeight: number;
  pureSeedWeight: number;
}

export async function recordPurityTest(token: string, payload: RecordPurityTestPayload): Promise<unknown> {
  return request('/production/compliance/purity-tests', token, { method: 'POST', body: JSON.stringify(payload) });
}

export interface RecordViabilityTestPayload {
  seedLotId: string;
  sampleSize: number;
  viableCount: number;
}

export async function recordViabilityTest(token: string, payload: RecordViabilityTestPayload): Promise<unknown> {
  return request('/production/compliance/viability-tests', token, { method: 'POST', body: JSON.stringify(payload) });
}

export interface RecordPhytosanitaryCertificatePayload {
  seedLotId: string;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate?: string;
}

export async function recordPhytosanitaryCertificate(
  token: string,
  payload: RecordPhytosanitaryCertificatePayload,
): Promise<unknown> {
  return request('/production/compliance/phytosanitary-certificates', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const WORKFLOW_STAGE_KEYS = [
  'FOUNDATION_LOT',
  'PRE_CERTIFIED_INSPECTION',
  'CERTIFIED_PRODUCTION',
  'QUALITY_TESTING',
  'MARKET_READY_RELEASE',
] as const;

export type WorkflowStageKey = (typeof WORKFLOW_STAGE_KEYS)[number];

export interface WorkflowStageDisplay {
  key: WorkflowStageKey;
  label: string;
  department: string;
}

// Mirrors server/src/modules/workflows/workflows.types.ts — display-only
// metadata; the server is the source of truth for who may actually approve.
export const WORKFLOW_STAGE_DISPLAY: WorkflowStageDisplay[] = [
  { key: 'FOUNDATION_LOT', label: 'Foundation Lot', department: 'Production' },
  { key: 'PRE_CERTIFIED_INSPECTION', label: 'Pre-Certified Inspection', department: 'Inspection' },
  { key: 'CERTIFIED_PRODUCTION', label: 'Certified Production', department: 'Production' },
  { key: 'QUALITY_TESTING', label: 'Quality Testing', department: 'Quality' },
  { key: 'MARKET_READY_RELEASE', label: 'Market-Ready Release', department: 'Marketing' },
];

export interface WorkflowStageRow {
  id: string;
  workflow_id: string;
  stage_key: WorkflowStageKey;
  sequence: number;
  department: string;
  status: string;
  started_at: string | null;
  due_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowInstanceRow {
  id: string;
  seed_lot_id: string;
  certified_lot_id: string | null;
  status: string;
  started_by: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowWithStages extends WorkflowInstanceRow {
  stages: WorkflowStageRow[];
}

export async function startWorkflow(token: string, seedLotId: string): Promise<WorkflowWithStages> {
  return request('/production/workflows', token, { method: 'POST', body: JSON.stringify({ seedLotId }) });
}

export async function listWorkflows(
  token: string,
  filters: { seedLotId?: string; status?: string } = {},
): Promise<WorkflowWithStages[]> {
  const params = new URLSearchParams();
  if (filters.seedLotId) params.set('seedLotId', filters.seedLotId);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/production/workflows${query ? `?${query}` : ''}`, token);
}

export async function getWorkflow(token: string, workflowId: string): Promise<WorkflowWithStages> {
  return request(`/production/workflows/${workflowId}`, token);
}

export async function approveWorkflowStage(
  token: string,
  workflowId: string,
  stageKey: WorkflowStageKey,
  notes?: string,
): Promise<WorkflowWithStages> {
  return request(`/production/workflows/${workflowId}/stages/${stageKey}/approve`, token, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function rejectWorkflowStage(
  token: string,
  workflowId: string,
  stageKey: WorkflowStageKey,
  reason: string,
): Promise<WorkflowWithStages> {
  return request(`/production/workflows/${workflowId}/stages/${stageKey}/reject`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function cancelWorkflow(token: string, workflowId: string): Promise<WorkflowInstanceRow> {
  return request(`/production/workflows/${workflowId}/cancel`, token, { method: 'POST' });
}

export interface PlanningItemInput {
  crop: string;
  variety: string;
  season: string;
  targetArea?: number;
  sowingDate: string;
}

export type DemandUrgency = 'urgent' | 'planned';

export interface DemandForecastEntry {
  crop: string;
  variety: string;
  season: string;
  monthsAhead: number;
  urgency: DemandUrgency;
  seedRatePerAcre: number;
  totalAreaAcres: number;
  requiredQuantity: number;
  availableQuantity: number;
  gapQuantity: number;
  unit: string;
}

export interface DemandForecastResult {
  horizonMonths: number;
  generatedAt: string;
  entries: DemandForecastEntry[];
}

export async function computeDemandForecast(
  token: string,
  items: PlanningItemInput[],
  horizonMonths = 6,
): Promise<DemandForecastResult> {
  return request('/production/demand-planning/forecast', token, {
    method: 'POST',
    body: JSON.stringify({ items, horizonMonths }),
  });
}

export interface PurchaseOrderRow {
  id: string;
  po_number: string;
  crop: string;
  variety: string;
  organization_id: string;
  quantity_requested: number;
  unit: string;
  status: string;
  source: string;
  requested_by: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  fulfilled_seed_lot_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function generatePurchaseOrder(
  token: string,
  payload: { crop: string; variety: string; quantity: number },
): Promise<PurchaseOrderRow> {
  return request('/production/demand-planning/purchase-orders', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listPurchaseOrders(
  token: string,
  filters: { status?: string; crop?: string } = {},
): Promise<PurchaseOrderRow[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.crop) params.set('crop', filters.crop);
  const query = params.toString();
  return request(`/production/demand-planning/purchase-orders${query ? `?${query}` : ''}`, token);
}

export async function updatePurchaseOrderStatus(
  token: string,
  id: string,
  status: string,
  extra: { fulfilledSeedLotId?: string; notes?: string } = {},
): Promise<PurchaseOrderRow> {
  return request(`/production/demand-planning/purchase-orders/${id}/status`, token, {
    method: 'POST',
    body: JSON.stringify({ status, ...extra }),
  });
}

export interface InventoryOptimizationEntry {
  seedLotId: string | null;
  lotCode: string | null;
  crop: string;
  variety: string;
  quantityAvailable: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  openPurchaseOrders: Array<{ id: string; poNumber: string; status: string; quantityRequested: number }>;
}

export async function fetchInventoryOptimization(token: string): Promise<InventoryOptimizationEntry[]> {
  return request('/production/demand-planning/inventory-optimization', token);
}

export interface FarmerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  region: string;
  location: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  anonymized?: boolean;
  anonymized_at?: string | null;
  anonymized_by?: string | null;
  anonymization_reason?: string | null;
}

export async function fetchFarmers(token: string, filters: { region?: string } = {}): Promise<FarmerRow[]> {
  const params = new URLSearchParams();
  if (filters.region) params.set('region', filters.region);
  const query = params.toString();
  return request(`/farmers${query ? `?${query}` : ''}`, token);
}

export interface FarmerPrivacyExport {
  exportedAt: string;
  farmer: Record<string, unknown>;
  farms: Record<string, unknown>[];
  seedRequests: Record<string, unknown>[];
  performanceRatings: Record<string, unknown>[];
  cropPlans: Record<string, unknown>[];
  fieldInspections: Record<string, unknown>[];
}

export interface RetentionPolicy {
  id: string;
  entity_type: string;
  retention_days: number;
  action: string;
  description: string;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RetentionCandidate {
  farmerId: string;
  name: string;
  region: string;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;
}

export interface ComplianceAuditReport {
  totalFarmers: number;
  anonymizedFarmers: number;
  retentionCandidateCount: number;
  dataAccess: {
    windowDays: number;
    totalAccesses: number;
    unmaskedAccesses: number;
    exportCount: number;
    byRole: { role: string; count: number; unmaskedCount: number }[];
  };
  principles: { principle: string; status: 'met' | 'attention'; note: string }[];
}

export interface DataAccessLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  access_type: string;
  accessed_by: string;
  accessed_by_role: string;
  was_masked: boolean;
  route: string | null;
  created_at: string;
}

export async function fetchComplianceAudit(token: string): Promise<ComplianceAuditReport> {
  return request('/privacy/compliance-audit', token);
}

export async function fetchRetentionPolicies(token: string): Promise<RetentionPolicy[]> {
  return request('/privacy/retention-policies', token);
}

export async function updateRetentionPolicy(
  token: string,
  entityType: string,
  input: { retentionDays?: number; isActive?: boolean },
): Promise<RetentionPolicy> {
  return request(`/privacy/retention-policies/${entityType}`, token, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function fetchRetentionCandidates(token: string): Promise<RetentionCandidate[]> {
  return request('/privacy/retention-candidates', token);
}

export async function fetchDataAccessLogs(token: string, entityId?: string): Promise<DataAccessLogRow[]> {
  const query = entityId ? `?entityId=${encodeURIComponent(entityId)}` : '';
  return request(`/privacy/access-logs${query}`, token);
}

export async function anonymizeFarmerRequest(token: string, farmerId: string, reason: string): Promise<void> {
  await request(`/privacy/farmers/${farmerId}/anonymize`, token, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function exportFarmerJson(token: string, farmerId: string): Promise<FarmerPrivacyExport> {
  return request(`/privacy/farmers/${farmerId}/export?format=json`, token);
}

/** CSV export triggers a real browser download — a raw fetch + Blob, bypassing the JSON-only shared request() helper. */
export async function downloadFarmerCsvExport(token: string, farmerId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/privacy/farmers/${farmerId}/export?format=csv`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new SeedLotApiError(text || `Export failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `farmer-${farmerId}-export.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface CreateFarmerPayload {
  name: string;
  phone?: string;
  email: string;
  region: string;
  location?: string;
  organizationId?: string | null;
}

export interface UpdateFarmerPayload {
  name?: string;
  phone?: string;
  email?: string;
  region?: string;
  location?: string;
  organizationId?: string | null;
}

export async function createFarmer(token: string, payload: CreateFarmerPayload): Promise<FarmerRow> {
  return request('/farmers', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateFarmer(token: string, id: string, payload: UpdateFarmerPayload): Promise<FarmerRow> {
  return request(`/farmers/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function fetchFarmerById(token: string, id: string): Promise<FarmerRow> {
  return request(`/farmers/${id}`, token);
}

export async function deleteFarmer(token: string, id: string): Promise<{ deleted: boolean }> {
  return request(`/farmers/${id}`, token, { method: 'DELETE' });
}

export interface SeedRequestRow {
  id: string;
  farmer_id: string;
  crop: string;
  variety: string;
  quantity_requested: number;
  unit: string;
  region: string;
  status: string;
  requested_by: string;
  approved_by: string | null;
  allocation_id: string | null;
  requested_seed_lot_id: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Farmer Portal "My Allocations" (Extend #9) — see the matching backend
// type's doc comment for why "pickup schedule" is represented as a
// ready-since timestamp plus a storage zone rather than a bookable slot.
export interface MyAllocationEntry extends SeedRequestRow {
  lot_code: string | null;
  storage_zones: string[];
  ready_since: string | null;
}

export interface SeedRequestWithFarmer extends SeedRequestRow {
  farmer_name: string;
  farmer_phone: string | null;
  farmer_location: string | null;
}

export interface DistributionListEntry {
  region: string;
  requests: SeedRequestWithFarmer[];
  totalQuantity: number;
}

export interface CreateSeedRequestPayload {
  farmerId: string;
  crop: string;
  variety: string;
  quantity: number;
  notes?: string;
  seedLotId?: string;
}

export async function createSeedRequest(token: string, payload: CreateSeedRequestPayload): Promise<SeedRequestRow> {
  return request('/production/seed-requests', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchMyAllocations(token: string, farmerId: string): Promise<MyAllocationEntry[]> {
  return request(`/production/seed-requests/my-allocations?farmerId=${encodeURIComponent(farmerId)}`, token);
}

export async function fetchSeedRequests(
  token: string,
  filters: { farmerId?: string; status?: string; region?: string; crop?: string } = {},
): Promise<SeedRequestRow[]> {
  const params = new URLSearchParams();
  if (filters.farmerId) params.set('farmerId', filters.farmerId);
  if (filters.status) params.set('status', filters.status);
  if (filters.region) params.set('region', filters.region);
  if (filters.crop) params.set('crop', filters.crop);
  const query = params.toString();
  return request(`/production/seed-requests${query ? `?${query}` : ''}`, token);
}

export async function approveSeedRequest(token: string, id: string, seedLotId?: string): Promise<SeedRequestRow> {
  return request(`/production/seed-requests/${id}/approve`, token, {
    method: 'POST',
    body: seedLotId ? JSON.stringify({ seedLotId }) : undefined,
  });
}

export async function rejectSeedRequest(token: string, id: string, reason: string): Promise<SeedRequestRow> {
  return request(`/production/seed-requests/${id}/reject`, token, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function fulfillSeedRequest(token: string, id: string, seedLotId: string): Promise<SeedRequestRow> {
  return request(`/production/seed-requests/${id}/fulfill`, token, { method: 'POST', body: JSON.stringify({ seedLotId }) });
}

export async function deliverSeedRequest(token: string, id: string): Promise<SeedRequestRow> {
  return request(`/production/seed-requests/${id}/deliver`, token, { method: 'POST' });
}

export async function fetchDistributionLists(token: string, region?: string): Promise<DistributionListEntry[]> {
  const query = region ? `?region=${encodeURIComponent(region)}` : '';
  return request(`/production/seed-requests/distribution-lists${query}`, token);
}

export interface SubmitRatingPayload {
  farmerId: string;
  seedRequestId?: string;
  crop: string;
  variety: string;
  germinationRating: number;
  yieldRating: number;
  overallRating: number;
  harvestedQuantity?: number;
  feedbackText?: string;
}

export interface PerformanceRatingRow {
  id: string;
  farmer_id: string;
  seed_request_id: string | null;
  crop: string;
  variety: string;
  germination_rating: number;
  yield_rating: number;
  overall_rating: number;
  harvested_quantity: number | null;
  feedback_text: string | null;
  recorded_by: string;
  created_at: string;
}

export async function submitPerformanceRating(token: string, payload: SubmitRatingPayload): Promise<PerformanceRatingRow> {
  return request('/production/performance-ratings', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchPerformanceRatings(
  token: string,
  filters: { farmerId?: string; crop?: string; variety?: string } = {},
): Promise<PerformanceRatingRow[]> {
  const params = new URLSearchParams();
  if (filters.farmerId) params.set('farmerId', filters.farmerId);
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.variety) params.set('variety', filters.variety);
  const query = params.toString();
  return request(`/production/performance-ratings${query ? `?${query}` : ''}`, token);
}

export interface VarietyEffectivenessEntry {
  crop: string;
  variety: string;
  totalFarmersServed: number;
  farmersRated: number;
  adoptionRate: number;
  reportingRate: number;
  repeatRequestRate: number;
  avgGerminationRating: number | null;
  avgYieldRating: number | null;
  avgOverallRating: number | null;
  ratingCount: number;
}

export async function fetchVarietyEffectiveness(token: string): Promise<VarietyEffectivenessEntry[]> {
  return request('/production/performance-ratings/variety-effectiveness', token);
}

export interface PackagingBatchRow {
  id: string;
  batch_code: string;
  seed_lot_id: string;
  unit_size: number;
  unit_count: number;
  unit_of_measure: string;
  total_quantity: number;
  storage_conditions: string;
  shelf_life_months: number;
  status: string;
  packaged_by: string;
  created_at: string;
  updated_at: string;
}

export interface PackagingUnitRow {
  id: string;
  packaging_batch_id: string;
  unit_code: string;
  sequence_number: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UnitLabelData {
  unitCode: string;
  batchCode: string;
  sequenceNumber: number;
  lotCode: string;
  crop: string;
  variety: string;
  stage: string;
  unitSize: number;
  unitOfMeasure: string;
  shelfLifeMonths: number;
  storageConditions: string;
  packagedAt: string;
  certifiedDate: string | null;
  germinationPercent: number | null;
  qrPayload: string;
}

export interface CreatePackagingBatchPayload {
  seedLotId: string;
  unitSize: number;
  unitCount: number;
  storageConditions: string;
  shelfLifeMonths: number;
}

export async function createPackagingBatch(
  token: string,
  payload: CreatePackagingBatchPayload,
): Promise<{ batch: PackagingBatchRow; units: PackagingUnitRow[] }> {
  return request('/production/packaging/batches', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchPackagingBatches(
  token: string,
  filters: { seedLotId?: string } = {},
): Promise<PackagingBatchRow[]> {
  const params = new URLSearchParams();
  if (filters.seedLotId) params.set('seedLotId', filters.seedLotId);
  const query = params.toString();
  return request(`/production/packaging/batches${query ? `?${query}` : ''}`, token);
}

export async function fetchPackagingUnits(token: string, batchId: string): Promise<PackagingUnitRow[]> {
  return request(`/production/packaging/batches/${batchId}/units`, token);
}

export async function fetchUnitLabel(token: string, unitId: string): Promise<UnitLabelData> {
  return request(`/production/packaging/units/${unitId}/label`, token);
}

export async function updatePackagingUnitStatus(token: string, unitId: string, status: string): Promise<PackagingUnitRow> {
  return request(`/production/packaging/units/${unitId}/status`, token, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export interface StorageLocationRow {
  id: string;
  organization_id: string;
  code: string;
  warehouse_zone: string;
  shelf: string | null;
  capacity_units: number;
  target_temperature_c: number;
  target_humidity_percent: number;
  daily_rate_per_unit: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStorageLocationPayload {
  organizationId: string;
  code: string;
  warehouseZone: string;
  shelf?: string;
  capacityUnits: number;
  targetTemperatureC: number;
  targetHumidityPercent: number;
  dailyRatePerUnit?: number;
}

export interface StorageAssignmentRow {
  id: string;
  packaging_batch_id: string;
  storage_location_id: string;
  status: string;
  stored_at: string;
  ended_at: string | null;
  performed_by: string;
  notes: string | null;
  created_at: string;
}

export interface ActiveStorageEntry extends StorageAssignmentRow {
  batch_code: string;
  unit_count: number;
  total_quantity: number;
  unit_of_measure: string;
}

export interface StorageConditionLogRow {
  id: string;
  storage_location_id: string;
  recorded_temperature_c: number;
  recorded_humidity_percent: number;
  recorded_by: string;
  notes: string | null;
  created_at: string;
}

export type ExpirationStatus = 'expired' | 'critical' | 'warning' | 'ok';

export interface ExpirationEntry {
  packagingBatchId: string;
  batchCode: string;
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  packagedAt: string;
  shelfLifeMonths: number;
  expirationDate: string;
  daysRemaining: number;
  status: ExpirationStatus;
  currentLocationCode: string | null;
  currentLocationZone: string | null;
  currentLocationShelf: string | null;
  currentLocationTemperatureC: number | null;
}

export interface FifoPickEntry {
  packagingBatchId: string;
  batchCode: string;
  lotCode: string;
  packagedAt: string;
  unitCount: number;
  totalQuantity: number;
  unitOfMeasure: string;
  currentLocationCode: string | null;
  currentLocationZone: string | null;
  daysInStorage: number;
}

export interface StorageCostEntry {
  packagingBatchId: string;
  batchCode: string;
  storageLocationId: string;
  locationCode: string;
  dailyRatePerUnit: number;
  unitCount: number;
  daysStored: number;
  accruedCost: number;
  status: string;
}

export async function fetchStorageLocations(
  token: string,
  filters: { warehouseZone?: string } = {},
): Promise<StorageLocationRow[]> {
  const params = new URLSearchParams();
  if (filters.warehouseZone) params.set('warehouseZone', filters.warehouseZone);
  const query = params.toString();
  return request(`/production/storage/locations${query ? `?${query}` : ''}`, token);
}

export async function createStorageLocation(
  token: string,
  payload: CreateStorageLocationPayload,
): Promise<StorageLocationRow> {
  return request('/production/storage/locations', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchActiveBatchesByLocation(token: string, locationId: string): Promise<ActiveStorageEntry[]> {
  return request(`/production/storage/locations/${locationId}/active-batches`, token);
}

export async function assignBatchToStorage(
  token: string,
  batchId: string,
  storageLocationId: string,
  notes?: string,
): Promise<StorageAssignmentRow> {
  return request(`/production/storage/batches/${batchId}/assign`, token, {
    method: 'POST',
    body: JSON.stringify({ storageLocationId, notes }),
  });
}

export async function moveBatchStorage(
  token: string,
  batchId: string,
  storageLocationId: string,
  notes?: string,
): Promise<StorageAssignmentRow> {
  return request(`/production/storage/batches/${batchId}/move`, token, {
    method: 'POST',
    body: JSON.stringify({ storageLocationId, notes }),
  });
}

export async function removeBatchFromStorage(token: string, batchId: string): Promise<StorageAssignmentRow> {
  return request(`/production/storage/batches/${batchId}/remove`, token, { method: 'POST' });
}

export async function fetchMovementHistory(token: string, batchId: string): Promise<StorageAssignmentRow[]> {
  return request(`/production/storage/batches/${batchId}/movement-history`, token);
}

export async function fetchExpirationStatuses(token: string): Promise<ExpirationEntry[]> {
  return request('/production/storage/expiration-status', token);
}

export async function fetchFifoPickOrder(token: string, crop: string, variety: string): Promise<FifoPickEntry[]> {
  const params = new URLSearchParams({ crop, variety });
  return request(`/production/storage/fifo?${params.toString()}`, token);
}

export async function fetchStorageCosts(token: string): Promise<StorageCostEntry[]> {
  return request('/production/storage/costs', token);
}

export async function recordStorageConditionLog(
  token: string,
  locationId: string,
  payload: { temperature: number; humidity: number; notes?: string },
): Promise<StorageConditionLogRow> {
  return request(`/production/storage/locations/${locationId}/condition-logs`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchConditionLogs(token: string, locationId: string): Promise<StorageConditionLogRow[]> {
  return request(`/production/storage/locations/${locationId}/condition-logs`, token);
}

export interface OrganizationRow {
  id: string;
  name: string;
  type: string;
  location?: string | null;
  contact_person?: string | null;
  certification_type?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function fetchOrganizations(token: string, filters: { type?: string } = {}): Promise<OrganizationRow[]> {
  const query = filters.type ? `?type=${encodeURIComponent(filters.type)}` : '';
  return request(`/organizations${query}`, token);
}

export async function fetchOrganizationById(token: string, id: string): Promise<OrganizationRow> {
  return request(`/organizations/${id}`, token);
}

export interface CreateOrganizationPayload {
  name: string;
  type: string;
  location?: string;
  contactPerson?: string;
  certificationType?: string;
  active?: boolean;
}

export interface UpdateOrganizationPayload {
  name?: string;
  type?: string;
  location?: string;
  contactPerson?: string;
  certificationType?: string;
  active?: boolean;
}

export async function createOrganization(token: string, payload: CreateOrganizationPayload): Promise<OrganizationRow> {
  return request('/organizations', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateOrganization(
  token: string,
  id: string,
  payload: UpdateOrganizationPayload,
): Promise<OrganizationRow> {
  return request(`/organizations/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteOrganization(token: string, id: string): Promise<{ deleted: boolean }> {
  return request(`/organizations/${id}`, token, { method: 'DELETE' });
}

export interface RecordLotFieldInspectionPayload {
  seedLotId: string;
  farmerId?: string;
  healthScore: number;
  diseaseDetected: boolean;
  diseaseName?: string;
  pestDetected?: boolean;
  pestName?: string;
  environmentalNotes?: string;
  inspectionDate: string;
}

export interface LotFieldInspectionRow {
  id: string;
  seed_lot_id: string;
  farmer_id: string | null;
  seed_request_id: string | null;
  health_score: number;
  disease_detected: boolean;
  disease_name: string | null;
  environmental_notes: string | null;
  inspection_date: string;
  recorded_by: string;
  created_at: string;
}

export type PerformanceRating = 'high' | 'moderate' | 'low' | 'insufficient_data';

export interface LotPerformanceEntry {
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  inspectionCount: number;
  avgHealthScore: number | null;
  diseaseIncidenceRate: number | null;
  // % of inspections reporting neither disease nor pest — "Lot A used in
  // 10 fields -> 90% healthy" read literally, as its own figure alongside
  // (not a replacement for) the existing avgHealthScore/diseaseIncidenceRate
  // -driven performanceRating.
  healthyRate: number | null;
  avgGerminationRate: number | null;
  performanceRating: PerformanceRating;
}

// "System finds originating lot" — resolves which real seed lot a farmer's
// crop actually came from, checking both reservation pipelines this app
// has (Extend #9's seed_requests allocation flow, and the Crop Planning
// Wizard's crop_plans reservation flow), most recent match wins.
export interface OriginatingLotMatch {
  seedLotId: string;
  lotCode: string;
  source: 'seed_request' | 'crop_plan';
  matchedAt: string;
}

export interface BreederPerformanceEntry {
  breederOrganizationId: string;
  breederOrganizationName: string;
  lotCount: number;
  inspectionCount: number;
  avgHealthScore: number | null;
  diseaseIncidenceRate: number | null;
  avgGerminationRate: number | null;
}

export interface EnvironmentalAdaptationEntry {
  crop: string;
  variety: string;
  region: string;
  inspectionCount: number;
  avgHealthScore: number | null;
  diseaseIncidenceRate: number | null;
}

export async function recordLotFieldInspection(
  token: string,
  payload: RecordLotFieldInspectionPayload,
): Promise<LotFieldInspectionRow> {
  return request('/production/field-inspections', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchLotFieldInspections(
  token: string,
  filters: { seedLotId?: string } = {},
): Promise<LotFieldInspectionRow[]> {
  const params = new URLSearchParams();
  if (filters.seedLotId) params.set('seedLotId', filters.seedLotId);
  const query = params.toString();
  return request(`/production/field-inspections${query ? `?${query}` : ''}`, token);
}

export async function fetchLotPerformance(token: string): Promise<LotPerformanceEntry[]> {
  return request('/production/field-inspections/lot-performance', token);
}

export async function findOriginatingLot(token: string, farmerId: string, crop: string): Promise<OriginatingLotMatch | null> {
  return request(
    `/production/field-inspections/originating-lot?farmerId=${encodeURIComponent(farmerId)}&crop=${encodeURIComponent(crop)}`,
    token,
  );
}

export async function fetchBreederPerformance(token: string): Promise<BreederPerformanceEntry[]> {
  return request('/production/field-inspections/breeder-performance', token);
}

export async function fetchEnvironmentalAdaptation(token: string): Promise<EnvironmentalAdaptationEntry[]> {
  return request('/production/field-inspections/environmental-adaptation', token);
}

export type GovernanceViolationType = 'CROP_MISMATCH' | 'STAGE_HIERARCHY' | 'PRODUCTION_DATE' | 'QUANTITY_LIMIT';

export interface SeedLotViolation {
  seedLotId: string;
  lotCode: string;
  crop: string;
  stage: string;
  parentLotId: string;
  parentLotCode: string;
  violationType: GovernanceViolationType;
  description: string;
}

export interface RecordInventoryCountPayload {
  seedLotId: string;
  countedQuantity: number;
  countDate?: string;
  notes?: string;
}

export interface InventoryCountRow {
  id: string;
  seed_lot_id: string;
  counted_quantity: number;
  recorded_quantity: number;
  discrepancy: number;
  counted_by: string;
  count_date: string;
  notes: string | null;
  created_at: string;
}

export interface ReconciliationEntry {
  id: string;
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  countedQuantity: number;
  recordedQuantity: number;
  discrepancy: number;
  discrepancyPct: number | null;
  countedBy: string;
  countDate: string;
  notes: string | null;
}

export interface OrphanLotEntry {
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  stage: string;
  status: string;
  createdAt: string;
  daysSinceCreated: number;
}

export interface CorrectionHistoryEntry {
  id: string;
  entityId: string;
  action: string;
  performedBy: string;
  beforeState: { quantity_total?: number; status?: string } | null;
  afterState: { quantity_total?: number; status?: string } | null;
  metadata: { reason?: string } | null;
  createdAt: string;
}

export async function fetchGovernanceViolations(token: string): Promise<SeedLotViolation[]> {
  return request('/production/data-governance/violations', token);
}

export async function fetchReconciliationReport(token: string): Promise<ReconciliationEntry[]> {
  return request('/production/data-governance/reconciliation', token);
}

export async function recordInventoryCount(token: string, payload: RecordInventoryCountPayload): Promise<InventoryCountRow> {
  return request('/production/data-governance/inventory-counts', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchOrphanLots(token: string): Promise<OrphanLotEntry[]> {
  return request('/production/data-governance/orphan-lots', token);
}

export async function archiveOrphanLot(token: string, seedLotId: string, reason: string): Promise<RealtimeSeedLot> {
  return request(`/production/data-governance/orphan-lots/${seedLotId}/archive`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function correctSeedLotQuantity(
  token: string,
  seedLotId: string,
  payload: { quantityTotal: number; reason: string },
): Promise<RealtimeSeedLot> {
  return request(`/production/data-governance/seed-lots/${seedLotId}/correct-quantity`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCorrectionHistory(token: string, seedLotId?: string): Promise<CorrectionHistoryEntry[]> {
  const query = seedLotId ? `?seedLotId=${encodeURIComponent(seedLotId)}` : '';
  return request(`/production/data-governance/corrections${query}`, token);
}

// Mirrors server/src/modules/varieties/varieties.types.ts COMMITTEE_ROLES —
// display-only; the server is the source of truth for who may actually review.
export const COMMITTEE_ROLES = ['Admin', 'Breeder'];

export type VarietyStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'deprecated';
export type VersionStatus = 'draft' | 'issued' | 'superseded';
export type MarketDemandTrend = 'rising' | 'stable' | 'declining';
export type ReviewDecision = 'approved' | 'rejected' | 'changes_requested';
export type ResistanceLevel = 'high' | 'moderate' | 'low' | 'susceptible';

export interface DiseaseResistanceEntry {
  disease: string;
  resistanceLevel: ResistanceLevel;
}

export interface Variety {
  id: string;
  crop: string;
  variety_name: string;
  botanical_name: string;
  local_names: string[];
  organization_id: string | null;
  status: VarietyStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VarietyVersion {
  id: string;
  variety_id: string;
  version: number;
  status: VersionStatus;
  season: string;
  agro_climatic_suitability: string[];
  yield_benchmark_per_acre: number | null;
  yield_unit: string;
  disease_resistance_profile: DiseaseResistanceEntry[];
  market_demand_trend: MarketDemandTrend | null;
  notes: string | null;
  submitted_by: string;
  created_at: string;
}

export interface VarietyCommitteeReview {
  id: string;
  variety_version_id: string;
  reviewer: string;
  reviewer_role: string;
  decision: ReviewDecision;
  comments: string | null;
  reviewed_at: string;
}

export interface VarietyVersionWithReviews extends VarietyVersion {
  reviews: VarietyCommitteeReview[];
}

export interface VarietyWithVersions extends Variety {
  versions: VarietyVersionWithReviews[];
}

export interface VarietyWithLatestVersion extends Variety {
  latestVersion: VarietyVersion | null;
}

export interface CreateVarietyPayload {
  crop: string;
  varietyName: string;
  botanicalName: string;
  localNames?: string[];
  organizationId?: string | null;
  season: string;
  agroClimaticSuitability?: string[];
  yieldBenchmarkPerAcre?: number;
  yieldUnit?: string;
  diseaseResistanceProfile?: DiseaseResistanceEntry[];
  marketDemandTrend?: MarketDemandTrend;
  notes?: string;
}

export interface UpdateVarietyDraftPayload {
  botanicalName?: string;
  localNames?: string[];
  season?: string;
  agroClimaticSuitability?: string[];
  yieldBenchmarkPerAcre?: number;
  yieldUnit?: string;
  diseaseResistanceProfile?: DiseaseResistanceEntry[];
  marketDemandTrend?: MarketDemandTrend;
  notes?: string;
}

export async function createVariety(token: string, payload: CreateVarietyPayload): Promise<VarietyWithLatestVersion> {
  return request('/production/varieties', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchVarieties(
  token: string,
  filters: { crop?: string; status?: string } = {},
): Promise<VarietyWithLatestVersion[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/production/varieties${query ? `?${query}` : ''}`, token);
}

export async function fetchVarietyById(token: string, id: string): Promise<VarietyWithVersions> {
  return request(`/production/varieties/${id}`, token);
}

export async function updateVarietyDraft(
  token: string,
  id: string,
  payload: UpdateVarietyDraftPayload,
): Promise<VarietyWithLatestVersion> {
  return request(`/production/varieties/${id}/draft`, token, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function submitVarietyForReview(token: string, id: string): Promise<VarietyWithLatestVersion> {
  return request(`/production/varieties/${id}/submit-for-review`, token, { method: 'POST' });
}

export async function reviewVariety(
  token: string,
  id: string,
  payload: { decision: ReviewDecision; comments?: string },
): Promise<VarietyWithLatestVersion> {
  return request(`/production/varieties/${id}/review`, token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function createVarietyVersion(
  token: string,
  id: string,
  payload: UpdateVarietyDraftPayload,
): Promise<VarietyWithLatestVersion> {
  return request(`/production/varieties/${id}/versions`, token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function deprecateVariety(token: string, id: string, reason: string): Promise<Variety> {
  return request(`/production/varieties/${id}/deprecate`, token, { method: 'POST', body: JSON.stringify({ reason }) });
}

export type LabTestType = 'germination' | 'purity' | 'vigor';
export type LabSubmissionStatus = 'submitted' | 'in_progress' | 'completed' | 'failed';
export type LabResultSource = 'manual' | 'file_upload';

export interface LabTestResult {
  id: string;
  submission_id: string;
  test_type: LabTestType;
  metrics: Record<string, number>;
  result_value: number;
  threshold_used: number;
  passed: boolean;
  source: LabResultSource;
  recorded_by: string;
  recorded_at: string;
  notes: string | null;
}

export interface LabTestSubmission {
  id: string;
  seed_lot_id: string;
  lab_organization_id: string;
  requested_tests: LabTestType[];
  sample_quantity: number;
  sample_unit: string;
  status: LabSubmissionStatus;
  submitted_by: string;
  submitted_at: string;
  expected_completion_date: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  lab_organization_name: string;
  lot_code: string;
  results: LabTestResult[];
}

export interface LabQualityFlag {
  id: string;
  seed_lot_id: string;
  submission_id: string;
  test_type: LabTestType;
  reason: string;
  flagged_at: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  lot_code: string;
}

export interface LabPerformanceEntry {
  labOrganizationId: string;
  labOrganizationName: string;
  totalSubmissions: number;
  completedCount: number;
  failedCount: number;
  passRate: number | null;
  avgTurnaroundDays: number | null;
  overdueCount: number;
}

export interface SubmitSampleBatchPayload {
  seedLotId: string;
  labOrganizationId: string;
  requestedTests: LabTestType[];
  sampleQuantity: number;
  sampleUnit?: string;
  expectedCompletionDate?: string;
}

export interface RecordLabTestResultPayload {
  testType: LabTestType;
  metrics: Record<string, number>;
  notes?: string;
}

export async function submitSampleBatch(token: string, payload: SubmitSampleBatchPayload): Promise<LabTestSubmission> {
  return request('/production/lab-testing/submissions', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchLabSubmissions(
  token: string,
  filters: { seedLotId?: string; labOrganizationId?: string; status?: string } = {},
): Promise<LabTestSubmission[]> {
  const params = new URLSearchParams();
  if (filters.seedLotId) params.set('seedLotId', filters.seedLotId);
  if (filters.labOrganizationId) params.set('labOrganizationId', filters.labOrganizationId);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/production/lab-testing/submissions${query ? `?${query}` : ''}`, token);
}

export async function fetchLabSubmissionById(token: string, id: string): Promise<LabTestSubmission> {
  return request(`/production/lab-testing/submissions/${id}`, token);
}

export async function recordLabTestResult(
  token: string,
  submissionId: string,
  payload: RecordLabTestResultPayload,
): Promise<LabTestSubmission> {
  return request(`/production/lab-testing/submissions/${submissionId}/results`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function bulkUploadLabResults(
  token: string,
  submissionId: string,
  results: RecordLabTestResultPayload[],
): Promise<LabTestSubmission> {
  return request(`/production/lab-testing/submissions/${submissionId}/results/bulk-upload`, token, {
    method: 'POST',
    body: JSON.stringify({ results }),
  });
}

export async function fetchLabQualityFlags(
  token: string,
  filters: { resolved?: boolean; seedLotId?: string } = {},
): Promise<LabQualityFlag[]> {
  const params = new URLSearchParams();
  if (filters.resolved !== undefined) params.set('resolved', String(filters.resolved));
  if (filters.seedLotId) params.set('seedLotId', filters.seedLotId);
  const query = params.toString();
  return request(`/production/lab-testing/quality-flags${query ? `?${query}` : ''}`, token);
}

export async function resolveLabQualityFlag(token: string, id: string, resolutionNotes: string): Promise<LabQualityFlag> {
  return request(`/production/lab-testing/quality-flags/${id}/resolve`, token, {
    method: 'POST',
    body: JSON.stringify({ resolutionNotes }),
  });
}

export async function fetchLabPerformance(token: string): Promise<LabPerformanceEntry[]> {
  return request('/production/lab-testing/lab-performance', token);
}

export interface LabIssuedCertificate {
  id: string;
  certificate_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  issued_by: string;
  notes: string | null;
  seed_lot_id: string;
  lot_code: string;
  submission_id: string | null;
  lab_organization_name: string | null;
}

export async function fetchLabIssuedCertificates(token: string): Promise<LabIssuedCertificate[]> {
  return request('/production/lab-testing/certificates', token);
}

// --- AI assistant ---------------------------------------------------------

export type AssistantIntent =
  | 'low_stock'
  | 'expiring_lots'
  | 'lab_failures'
  | 'lab_pending'
  | 'demand_gap'
  | 'pending_requests'
  | 'inventory_summary'
  | 'storage_overview'
  | 'module_help'
  | 'general';

export interface AssistantCitation {
  label: string;
  module: string;
  path: string;
  detail?: string;
}

export interface AssistantAnswer {
  answer: string;
  intent: AssistantIntent;
  citations: AssistantCitation[];
  /** 'model' = an external LLM wrote the prose; 'rules' = the built-in
   *  deterministic engine did. Both read the same live data. */
  source: 'model' | 'rules';
  modelName: string | null;
  suggestions: string[];
  /** Knowledge-base passages the answer was grounded on (RAG). */
  sources?: { id: string; title: string; module: string; path: string; type: string; excerpt: string }[];
}

export interface AssistantStatus {
  modelConfigured: boolean;
  provider: string;
  model: string | null;
}

export async function fetchAssistantStatus(token: string): Promise<AssistantStatus> {
  return request('/assistant/status', token);
}

export async function askAssistant(
  token: string,
  question: string,
  currentPath?: string,
  history: { role: 'user' | 'assistant'; text: string }[] = [],
): Promise<AssistantAnswer> {
  return request('/assistant/ask', token, {
    method: 'POST',
    body: JSON.stringify({ question, currentPath, history: history.slice(-6) }),
  });
}

export async function generatePhytosanitaryFromSubmission(
  token: string,
  submissionId: string,
  payload: { certificateNumber?: string; issuingAuthority?: string; expiryDate?: string; notes?: string } = {},
): Promise<PhytosanitaryCertificateRow> {
  return request(`/production/lab-testing/submissions/${submissionId}/phytosanitary-certificate`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface SeedLotSearchResult {
  id: string;
  lot_code: string;
  crop: string;
  variety: string;
  stage: string;
  quantity_total: number;
  quantity_allocated: number;
  quantity_available: number;
  unit: string;
  status: string;
  production_date: string;
  organization_id: string | null;
  organization_name: string | null;
  agro_climatic_suitability: string[] | null;
  disease_resistance_profile: DiseaseResistanceEntry[] | null;
  yield_benchmark_per_acre: number | null;
  variety_yield_unit: string | null;
  latest_certificate_status: string | null;
  is_certified: boolean;
  testing_status: string;
  storage_zones: string[];
  storage_location_codes: string[];
}

export interface SeedLotSearchFilterOptions {
  crops: string[];
  organizations: { id: string; name: string }[];
  agroClimaticZones: string[];
  diseaseTraits: string[];
  storageZones: string[];
}

export interface SeedLotSearchFilters {
  // Free-text quick search across crop, variety, and lot code — see the
  // matching comment on the backend type for why this is separate from
  // the precise `crop`/`variety` fields below.
  q?: string;
  variety?: string;
  crop?: string;
  seedClass?: string;
  sourceOrganizationId?: string;
  productionDateFrom?: string;
  productionDateTo?: string;
  minAvailableQuantity?: number;
  storageZone?: string;
  certificationStatus?: 'certified' | 'not_certified';
  testingStatus?: 'not_submitted' | 'testing' | 'certified' | 'rejected';
  agroClimaticZone?: string;
  diseaseResistanceTrait?: string;
  minYieldBenchmark?: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SeedLotSearchFilters;
  created_at: string;
}

export async function fetchSeedLotSearchFilterOptions(token: string): Promise<SeedLotSearchFilterOptions> {
  return request('/production/seed-lots/search/filter-options', token);
}

export async function searchSeedLots(token: string, filters: SeedLotSearchFilters): Promise<SeedLotSearchResult[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const query = params.toString();
  return request(`/production/seed-lots/search${query ? `?${query}` : ''}`, token);
}

export async function fetchSavedSearches(token: string): Promise<SavedSearch[]> {
  return request('/production/seed-lots/saved-searches', token);
}

export async function saveSearch(token: string, name: string, filters: SeedLotSearchFilters): Promise<SavedSearch> {
  return request('/production/seed-lots/saved-searches', token, {
    method: 'POST',
    body: JSON.stringify({ name, filters }),
  });
}

export async function deleteSavedSearch(token: string, id: string): Promise<void> {
  await request(`/production/seed-lots/saved-searches/${id}`, token, { method: 'DELETE' });
}

export interface ErrorLogGroup {
  fingerprint: string;
  source: 'backend' | 'frontend';
  level: 'error' | 'warning';
  message: string;
  stack_trace: string | null;
  route: string | null;
  method: string | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

export interface ApiPerformanceEntry {
  method: string;
  route: string;
  requestCount: number;
  avgDurationMs: number;
  p95DurationMs: number;
  errorRate: number;
}

export interface FailedOperationEntry {
  method: string;
  route: string;
  statusCode: number;
  occurrenceCount: number;
  lastOccurredAt: string;
}

export interface UserActivityEntry {
  userEmail: string;
  actionCount: number;
  distinctEntityTypes: number;
  lastActionAt: string;
}

export interface DataConsistencySummary {
  parentageViolationCount: number;
  reconciliationDiscrepancyCount: number;
  orphanLotCount: number;
}

export interface AnomalyEntry {
  metric: string;
  label: string;
  todayCount: number;
  trailingDailyAverage: number;
  isAnomalous: boolean;
}

/**
 * Reports a frontend crash caught by ErrorBoundary. Best-effort by design —
 * if this itself fails (e.g. we're offline, which is plausible exactly when
 * things are going wrong), it must not throw a second error on top of the
 * one already being handled.
 */
export async function reportFrontendError(input: {
  message: string;
  stackTrace?: string;
  route?: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    await request('/monitoring/errors', lastKnownToken, { method: 'POST', body: JSON.stringify(input) });
  } catch {
    // Swallowed intentionally — see doc comment above.
  }
}

export async function fetchErrorLogs(token: string, source?: string): Promise<ErrorLogGroup[]> {
  const query = source ? `?source=${encodeURIComponent(source)}` : '';
  return request(`/monitoring/errors${query}`, token);
}

export async function fetchApiPerformance(token: string): Promise<ApiPerformanceEntry[]> {
  return request('/monitoring/api-performance', token);
}

export async function fetchFailedOperations(token: string): Promise<FailedOperationEntry[]> {
  return request('/monitoring/failed-operations', token);
}

export async function fetchUserActivity(token: string): Promise<UserActivityEntry[]> {
  return request('/monitoring/user-activity', token);
}

export async function fetchDataConsistency(token: string): Promise<DataConsistencySummary> {
  return request('/monitoring/data-consistency', token);
}

export async function fetchAnomalies(token: string): Promise<AnomalyEntry[]> {
  return request('/monitoring/anomalies', token);
}

// --- Seed Lot Authenticity & Anti-Counterfeiting ------------------------
// The three "public" functions below deliberately pass `null` as the token
// — request() already supports that (no Authorization header sent) — since
// they hit this app's first-ever unauthenticated endpoints, reachable by a
// farmer scanning a QR code with no SeedSphere login at all.

export type HashChainEventType = 'CREATE' | 'UPDATE' | 'ALLOCATE' | 'RELEASE';

export interface HashChainEntry {
  id: string;
  seed_lot_id: string;
  sequence_number: number;
  event_type: HashChainEventType;
  snapshot: unknown;
  previous_hash: string;
  record_hash: string;
  recorded_by: string;
  created_at: string;
}

export interface ChainIntegrityResult {
  valid: boolean;
  brokenAtSequence: number | null;
  reason: string | null;
}

export interface AuthenticityCertificate {
  id: string;
  seed_lot_id: string;
  certificate_number: string;
  chain_length: number;
  latest_hash: string;
  signing_key_id: string;
  signature: string;
  issued_by: string;
  issued_at: string;
  revoked: boolean;
  revoked_at: string | null;
  revoked_by: string | null;
  revoked_reason: string | null;
}

export interface CertificateBundle {
  certificateNumber: string;
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  chain: {
    sequenceNumber: number;
    eventType: HashChainEventType;
    snapshot: unknown;
    previousHash: string;
    recordHash: string;
    createdAt: string;
  }[];
  chainLength: number;
  latestHash: string;
  signature: string;
  signingKeyFingerprint: string;
  publicKeyPem: string;
  issuedAt: string;
  issuedBy: string;
  revoked: boolean;
}

export interface AuthenticityVerificationResult {
  authentic: boolean;
  chainValid: boolean;
  signatureValid: boolean;
  revoked: boolean;
  brokenAtSequence: number | null;
  reason: string | null;
  certificateNumber: string;
  lotCode: string;
  crop: string;
  variety: string;
  chainLength: number;
  issuedAt: string;
}

export async function fetchLotHashChain(token: string, seedLotId: string): Promise<HashChainEntry[]> {
  return request(`/authenticity/seed-lots/${seedLotId}/chain`, token);
}

export async function fetchLotChainIntegrity(token: string, seedLotId: string): Promise<ChainIntegrityResult> {
  return request(`/authenticity/seed-lots/${seedLotId}/verify-chain`, token);
}

export async function fetchLotCertificates(token: string, seedLotId: string): Promise<AuthenticityCertificate[]> {
  return request(`/authenticity/seed-lots/${seedLotId}/certificates`, token);
}

export async function issueLotCertificate(token: string, seedLotId: string): Promise<AuthenticityCertificate> {
  return request(`/authenticity/seed-lots/${seedLotId}/certificates`, token, { method: 'POST' });
}

export async function revokeLotCertificate(token: string, certificateId: string, reason: string): Promise<AuthenticityCertificate> {
  return request(`/authenticity/certificates/${certificateId}/revoke`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/** Public — no login required. What a QR code embedding `/verify-lot/:certificateId` resolves to. */
export async function fetchPublicVerification(certificateId: string): Promise<AuthenticityVerificationResult> {
  return request(`/authenticity/certificates/${certificateId}/verify`, null);
}

/** Public — the full portable bundle, downloadable so a farmer can re-verify later with scripts/verifyLotCertificate.ts and no network access at all. */
export async function fetchPublicCertificateBundle(certificateId: string): Promise<CertificateBundle> {
  return request(`/authenticity/certificates/${certificateId}/bundle`, null);
}

// --- Third-Party Seed Bank Integration -----------------------------------

export async function updateSeedLotAvailability(token: string, seedLotId: string, availableForPartnerOrder: boolean): Promise<RealtimeSeedLot> {
  return request(`/production/seed-lots/${seedLotId}`, token, {
    method: 'PUT',
    body: JSON.stringify({ availableForPartnerOrder }),
  });
}

export const PARTNER_LINK_STATUSES = ['pending', 'active', 'suspended', 'terminated'] as const;
export type PartnerLinkStatus = (typeof PARTNER_LINK_STATUSES)[number];

export interface PartnerLink {
  id: string;
  requesting_org_id: string;
  partner_org_id: string;
  status: PartnerLinkStatus;
  requested_by: string;
  approved_by: string | null;
  requested_at: string;
  approved_at: string | null;
  notes: string | null;
}

export const PARTNER_ORDER_STATUSES = ['requested', 'confirmed', 'rejected', 'shipped', 'received', 'disputed', 'cancelled'] as const;
export type PartnerOrderStatus = (typeof PARTNER_ORDER_STATUSES)[number];

export interface PartnerOrder {
  id: string;
  order_number: string;
  buyer_org_id: string;
  partner_org_id: string;
  seed_lot_id: string;
  crop: string;
  variety: string;
  quantity_requested: number;
  unit: string;
  status: PartnerOrderStatus;
  allocation_id: string | null;
  received_seed_lot_id: string | null;
  requested_by: string;
  confirmed_by: string | null;
  rejection_reason: string | null;
  dispute_reason: string | null;
  quality_rating_at_receipt: number | null;
  on_time: boolean | null;
  notes: string | null;
  requested_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerPerformanceRating {
  id: string;
  buyer_org_id: string;
  partner_org_id: string;
  total_orders: number;
  fulfilled_orders: number;
  disputed_orders: number;
  cancelled_orders: number;
  on_time_orders: number;
  avg_quality_rating: number | null;
  overall_score: number | null;
  last_order_at: string | null;
  updated_at: string;
}

export interface PartnerInventorySyncLog {
  id: string;
  buyer_org_id: string;
  partner_org_id: string;
  synced_by: string;
  lots_synced: number;
  total_available_quantity: number;
  synced_at: string;
}

export interface PartnerCatalogEntry {
  id: string;
  lot_code: string;
  crop: string;
  variety: string;
  stage: string;
  quantity_available: number;
  unit: string;
  organization_id: string;
  production_date: string;
}

export interface QualityComparisonEntry {
  seedLotId: string;
  lotCode: string;
  organizationId: string;
  organizationName: string;
  crop: string;
  variety: string;
  quantityAvailable: number;
  purity: { averagePercent: number | null; testCount: number };
  viability: { averagePercent: number | null; testCount: number };
  germination: { averagePercent: number | null; testCount: number };
}

export async function fetchPartnerLinks(token: string, organizationId?: string): Promise<PartnerLink[]> {
  const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
  return request(`/partners/links${query}`, token);
}

export async function requestPartnerLink(token: string, requestingOrgId: string, partnerOrgId: string, notes?: string): Promise<PartnerLink> {
  return request('/partners/links', token, { method: 'POST', body: JSON.stringify({ requestingOrgId, partnerOrgId, notes }) });
}

export async function approvePartnerLink(token: string, linkId: string): Promise<PartnerLink> {
  return request(`/partners/links/${linkId}/approve`, token, { method: 'POST' });
}

export async function rejectPartnerLink(token: string, linkId: string): Promise<PartnerLink> {
  return request(`/partners/links/${linkId}/reject`, token, { method: 'POST' });
}

export async function suspendPartnerLink(token: string, linkId: string): Promise<PartnerLink> {
  return request(`/partners/links/${linkId}/suspend`, token, { method: 'POST' });
}

export async function reactivatePartnerLink(token: string, linkId: string): Promise<PartnerLink> {
  return request(`/partners/links/${linkId}/reactivate`, token, { method: 'POST' });
}

export async function fetchPartnerCatalog(token: string, partnerOrgId: string, crop?: string): Promise<PartnerCatalogEntry[]> {
  const query = crop ? `?crop=${encodeURIComponent(crop)}` : '';
  return request(`/partners/${partnerOrgId}/catalog${query}`, token);
}

export async function syncPartnerInventory(
  token: string,
  partnerOrgId: string,
  buyerOrgId: string,
): Promise<{ catalog: PartnerCatalogEntry[]; syncLog: PartnerInventorySyncLog }> {
  return request(`/partners/${partnerOrgId}/sync`, token, { method: 'POST', body: JSON.stringify({ buyerOrgId }) });
}

export async function fetchPartnerSyncHistory(token: string, partnerOrgId: string, buyerOrgId: string): Promise<PartnerInventorySyncLog[]> {
  return request(`/partners/${partnerOrgId}/sync-history?buyerOrgId=${encodeURIComponent(buyerOrgId)}`, token);
}

export async function fetchQualityComparison(token: string, crop: string, variety?: string): Promise<QualityComparisonEntry[]> {
  const params = new URLSearchParams({ crop });
  if (variety) params.set('variety', variety);
  return request(`/partners/quality-comparison?${params.toString()}`, token);
}

export async function fetchPartnerOrders(
  token: string,
  filters: { buyerOrgId?: string; partnerOrgId?: string; status?: string } = {},
): Promise<PartnerOrder[]> {
  const params = new URLSearchParams();
  if (filters.buyerOrgId) params.set('buyerOrgId', filters.buyerOrgId);
  if (filters.partnerOrgId) params.set('partnerOrgId', filters.partnerOrgId);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/partners/orders${query ? `?${query}` : ''}`, token);
}

export interface CreatePartnerOrderPayload {
  buyerOrgId: string;
  partnerOrgId: string;
  seedLotId: string;
  quantity: number;
  notes?: string;
}

export async function createPartnerOrder(token: string, payload: CreatePartnerOrderPayload): Promise<PartnerOrder> {
  return request('/partners/orders', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function confirmPartnerOrder(token: string, orderId: string): Promise<PartnerOrder> {
  return request(`/partners/orders/${orderId}/confirm`, token, { method: 'POST' });
}

export async function rejectPartnerOrder(token: string, orderId: string, reason: string): Promise<PartnerOrder> {
  return request(`/partners/orders/${orderId}/reject`, token, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function shipPartnerOrder(token: string, orderId: string): Promise<PartnerOrder> {
  return request(`/partners/orders/${orderId}/ship`, token, { method: 'POST' });
}

export async function receivePartnerOrder(
  token: string,
  orderId: string,
  input: { qualityRating: number; onTime: boolean; notes?: string },
): Promise<PartnerOrder> {
  return request(`/partners/orders/${orderId}/receive`, token, { method: 'POST', body: JSON.stringify(input) });
}

export async function disputePartnerOrder(token: string, orderId: string, reason: string): Promise<PartnerOrder> {
  return request(`/partners/orders/${orderId}/dispute`, token, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function cancelPartnerOrder(token: string, orderId: string): Promise<PartnerOrder> {
  return request(`/partners/orders/${orderId}/cancel`, token, { method: 'POST' });
}

export async function fetchPartnerRating(token: string, partnerOrgId: string, buyerOrgId: string): Promise<PartnerPerformanceRating | null> {
  return request(`/partners/${partnerOrgId}/rating?buyerOrgId=${encodeURIComponent(buyerOrgId)}`, token);
}

export async function fetchPartnerRatings(token: string, partnerOrgId: string): Promise<PartnerPerformanceRating[]> {
  return request(`/partners/${partnerOrgId}/ratings`, token);
}

// --- Government Registration & Subsidy Programs --------------------------

export const REGISTRATION_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'rejected'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export interface LotGovernmentRegistration {
  id: string;
  seed_lot_id: string;
  authority_org_id: string;
  status: RegistrationStatus;
  registration_number: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubsidyEligibilityCriteria {
  maxQuantityPerFarmer?: number;
  eligibleRegions?: string[];
}

export interface SubsidyProgram {
  id: string;
  name: string;
  authority_org_id: string;
  crop: string | null;
  min_stage: SeedLotStage | null;
  requires_government_registration: boolean;
  subsidy_amount_per_unit: number;
  unit: string;
  eligibility_criteria: SubsidyEligibilityCriteria;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const CLAIM_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'paid'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export interface SubsidyClaim {
  id: string;
  claim_number: string;
  program_id: string;
  farmer_id: string;
  seed_lot_id: string;
  quantity: number;
  claim_amount: number;
  status: ClaimStatus;
  submitted_by: string;
  decided_by: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const GOVERNMENT_REPORT_TYPES = ['production', 'distribution', 'quality'] as const;
export type GovernmentReportType = (typeof GOVERNMENT_REPORT_TYPES)[number];

export interface ProductionReportEntry {
  crop: string;
  variety: string;
  stage: string;
  lotCount: number;
  totalQuantity: number;
  unit: string;
}

export interface DistributionReportEntry {
  crop: string;
  variety: string;
  claimCount: number;
  farmerCount: number;
  totalQuantityClaimed: number;
  totalSubsidyAmount: number;
}

export interface QualityReportEntry {
  crop: string;
  variety: string;
  lotCount: number;
  germination: { averagePercent: number | null; testCount: number };
  purity: { averagePercent: number | null; testCount: number };
  viability: { averagePercent: number | null; testCount: number };
}

export interface GovernmentReport {
  id: string;
  report_type: GovernmentReportType;
  crop_year: number | null;
  snapshot: ProductionReportEntry[] | DistributionReportEntry[] | QualityReportEntry[];
  generated_by: string;
  generated_at: string;
}

export async function fetchLotRegistrations(token: string, seedLotId: string): Promise<LotGovernmentRegistration[]> {
  return request(`/government-programs/seed-lots/${seedLotId}/registrations`, token);
}

export async function fetchAllRegistrations(
  token: string,
  filters: { authorityOrgId?: string; status?: string } = {},
): Promise<LotGovernmentRegistration[]> {
  const params = new URLSearchParams();
  if (filters.authorityOrgId) params.set('authorityOrgId', filters.authorityOrgId);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/government-programs/registrations${query ? `?${query}` : ''}`, token);
}

export async function submitGovRegistration(token: string, seedLotId: string, authorityOrgId: string): Promise<LotGovernmentRegistration> {
  return request(`/government-programs/seed-lots/${seedLotId}/registrations`, token, {
    method: 'POST',
    body: JSON.stringify({ authorityOrgId }),
  });
}

export async function approveGovRegistration(token: string, registrationId: string): Promise<LotGovernmentRegistration> {
  return request(`/government-programs/registrations/${registrationId}/approve`, token, { method: 'POST' });
}

export async function rejectGovRegistration(token: string, registrationId: string, reason: string): Promise<LotGovernmentRegistration> {
  return request(`/government-programs/registrations/${registrationId}/reject`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export interface CreateSubsidyProgramPayload {
  name: string;
  authorityOrgId: string;
  crop?: string;
  minStage?: SeedLotStage;
  requiresGovernmentRegistration?: boolean;
  subsidyAmountPerUnit: number;
  unit?: string;
  eligibilityCriteria?: SubsidyEligibilityCriteria;
}

export async function fetchSubsidyPrograms(token: string, filters: { crop?: string; isActive?: boolean } = {}): Promise<SubsidyProgram[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  const query = params.toString();
  return request(`/government-programs/subsidy-programs${query ? `?${query}` : ''}`, token);
}

export async function createSubsidyProgram(token: string, payload: CreateSubsidyProgramPayload): Promise<SubsidyProgram> {
  return request('/government-programs/subsidy-programs', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function activateSubsidyProgram(token: string, programId: string): Promise<SubsidyProgram> {
  return request(`/government-programs/subsidy-programs/${programId}/activate`, token, { method: 'POST' });
}

export async function deactivateSubsidyProgram(token: string, programId: string): Promise<SubsidyProgram> {
  return request(`/government-programs/subsidy-programs/${programId}/deactivate`, token, { method: 'POST' });
}

export interface CreateSubsidyClaimPayload {
  programId: string;
  farmerId: string;
  seedLotId: string;
  quantity: number;
  notes?: string;
}

export async function fetchSubsidyClaims(
  token: string,
  filters: { farmerId?: string; programId?: string; status?: string } = {},
): Promise<SubsidyClaim[]> {
  const params = new URLSearchParams();
  if (filters.farmerId) params.set('farmerId', filters.farmerId);
  if (filters.programId) params.set('programId', filters.programId);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/government-programs/subsidy-claims${query ? `?${query}` : ''}`, token);
}

export async function submitSubsidyClaim(token: string, payload: CreateSubsidyClaimPayload): Promise<SubsidyClaim> {
  return request('/government-programs/subsidy-claims', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function approveSubsidyClaim(token: string, claimId: string): Promise<SubsidyClaim> {
  return request(`/government-programs/subsidy-claims/${claimId}/approve`, token, { method: 'POST' });
}

export async function rejectSubsidyClaim(token: string, claimId: string, reason: string): Promise<SubsidyClaim> {
  return request(`/government-programs/subsidy-claims/${claimId}/reject`, token, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function paySubsidyClaim(token: string, claimId: string, paymentReference: string): Promise<SubsidyClaim> {
  return request(`/government-programs/subsidy-claims/${claimId}/pay`, token, {
    method: 'POST',
    body: JSON.stringify({ paymentReference }),
  });
}

export async function generateGovReport(token: string, reportType: GovernmentReportType, cropYear?: number): Promise<GovernmentReport> {
  return request(`/government-programs/reports/${reportType}`, token, { method: 'POST', body: JSON.stringify({ cropYear }) });
}

export async function fetchGovReports(token: string, reportType?: GovernmentReportType): Promise<GovernmentReport[]> {
  const query = reportType ? `?reportType=${reportType}` : '';
  return request(`/government-programs/reports${query}`, token);
}

// --- Market Intelligence & Demand Forecasting -----------------------------
// No live external feed exists for any of this — staff record what an
// external bulletin/authority reported, and the forecast is a transparent,
// weighted score computed from those recordings plus this app's own
// adoption history, never a black-box prediction. See demandScoring.ts on
// the server for the full, inspectable formula.

export interface MarketPriceObservation {
  id: string;
  crop: string;
  variety: string | null;
  region: string | null;
  price_per_unit: number;
  unit: string;
  observed_date: string;
  source: string;
  recorded_by: string;
  created_at: string;
}

export interface MinistryDemandForecast {
  id: string;
  crop: string;
  variety: string | null;
  region: string | null;
  season: string;
  forecasted_demand_quantity: number;
  unit: string;
  issuing_authority: string;
  published_date: string;
  recorded_by: string;
  created_at: string;
}

export const WEATHER_OUTLOOK_VALUES = ['favorable', 'normal', 'adverse', 'severe'] as const;
export type WeatherOutlookValue = (typeof WEATHER_OUTLOOK_VALUES)[number];

export interface WeatherOutlookRecord {
  id: string;
  region: string;
  crop: string | null;
  season: string;
  outlook: WeatherOutlookValue;
  rainfall_deviation_percent: number | null;
  issuing_authority: string;
  recorded_by: string;
  created_at: string;
}

export interface CropInsuranceRecord {
  id: string;
  crop: string;
  variety: string | null;
  region: string | null;
  season: string;
  claims_count: number;
  total_claim_amount: number;
  total_insured_quantity: number | null;
  recorded_by: string;
  created_at: string;
}

export const RECOMMENDED_ACTIONS = ['increase_production', 'maintain', 'decrease_production'] as const;
export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

export interface SignalContribution {
  signal: string;
  weight: number;
  deviation: number;
}

export interface VarietyDemandForecast {
  id: string;
  crop: string;
  variety: string;
  season: string;
  demand_score: number;
  recommended_action: RecommendedAction;
  suggested_price_per_unit: number | null;
  unit: string;
  signals_breakdown: SignalContribution[];
  generated_by: string;
  generated_at: string;
}

export interface BreedingPriorityRecommendation {
  crop: string;
  variety: string;
  season: string;
  demandScore: number;
  recommendedAction: RecommendedAction;
  activeCropPlanCount: number;
  currentCertifiedSupply: number;
  priorityNote: string;
}

export async function fetchMarketPrices(token: string, filters: { crop?: string; variety?: string } = {}): Promise<MarketPriceObservation[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.variety) params.set('variety', filters.variety);
  const query = params.toString();
  return request(`/production/market-intelligence/prices${query ? `?${query}` : ''}`, token);
}

export interface RecordMarketPricePayload {
  crop: string;
  variety?: string;
  region?: string;
  pricePerUnit: number;
  unit?: string;
  observedDate: string;
  source: string;
}

export async function recordMarketPrice(token: string, payload: RecordMarketPricePayload): Promise<MarketPriceObservation> {
  return request('/production/market-intelligence/prices', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchMinistryForecasts(token: string, filters: { crop?: string; variety?: string } = {}): Promise<MinistryDemandForecast[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.variety) params.set('variety', filters.variety);
  const query = params.toString();
  return request(`/production/market-intelligence/ministry-forecasts${query ? `?${query}` : ''}`, token);
}

export interface RecordMinistryForecastPayload {
  crop: string;
  variety?: string;
  region?: string;
  season: string;
  forecastedDemandQuantity: number;
  unit?: string;
  issuingAuthority: string;
  publishedDate: string;
}

export async function recordMinistryForecast(token: string, payload: RecordMinistryForecastPayload): Promise<MinistryDemandForecast> {
  return request('/production/market-intelligence/ministry-forecasts', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchWeatherOutlooks(token: string, filters: { crop?: string; region?: string } = {}): Promise<WeatherOutlookRecord[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.region) params.set('region', filters.region);
  const query = params.toString();
  return request(`/production/market-intelligence/weather-outlooks${query ? `?${query}` : ''}`, token);
}

export interface RecordWeatherOutlookPayload {
  region: string;
  crop?: string;
  season: string;
  outlook: WeatherOutlookValue;
  rainfallDeviationPercent?: number;
  issuingAuthority: string;
}

export async function recordWeatherOutlook(token: string, payload: RecordWeatherOutlookPayload): Promise<WeatherOutlookRecord> {
  return request('/production/market-intelligence/weather-outlooks', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchCropInsuranceRecords(token: string, filters: { crop?: string; variety?: string } = {}): Promise<CropInsuranceRecord[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.variety) params.set('variety', filters.variety);
  const query = params.toString();
  return request(`/production/market-intelligence/insurance-records${query ? `?${query}` : ''}`, token);
}

export interface RecordCropInsurancePayload {
  crop: string;
  variety?: string;
  region?: string;
  season: string;
  claimsCount: number;
  totalClaimAmount: number;
  totalInsuredQuantity?: number;
}

export async function recordCropInsurance(token: string, payload: RecordCropInsurancePayload): Promise<CropInsuranceRecord> {
  return request('/production/market-intelligence/insurance-records', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function generateDemandForecast(token: string, crop: string, variety: string, season: string): Promise<VarietyDemandForecast> {
  return request('/production/market-intelligence/demand-forecasts', token, { method: 'POST', body: JSON.stringify({ crop, variety, season }) });
}

export async function fetchDemandForecasts(
  token: string,
  filters: { crop?: string; variety?: string; season?: string } = {},
): Promise<VarietyDemandForecast[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.variety) params.set('variety', filters.variety);
  if (filters.season) params.set('season', filters.season);
  const query = params.toString();
  return request(`/production/market-intelligence/demand-forecasts${query ? `?${query}` : ''}`, token);
}

export async function fetchLatestDemandForecasts(token: string, season: string): Promise<VarietyDemandForecast[]> {
  return request(`/production/market-intelligence/demand-forecasts/latest?season=${encodeURIComponent(season)}`, token);
}

export async function fetchBreedingPriorityRecommendations(token: string, season: string): Promise<BreedingPriorityRecommendation[]> {
  return request(`/production/market-intelligence/breeding-priority?season=${encodeURIComponent(season)}`, token);
}

// --- Breeding Program Analytics & Genetics Tracking -----------------------
// Most "genetic lineage" is already the existing parent_lot_id chain; this
// adds per-lot measured trait values (traits only existed at the variety
// level before), a real Pearson-correlation inheritance analysis over those
// measurements, a germplasm ranking, cycle-timeline and yield-based ROI
// reports, and an explainable hybrid-vigor prediction for a hypothetical
// cross — never a fabricated genomic claim, see hybridVigorPrediction.ts on
// the server for the documented heuristic.

export interface LotTraitMeasurement {
  id: string;
  seed_lot_id: string;
  trait_type: string;
  numeric_value: number | null;
  category_value: string | null;
  unit: string | null;
  measured_date: string;
  recorded_by: string;
  notes: string | null;
  created_at: string;
}

export interface RecordTraitMeasurementPayload {
  seedLotId: string;
  traitType: string;
  numericValue?: number;
  categoryValue?: string;
  unit?: string;
  measuredDate: string;
  notes?: string;
}

export interface LineageSummaryEntry {
  rootLotId: string;
  rootLotCode: string;
  crop: string;
  variety: string;
  descendantCount: number;
  foundationLotCount: number;
  certifiedLotCount: number;
  totalDescendantQuantity: number;
  unit: string;
}

export type CorrelationStrength = 'insufficient_data' | 'weak' | 'moderate' | 'strong';

export interface TraitInheritanceReport {
  traitType: string;
  correlation: number | null;
  sampleSize: number;
  strength: CorrelationStrength;
  pairs: { parentLotCode: string; childLotCode: string; parentValue: number; childValue: number }[];
}

export interface GermplasmSignalContribution {
  signal: string;
  weight: number;
  normalizedValue: number;
}

export interface GermplasmPoolRanking {
  rootLotId: string;
  rootLotCode: string;
  crop: string;
  variety: string;
  score: number;
  breakdown: GermplasmSignalContribution[];
}

export interface BreedingCycleTimelineEntry {
  rootLotId: string;
  rootLotCode: string;
  descendantLotId: string;
  descendantLotCode: string;
  descendantStage: string;
  daysFromRoot: number;
}

export interface BreedingProgramRoiEntry {
  rootLotId: string;
  rootLotCode: string;
  crop: string;
  variety: string;
  breederStageQuantity: number;
  foundationYieldAchieved: number;
  unit: string;
  yieldMultiplicationRoi: number | null;
}

export interface HybridVigorSignalContribution {
  signal: string;
  contributionPercent: number;
}

export interface HybridCrossPrediction {
  id: string;
  parent_a_lot_id: string;
  parent_b_lot_id: string;
  trait_type: string;
  mid_parent_value: number;
  same_lineage: boolean;
  predicted_heterosis_percent: number;
  predicted_vigor_score: number;
  signals_breakdown: HybridVigorSignalContribution[];
  predicted_by: string;
  predicted_at: string;
  actual_child_lot_id: string | null;
  actual_trait_value: number | null;
}

export async function recordTraitMeasurement(token: string, payload: RecordTraitMeasurementPayload): Promise<LotTraitMeasurement> {
  return request('/production/breeding-analytics/traits', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchTraitMeasurementsForLot(token: string, seedLotId: string): Promise<LotTraitMeasurement[]> {
  return request(`/production/breeding-analytics/seed-lots/${seedLotId}/traits`, token);
}

export async function fetchLineageSummary(token: string, rootLotIds?: string[]): Promise<LineageSummaryEntry[]> {
  const query = rootLotIds && rootLotIds.length > 0 ? `?rootLotIds=${rootLotIds.join(',')}` : '';
  return request(`/production/breeding-analytics/lineage-summary${query}`, token);
}

export async function fetchTraitInheritance(token: string, traitType: string): Promise<TraitInheritanceReport> {
  return request(`/production/breeding-analytics/trait-inheritance?traitType=${encodeURIComponent(traitType)}`, token);
}

export async function fetchGermplasmPoolRankings(token: string): Promise<GermplasmPoolRanking[]> {
  return request('/production/breeding-analytics/germplasm-rankings', token);
}

export async function fetchBreedingCycleTimelines(token: string, rootLotIds?: string[]): Promise<BreedingCycleTimelineEntry[]> {
  const query = rootLotIds && rootLotIds.length > 0 ? `?rootLotIds=${rootLotIds.join(',')}` : '';
  return request(`/production/breeding-analytics/cycle-timelines${query}`, token);
}

export async function fetchBreedingProgramRoi(token: string, rootLotIds?: string[]): Promise<BreedingProgramRoiEntry[]> {
  const query = rootLotIds && rootLotIds.length > 0 ? `?rootLotIds=${rootLotIds.join(',')}` : '';
  return request(`/production/breeding-analytics/program-roi${query}`, token);
}

export interface PredictHybridCrossPayload {
  parentALotId: string;
  parentBLotId: string;
  traitType: string;
}

export async function predictHybridCrossVigor(token: string, payload: PredictHybridCrossPayload): Promise<HybridCrossPrediction> {
  return request('/production/breeding-analytics/hybrid-predictions', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function recordActualCrossOutcome(
  token: string,
  predictionId: string,
  input: { actualChildLotId: string; actualTraitValue: number },
): Promise<HybridCrossPrediction> {
  return request(`/production/breeding-analytics/hybrid-predictions/${predictionId}/actual-outcome`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchHybridCrossPredictions(token: string, lotId?: string): Promise<HybridCrossPrediction[]> {
  const query = lotId ? `?lotId=${lotId}` : '';
  return request(`/production/breeding-analytics/hybrid-predictions${query}`, token);
}

// --- Climate-Smart Seed Selection Engine -----------------------------------
// No live weather/climate API or ML infrastructure exists in this app —
// staff record predicted conditions from whatever external forecast they've
// received, and "AI-powered scoring" is a transparent weighted formula (see
// climateResilienceScoring.ts on the server), not a black box. Recommendations
// wrap the EXISTING crop-planning wizard's farm/soil/history-aware engine
// rather than duplicating it, adding a climate-resilience layer on top.

export const RISK_LEVELS = ['low', 'moderate', 'high', 'severe'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const PRIMARY_RISK_FACTORS = ['drought', 'excess_rainfall', 'heat', 'cold', 'none'] as const;
export type PrimaryRiskFactor = (typeof PRIMARY_RISK_FACTORS)[number];

export interface ClimatePrediction {
  id: string;
  region: string;
  season: string;
  predicted_rainfall_mm: number | null;
  predicted_avg_temp_celsius: number | null;
  predicted_min_temp_celsius: number | null;
  predicted_max_temp_celsius: number | null;
  risk_level: RiskLevel;
  primary_risk_factor: PrimaryRiskFactor | null;
  source: string;
  recorded_by: string;
  created_at: string;
}

export interface RecordClimatePredictionPayload {
  region: string;
  season: string;
  predictedRainfallMm?: number;
  predictedAvgTempCelsius?: number;
  predictedMinTempCelsius?: number;
  predictedMaxTempCelsius?: number;
  riskLevel?: RiskLevel;
  primaryRiskFactor?: PrimaryRiskFactor;
  source: string;
}

export interface ClimateRiskAlert {
  id: string;
  climate_prediction_id: string;
  farm_id: string;
  farmer_id: string;
  crop: string;
  risk_level: RiskLevel;
  message: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export const OUTCOME_RATINGS = ['excellent', 'good', 'fair', 'poor'] as const;
export type OutcomeRating = (typeof OUTCOME_RATINGS)[number];

export interface AdaptationOutcome {
  id: string;
  farm_id: string;
  variety_id: string;
  climate_prediction_id: string | null;
  crop: string;
  season: string;
  actual_yield_per_acre: number | null;
  outcome_rating: OutcomeRating;
  notes: string | null;
  recorded_by: string;
  recorded_at: string;
}

export interface RecordAdaptationOutcomePayload {
  farmId: string;
  varietyId: string;
  climatePredictionId?: string;
  crop: string;
  season: string;
  actualYieldPerAcre?: number;
  outcomeRating: OutcomeRating;
  notes?: string;
}

export interface ClimateResilienceSignalContribution {
  signal: string;
  weight: number;
  value: number;
}

export interface ClimateSmartRecommendation {
  varietyId: string;
  varietyName: string;
  botanicalName: string;
  yieldBenchmarkPerAcre: number | null;
  yieldUnit: string;
  marketDemandTrend: string | null;
  baseScore: number;
  baseReasons: string[];
  climateResilienceScore: number | null;
  climateBreakdown: ClimateResilienceSignalContribution[];
  combinedScore: number;
}

export interface CropRotationSuggestion {
  crop: string;
  reason: string;
}

export async function recordClimatePrediction(token: string, payload: RecordClimatePredictionPayload): Promise<ClimatePrediction> {
  return request('/production/climate-smart/predictions', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchClimatePredictions(token: string, filters: { region?: string; season?: string } = {}): Promise<ClimatePrediction[]> {
  const params = new URLSearchParams();
  if (filters.region) params.set('region', filters.region);
  if (filters.season) params.set('season', filters.season);
  const query = params.toString();
  return request(`/production/climate-smart/predictions${query ? `?${query}` : ''}`, token);
}

export async function fetchClimateRiskAlerts(
  token: string,
  filters: { farmId?: string; farmerId?: string; acknowledged?: boolean } = {},
): Promise<ClimateRiskAlert[]> {
  const params = new URLSearchParams();
  if (filters.farmId) params.set('farmId', filters.farmId);
  if (filters.farmerId) params.set('farmerId', filters.farmerId);
  if (filters.acknowledged !== undefined) params.set('acknowledged', String(filters.acknowledged));
  const query = params.toString();
  return request(`/production/climate-smart/alerts${query ? `?${query}` : ''}`, token);
}

export async function acknowledgeClimateRiskAlert(token: string, alertId: string): Promise<ClimateRiskAlert> {
  return request(`/production/climate-smart/alerts/${alertId}/acknowledge`, token, { method: 'POST' });
}

export async function fetchClimateSmartRecommendations(token: string, farmerId: string, farmId: string, crop: string): Promise<ClimateSmartRecommendation[]> {
  return request(`/production/climate-smart/recommendations?farmerId=${farmerId}&farmId=${farmId}&crop=${encodeURIComponent(crop)}`, token);
}

export async function fetchCropRotationSuggestions(token: string, farmId: string): Promise<CropRotationSuggestion[]> {
  return request(`/production/climate-smart/farms/${farmId}/rotation-suggestions`, token);
}

export async function recordAdaptationOutcome(token: string, payload: RecordAdaptationOutcomePayload): Promise<AdaptationOutcome> {
  return request('/production/climate-smart/adaptation-outcomes', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchAdaptationOutcomes(token: string, filters: { farmId?: string; varietyId?: string } = {}): Promise<AdaptationOutcome[]> {
  const params = new URLSearchParams();
  if (filters.farmId) params.set('farmId', filters.farmId);
  if (filters.varietyId) params.set('varietyId', filters.varietyId);
  const query = params.toString();
  return request(`/production/climate-smart/adaptation-outcomes${query ? `?${query}` : ''}`, token);
}

export const SOIL_TYPES = ['loamy', 'clay', 'sandy', 'black', 'red', 'alluvial'] as const;
export type SoilType = (typeof SOIL_TYPES)[number];

export const IRRIGATION_TYPES = ['canal', 'borewell', 'rainfed', 'drip', 'sprinkler'] as const;
export type IrrigationType = (typeof IRRIGATION_TYPES)[number];

export const CROP_PLAN_STATUSES = ['draft', 'reserved', 'confirmed', 'cancelled'] as const;
export type CropPlanStatus = (typeof CROP_PLAN_STATUSES)[number];

export interface Farm {
  id: string;
  farmer_id: string;
  name: string;
  soil_type: SoilType;
  area_acres: number;
  irrigation_type: IrrigationType | null;
  created_at: string;
  updated_at: string;
}

export async function fetchFarms(token: string, farmerId?: string): Promise<Farm[]> {
  const query = farmerId ? `?farmerId=${farmerId}` : '';
  return request(`/production/crop-planning/farms${query}`, token);
}

export async function createFarm(
  token: string,
  payload: { farmerId: string; name: string; soilType: SoilType; areaAcres: number; irrigationType?: IrrigationType },
): Promise<Farm> {
  return request('/production/crop-planning/farms', token, { method: 'POST', body: JSON.stringify(payload) });
}

export interface CropPlanWithContext {
  id: string;
  farmer_id: string;
  farm_id: string;
  crop: string;
  variety_id: string;
  target_area_acres: number;
  calculated_seed_quantity: number;
  seed_unit: string;
  sowing_date: string | null;
  seed_lot_id: string | null;
  allocation_id: string | null;
  status: CropPlanStatus;
  farmer_name: string;
  farm_name: string;
  variety_name: string;
  lot_code: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Real crop plans (draft -> reserved -> confirmed/cancelled) — the "Production Targets" view reads this directly. */
export async function fetchCropPlans(
  token: string,
  filters: { farmerId?: string; status?: string } = {},
): Promise<CropPlanWithContext[]> {
  const params = new URLSearchParams();
  if (filters.farmerId) params.set('farmerId', filters.farmerId);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/production/crop-planning/plans${query ? `?${query}` : ''}`, token);
}

export async function fetchCropPlanById(token: string, id: string): Promise<CropPlanWithContext> {
  return request(`/production/crop-planning/plans/${id}`, token);
}

export interface CreateCropPlanDraftPayload {
  farmerId: string;
  farmId: string;
  crop: string;
  varietyId: string;
  targetAreaAcres: number;
  sowingDate?: string;
}

/** Step 1+2 of the Crop Planning Wizard: creates the draft (no inventory touched yet) once farmer/farm/crop/variety/area are set, computing the seed quantity requirement server-side. */
export async function createCropPlanDraft(token: string, payload: CreateCropPlanDraftPayload): Promise<CropPlanWithContext> {
  return request('/production/crop-planning/plans', token, { method: 'POST', body: JSON.stringify(payload) });
}

export interface SeedLotRecommendation {
  seedLotId: string;
  lotCode: string;
  productionDate: string;
  quantityAvailable: number;
  unit: string;
  isCertified: boolean;
  testingStatus: string;
  germinationPercent: number | null;
  storageZones: string[];
  score: number;
  reasons: string[];
}

/** The wizard's "Recommended Seed Lots" step — ranked candidates for a draft plan's exact crop/variety, by certified status, germination %, available quantity, and storage zone proximity. */
export async function fetchSeedLotRecommendations(token: string, cropPlanId: string): Promise<SeedLotRecommendation[]> {
  return request(`/production/crop-planning/plans/${cropPlanId}/seed-lot-recommendations`, token);
}

/** Reserves a specific seed lot (from the recommendations list) against a draft plan — an immediate, live allocation, not a soft hold. Omit seedLotId to fall back to the server's FIFO auto-pick. */
export async function reserveCropPlanSeedLot(token: string, cropPlanId: string, seedLotId?: string): Promise<CropPlanWithContext> {
  return request(`/production/crop-planning/plans/${cropPlanId}/reserve`, token, {
    method: 'POST',
    body: JSON.stringify(seedLotId ? { seedLotId } : {}),
  });
}

export async function confirmCropPlanBooking(token: string, cropPlanId: string): Promise<CropPlanWithContext> {
  return request(`/production/crop-planning/plans/${cropPlanId}/confirm`, token, { method: 'POST' });
}

export async function cancelCropPlan(token: string, cropPlanId: string, reason?: string): Promise<CropPlanWithContext> {
  return request(`/production/crop-planning/plans/${cropPlanId}/cancel`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// --- Supply Chain Financing & Credit Programs -----------------------------
// A real internal financial ledger/workflow (loan amounts, interest,
// repayment) — unlike most features this session, genuine monetary fields
// are appropriate here since the user explicitly asked for financing. This
// is still not a real payment gateway/bank integration — no money actually
// moves, the same honest scope subsidy claims already established.

export const FINANCING_TYPES = ['breeder_credit', 'farmer_microfinance', 'warehouse_receivables'] as const;
export type FinancingType = (typeof FINANCING_TYPES)[number];

export const FINANCING_STATUSES = ['requested', 'approved', 'rejected', 'disbursed', 'repaying', 'repaid', 'defaulted'] as const;
export type FinancingStatus = (typeof FINANCING_STATUSES)[number];

export interface FinancingAccount {
  id: string;
  financing_type: FinancingType;
  borrower_organization_id: string | null;
  borrower_farmer_id: string | null;
  seed_lot_id: string | null;
  allocation_id: string | null;
  principal_amount: number;
  annual_interest_rate_percent: number;
  receivable_amount: number | null;
  linked_insurance_crop: string | null;
  linked_insurance_season: string | null;
  status: FinancingStatus;
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  disbursed_at: string | null;
  amount_due: number | null;
  repayment_due_date: string | null;
  repaid_at: string | null;
  repaid_amount: number | null;
  payment_reference: string | null;
  defaulted_at: string | null;
  default_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestFinancingPayload {
  financingType: FinancingType;
  borrowerOrganizationId?: string;
  borrowerFarmerId?: string;
  seedLotId?: string;
  allocationId?: string;
  principalAmount: number;
  annualInterestRatePercent: number;
  receivableAmount?: number;
  linkedInsuranceCrop?: string;
  linkedInsuranceSeason?: string;
  notes?: string;
}

export interface FinancingCostSummary {
  seedLotId: string;
  financingCount: number;
  totalPrincipal: number;
  totalAccruedInterest: number;
  totalAmountDue: number;
}

export interface InsuranceContext {
  crop: string;
  season: string;
  claimsCount: number;
  totalClaimAmount: number;
  recordCount: number;
}

export async function requestFinancing(token: string, payload: RequestFinancingPayload): Promise<FinancingAccount> {
  return request('/financing/accounts', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchFinancingAccounts(
  token: string,
  filters: { financingType?: string; borrowerOrganizationId?: string; borrowerFarmerId?: string; seedLotId?: string; status?: string } = {},
): Promise<FinancingAccount[]> {
  const params = new URLSearchParams();
  if (filters.financingType) params.set('financingType', filters.financingType);
  if (filters.borrowerOrganizationId) params.set('borrowerOrganizationId', filters.borrowerOrganizationId);
  if (filters.borrowerFarmerId) params.set('borrowerFarmerId', filters.borrowerFarmerId);
  if (filters.seedLotId) params.set('seedLotId', filters.seedLotId);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/financing/accounts${query ? `?${query}` : ''}`, token);
}

export async function approveFinancing(token: string, id: string): Promise<FinancingAccount> {
  return request(`/financing/accounts/${id}/approve`, token, { method: 'POST' });
}

export async function rejectFinancing(token: string, id: string, reason: string): Promise<FinancingAccount> {
  return request(`/financing/accounts/${id}/reject`, token, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function disburseFinancing(token: string, id: string): Promise<FinancingAccount> {
  return request(`/financing/accounts/${id}/disburse`, token, { method: 'POST' });
}

export async function triggerPostHarvestRepayment(token: string, id: string): Promise<FinancingAccount> {
  return request(`/financing/accounts/${id}/trigger-repayment`, token, { method: 'POST' });
}

export async function recordFinancingRepayment(token: string, id: string, input: { repaidAmount: number; paymentReference: string }): Promise<FinancingAccount> {
  return request(`/financing/accounts/${id}/repay`, token, { method: 'POST', body: JSON.stringify(input) });
}

export async function markFinancingDefaulted(token: string, id: string, reason: string): Promise<FinancingAccount> {
  return request(`/financing/accounts/${id}/default`, token, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function fetchAccruedInterest(token: string, id: string): Promise<{ accruedInterest: number; asOf: string }> {
  return request(`/financing/accounts/${id}/accrued-interest`, token);
}

export async function fetchFinancingCostsForLot(token: string, seedLotId: string): Promise<FinancingCostSummary> {
  return request(`/financing/seed-lots/${seedLotId}/financing-costs`, token);
}

export async function fetchInsuranceContext(token: string, crop: string, season?: string): Promise<InsuranceContext | null> {
  const query = season ? `&season=${encodeURIComponent(season)}` : '';
  return request(`/financing/insurance-context?crop=${encodeURIComponent(crop)}${query}`, token);
}

// --- Farmer Education & Extension Resources -------------------------------
// "Video tutorials" store video URLs/metadata only (linking out to
// externally-hosted video), and "success stories" are always curated FROM a
// real performance-ratings row, not invented testimonials. All reads here
// are plain GETs, so the app's EXISTING offline cache-fallback mechanism
// (requestWithCacheFallback, already defined above) already makes this
// content offline-resilient with no new plumbing.

export const CONTENT_STATUSES = ['draft', 'published'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export interface CultivationGuide {
  id: string;
  crop: string;
  variety: string | null;
  title: string;
  content: string;
  stage: string | null;
  status: ContentStatus;
  author: string;
  created_at: string;
  updated_at: string;
}

export interface VideoTutorial {
  id: string;
  crop: string;
  variety: string | null;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  topic: string | null;
  status: ContentStatus;
  author: string;
  created_at: string;
}

export const DISEASE_SEVERITIES = ['low', 'moderate', 'high', 'severe'] as const;
export type DiseaseSeverity = (typeof DISEASE_SEVERITIES)[number];

export interface DiseaseGuide {
  id: string;
  crop: string;
  disease_name: string;
  symptoms: string;
  management_steps: string;
  severity: DiseaseSeverity | null;
  reference_image_url: string | null;
  status: ContentStatus;
  author: string;
  created_at: string;
}

export interface SuccessStory {
  id: string;
  performance_rating_id: string;
  crop: string;
  variety: string;
  headline: string;
  curated_summary: string;
  featured: boolean;
  curated_by: string;
  created_at: string;
}

export const QA_QUESTION_STATUSES = ['open', 'answered', 'closed'] as const;
export type QaQuestionStatus = (typeof QA_QUESTION_STATUSES)[number];

export interface QaAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  answered_by: string;
  expert_role: string;
  created_at: string;
}

export interface QaQuestion {
  id: string;
  crop: string | null;
  variety: string | null;
  farmer_id: string | null;
  question_text: string;
  asked_by: string;
  status: QaQuestionStatus;
  created_at: string;
}

export interface QaQuestionWithAnswers extends QaQuestion {
  answers: QaAnswer[];
}

export interface AgroAdvisory {
  idealSowingWindow: string;
  spacing: string;
  nutrients: string;
  suitableSoils: string[];
}

export interface AdvisoryBundle {
  crop: string;
  variety: string | null;
  agroAdvisory: AgroAdvisory;
  cultivationGuides: CultivationGuide[];
  videoTutorials: VideoTutorial[];
  diseaseGuides: DiseaseGuide[];
  successStories: SuccessStory[];
}

export async function fetchAdvisoryBundle(token: string, crop: string, variety?: string): Promise<AdvisoryBundle> {
  const query = variety ? `&variety=${encodeURIComponent(variety)}` : '';
  return request(`/farmer-education/advisory-bundle?crop=${encodeURIComponent(crop)}${query}`, token);
}

export async function fetchCultivationGuides(
  token: string,
  filters: { crop?: string; variety?: string; status?: string } = {},
): Promise<CultivationGuide[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.variety) params.set('variety', filters.variety);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/farmer-education/cultivation-guides${query ? `?${query}` : ''}`, token);
}

export async function createCultivationGuide(
  token: string,
  payload: { crop: string; variety?: string; title: string; content: string; stage?: string },
): Promise<CultivationGuide> {
  return request('/farmer-education/cultivation-guides', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function publishCultivationGuide(token: string, id: string): Promise<CultivationGuide> {
  return request(`/farmer-education/cultivation-guides/${id}/publish`, token, { method: 'POST' });
}

export async function fetchVideoTutorials(
  token: string,
  filters: { crop?: string; variety?: string; status?: string } = {},
): Promise<VideoTutorial[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.variety) params.set('variety', filters.variety);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/farmer-education/video-tutorials${query ? `?${query}` : ''}`, token);
}

export async function createVideoTutorial(
  token: string,
  payload: { crop: string; variety?: string; title: string; description?: string; videoUrl: string; thumbnailUrl?: string; durationSeconds?: number; topic?: string },
): Promise<VideoTutorial> {
  return request('/farmer-education/video-tutorials', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function publishVideoTutorial(token: string, id: string): Promise<VideoTutorial> {
  return request(`/farmer-education/video-tutorials/${id}/publish`, token, { method: 'POST' });
}

export async function fetchDiseaseGuides(token: string, filters: { crop?: string; status?: string } = {}): Promise<DiseaseGuide[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/farmer-education/disease-guides${query ? `?${query}` : ''}`, token);
}

export async function createDiseaseGuide(
  token: string,
  payload: { crop: string; diseaseName: string; symptoms: string; managementSteps: string; severity?: DiseaseSeverity; referenceImageUrl?: string },
): Promise<DiseaseGuide> {
  return request('/farmer-education/disease-guides', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function publishDiseaseGuide(token: string, id: string): Promise<DiseaseGuide> {
  return request(`/farmer-education/disease-guides/${id}/publish`, token, { method: 'POST' });
}

export async function fetchSuccessStories(
  token: string,
  filters: { crop?: string; variety?: string; featured?: boolean } = {},
): Promise<SuccessStory[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.variety) params.set('variety', filters.variety);
  if (filters.featured !== undefined) params.set('featured', String(filters.featured));
  const query = params.toString();
  return request(`/farmer-education/success-stories${query ? `?${query}` : ''}`, token);
}

export async function createSuccessStory(
  token: string,
  payload: { performanceRatingId: string; headline: string; curatedSummary: string; featured?: boolean },
): Promise<SuccessStory> {
  return request('/farmer-education/success-stories', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchQaQuestions(
  token: string,
  filters: { crop?: string; variety?: string; status?: string } = {},
): Promise<QaQuestion[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.variety) params.set('variety', filters.variety);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/farmer-education/questions${query ? `?${query}` : ''}`, token);
}

export async function fetchQaQuestion(token: string, id: string): Promise<QaQuestionWithAnswers> {
  return request(`/farmer-education/questions/${id}`, token);
}

export async function askQaQuestion(token: string, payload: { crop?: string; variety?: string; farmerId?: string; questionText: string }): Promise<QaQuestion> {
  return request('/farmer-education/questions', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function answerQaQuestion(token: string, questionId: string, answerText: string): Promise<QaQuestionWithAnswers> {
  return request(`/farmer-education/questions/${questionId}/answers`, token, { method: 'POST', body: JSON.stringify({ answerText }) });
}

export async function closeQaQuestion(token: string, questionId: string): Promise<QaQuestion> {
  return request(`/farmer-education/questions/${questionId}/close`, token, { method: 'POST' });
}

// --- Batch Operations for Seed Lots -------------------------------------
// Bulk create/edit/delete each process every item independently on the
// backend (partial success, not all-or-nothing) — a bad row never blocks
// the good ones. Batch allocation predicts in-batch conflicts before
// writing, then the real allocate() call still re-checks under a row lock
// for anything the prediction approved.

export interface CreateSeedLotPayload {
  lotCode: string;
  crop: string;
  variety: string;
  parentLotId?: string | null;
  stage?: string;
  quantityTotal: number;
  unit?: string;
  sourceFarmId?: string;
  notes?: string;
  lowStockThreshold?: number;
  productionDate?: string;
  organizationId?: string | null;
}

export interface UpdateSeedLotPayload {
  variety?: string;
  quantityTotal?: number;
  unit?: string;
  status?: string;
  sourceFarmId?: string;
  notes?: string;
  lowStockThreshold?: number;
  availableForPartnerOrder?: boolean;
  storageZone?: string;
  approvedForSale?: boolean;
}

export interface BatchItemResult<T> {
  index: number;
  status: 'created' | 'updated' | 'deleted' | 'failed';
  data?: T;
  error?: string;
}

export interface BatchResult<T> {
  total: number;
  succeeded: number;
  failed: number;
  results: BatchItemResult<T>[];
}

export interface CsvImportItemResult extends BatchItemResult<RealtimeSeedLot> {
  rowNumber: number;
}

export interface CsvImportResult {
  total: number;
  succeeded: number;
  failed: number;
  results: CsvImportItemResult[];
}

export async function bulkCreateSeedLots(token: string, items: CreateSeedLotPayload[]): Promise<BatchResult<RealtimeSeedLot>> {
  return request('/production/seed-lots/bulk-create', token, { method: 'POST', body: JSON.stringify({ items }) });
}

export async function bulkUpdateSeedLots(
  token: string,
  items: { id: string; updates: UpdateSeedLotPayload }[],
): Promise<BatchResult<RealtimeSeedLot>> {
  return request('/production/seed-lots/bulk-update', token, { method: 'POST', body: JSON.stringify({ items }) });
}

export async function bulkDeleteSeedLots(token: string, ids: string[]): Promise<BatchResult<{ id: string }>> {
  return request('/production/seed-lots/bulk-delete', token, { method: 'POST', body: JSON.stringify({ ids }) });
}

export async function importSeedLotsFromCsv(token: string, csvText: string): Promise<CsvImportResult> {
  return request('/production/seed-lots/bulk-import-csv', token, { method: 'POST', body: JSON.stringify({ csvText }) });
}

// --- Batch "quick actions" (Batch Operations for Seed Lots) ------------

export type QuickActionType = 'move_zone' | 'approve_for_sale' | 'mark_expired';

export interface QuickActionItemResult {
  index: number;
  seedLotId: string;
  status: 'succeeded' | 'failed';
  lotCode?: string;
  error?: string;
}

export interface QuickActionResult {
  total: number;
  succeeded: number;
  failed: number;
  results: QuickActionItemResult[];
}

export async function bulkQuickAction(
  token: string,
  action: QuickActionType,
  ids: string[],
  options: { zone?: string; actionId?: string } = {},
): Promise<QuickActionResult> {
  return request('/production/seed-lots/bulk-quick-action', token, {
    method: 'POST',
    body: JSON.stringify({ action, ids, zone: options.zone, actionId: options.actionId }),
  });
}

export interface PrintLabelItemResult {
  index: number;
  seedLotId: string;
  status: 'succeeded' | 'failed';
  lotCode?: string;
  crop?: string;
  variety?: string;
  error?: string;
}

export interface PrintLabelResult {
  total: number;
  succeeded: number;
  failed: number;
  results: PrintLabelItemResult[];
}

export async function bulkPrintLabels(token: string, ids: string[], actionId?: string): Promise<PrintLabelResult> {
  return request('/production/seed-lots/bulk-print-labels', token, {
    method: 'POST',
    body: JSON.stringify({ ids, actionId }),
  });
}

export interface BatchAllocationRequestPayload {
  seedLotId: string;
  quantity: number;
  allocatedTo: string;
  cropPlanId?: string;
  notes?: string;
}

export interface BatchAllocationItemResult {
  index: number;
  seedLotId: string;
  status: 'allocated' | 'skipped' | 'failed';
  allocation?: RealtimeAllocation;
  seedLot?: RealtimeSeedLot;
  reason?: string;
  error?: string;
}

export interface BatchAllocationResult {
  total: number;
  allocated: number;
  skipped: number;
  failed: number;
  results: BatchAllocationItemResult[];
}

export async function batchAllocateSeedLots(
  token: string,
  requests: BatchAllocationRequestPayload[],
): Promise<BatchAllocationResult> {
  return request('/production/allocations/bulk-allocate', token, { method: 'POST', body: JSON.stringify({ requests }) });
}

// --- Master Data: Crop Varieties (simple draft -> reviewed -> approved) ---
// A separate, lighter-weight catalog than the Variety/VarietyVersion/
// VarietyCommitteeReview breeding-committee model above — this backs the
// Master Data > Varieties screen, which just needs a 3-status approval
// workflow gated to Admin for the final sign-off, not seasonal versions or
// peer committee review.

export interface CropRow {
  id: string;
  name: string;
  category: string;
  season: string;
  active: boolean;
}

export async function fetchCrops(token: string, filters: { active?: boolean } = {}): Promise<CropRow[]> {
  const query = filters.active !== undefined ? `?active=${filters.active}` : '';
  return request(`/crops${query}`, token);
}

export async function fetchCropById(token: string, id: string): Promise<CropRow> {
  return request(`/crops/${id}`, token);
}

export interface CreateCropPayload {
  name: string;
  category: string;
  season: string;
  active?: boolean;
}

export interface UpdateCropPayload {
  name?: string;
  category?: string;
  season?: string;
  active?: boolean;
}

export async function createCrop(token: string, payload: CreateCropPayload): Promise<CropRow> {
  return request('/crops', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCrop(token: string, id: string, payload: UpdateCropPayload): Promise<CropRow> {
  return request(`/crops/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteCrop(token: string, id: string): Promise<{ deleted: boolean }> {
  return request(`/crops/${id}`, token, { method: 'DELETE' });
}

export type CropVarietyStatus = 'draft' | 'reviewed' | 'approved';

// Display-only mirror of server/src/modules/cropVarieties/cropVarieties.types.ts
// CROP_VARIETY_APPROVER_ROLES — the server is the source of truth for who may
// actually approve/reject.
export const CROP_VARIETY_APPROVER_ROLES = ['Admin'];

export interface CropVariety {
  id: string;
  name: string;
  crop: string;
  description: string | null;
  category: string | null;
  breeder_organization_id: string | null;
  status: CropVarietyStatus;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCropVarietyPayload {
  name: string;
  crop: string;
  description?: string;
  category?: string;
  breederOrganizationId?: string | null;
}

export interface UpdateCropVarietyPayload {
  name?: string;
  crop?: string;
  description?: string;
  category?: string;
  breederOrganizationId?: string | null;
}

export async function fetchCropVarieties(
  token: string,
  filters: { crop?: string; status?: string } = {},
): Promise<CropVariety[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/crop-varieties${query ? `?${query}` : ''}`, token);
}

export async function fetchCropVarietyById(token: string, id: string): Promise<CropVariety> {
  return request(`/crop-varieties/${id}`, token);
}

export async function createCropVariety(token: string, payload: CreateCropVarietyPayload): Promise<CropVariety> {
  return request('/crop-varieties', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCropVariety(
  token: string,
  id: string,
  payload: UpdateCropVarietyPayload,
): Promise<CropVariety> {
  return request(`/crop-varieties/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function submitCropVarietyForReview(token: string, id: string): Promise<CropVariety> {
  return request(`/crop-varieties/${id}/submit-for-review`, token, { method: 'POST' });
}

export async function approveCropVariety(token: string, id: string): Promise<CropVariety> {
  return request(`/crop-varieties/${id}/approve`, token, { method: 'POST' });
}

export async function rejectCropVariety(token: string, id: string, reason: string): Promise<CropVariety> {
  return request(`/crop-varieties/${id}/reject`, token, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function deleteCropVariety(token: string, id: string): Promise<{ deleted: boolean }> {
  return request(`/crop-varieties/${id}`, token, { method: 'DELETE' });
}

// --- Master Data: Reconciliation ---
// A read-only data-integrity scan across the master-data catalogs (farmers,
// labs, crops/varieties) — surfaces the same rules enforced on create/edit
// (farmer email, lab certification type) plus the crop/variety
// relationship the Reconcile button is what actually detects (see
// server/src/modules/reconciliation/reconciliation.service.ts).

export type ReconciliationSeverity = 'error' | 'warning';

export interface ReconciliationIssue {
  entityType: 'farmer' | 'organization' | 'crop';
  entityId: string;
  entityName: string;
  rule: string;
  message: string;
  severity: ReconciliationSeverity;
}

export interface ReconciliationReport {
  generatedAt: string;
  totalChecked: number;
  issueCount: number;
  issues: ReconciliationIssue[];
}

export async function runReconciliation(token: string): Promise<ReconciliationReport> {
  return request('/master-data/reconcile', token, { method: 'POST' });
}

// --- Administration ------------------------------------------------------
// Backs the Administration module (/admin/*). Two things live here that
// nothing else in the app could reach before:
//
//   1. The audit trail. GET /audit-logs has existed on the server since the
//      first phase but had no client wrapper at all, so the audit_logs table
//      was write-only from the front end's point of view.
//   2. User administration. /users is new (see
//      server/src/modules/users/users.routes.ts) — the platform had
//      authentication but no way to list accounts or change a role.
//
// Everything else the Administration module shows (system health, data
// governance, privacy/retention, workflows, organizations) deliberately
// reuses the wrappers already defined above rather than duplicating them,
// because those are the SAME records the Production module surfaces — Admin
// is a different audience for one source of truth, not a second copy of it.

export interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  before_state: unknown | null;
  after_state: unknown | null;
  metadata: unknown | null;
  created_at: string;
}

export async function fetchAuditLogs(
  token: string,
  filters: { entityType?: string; entityId?: string; limit?: number; offset?: number } = {},
): Promise<AuditLogRow[]> {
  const params = new URLSearchParams();
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.entityId) params.set('entityId', filters.entityId);
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  const query = params.toString();
  return request(`/audit-logs${query ? `?${query}` : ''}`, token);
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  organization_id: string | null;
  organization_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_action_at: string | null;
  action_count: number;
}

export interface AdminUserStats {
  total: number;
  active: number;
  inactive: number;
  withoutOrganization: number;
  byRole: { role: string; count: number }[];
}

export interface BackendRoleInfo {
  role: string;
  requiresOrganization: boolean;
}

export interface CreateAdminUserPayload {
  email: string;
  name: string;
  password: string;
  role: string;
  organizationId?: string | null;
}

export interface UpdateAdminUserPayload {
  name?: string;
  role?: string;
  organizationId?: string | null;
  isActive?: boolean;
}

export async function fetchAdminUsers(
  token: string,
  filters: { role?: string; organizationId?: string; isActive?: boolean; q?: string } = {},
): Promise<AdminUserRow[]> {
  const params = new URLSearchParams();
  if (filters.role) params.set('role', filters.role);
  if (filters.organizationId) params.set('organizationId', filters.organizationId);
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters.q) params.set('q', filters.q);
  const query = params.toString();
  return request(`/users${query ? `?${query}` : ''}`, token);
}

export async function fetchAdminUserStats(token: string): Promise<AdminUserStats> {
  return request('/users/stats', token);
}

export async function fetchBackendRoles(token: string): Promise<BackendRoleInfo[]> {
  return request('/users/roles', token);
}

export async function createAdminUser(token: string, payload: CreateAdminUserPayload): Promise<AdminUserRow> {
  return request('/users', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAdminUser(
  token: string,
  id: string,
  payload: UpdateAdminUserPayload,
): Promise<AdminUserRow> {
  return request(`/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function resetAdminUserPassword(token: string, id: string, password: string): Promise<void> {
  await request(`/users/${id}/reset-password`, token, { method: 'POST', body: JSON.stringify({ password }) });
}

// ---------------------------------------------------------------------------
// Quality (SOP register, non-conformances, CAPA, complaints, lot holds)
// Mirrors server/src/modules/quality. Every mutation returns the updated row.
// ---------------------------------------------------------------------------

export type QualityDepartment =
  | 'procurement'
  | 'production'
  | 'rd'
  | 'laboratory'
  | 'warehouse'
  | 'logistics'
  | 'operations'
  | 'quality'
  | 'hr_training';
export type QualitySeverity = 'minor' | 'major' | 'critical';

export const QUALITY_DEPARTMENTS: { value: QualityDepartment; label: string }[] = [
  { value: 'procurement', label: 'Procurement' },
  { value: 'production', label: 'Production' },
  { value: 'rd', label: 'R&D' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'operations', label: 'Operations' },
  { value: 'quality', label: 'Quality' },
  { value: 'hr_training', label: 'HR & Training' },
];

export function qualityDepartmentLabel(value: string): string {
  return QUALITY_DEPARTMENTS.find((d) => d.value === value)?.label ?? value;
}

export interface QualityDashboardData {
  generatedAt: string;
  nonConformances: {
    open_total: number;
    open_critical: number;
    open_major: number;
    open_minor: number;
    overdue: number;
    closed_last_30d: number;
    avg_days_to_close: number | null;
  };
  capas: {
    open_total: number;
    overdue: number;
    awaiting_verification: number;
    closed_last_30d: number;
    failed_verification: number;
    closed_total: number;
  };
  complaints: {
    open_total: number;
    open_critical: number;
    recall_recommended: number;
    received_last_30d: number;
    avg_days_to_resolve_90d: number | null;
  };
  sops: {
    effective: number;
    draft: number;
    in_review: number;
    reviewOverdue: number;
    reviewDueSoon: number;
    departmentCoverage: { department: QualityDepartment; effectiveSops: number; covered: boolean }[];
    departmentsCovered: number;
    departmentsTotal: number;
    coveragePercent: number;
  };
  holds: { active: number };
}

export type SopVersionStatus = 'draft' | 'in_review' | 'effective' | 'superseded' | 'rejected';
export type SopReviewStatus = 'current' | 'due_soon' | 'overdue' | 'not_effective';

export interface SopListItem {
  id: string;
  sop_code: string;
  title: string;
  department: QualityDepartment;
  owner_email: string;
  review_interval_months: number;
  effective_version: number | null;
  effective_date: string | null;
  next_review_date: string | null;
  approved_by: string | null;
  open_version: number | null;
  open_version_status: 'draft' | 'in_review' | null;
  review_status: SopReviewStatus;
  acknowledgement_count: number;
}

export interface SopVersion {
  id: string;
  sop_id: string;
  version_number: number;
  title: string;
  content: string;
  change_summary: string;
  status: SopVersionStatus;
  created_by: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  effective_date: string | null;
  next_review_date: string | null;
  acknowledgement_count: number;
}

export interface SopDetail {
  document: { id: string; sop_code: string; title: string; department: QualityDepartment; owner_email: string; review_interval_months: number };
  versions: SopVersion[];
  acknowledgements: { sop_version_id: string; user_email: string; acknowledged_at: string }[];
  acknowledgedByMe: boolean;
}

export interface PendingSopAcknowledgement {
  id: string;
  sop_code: string;
  title: string;
  department: QualityDepartment;
  version_number: number;
  effective_date: string;
}

export type NcrStatus = 'open' | 'investigating' | 'closed' | 'cancelled';

export interface NcrListItem {
  id: string;
  ncr_code: string;
  title: string;
  description: string;
  department: QualityDepartment;
  source: string;
  severity: QualitySeverity;
  seed_lot_id: string | null;
  lot_code: string | null;
  status: NcrStatus;
  raised_by: string;
  assigned_to: string | null;
  due_date: string | null;
  root_cause: string | null;
  closure_notes: string | null;
  closed_by: string | null;
  closed_at: string | null;
  complaint_id: string | null;
  is_overdue: boolean;
  capa_count: number;
  open_capa_count: number;
  created_at: string;
}

export type CapaStatus = 'open' | 'in_progress' | 'implemented' | 'closed' | 'cancelled';

export interface CapaItem {
  id: string;
  capa_code: string;
  ncr_id: string | null;
  ncr_code: string | null;
  complaint_id: string | null;
  complaint_code: string | null;
  action_type: 'corrective' | 'preventive';
  title: string;
  description: string;
  owner_email: string;
  due_date: string;
  status: CapaStatus;
  implementation_notes: string | null;
  implemented_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  effectiveness_result: 'effective' | 'ineffective' | null;
  effectiveness_notes: string | null;
  verification_count: number;
  is_overdue: boolean;
  created_by: string;
  created_at: string;
}

export interface NcrDetail extends Omit<NcrListItem, 'capa_count' | 'open_capa_count'> {
  capas: CapaItem[];
  complaint: { id: string; complaint_code: string; title: string; severity: QualitySeverity; status: string } | null;
  holds: LotHold[];
}

export type ComplaintStatus = 'received' | 'investigating' | 'resolved' | 'closed';

export interface ComplaintItem {
  id: string;
  complaint_code: string;
  source: string;
  complainant_name: string;
  complainant_contact: string | null;
  seed_lot_id: string | null;
  lot_code: string | null;
  ncr_id: string | null;
  ncr_code: string | null;
  title: string;
  description: string;
  severity: QualitySeverity;
  status: ComplaintStatus;
  received_date: string;
  assigned_to: string | null;
  root_cause: string | null;
  resolution: string | null;
  recall_recommended: boolean;
  resolved_at: string | null;
  closed_at: string | null;
  age_days: number;
}

export interface ComplaintDetail extends ComplaintItem {
  crop?: string | null;
  variety?: string | null;
  ncr: { id: string; ncr_code: string; title: string; severity: QualitySeverity; status: string } | null;
  capas: CapaItem[];
}

export interface LotHold {
  id: string;
  seed_lot_id: string;
  lot_code?: string;
  crop?: string;
  variety?: string;
  reason: string;
  source_type: 'ncr' | 'complaint' | 'manual';
  source_id: string | null;
  placed_by: string;
  placed_at: string;
  released_by: string | null;
  released_at: string | null;
  release_notes: string | null;
}

export interface LotImpact {
  lot: { id: string; lot_code: string; crop: string; variety: string; stage: string; status: string; testing_status: string; quantity_total: number; quantity_allocated: number; unit: string };
  packagingBatches: {
    id: string;
    batch_code: string;
    unit_count: number;
    unit_size: number;
    unit_of_measure: string;
    total_quantity: number;
    status: string;
    units_packaged: number;
    units_distributed: number;
    units_sold: number;
    units_damaged: number;
  }[];
  allocations: { id: string; allocated_to: string; quantity: number; status: string; created_at: string }[];
  holds: LotHold[];
  nonConformances: { id: string; ncr_code: string; title: string; severity: QualitySeverity; status: string }[];
  complaints: { id: string; complaint_code: string; title: string; severity: QualitySeverity; status: string; recall_recommended: boolean }[];
  summary: {
    activeHold: boolean;
    packagingBatchCount: number;
    unitsPackaged: number;
    unitsDistributed: number;
    unitsSold: number;
    unitsInField: number;
    activeAllocationCount: number;
    recipients: string[];
    recallRecommended: boolean;
  };
}

/**
 * When the backend is unreachable, request() queues writes and returns an
 * optimistic echo with a `demo-` id. For a compliance record that must never
 * be presented as "saved" — callers use this to say it is queued instead.
 */
export function wasQueuedOffline(result: unknown): boolean {
  const id = (result as { id?: unknown } | null)?.id;
  return typeof id === 'string' && id.startsWith('demo-');
}

const post = <T>(path: string, token: string, body: object = {}): Promise<T> =>
  request<T>(path, token, { method: 'POST', body: JSON.stringify(body) });

const qs = (params: Record<string, string | boolean | undefined>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const fetchQualityDashboard = (token: string) => request<QualityDashboardData>('/quality/dashboard', token);

// SOPs
export const fetchSops = (token: string, filters: { department?: string; reviewStatus?: string } = {}) =>
  request<SopListItem[]>(`/quality/sops${qs(filters)}`, token);
export const fetchSopById = (token: string, id: string) => request<SopDetail>(`/quality/sops/${id}`, token);
export const fetchPendingSopAcknowledgements = (token: string) =>
  request<PendingSopAcknowledgement[]>('/quality/sops/pending-acknowledgement', token);
export interface CreateSopPayload {
  title: string;
  department: QualityDepartment;
  ownerEmail: string;
  content: string;
  reviewIntervalMonths?: number;
}
export const createSop = (token: string, payload: CreateSopPayload) => post<{ document: { id: string; sop_code: string } }>('/quality/sops', token, payload);
export const reviseSop = (token: string, id: string, payload: { title?: string; content: string; changeSummary: string }) =>
  post<SopVersion>(`/quality/sops/${id}/revise`, token, payload);
export const updateSopDraft = (token: string, id: string, payload: { title?: string; content?: string; changeSummary?: string }) =>
  request<SopVersion>(`/quality/sops/${id}/draft`, token, { method: 'PATCH', body: JSON.stringify(payload) });
export const submitSopForReview = (token: string, id: string) => post<SopVersion>(`/quality/sops/${id}/submit`, token);
export const approveSop = (token: string, id: string) => post<SopVersion>(`/quality/sops/${id}/approve`, token);
export const rejectSop = (token: string, id: string, reason: string) => post<SopVersion>(`/quality/sops/${id}/reject`, token, { reason });
export const retireSop = (token: string, id: string, reason: string) => post<SopVersion>(`/quality/sops/${id}/retire`, token, { reason });
export const acknowledgeSop = (token: string, id: string) => post<{ alreadyAcknowledged: boolean }>(`/quality/sops/${id}/acknowledge`, token);

// NCRs
export const fetchNcrs = (token: string, filters: { status?: string; severity?: string; department?: string; seedLotId?: string; overdue?: boolean } = {}) =>
  request<NcrListItem[]>(`/quality/ncrs${qs(filters)}`, token);
export const fetchNcrById = (token: string, id: string) => request<NcrDetail>(`/quality/ncrs/${id}`, token);
export interface RaiseNcrPayload {
  title: string;
  description: string;
  department: QualityDepartment;
  source: string;
  severity: QualitySeverity;
  seedLotId?: string;
  assignedTo?: string;
  dueDate?: string;
}
export const raiseNcr = (token: string, payload: RaiseNcrPayload) =>
  post<{ ncr: NcrListItem; holdPlaced: boolean }>('/quality/ncrs', token, payload);
export const updateNcr = (token: string, id: string, payload: { assignedTo?: string | null; dueDate?: string | null; rootCause?: string | null; startInvestigation?: boolean }) =>
  request<NcrListItem>(`/quality/ncrs/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) });
export const closeNcr = (token: string, id: string, payload: { closureNotes: string; rootCause?: string }) => post<NcrListItem>(`/quality/ncrs/${id}/close`, token, payload);
export const cancelNcr = (token: string, id: string, reason: string) => post<NcrListItem>(`/quality/ncrs/${id}/cancel`, token, { reason });

// CAPAs
export const fetchCapas = (token: string, filters: { status?: string; ncrId?: string; complaintId?: string; owner?: string; overdue?: boolean } = {}) =>
  request<CapaItem[]>(`/quality/capas${qs(filters)}`, token);
export interface CreateCapaPayload {
  actionType: 'corrective' | 'preventive';
  title: string;
  description: string;
  ownerEmail: string;
  dueDate: string;
  ncrId?: string;
  complaintId?: string;
}
export const createCapa = (token: string, payload: CreateCapaPayload) => post<CapaItem>('/quality/capas', token, payload);
export const startCapa = (token: string, id: string) => post<CapaItem>(`/quality/capas/${id}/start`, token);
export const implementCapa = (token: string, id: string, implementationNotes: string) => post<CapaItem>(`/quality/capas/${id}/implement`, token, { implementationNotes });
export const verifyCapa = (token: string, id: string, result: 'effective' | 'ineffective', effectivenessNotes: string) =>
  post<CapaItem>(`/quality/capas/${id}/verify`, token, { result, effectivenessNotes });
export const cancelCapa = (token: string, id: string, reason: string) => post<CapaItem>(`/quality/capas/${id}/cancel`, token, { reason });

// Complaints
export const fetchComplaints = (token: string, filters: { status?: string; severity?: string; seedLotId?: string } = {}) =>
  request<ComplaintItem[]>(`/quality/complaints${qs(filters)}`, token);
export const fetchComplaintById = (token: string, id: string) => request<ComplaintDetail>(`/quality/complaints/${id}`, token);
export interface LogComplaintPayload {
  source: 'farmer' | 'dealer' | 'distributor' | 'internal' | 'other';
  complainantName: string;
  complainantContact?: string;
  seedLotId?: string;
  title: string;
  description: string;
  severity: QualitySeverity;
  receivedDate?: string;
}
export const logComplaint = (token: string, payload: LogComplaintPayload) =>
  post<{ complaint: ComplaintItem; ncr: NcrListItem | null; hold: LotHold | null }>('/quality/complaints', token, payload);
export const investigateComplaint = (token: string, id: string, payload: { assignedTo?: string; recallRecommended?: boolean } = {}) =>
  post<ComplaintItem>(`/quality/complaints/${id}/investigate`, token, payload);
export const resolveComplaint = (token: string, id: string, payload: { rootCause: string; resolution: string; recallRecommended?: boolean }) =>
  post<ComplaintItem>(`/quality/complaints/${id}/resolve`, token, payload);
export const closeComplaint = (token: string, id: string) => post<ComplaintItem>(`/quality/complaints/${id}/close`, token);

// Lot holds
export const fetchLotHolds = (token: string, filters: { active?: boolean; seedLotId?: string } = {}) => request<LotHold[]>(`/quality/holds${qs(filters)}`, token);
export const placeLotHold = (token: string, seedLotId: string, reason: string) => post<LotHold>('/quality/holds', token, { seedLotId, reason });
export const releaseLotHold = (token: string, id: string, releaseNotes: string) => post<LotHold>(`/quality/holds/${id}/release`, token, { releaseNotes });
export const fetchLotImpact = (token: string, seedLotId: string) => request<LotImpact>(`/quality/lots/${seedLotId}/impact`, token);


// Compliance register (regulatory requirements, gap assessment, evidence)
export type RequirementStatus = 'not_assessed' | 'compliant' | 'partially_compliant' | 'non_compliant' | 'not_applicable';
export type RequirementRisk = 'low' | 'medium' | 'high' | 'critical';
export type RequirementCategory =
  | 'licensing'
  | 'certification'
  | 'labelling_packaging'
  | 'record_keeping'
  | 'quality_testing'
  | 'storage_handling'
  | 'dealer_sales'
  | 'customer_export'
  | 'other';

export const REQUIREMENT_CATEGORIES: { value: RequirementCategory; label: string }[] = [
  { value: 'licensing', label: 'Licensing' },
  { value: 'certification', label: 'Certification' },
  { value: 'labelling_packaging', label: 'Labelling & packaging' },
  { value: 'record_keeping', label: 'Record keeping & traceability' },
  { value: 'quality_testing', label: 'Quality testing' },
  { value: 'storage_handling', label: 'Storage & handling' },
  { value: 'dealer_sales', label: 'Dealers & sales' },
  { value: 'customer_export', label: 'Customer & export' },
  { value: 'other', label: 'Other' },
];

export const requirementCategoryLabel = (value: string): string =>
  REQUIREMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export interface RequirementItem {
  id: string;
  req_code: string;
  regulation: string;
  reference: string | null;
  title: string;
  description: string;
  category: RequirementCategory;
  department: QualityDepartment;
  status: RequirementStatus;
  current_status: string | null;
  gap: string | null;
  risk: RequirementRisk | null;
  corrective_action: string | null;
  responsible_email: string | null;
  target_date: string | null;
  sop_id: string | null;
  sop_code: string | null;
  ncr_id: string | null;
  ncr_code: string | null;
  ncr_status: string | null;
  assessed_by: string | null;
  assessed_at: string | null;
  next_review_date: string | null;
  evidence_count: number;
  is_overdue: boolean;
  review_overdue: boolean;
}

export interface RequirementEvidence {
  id: string;
  title: string;
  reference: string | null;
  description: string | null;
  added_by: string;
  added_at: string;
}

export interface RequirementDetail {
  requirement: RequirementItem;
  evidence: RequirementEvidence[];
  capas: { id: string; capa_code: string; title: string; action_type: string; status: string; owner_email: string; due_date: string }[];
}

export interface ComplianceDashboardData {
  totals: {
    total: number;
    not_assessed: number;
    compliant: number;
    partially_compliant: number;
    non_compliant: number;
    not_applicable: number;
    overdue_gaps: number;
    gaps_without_ncr: number;
    reviews_overdue: number;
  };
  assessedOfApplicable: { assessed: number; applicable: number };
  byCategory: { category: RequirementCategory; total: number; compliant: number; gaps: number; not_assessed: number }[];
  openGapsByRisk: Record<RequirementRisk, number>;
  nextGapsDue: { id: string; req_code: string; title: string; status: RequirementStatus; risk: RequirementRisk; target_date: string; responsible_email: string }[];
}

export interface RequirementFilters {
  status?: string;
  category?: string;
  department?: string;
  risk?: string;
  overdue?: boolean;
  q?: string;
}

export interface AssessRequirementPayload {
  status: Exclude<RequirementStatus, 'not_assessed'>;
  currentStatus: string;
  gap?: string;
  risk?: RequirementRisk;
  correctiveAction?: string;
  responsibleEmail?: string;
  targetDate?: string;
  nextReviewDate?: string;
}

export interface RequirementDefinitionPayload {
  regulation: string;
  reference?: string;
  title: string;
  description: string;
  category: RequirementCategory;
  department: QualityDepartment;
  sopId?: string;
}

export const fetchComplianceDashboard = (token: string) => request<ComplianceDashboardData>('/quality/compliance/dashboard', token);
export const fetchRequirements = (token: string, filters: RequirementFilters = {}) =>
  request<RequirementItem[]>(`/quality/compliance/requirements${qs({ ...filters })}`, token);
export const fetchRequirementById = (token: string, id: string) => request<RequirementDetail>(`/quality/compliance/requirements/${id}`, token);
export const createRequirement = (token: string, payload: RequirementDefinitionPayload) =>
  post<RequirementItem>('/quality/compliance/requirements', token, payload);
export const updateRequirement = (token: string, id: string, payload: RequirementDefinitionPayload) =>
  request<RequirementItem>(`/quality/compliance/requirements/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const assessRequirement = (token: string, id: string, payload: AssessRequirementPayload) =>
  post<RequirementItem>(`/quality/compliance/requirements/${id}/assess`, token, payload);
export const addRequirementEvidence = (token: string, id: string, payload: { title: string; reference?: string; description?: string }) =>
  post<RequirementEvidence>(`/quality/compliance/requirements/${id}/evidence`, token, payload);
export const removeRequirementEvidence = (token: string, id: string, evidenceId: string) =>
  request<{ removed: boolean }>(`/quality/compliance/requirements/${id}/evidence/${evidenceId}`, token, { method: 'DELETE' });
export const raiseNcrForRequirement = (token: string, id: string) =>
  post<{ requirement: RequirementItem; ncr: NcrListItem }>(`/quality/compliance/requirements/${id}/raise-ncr`, token);
export const loadComplianceStarterTemplate = (token: string) =>
  post<{ added: number; skipped: number; templateSize: number }>('/quality/compliance/template/seed-company', token);

/**
 * Downloads the Seed Compliance Gap Assessment Report as a CSV. This is a
 * file, not JSON, so it bypasses request() — and unlike a read it must never
 * degrade to demo data: an auditor handed an empty or invented report would
 * be worse off than one told the server is unreachable.
 */
export async function downloadComplianceGapReport(token: string, filters: RequirementFilters = {}): Promise<void> {
  const response = await fetch(`${BASE_URL}/quality/compliance/report.csv${qs({ ...filters })}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new SeedLotApiError(friendlyMessageForStatus(response.status, undefined));
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `seed-compliance-gap-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// --- AI Center (server/src/modules/ai) -------------------------------------
// Risk scores and forecasts are computed deterministically on the server;
// the model (when configured) only writes the narrative and analyses photos.

export type AiRiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface AiLotRisk {
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  stage: string;
  testingStatus: string;
  quantityAvailable: number;
  unit: string;
  ageDays: number;
  germination: number | null;
  purity: number | null;
  viability: number | null;
  minGermination: number;
  predictedGermination90d: number | null;
  openQualityFlags: number;
  riskScore: number;
  riskLevel: AiRiskLevel;
  factors: { label: string; points: number }[];
  recommendation: string;
}

export interface AiLabRiskReport {
  generatedAt: string;
  summary: { total: number; critical: number; high: number; medium: number; low: number; quantityAtRisk: number };
  lots: AiLotRisk[];
  narrative: string;
  narrativeSource: 'model' | 'rules';
  model: string | null;
}

export interface AiCropForecast {
  crop: string;
  lots: number;
  quantityAvailable: number;
  allocatedLast90d: number;
  monthlyVelocity: number;
  monthsOfCover: number | null;
  projectedStockoutDate: string | null;
  status: 'shortage' | 'tight' | 'healthy' | 'slow-moving';
}

export interface AiExpiryForecast {
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  quantityAvailable: number;
  unit: string;
  daysToExpiry: number;
  expiryDate: string;
}

export interface AiForecastReport {
  generatedAt: string;
  horizonDays: number;
  crops: AiCropForecast[];
  expiring: AiExpiryForecast[];
  narrative: string;
  narrativeSource: 'model' | 'rules';
  model: string | null;
}

export type AiSeverity = 'none' | 'low' | 'medium' | 'high';

export interface AiPhotoAnalysis {
  configured: boolean;
  model: string | null;
  subject: string;
  cropGuess: string | null;
  overallSeverity: AiSeverity;
  findings: { issue: string; severity: AiSeverity; confidence: number; evidence: string }[];
  recommendations: string[];
  followUpTests: string[];
  summary: string;
}

export interface AiStatus {
  configured: boolean;
  model: string | null;
  provider?: string;
  models?: { chat: string; fast: string; vision: string } | null;
  knowledge?: { total: number; bySource: Record<string, number> };
}

/** A knowledge-base passage retrieved for a question (RAG source). */
export interface AiKnowledgeHit {
  id: string;
  sourceType: string;
  title: string;
  module: string;
  path: string;
  passage: string;
  score: number;
}

export async function searchAiKnowledge(token: string, q: string): Promise<AiKnowledgeHit[]> {
  return request(`/ai/knowledge/search?q=${encodeURIComponent(q)}`, token);
}

export async function reindexAiKnowledge(token: string): Promise<{ indexed: number; removed: number; bySource: Record<string, number> }> {
  return request('/ai/knowledge/reindex', token, { method: 'POST' });
}

export async function fetchAiStatus(token: string): Promise<AiStatus> {
  return request('/ai/status', token);
}

export async function fetchAiLabRisk(token: string): Promise<AiLabRiskReport> {
  return request('/ai/lab-risk', token);
}

export async function fetchAiForecasts(token: string): Promise<AiForecastReport> {
  return request('/ai/forecasts', token);
}

export type AiModuleKey = 'production' | 'procurement' | 'warehouse' | 'rd' | 'processing' | 'laboratory' | 'quality' | 'administration';
export type AiInsightSeverity = 'critical' | 'warning' | 'info' | 'good';

export interface AiModuleInsight {
  id: string;
  severity: AiInsightSeverity;
  title: string;
  detail: string;
  action: string | null;
  link: string | null;
  aiTab: 'risk' | 'forecast' | null;
}

export interface AiModuleMetric {
  label: string;
  value: string;
  tone: 'bad' | 'warn' | 'good' | 'neutral';
}

export interface AiModuleInsights {
  module: AiModuleKey;
  label: string;
  generatedAt: string;
  headline: string;
  metrics: AiModuleMetric[];
  insights: AiModuleInsight[];
  suggestedQuestions: string[];
  briefing: string | null;
  briefingSource: 'model' | 'rules';
  model: string | null;
}

export interface AiModuleSummary {
  module: AiModuleKey;
  label: string;
  headline: string;
  severity: AiInsightSeverity;
  counts: Record<AiInsightSeverity, number>;
  metrics: AiModuleMetric[];
  top: AiModuleInsight[];
}

export async function fetchAiModuleInsights(token: string, module: AiModuleKey, briefing = false): Promise<AiModuleInsights> {
  return request(`/ai/insights/${module}${briefing ? '?briefing=true' : ''}`, token);
}

export async function fetchAiAllModules(token: string): Promise<AiModuleSummary[]> {
  return request('/ai/insights', token);
}

export async function analyzeCropPhoto(
  token: string,
  payload: { imageBase64: string; mediaType: string; kind: 'field' | 'seed'; crop?: string; notes?: string },
): Promise<AiPhotoAnalysis> {
  return request('/ai/photo-analysis', token, { method: 'POST', body: JSON.stringify(payload) });
}

// ---------------------------------------------------------------------------
// Custom fields — admin-defined attributes that show and work across modules.
// ---------------------------------------------------------------------------

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';
export type CustomEntityType =
  | 'seed_lot' | 'supplier' | 'purchase_order' | 'grn' | 'processing_batch'
  | 'warehouse_item' | 'lab_submission' | 'non_conformance';

export interface CustomField {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[];
  entityTypes: CustomEntityType[];
  required: boolean;
  helpText: string | null;
  sortOrder: number;
  active: boolean;
}

export interface CustomFieldWithValue extends CustomField {
  value: string | number | boolean | null;
  storedOn: { entityType: string; entityId: string };
  /** True when stored on the lot, i.e. shared with every module showing it. */
  shared: boolean;
}

export interface CustomFieldInput {
  label: string;
  fieldType?: CustomFieldType;
  fieldKey?: string;
  options?: string[];
  entityTypes: CustomEntityType[];
  required?: boolean;
  helpText?: string;
  active?: boolean;
}

export interface CustomFieldRef {
  entityType: CustomEntityType;
  entityId: string;
  /** The seed lot this record belongs to; lets lot-wide fields be shared across modules. */
  lotId?: string;
}

export function fetchCustomFields(token: string, includeInactive = false): Promise<CustomField[]> {
  return request(`/custom-fields${includeInactive ? '?all=true' : ''}`, token);
}
export function createCustomField(token: string, input: CustomFieldInput): Promise<CustomField> {
  return request('/custom-fields', token, { method: 'POST', body: JSON.stringify(input) });
}
export function updateCustomField(token: string, id: string, input: Partial<CustomFieldInput>): Promise<CustomField> {
  return request(`/custom-fields/${id}`, token, { method: 'PATCH', body: JSON.stringify(input) });
}
export function fetchCustomFieldValues(token: string, ref: CustomFieldRef): Promise<CustomFieldWithValue[]> {
  const q = new URLSearchParams({ entityType: ref.entityType, entityId: ref.entityId });
  if (ref.lotId) q.set('lotId', ref.lotId);
  return request(`/custom-fields/values?${q.toString()}`, token);
}
export function saveCustomFieldValues(
  token: string, ref: CustomFieldRef, values: Record<string, string | number | boolean | null>,
): Promise<CustomFieldWithValue[]> {
  return request('/custom-fields/values', token, { method: 'PUT', body: JSON.stringify({ ...ref, values }) });
}

// ---------------------------------------------------------------------------
// Record-level AI ("AI assist" on detail pages). The rules live in
// src/ai/copilot and are shared with the server; see RecordAiPanel.
// ---------------------------------------------------------------------------

export async function runRecordCopilot(
  token: string,
  payload: { recordType: string; action?: string; question?: string; record: unknown },
): Promise<import('@/ai/copilot').CopilotResult> {
  return request('/ai/copilot', token, { method: 'POST', body: JSON.stringify(payload) });
}

// ---------------------------------------------------------------------------
// Generic module record store (migration 059). Backs Procurement, Warehouse,
// Processing and R&D screens; see src/hooks/persistentCollections.ts.
// ---------------------------------------------------------------------------

export interface ModuleRecordCollection<T = unknown> {
  collection: string;
  seeded: boolean;
  items: T[];
}

export interface ModuleRecordSync {
  upserts?: { id: string; data: unknown; position?: number }[];
  deletes?: string[];
  seed?: { id: string; data: unknown; position?: number }[];
  actor?: string;
}

export async function fetchModuleRecords<T = unknown>(token: string, collection: string): Promise<ModuleRecordCollection<T>> {
  return request(`/module-records/${encodeURIComponent(collection)}`, token);
}

export async function syncModuleRecords(
  token: string,
  collection: string,
  body: ModuleRecordSync,
): Promise<{ collection: string; seeded: boolean; upserted: number; deleted: number }> {
  return request(`/module-records/${encodeURIComponent(collection)}/sync`, token, { method: 'POST', body: JSON.stringify(body) });
}
