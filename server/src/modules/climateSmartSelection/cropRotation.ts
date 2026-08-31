// Pure logic — zero DB imports, same reasoning as the other scoring
// engines in this app. This applies one real, well-established agronomic
// principle (cereals deplete soil nitrogen; legumes fix it back in, so
// alternating between them is good rotation practice; repeating the same
// crop or crop family back-to-back builds up soil-borne pests/disease) to
// the same small demo-scale crop universe cropPlanning.validation.ts
// already defines suitability/advisory data for — not a general-purpose
// agronomy engine, and explicitly documented as such.

export type CropCategory = 'cereal' | 'legume' | 'fiber' | 'vegetable';

// Mirrors the crop universe in cropPlanning.validation.ts's CROP_SOIL_SUITABILITY/CROP_ADVISORY.
const CROP_CATEGORIES: Record<string, CropCategory> = {
  Paddy: 'cereal',
  Maize: 'cereal',
  Cotton: 'fiber',
  Groundnut: 'legume',
  Tomato: 'vegetable',
};

const ROTATION_REASON: Record<CropCategory, string> = {
  cereal: 'a cereal, which draws down soil nitrogen — a legume next replenishes it',
  legume: 'a legume, which fixes nitrogen into the soil — a cereal next can take advantage of that',
  fiber: 'a fiber crop with heavy nutrient draw — a legume next helps restore soil fertility',
  vegetable: 'a vegetable crop — rotating to a different family reduces pest/disease carryover',
};

export interface CropRotationSuggestion {
  crop: string;
  reason: string;
}

/**
 * Suggests 1-2 crops (from this app's known crop universe) that
 * complement whatever was planted last, and explicitly flags repeating
 * the same crop or crop family as a caution rather than suggesting it.
 */
export function suggestCropRotation(lastCrop: string | null): CropRotationSuggestion[] {
  if (!lastCrop || !(lastCrop in CROP_CATEGORIES)) {
    return [];
  }

  const lastCategory = CROP_CATEGORIES[lastCrop];
  const reason = `Your last tracked crop was ${lastCrop}, ${ROTATION_REASON[lastCategory]}.`;

  // Excluding lastCrop's own category already excludes lastCrop itself —
  // every crop belongs to exactly one category, and lastCrop's category is
  // lastCategory by definition — so no separate crop!==lastCrop check is needed.
  const candidates = Object.entries(CROP_CATEGORIES).filter(([, category]) => category !== lastCategory);

  // Legumes are the single most agronomically valuable follow-up after any
  // non-legume crop (real nitrogen fixation), so they're always surfaced
  // first when available; everything else is a same-priority alternative.
  // A partition (rather than a sort comparator) makes that ordering obvious
  // and leaves no ambiguous tie-breaking case to get subtly wrong.
  const legumes = candidates.filter(([, category]) => category === 'legume');
  const nonLegumes = candidates.filter(([, category]) => category !== 'legume');

  return [...legumes, ...nonLegumes].slice(0, 2).map(([crop]) => ({ crop, reason }));
}
