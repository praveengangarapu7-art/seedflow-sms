import type { AgroAdvisory, SoilType } from './cropPlanning.types';

// Same per-crop simplification demandPlanning.service.ts uses for its own
// forecast (SEED_RATE_PER_ACRE_KG) — duplicated locally rather than shared
// across modules, matching how each module here owns its demo-scale
// agronomic constants independently.
const SEED_RATE_PER_ACRE_KG: Record<string, number> = {
  Paddy: 20,
  Maize: 8,
  Cotton: 5,
  Groundnut: 40,
  Tomato: 0.2,
};
const DEFAULT_SEED_RATE_PER_ACRE_KG = 15;

function seedRateForCrop(crop: string): number {
  return SEED_RATE_PER_ACRE_KG[crop] ?? DEFAULT_SEED_RATE_PER_ACRE_KG;
}

const CROP_SOIL_SUITABILITY: Record<string, SoilType[]> = {
  Paddy: ['clay', 'alluvial', 'loamy'],
  Maize: ['loamy', 'alluvial', 'red'],
  Cotton: ['black', 'loamy'],
  Groundnut: ['sandy', 'red', 'loamy'],
  Tomato: ['loamy', 'alluvial', 'sandy'],
};

const CROP_ADVISORY: Record<string, Omit<AgroAdvisory, 'suitableSoils'>> = {
  Paddy: {
    idealSowingWindow: 'June-July (Kharif) or Nov-Dec (Rabi)',
    spacing: '20cm x 15cm',
    nutrients: 'NPK 120:60:40 kg/ha, nitrogen applied in 3 splits',
  },
  Maize: {
    idealSowingWindow: 'June-July (Kharif) or Oct-Nov (Rabi)',
    spacing: '60cm x 20cm',
    nutrients: 'NPK 150:75:60 kg/ha, basal + top-dress at knee-high and tasseling',
  },
  Cotton: {
    idealSowingWindow: 'May-June',
    spacing: '90cm x 60cm',
    nutrients: 'NPK 100:50:50 kg/ha, nitrogen in split doses',
  },
  Groundnut: {
    idealSowingWindow: 'June-July (Kharif) or Jan-Feb (summer)',
    spacing: '30cm x 10cm',
    nutrients: 'NPK 20:40:40 kg/ha basal, gypsum at pegging stage',
  },
  Tomato: {
    idealSowingWindow: 'June-July or Oct-Nov (irrigated crop, wider window)',
    spacing: '60cm x 45cm',
    nutrients: 'NPK 150:75:75 kg/ha, calcium/boron supplementation for fruit quality',
  },
};
const DEFAULT_ADVISORY: Omit<AgroAdvisory, 'suitableSoils'> = {
  idealSowingWindow: 'Consult the local agriculture extension office for this crop',
  spacing: 'Follow variety-specific seed packet guidance',
  nutrients: 'A soil-test based NPK recommendation is advised',
};

/**
 * Pure calculation logic — deliberately dependency-free (no pool/DB import)
 * so the wizard's "seed quantity requirement" rule can be unit- and
 * mutation-tested in isolation from the I/O half of drafting a crop plan.
 */
export function calculateSeedQuantity(crop: string, targetAreaAcres: number): number {
  return Math.round(targetAreaAcres * seedRateForCrop(crop) * 100) / 100;
}

export function getAgroAdvisory(crop: string): AgroAdvisory {
  const advisory = CROP_ADVISORY[crop] ?? DEFAULT_ADVISORY;
  return { ...advisory, suitableSoils: CROP_SOIL_SUITABILITY[crop] ?? [] };
}

export function getSuitableSoilsForCrop(crop: string): SoilType[] {
  return CROP_SOIL_SUITABILITY[crop] ?? [];
}
