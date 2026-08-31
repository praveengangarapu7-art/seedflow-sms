import { useSyncExternalStore } from 'react';
import type { CropPlan, Farm, SeedVariety } from '@/services/api';
import { seedCropPlans } from './cropPlanningData';

/**
 * Harvest Management — Phase 7.
 *
 * Workflow: a farmer raises a harvest request, an inspector verifies readiness
 * and approves it (which auto-generates the seed lot tracking ID), the harvest
 * is recorded against that lot, and transport to the processing plant is
 * authorised. Every transition is appended to the request's history.
 *
 * State lives in a small module-level store persisted to localStorage, so the
 * request a farmer submits on one page is immediately visible in the
 * inspector's queue on another — the same way a real API would behave.
 */

export const harvestStatusOptions = [
  'Pending Approval',
  'Changes Requested',
  'Approved',
  'Rejected',
  'Harvested',
  'Transport Authorized',
  'Delivered to Processing',
] as const;

export type HarvestStatus = (typeof harvestStatusOptions)[number];

/** Statuses still sitting in the inspector's queue. */
export const PENDING_STATUSES: HarvestStatus[] = ['Pending Approval', 'Changes Requested'];

/** Statuses that have a seed lot attached and therefore appear in the harvest register. */
export const LOT_STATUSES: HarvestStatus[] = [
  'Approved',
  'Harvested',
  'Transport Authorized',
  'Delivered to Processing',
];

export interface HarvestStatusEvent {
  status: HarvestStatus;
  at: string;
  by: string;
  note?: string;
}

export interface TransportAuthorization {
  transporterName: string;
  vehicleNumber: string;
  destination: string;
  dispatchDate: string;
  authorizedBy: string;
  authorizedAt: string;
}

export interface HarvestRequest {
  id: string;
  requestCode: string;
  farmId: string;
  farmerId: string;
  varietyId: string;
  crop: string;
  cropPlanId?: string;
  estimatedQuantityKg: number;
  actualQuantityKg?: number;
  requestedHarvestDate: string;
  harvestedDate?: string;
  notes?: string;
  status: HarvestStatus;
  requestedBy: string;
  requestedAt: string;
  inspectorName?: string;
  inspectorNotes?: string;
  reviewedAt?: string;
  /** Auto-generated on approval — the seed lot's tracking ID. */
  lotId?: string;
  transport?: TransportAuthorization;
  history: HarvestStatusEvent[];
}

export function isPendingStatus(status: HarvestStatus): boolean {
  return PENDING_STATUSES.includes(status);
}

export function hasLot(request: HarvestRequest): boolean {
  return Boolean(request.lotId) && LOT_STATUSES.includes(request.status);
}

export function harvestStatusClass(status: HarvestStatus): string {
  // "Delivered to Processing" -> "hsDeliveredToProcessing": every word is
  // capitalised so the generated key always matches the CSS module class.
  const pascal = status
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return `hs${pascal}`;
}

