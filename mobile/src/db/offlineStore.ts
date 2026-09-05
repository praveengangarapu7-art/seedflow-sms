import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecordFieldInspectionPayload, SeedLotSummary, VarietySummary } from '../api/client';

const KEYS = {
  varieties: 'seedsphere:cache:varieties',
  seedLots: 'seedsphere:cache:seedLots',
  inspectionQueue: 'seedsphere:queue:inspections',
  authToken: 'seedsphere:auth:token',
  authUser: 'seedsphere:auth:user',
};

export interface QueuedInspection {
  localId: string;
  payload: RecordFieldInspectionPayload;
  queuedAt: string;
  status: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// --- Auth session persistence (so the app stays logged in across restarts) ---

export async function saveSession(token: string, user: unknown): Promise<void> {
  await AsyncStorage.setItem(KEYS.authToken, token);
  await writeJson(KEYS.authUser, user);
}

export async function loadSession<T>(): Promise<{ token: string; user: T } | null> {
  const token = await AsyncStorage.getItem(KEYS.authToken);
  if (!token) return null;
  const user = await readJson<T | null>(KEYS.authUser, null);
  if (!user) return null;
  return { token, user };
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.authToken, KEYS.authUser]);
}

// --- Offline reference data cache (variety database, seed lots) ---

export async function cacheVarieties(varieties: VarietySummary[]): Promise<void> {
  await writeJson(KEYS.varieties, varieties);
}

export async function getCachedVarieties(): Promise<VarietySummary[]> {
  return readJson(KEYS.varieties, []);
}

export async function cacheSeedLots(lots: SeedLotSummary[]): Promise<void> {
  await writeJson(KEYS.seedLots, lots);
}

export async function getCachedSeedLots(): Promise<SeedLotSummary[]> {
  return readJson(KEYS.seedLots, []);
}

// --- Offline inspection submission queue ---

export async function getInspectionQueue(): Promise<QueuedInspection[]> {
  return readJson(KEYS.inspectionQueue, []);
}

export async function queueInspection(payload: RecordFieldInspectionPayload): Promise<QueuedInspection> {
  const queue = await getInspectionQueue();
  const entry: QueuedInspection = {
    localId: `local-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    payload,
    queuedAt: new Date().toISOString(),
    status: 'pending',
  };
  await writeJson(KEYS.inspectionQueue, [entry, ...queue]);
  return entry;
}

export async function updateQueuedInspection(localId: string, patch: Partial<QueuedInspection>): Promise<void> {
  const queue = await getInspectionQueue();
  const updated = queue.map((entry) => (entry.localId === localId ? { ...entry, ...patch } : entry));
  await writeJson(KEYS.inspectionQueue, updated);
}

export async function removeQueuedInspection(localId: string): Promise<void> {
  const queue = await getInspectionQueue();
  await writeJson(
    KEYS.inspectionQueue,
    queue.filter((entry) => entry.localId !== localId),
  );
}
