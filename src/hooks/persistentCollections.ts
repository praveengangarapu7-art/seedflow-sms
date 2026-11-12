import { useCallback, useSyncExternalStore } from 'react';
import {
  DEMO_ACCOUNTS,
  fetchModuleRecords,
  isDemoMode,
  login,
  syncModuleRecords,
  type ModuleRecordSync,
} from '@/services/seedLotRealtimeClient';

/**
 * Persistent, shared collections for the modules that started on sample data
 * (Procurement, Warehouse, Processing, R&D).
 *
 * A page asks for a collection by name ("warehouse.inventory") with the
 * sample array as starter data. The first time any browser opens it, the
 * starter data is written to the server (module_records, migration 059);
 * after that every page, user and device reads the same saved records.
 *
 *  - One in-memory copy per collection, so a change on one page (e.g. a
 *    batch advanced on its detail page) shows on every other page at once.
 *  - Changes are diffed by record id and only the changed records are sent,
 *    batched every 400 ms. The server writes each change to the audit log.
 *  - If the server is unreachable (demo mode / offline), the collection is
 *    kept in this browser's localStorage so nothing is lost on refresh, and
 *    writes are queued by the API client for replay when the server returns.
 *  - Arrays whose items have no unique id are stored as one document.
 */

type Listener = () => void;
type Item = Record<string, unknown>;

interface Entry {
  name: string;
  items: unknown[];
  keyed: boolean;
  status: 'local' | 'loading' | 'synced' | 'offline';
  listeners: Set<Listener>;
  pendingUpserts: Map<string, unknown>;
  pendingDeletes: Set<string>;
  timer: ReturnType<typeof setTimeout> | null;
  starter: unknown[];
}

const entries = new Map<string, Entry>();
const WHOLE_DOC_ID = '__collection__';
const LS_PREFIX = 'seedsphere.records.';
const FLUSH_MS = 400;

// ------------------------------------------------------------------ helpers

function idOf(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  const id = (item as Item).id;
  if (typeof id === 'string' && id) return id;
  if (typeof id === 'number') return String(id);
  return null;
}

function isKeyed(items: unknown[]): boolean {
  const ids = items.map(idOf);
  if (ids.some((id) => id === null)) return items.length === 0;
  return new Set(ids).size === ids.length;
}

function readLocal(name: string): unknown[] | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + name);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocal(name: string, items: unknown[]): void {
  try {
    localStorage.setItem(LS_PREFIX + name, JSON.stringify(items));
  } catch {
    // Storage full or blocked: the server copy is still authoritative.
  }
}

/** Who is using the app (the front-end login), for the audit log. */
function actor(): string | undefined {
  try {
    const raw = localStorage.getItem('seedflow_auth');
    const user = raw ? (JSON.parse(raw) as { email?: string; name?: string }) : null;
    return user?.email ?? user?.name ?? undefined;
  } catch {
    return undefined;
  }
}

let tokenPromise: Promise<string | null> | null = null;
function token(): Promise<string | null> {
  if (!tokenPromise) {
    const account = DEMO_ACCOUNTS[0];
    tokenPromise = login(account.email, account.password)
      .then((s) => s?.accessToken ?? null)
      .catch(() => null);
    // Sessions expire; ask again after 10 minutes (login() reuses its own cache).
    setTimeout(() => { tokenPromise = null; }, 10 * 60_000);
  }
  return tokenPromise;
}

function notify(entry: Entry): void {
  entry.listeners.forEach((l) => l());
}

function toUpserts(items: unknown[], positions = false) {
  return items.map((item, i) => ({ id: idOf(item) as string, data: item, ...(positions ? { position: i } : {}) }));
}

// ------------------------------------------------------------------ server sync

async function load(entry: Entry): Promise<void> {
  entry.status = 'loading';
  const t = await token();
  if (!t) { entry.status = 'offline'; return; }
  try {
    const res = await fetchModuleRecords(t, entry.name);
    if (!res || Array.isArray(res) || !Array.isArray(res.items) || isDemoMode()) {
      entry.status = 'offline';
      return;
    }
    if (res.items.length > 0 || res.seeded) {
      const serverItems = entry.keyed ? res.items : (Array.isArray(res.items[0]) ? (res.items[0] as unknown[]) : []);
      // Keep any edits made while loading.
      if (entry.pendingUpserts.size === 0 && entry.pendingDeletes.size === 0) entry.items = serverItems;
      entry.status = 'synced';
      writeLocal(entry.name, entry.items);
      notify(entry);
      return;
    }
    // First time this collection is opened anywhere: save the starter data
    // (or what this browser already had locally) to the server.
    const initial = entry.items;
    const seed = entry.keyed ? toUpserts(initial, true) : [{ id: WHOLE_DOC_ID, data: initial }];
    await syncModuleRecords(t, entry.name, { seed, actor: actor() });
    entry.status = 'synced';
  } catch (error) {
    console.warn(`[records] could not load ${entry.name}; working offline`, error);
    entry.status = 'offline';
  }
}

