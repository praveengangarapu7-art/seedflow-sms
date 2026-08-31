import type { Organization, SeedClass, SeedLot, SeedVariety } from '@/services/api';

/**
 * SeedFlow currently ships as a frontend-only scaffold (see README) — there is no backend
 * listening at VITE_API_BASE_URL, so every masterDataApi.* call for seed lots will fail after
 * its timeout. To keep the Seed Lot Register and Crop Planning's "consume a Foundation lot"
 * flow demoable without a backend, this module doubles as a tiny in-memory store: pages call
 * masterDataApi first (so this is forward-compatible with a real backend later), and fall back
 * to reading/writing this module-level array on failure. Like the rest of the app, this state
 * is session-only and resets on a full page refresh.
 */

export const seedLotClassOptions: SeedClass[] = ['Breeder', 'Foundation'];

// Duplicated fallback pools (same ids as VarietyList/OrganizationList seed data) — matches the
// existing convention in this codebase of each page/module keeping its own local fallback copy.
export const seedLotVarieties: SeedVariety[] = [
  { id: 'variety-1', name: 'Paddy-1010', crop: 'Paddy' },
  { id: 'variety-2', name: 'Maize-Hybrid-22', crop: 'Maize' },
  { id: 'variety-3', name: 'Cotton-BT-5', crop: 'Cotton' },
  { id: 'variety-4', name: 'Groundnut-TG-37', crop: 'Groundnut' },
  { id: 'variety-5', name: 'Tomato-Hybrid-9', crop: 'Tomato' },
];

export const seedLotOrganizations: Organization[] = [
  { id: 'org-1', name: 'GreenFields Breeders', type: 'breeder', location: 'Hyderabad, Telangana', contact_person: 'Ramesh Kumar', active: true },
  { id: 'org-2', name: 'AgriGrow Seed Producers', type: 'producer', location: 'Nashik, Maharashtra', contact_person: 'Sunita Patel', active: true },
  { id: 'org-3', name: 'National Seed Testing Lab', type: 'laboratory', location: 'Bengaluru, Karnataka', contact_person: 'Dr. Anil Sharma', active: true },
  { id: 'org-4', name: 'Krishna Cold Storage & Warehouse', type: 'warehouse', location: 'Guntur, Andhra Pradesh', contact_person: 'Venkat Rao', active: true },
  { id: 'org-5', name: 'Sri Lakshmi Agro Dealers', type: 'dealer', location: 'Coimbatore, Tamil Nadu', contact_person: 'Lakshmi Narayanan', active: true },
];

const initialSeedLots: SeedLot[] = [
  { id: 'lot-b1', varietyId: 'variety-1', seedClass: 'Breeder', sourceOrgId: 'org-1', quantity: 40, productionDate: '2025-11-10' },
  { id: 'lot-f1', varietyId: 'variety-1', seedClass: 'Foundation', sourceOrgId: 'org-2', quantity: 1800, productionDate: '2026-01-15', parentLotId: 'lot-b1' },
  { id: 'lot-b2', varietyId: 'variety-3', seedClass: 'Breeder', sourceOrgId: 'org-1', quantity: 25, productionDate: '2025-10-05' },
  { id: 'lot-f2', varietyId: 'variety-3', seedClass: 'Foundation', sourceOrgId: 'org-2', quantity: 900, productionDate: '2025-12-20', parentLotId: 'lot-b2' },
];

let store: SeedLot[] = [...initialSeedLots];

export function getSeedLotStore(): SeedLot[] {
  return store;
}

/** Breeder + Foundation lots only — what the Seed Lot Register (ahead of Certified Seed Production) shows. */
export function getRegisterSeedLots(): SeedLot[] {
  return store.filter((lot) => lot.seedClass === 'Breeder' || lot.seedClass === 'Foundation');
}

/** Foundation lots with quantity remaining — the pool Crop Planning's parent-seed picker draws from. */
export function getAvailableFoundationLots(): SeedLot[] {
  return store.filter((lot) => lot.seedClass === 'Foundation' && lot.quantity > 0);
}

export function getSeedLotById(id: string): SeedLot | undefined {
  return store.find((lot) => lot.id === id);
}

export function createSeedLotRecord(payload: Omit<SeedLot, 'id'>): SeedLot {
  const lot: SeedLot = { ...payload, id: `lot-${Date.now()}` };
  store = [...store, lot];
  return lot;
}

export function updateSeedLotRecord(id: string, changes: Partial<SeedLot>): SeedLot | undefined {
  let updated: SeedLot | undefined;
  store = store.map((lot) => {
    if (lot.id !== id) return lot;
    updated = { ...lot, ...changes, id: lot.id };
    return updated;
  });
  return updated;
}

export function deleteSeedLotRecord(id: string): void {
  store = store.filter((lot) => lot.id !== id);
}

/** Deducts `amount` from a lot's remaining quantity. Throws if the lot is missing or over-allocated. */
export function allocateSeedLotQuantity(id: string, amount: number): SeedLot {
  const lot = getSeedLotById(id);
  if (!lot) {
    throw new Error('Seed lot not found.');
  }
  if (amount <= 0) {
    throw new Error('Allocated quantity must be greater than zero.');
  }
  if (amount > lot.quantity) {
    throw new Error(`Only ${lot.quantity.toLocaleString()}kg remaining in this lot.`);
  }
  const updated = updateSeedLotRecord(id, { quantity: lot.quantity - amount });
  return updated!;
}

export function seedLotCode(lot: SeedLot): string {
  return lot.id.toUpperCase();
}
