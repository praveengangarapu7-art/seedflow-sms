// Pure logic — zero DB imports, same reasoning as the other scoring engines
// in this app. "Identify superior germplasm pools" is a ranking, not a
// deviation-from-neutral score (unlike demandScoring.ts) — a root Breeder
// lot's germplasm score is a plain 0-100 "how good has this lineage been,"
// weighted only over whichever signals actually have data.

export interface GermplasmScoreInputs {
  /** Average germination % across this lineage's Certified-stage descendants, or null if none tested. */
  avgGerminationPercent?: number | null;
  /** Total descendant quantity produced divided by the root lot's own quantity — how much this lineage multiplied into, or null if no descendants exist yet. */
  multiplicationRatio?: number | null;
  /** How many descendant lots (any stage) trace back to this root — breeding breadth, or null/0 if none. */
  descendantCount?: number | null;
}

export interface GermplasmSignalContribution {
  signal: string;
  weight: number;
  normalizedValue: number;
}

export interface GermplasmScoreResult {
  score: number;
  breakdown: GermplasmSignalContribution[];
}

const WEIGHTS = { germination: 50, multiplicationRatio: 30, descendantBreadth: 20 };

// A multiplication ratio of 5x or more (each unit of Breeder seed becoming
// 5+ units by the time it reaches its furthest descendants) already
// represents excellent multiplication efficiency in seed production — capped
// there so one exceptional lineage can't dominate the whole ranking.
const MULTIPLICATION_RATIO_CAP = 5;
// Twenty or more descendant lots is treated as full breeding breadth for
// the same reason — beyond that, more descendants doesn't mean "better
// germplasm," it may just mean an older or more actively multiplied lineage.
const DESCENDANT_COUNT_CAP = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeGermplasmScore(input: GermplasmScoreInputs): GermplasmScoreResult {
  const breakdown: GermplasmSignalContribution[] = [];

  if (input.avgGerminationPercent != null) {
    breakdown.push({ signal: 'germination', weight: WEIGHTS.germination, normalizedValue: clamp(input.avgGerminationPercent, 0, 100) });
  }
  if (input.multiplicationRatio != null) {
    breakdown.push({
      signal: 'multiplicationRatio',
      weight: WEIGHTS.multiplicationRatio,
      normalizedValue: clamp((input.multiplicationRatio / MULTIPLICATION_RATIO_CAP) * 100, 0, 100),
    });
  }
  if (input.descendantCount != null) {
    breakdown.push({
      signal: 'descendantBreadth',
      weight: WEIGHTS.descendantBreadth,
      normalizedValue: clamp((input.descendantCount / DESCENDANT_COUNT_CAP) * 100, 0, 100),
    });
  }

  if (breakdown.length === 0) {
    return { score: 0, breakdown: [] };
  }

  const totalWeight = breakdown.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = breakdown.reduce((sum, c) => sum + c.normalizedValue * c.weight, 0);
  const score = Math.round((weightedSum / totalWeight) * 10) / 10;

  return { score, breakdown };
}