function scheduleFlush(entry: Entry): void {
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => void flush(entry), FLUSH_MS);
}

async function flush(entry: Entry): Promise<void> {
  entry.timer = null;
  if (entry.pendingUpserts.size === 0 && entry.pendingDeletes.size === 0) return;
  const body: ModuleRecordSync = {
    upserts: [...entry.pendingUpserts.entries()].map(([id, data]) => ({ id, data })),
    deletes: [...entry.pendingDeletes],
    actor: actor(),
  };
  entry.pendingUpserts.clear();
  entry.pendingDeletes.clear();
  const t = await token();
  if (!t) return; // no session at all: the change stays in this browser's localStorage
  try {
    // While offline the API client queues this request and replays it later.
    await syncModuleRecords(t, entry.name, body);
  } catch (error) {
    console.warn(`[records] save failed for ${entry.name}`, error);
  }
}

function recordChanges(entry: Entry, prev: unknown[], next: unknown[]): void {
  if (!entry.keyed) {
    entry.pendingUpserts.set(WHOLE_DOC_ID, next);
    return;
  }
  const before = new Map<string, unknown>();
  prev.forEach((item) => { const id = idOf(item); if (id) before.set(id, item); });
  const seen = new Set<string>();
  for (const item of next) {
    const id = idOf(item);
    if (!id) continue;
    seen.add(id);
    const old = before.get(id);
    if (old === item) continue; // unchanged reference: skip the deep compare
    if (old === undefined || JSON.stringify(old) !== JSON.stringify(item)) {
      entry.pendingUpserts.set(id, item);
      entry.pendingDeletes.delete(id);
    }
  }
  for (const id of before.keys()) {
    if (!seen.has(id)) {
      entry.pendingDeletes.add(id);
      entry.pendingUpserts.delete(id);
    }
  }
}

// ------------------------------------------------------------------ public API

function getEntry(name: string, starter: unknown[]): Entry {
  let entry = entries.get(name);
  if (!entry) {
    const local = name.startsWith('__') ? null : readLocal(name);
    const items = local ?? starter;
    entry = {
      name,
      items,
      keyed: isKeyed(starter) && isKeyed(items),
      status: 'local',
      listeners: new Set(),
      pendingUpserts: new Map(),
      pendingDeletes: new Set(),
      timer: null,
      starter,
    };
    entries.set(name, entry);
    // Names starting with "__" are component-local placeholders, never synced.
    if (!name.startsWith('__')) void load(entry);
  }
  return entry;
}

export function setCollection<T>(name: string, starter: T[], next: T[] | ((prev: T[]) => T[])): void {
  const entry = getEntry(name, starter as unknown[]);
  const prev = entry.items as T[];
  const value = typeof next === 'function' ? (next as (p: T[]) => T[])(prev) : next;
  if (value === prev) return;
  entry.items = value as unknown[];
  recordChanges(entry, prev, value as unknown[]);
  if (name.startsWith('__')) { notify(entry); return; }
  writeLocal(name, entry.items);
  notify(entry);
  scheduleFlush(entry);
}

/** Current items without subscribing (for event handlers and services). */
export function readCollection<T>(name: string, starter: T[]): T[] {
  return getEntry(name, starter as unknown[]).items as T[];
}

/** Puts a collection back to its starter data (also on the server). */
export function resetCollection<T>(name: string, starter: T[]): void {
  setCollection(name, starter, starter.slice());
}

export function collectionStatus(name: string): Entry['status'] | 'unknown' {
  return entries.get(name)?.status ?? 'unknown';
}

/**
 * useState for a named, persistent, shared array:
 *   const [orders, setOrders] = usePersistentCollection('procurement.purchase_orders', mockPOs);
 */
export function usePersistentCollection<T>(name: string, starter: T[]): [T[], (next: T[] | ((prev: T[]) => T[])) => void] {
  const entry = getEntry(name, starter as unknown[]);
  const subscribe = useCallback(
    (listener: Listener) => {
      entry.listeners.add(listener);
      return () => entry.listeners.delete(listener);
    },
    [entry],
  );
  const items = useSyncExternalStore(subscribe, () => entry.items as T[], () => entry.items as T[]);
  const set = useCallback((next: T[] | ((prev: T[]) => T[])) => setCollection(name, starter, next), [name, starter]);
  return [items, set];
}

// Save anything still pending before the tab closes.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    entries.forEach((entry) => {
      if (entry.timer) {
        clearTimeout(entry.timer);
        void flush(entry);
      }
    });
  });
}
