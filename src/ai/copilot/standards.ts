import { lower } from './util';

/**
 * Seed certification working values used by the AI rules.
 *
 * These follow the commonly applied Indian Minimum Seed Certification
 * Standards (Seeds Act 1966 / Seeds Rules 1968) and match the minimums the
 * server's lab-risk engine uses. Standards differ by seed class and are
 * revised, so the AI always tells users to confirm against the current
 * notified standard; treat these as configuration, not law.
 */
export interface CropStandard {
  germination: number; // minimum %
  purity: number; // minimum physical purity %
  moisture: number; // maximum % (ordinary containers)
  /** Isolation distance in metres: [foundation, certified]. */
  isolation: [number, number] | null;
  /** Typical seed rate in kg per acre, for allocation sanity checks. */
  seedRateKgPerAcre: [number, number] | null;
  /** Typical germination loss per month in ambient storage, in % points. */
  monthlyDecline: number;
}

const STANDARDS: Record<string, CropStandard> = {
  maize: { germination: 90, purity: 98, moisture: 12, isolation: [400, 200], seedRateKgPerAcre: [7, 10], monthlyDecline: 0.8 },
  cotton: { germination: 65, purity: 98, moisture: 10, isolation: [50, 30], seedRateKgPerAcre: [0.8, 1.5], monthlyDecline: 1.4 },
  paddy: { germination: 80, purity: 98, moisture: 13, isolation: [3, 3], seedRateKgPerAcre: [8, 24], monthlyDecline: 0.8 },
  wheat: { germination: 85, purity: 98, moisture: 12, isolation: [3, 3], seedRateKgPerAcre: [40, 50], monthlyDecline: 0.7 },
  soybean: { germination: 70, purity: 98, moisture: 12, isolation: [3, 3], seedRateKgPerAcre: [25, 32], monthlyDecline: 2.0 },
  groundnut: { germination: 70, purity: 96, moisture: 9, isolation: [3, 3], seedRateKgPerAcre: [40, 60], monthlyDecline: 1.8 },
  sunflower: { germination: 70, purity: 98, moisture: 9, isolation: [600, 400], seedRateKgPerAcre: [2, 4], monthlyDecline: 1.5 },
  mustard: { germination: 85, purity: 97, moisture: 8, isolation: [200, 100], seedRateKgPerAcre: [1.5, 2], monthlyDecline: 1.0 },
  jowar: { germination: 75, purity: 98, moisture: 12, isolation: [400, 200], seedRateKgPerAcre: [4, 5], monthlyDecline: 0.8 },
  bajra: { germination: 75, purity: 98, moisture: 12, isolation: [1000, 200], seedRateKgPerAcre: [1.5, 2], monthlyDecline: 0.8 },
  tomato: { germination: 70, purity: 98, moisture: 8, isolation: [50, 25], seedRateKgPerAcre: [0.05, 0.2], monthlyDecline: 0.8 },
  chilli: { germination: 60, purity: 98, moisture: 8, isolation: [400, 200], seedRateKgPerAcre: [0.1, 0.5], monthlyDecline: 1.2 },
  onion: { germination: 70, purity: 98, moisture: 8, isolation: [1000, 500], seedRateKgPerAcre: [3, 4], monthlyDecline: 2.0 },
};

const ALIASES: Record<string, string> = {
  rice: 'paddy', corn: 'maize', sorghum: 'jowar', 'pearl millet': 'bajra', 'rapeseed': 'mustard', capsicum: 'chilli', chili: 'chilli',
};

export const DEFAULT_STANDARD: CropStandard = {
  germination: 80, purity: 98, moisture: 12, isolation: null, seedRateKgPerAcre: null, monthlyDecline: 0.8,
};

/** Resolves a crop name (any case, aliases, "Cotton hybrid" etc.) to its standard. */
export function cropStandard(crop: unknown): { key: string | null; std: CropStandard } {
  const c = lower(crop);
  if (!c) return { key: null, std: DEFAULT_STANDARD };
  for (const [alias, key] of Object.entries(ALIASES)) if (c.includes(alias)) return { key, std: STANDARDS[key] };
  for (const key of Object.keys(STANDARDS)) if (c.includes(key)) return { key, std: STANDARDS[key] };
  return { key: null, std: DEFAULT_STANDARD };
}

/** Guesses the crop from a lot or batch code such as LOT-COT-2026-0142. */
export function cropFromCode(code: unknown): string | null {
  const c = lower(code);
  const map: Record<string, string> = { '-cot-': 'cotton', '-mz-': 'maize', '-maz-': 'maize', '-ric-': 'paddy', '-pad-': 'paddy', '-wht-': 'wheat', '-soy-': 'soybean', '-gnt-': 'groundnut', '-tom-': 'tomato', '-chl-': 'chilli', '-sun-': 'sunflower', '-mus-': 'mustard' };
  for (const [frag, crop] of Object.entries(map)) if (c.includes(frag)) return crop;
  return null;
}

/** Seed storage: Harrington's rule of thumb (°F + RH% should stay under 100). */
export function harringtonSum(tempC: number, rh: number): number {
  return Math.round(tempC * 1.8 + 32 + rh);
}

export const STANDARDS_NOTE = 'Thresholds follow the commonly used Indian Minimum Seed Certification Standards; confirm against the current notified standard for this seed class.';
