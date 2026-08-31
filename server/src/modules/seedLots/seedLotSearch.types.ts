import type { DiseaseResistanceEntry } from '../varieties/varieties.types';

export interface SeedLotSearchFilters {
  // Free-text quick search across crop, variety, and lot code in one box —
  // "Search for 'Tomato'" (a crop name, not a variety) is the literal
  // motivating case: the dedicated `crop`/`variety` fields below stay as
  // precise dropdown/exact and partial-variety matches for advanced
  // filtering, while `q` is the single-box shortcut a first-time user
  // reaches for.
  q?: string;
  variety?: string;
  crop?: string;
  seedClass?: string; // maps to seed_lots.stage
  sourceOrganizationId?: string;
  productionDateFrom?: string;
  productionDateTo?: string;
  minAvailableQuantity?: number;
  storageZone?: string;
  // Whether the lot has an ISSUED quality certificate (quality_certificates
  // table / compliance module) — deliberately independent of
  // `testingStatus` below. A quality certificate is a formal
  // registry/compliance record; testing_status is the lab-testing
  // pipeline's own outcome (Extend #15). A lot can be lab-certified without
  // yet having an issued quality certificate (or vice versa, for
  // certificates issued outside the lab-testing workflow), so the two
  // filters are kept separate rather than merged into one "certified"
  // concept — same reasoning as keeping status/stage/testing_status apart.
  certificationStatus?: 'certified' | 'not_certified';
  testingStatus?: 'not_submitted' | 'testing' | 'certified' | 'rejected';
  agroClimaticZone?: string;
  diseaseResistanceTrait?: string;
  minYieldBenchmark?: number;
  limit?: number;
  offset?: number;
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

export interface SavedSearch {
  id: string;
  name: string;
  filters: SeedLotSearchFilters;
  created_at: string;
}

export interface SeedLotSearchFilterOptions {
  crops: string[];
  organizations: { id: string; name: string }[];
  agroClimaticZones: string[];
  diseaseTraits: string[];
  storageZones: string[];
}