export function formatKg(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toLocaleString('en-IN')} kg`;
}

export function formatHarvestDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(`${value}`.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatHarvestDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Resolves the variety a farm is currently growing: the farm's active crop plan
 * wins, otherwise fall back to matching the farm's current crop by name.
 */
export function resolveVarietyForFarm(
  farmId: string,
  options: { cropPlans?: CropPlan[]; varieties: SeedVariety[]; farms: Farm[] },
): { variety: SeedVariety | null; cropPlan: CropPlan | null; crop: string } {
  const { cropPlans = seedCropPlans, varieties, farms } = options;

  const rank = (status: string): number => {
    const normalized = status.toLowerCase();
    if (normalized === 'growing') return 0;
    if (normalized === 'sown') return 1;
    if (normalized === 'planned') return 2;
    if (normalized === 'harvested') return 3;
    return 4;
  };

  const cropPlan = [...cropPlans]
    .filter((plan) => plan.farmId === farmId && plan.status.toLowerCase() !== 'cancelled')
    .sort((a, b) => {
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      return (b.sowingDate ?? '').localeCompare(a.sowingDate ?? '');
    })[0] ?? null;

  if (cropPlan) {
    const planVariety = varieties.find((item) => item.id === cropPlan.varietyId) ?? null;
    if (planVariety) return { variety: planVariety, cropPlan, crop: planVariety.crop || cropPlan.crop };
    return { variety: null, cropPlan, crop: cropPlan.crop };
  }

  const farm = farms.find((item) => item.id === farmId) ?? null;
  const currentCrop = farm?.currentCrop ?? '';
  const byCrop = currentCrop
    ? varieties.find((item) => item.crop.toLowerCase() === currentCrop.toLowerCase()) ?? null
    : null;

  return { variety: byCrop, cropPlan: null, crop: byCrop?.crop ?? currentCrop };
}

// ---------------------------------------------------------------- seed data

function seedEvent(status: HarvestStatus, at: string, by: string, note?: string): HarvestStatusEvent {
  return { status, at, by, note };
}

export const seedHarvestRequests: HarvestRequest[] = [
  {
    id: 'harvest-1',
    requestCode: 'HR-2026-001',
    farmId: 'farm-1',
    farmerId: 'farmer-1',
    varietyId: 'variety-1',
    crop: 'Paddy',
    cropPlanId: 'plan-1',
    estimatedQuantityKg: 4200,
    requestedHarvestDate: '2026-10-18',
    notes: 'Crop reaching maturity ahead of plan. Requesting inspection before the monsoon window closes.',
    status: 'Pending Approval',
    requestedBy: 'Ramu Naidu',
    requestedAt: '2026-08-02T09:15:00.000Z',
    history: [seedEvent('Pending Approval', '2026-08-02T09:15:00.000Z', 'Ramu Naidu', 'Harvest request raised by farmer.')],
  },
  {
    id: 'harvest-2',
    requestCode: 'HR-2026-002',
    farmId: 'farm-3',
    farmerId: 'farmer-2',
    varietyId: 'variety-2',
    crop: 'Maize',
    cropPlanId: 'plan-2',
    estimatedQuantityKg: 6100,
    actualQuantityKg: 5840,
    requestedHarvestDate: '2026-04-12',
    harvestedDate: '2026-04-14',
    notes: 'Full block ready, moisture reading at 13.2%.',
    status: 'Delivered to Processing',
    requestedBy: 'Suresh Reddy',
    requestedAt: '2026-04-01T06:40:00.000Z',
    inspectorName: 'Vikram Singh',
    inspectorNotes: 'Field verified — uniform maturity, isolation distance maintained. Cleared for harvest.',
    reviewedAt: '2026-04-04T11:20:00.000Z',
    lotId: 'LOT-2026-0001',
    transport: {
      transporterName: 'Sri Balaji Logistics',
      vehicleNumber: 'TS 08 UB 4412',
      destination: 'Warangal Processing Plant',
      dispatchDate: '2026-04-15',
      authorizedBy: 'Vikram Singh',
      authorizedAt: '2026-04-14T13:05:00.000Z',
    },
    history: [
      seedEvent('Pending Approval', '2026-04-01T06:40:00.000Z', 'Suresh Reddy', 'Harvest request raised by farmer.'),
      seedEvent('Approved', '2026-04-04T11:20:00.000Z', 'Vikram Singh', 'Field verified. Lot LOT-2026-0001 created.'),
      seedEvent('Harvested', '2026-04-14T10:00:00.000Z', 'Suresh Reddy', 'Actual yield 5,840 kg recorded.'),
      seedEvent('Transport Authorized', '2026-04-14T13:05:00.000Z', 'Vikram Singh', 'TS 08 UB 4412 authorised to Warangal Processing Plant.'),
      seedEvent('Delivered to Processing', '2026-04-16T08:30:00.000Z', 'Warangal Plant', 'Lot received at raw intake.'),
    ],
  },
  {
    id: 'harvest-3',
    requestCode: 'HR-2026-003',
    farmId: 'farm-6',
    farmerId: 'farmer-5',
    varietyId: 'variety-5',
    crop: 'Tomato',
    cropPlanId: 'plan-5',
    estimatedQuantityKg: 7800,
    actualQuantityKg: 7350,
    requestedHarvestDate: '2026-05-12',
    harvestedDate: '2026-05-13',
    status: 'Harvested',
    requestedBy: 'Lakshmi Iyer',
    requestedAt: '2026-05-02T05:50:00.000Z',
    inspectorName: 'Divya Menon',
    inspectorNotes: 'Fruit set healthy, no pest activity. Approved for harvest.',
    reviewedAt: '2026-05-06T09:10:00.000Z',
    lotId: 'LOT-2026-0002',
    history: [
      seedEvent('Pending Approval', '2026-05-02T05:50:00.000Z', 'Lakshmi Iyer', 'Harvest request raised by farmer.'),
      seedEvent('Approved', '2026-05-06T09:10:00.000Z', 'Divya Menon', 'Field verified. Lot LOT-2026-0002 created.'),
      seedEvent('Harvested', '2026-05-13T11:45:00.000Z', 'Lakshmi Iyer', 'Actual yield 7,350 kg recorded.'),
    ],
  },
  {
    id: 'harvest-4',
    requestCode: 'HR-2026-004',
    farmId: 'farm-4',
    farmerId: 'farmer-3',
    varietyId: 'variety-3',
    crop: 'Cotton',
    cropPlanId: 'plan-3',
    estimatedQuantityKg: 2900,
    requestedHarvestDate: '2026-08-20',
    notes: 'Requesting early harvest for the low-lying section.',
    status: 'Changes Requested',
    requestedBy: 'Kavita Devi',
    requestedAt: '2026-08-04T07:25:00.000Z',
    inspectorName: 'Divya Menon',
    inspectorNotes: 'Boll rot reported in the last inspection. Re-submit with a revised quantity after treating the affected section.',
    reviewedAt: '2026-08-06T10:05:00.000Z',
    history: [
      seedEvent('Pending Approval', '2026-08-04T07:25:00.000Z', 'Kavita Devi', 'Harvest request raised by farmer.'),
      seedEvent('Changes Requested', '2026-08-06T10:05:00.000Z', 'Divya Menon', 'Revised quantity required after boll rot treatment.'),
    ],
  },
  {
    id: 'harvest-5',
    requestCode: 'HR-2026-005',
    farmId: 'farm-5',
    farmerId: 'farmer-4',
    varietyId: 'variety-4',
    crop: 'Groundnut',
    cropPlanId: 'plan-4',
    estimatedQuantityKg: 2400,
    requestedHarvestDate: '2026-06-08',
    status: 'Rejected',
    requestedBy: 'Manoj Yadav',
    requestedAt: '2026-05-28T04:35:00.000Z',
    inspectorName: 'Vikram Singh',
    inspectorNotes: 'Farmer KYC pending and isolation distance not maintained from the neighbouring plot.',
    reviewedAt: '2026-05-30T12:00:00.000Z',
    history: [
      seedEvent('Pending Approval', '2026-05-28T04:35:00.000Z', 'Manoj Yadav', 'Harvest request raised by farmer.'),
      seedEvent('Rejected', '2026-05-30T12:00:00.000Z', 'Vikram Singh', 'KYC pending and isolation distance not maintained.'),
    ],
  },
  {
    id: 'harvest-6',
    requestCode: 'HR-2026-006',
    farmId: 'farm-2',
    farmerId: 'farmer-1',
    varietyId: 'variety-1',
    crop: 'Paddy',
    estimatedQuantityKg: 1850,
    requestedHarvestDate: '2026-08-25',
    notes: 'South field block B only.',
    status: 'Pending Approval',
    requestedBy: 'Ramu Naidu',
    requestedAt: '2026-08-06T11:10:00.000Z',
    history: [seedEvent('Pending Approval', '2026-08-06T11:10:00.000Z', 'Ramu Naidu', 'Harvest request raised by farmer.')],
  },
];

// -------------------------------------------------------------------- store

const STORAGE_KEY = 'seedflow_harvest_requests';

function readStorage(): HarvestRequest[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HarvestRequest[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeStorage(value: HarvestRequest[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — the in-memory store still works.
  }
}

let state: HarvestRequest[] = readStorage() ?? seedHarvestRequests;

const listeners = new Set<() => void>();

function setState(next: HarvestRequest[]): void {
  state = next;
  writeStorage(state);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): HarvestRequest[] {
  return state;
}

/** Reactive read of every harvest request. */
export function useHarvestRequests(): HarvestRequest[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getHarvestRequests(): HarvestRequest[] {
  return state;
}

export function getHarvestRequest(id: string): HarvestRequest | null {
  return state.find((item) => item.id === id) ?? null;
}

/** Restores the bundled demo data — used by the "Reset demo data" action. */
export function resetHarvestRequests(): void {
  setState(seedHarvestRequests);
}

function nextSequence(prefix: 'HR' | 'LOT', year: number, width: number): string {
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const highest = state.reduce((max, request) => {
    const candidates = [request.requestCode, request.lotId].filter(Boolean) as string[];
    return candidates.reduce((inner, code) => {
      const match = pattern.exec(code);
      return match ? Math.max(inner, Number(match[1])) : inner;
    }, max);
  }, 0);
  return `${prefix}-${year}-${String(highest + 1).padStart(width, '0')}`;
}

/** `HR-2026-007` — next free harvest request code. */
export function nextRequestCode(): string {
  return nextSequence('HR', new Date().getFullYear(), 3);
}

/** `LOT-2026-0003` — next free seed lot tracking ID. */
export function generateLotId(): string {
  return nextSequence('LOT', new Date().getFullYear(), 4);
}

function withEvent(
  request: HarvestRequest,
  status: HarvestStatus,
  by: string,
  note?: string,
): HarvestRequest {
  return {
    ...request,
    status,
    history: [...request.history, { status, at: nowIso(), by, note }],
  };
}

function patch(id: string, updater: (request: HarvestRequest) => HarvestRequest): HarvestRequest | null {
  let updated: HarvestRequest | null = null;
  const next = state.map((request) => {
    if (request.id !== id) return request;
    updated = updater(request);
    return updated;
  });
  if (updated) setState(next);
  return updated;
}

export interface CreateHarvestRequestInput {
  farmId: string;
  farmerId: string;
  varietyId: string;
  crop: string;
  cropPlanId?: string;
  estimatedQuantityKg: number;
  requestedHarvestDate: string;
  notes?: string;
  requestedBy: string;
}

/** Farmer submits a harvest request — always enters at `Pending Approval`. */
export function createHarvestRequest(input: CreateHarvestRequestInput): HarvestRequest {
  const request: HarvestRequest = {
    id: `harvest-${Date.now()}`,
    requestCode: nextRequestCode(),
    farmId: input.farmId,
    farmerId: input.farmerId,
    varietyId: input.varietyId,
    crop: input.crop,
    cropPlanId: input.cropPlanId,
    estimatedQuantityKg: input.estimatedQuantityKg,
    requestedHarvestDate: input.requestedHarvestDate,
    notes: input.notes,
    status: 'Pending Approval',
    requestedBy: input.requestedBy,
    requestedAt: nowIso(),
    history: [
      { status: 'Pending Approval', at: nowIso(), by: input.requestedBy, note: 'Harvest request raised by farmer.' },
    ],
  };

  setState([request, ...state]);
  return request;
}

/**
 * Inspector approves the request. This is where the seed lot is created: the
 * tracking ID is generated once and never regenerated on re-approval.
 */
export function approveHarvestRequest(
  id: string,
  input: { inspectorName: string; inspectorNotes?: string },
): HarvestRequest | null {
  const lotId = getHarvestRequest(id)?.lotId ?? generateLotId();
  return patch(id, (request) =>
    withEvent(
      {
        ...request,
        inspectorName: input.inspectorName,
        inspectorNotes: input.inspectorNotes?.trim() || request.inspectorNotes,
        reviewedAt: nowIso(),
        lotId: request.lotId ?? lotId,
      },
      'Approved',
      input.inspectorName,
      `Readiness verified. Lot ${request.lotId ?? lotId} created.`,
    ),
  );
}

export function rejectHarvestRequest(
  id: string,
  input: { inspectorName: string; inspectorNotes: string },
): HarvestRequest | null {
  return patch(id, (request) =>
    withEvent(
      {
        ...request,
        inspectorName: input.inspectorName,
        inspectorNotes: input.inspectorNotes.trim(),
        reviewedAt: nowIso(),
      },
      'Rejected',
      input.inspectorName,
      input.inspectorNotes.trim(),
    ),
  );
}

export function requestHarvestChanges(
  id: string,
  input: { inspectorName: string; inspectorNotes: string },
): HarvestRequest | null {
  return patch(id, (request) =>
    withEvent(
      {
        ...request,
        inspectorName: input.inspectorName,
        inspectorNotes: input.inspectorNotes.trim(),
        reviewedAt: nowIso(),
      },
      'Changes Requested',
      input.inspectorName,
      input.inspectorNotes.trim(),
    ),
  );
}

/** Farmer/supervisor records what actually came off the field. */
export function recordHarvestCompletion(
  id: string,
  input: { actualQuantityKg: number; harvestedDate?: string; by: string },
): HarvestRequest | null {
  return patch(id, (request) =>
    withEvent(
      {
        ...request,
        actualQuantityKg: input.actualQuantityKg,
        harvestedDate: input.harvestedDate || today(),
      },
      'Harvested',
      input.by,
      `Actual yield ${input.actualQuantityKg.toLocaleString('en-IN')} kg recorded.`,
    ),
  );
}

export function authorizeTransport(
  id: string,
  input: {
    transporterName: string;
    vehicleNumber: string;
    destination: string;
    dispatchDate: string;
    authorizedBy: string;
  },
): HarvestRequest | null {
  return patch(id, (request) =>
    withEvent(
      {
        ...request,
        transport: {
          transporterName: input.transporterName.trim(),
          vehicleNumber: input.vehicleNumber.trim().toUpperCase(),
          destination: input.destination.trim(),
          dispatchDate: input.dispatchDate,
          authorizedBy: input.authorizedBy,
          authorizedAt: nowIso(),
        },
      },
      'Transport Authorized',
      input.authorizedBy,
      `${input.vehicleNumber.trim().toUpperCase()} authorised to ${input.destination.trim()}.`,
    ),
  );
}

export function markDeliveredToProcessing(id: string, by: string): HarvestRequest | null {
  return patch(id, (request) =>
    withEvent(request, 'Delivered to Processing', by, `Lot ${request.lotId ?? ''} received at raw intake.`.trim()),
  );
}
