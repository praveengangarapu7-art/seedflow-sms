// Pure scoring logic — deliberately zero imports of pool/db, mirroring
// authenticity/hashChain.ts's separation of algorithmic logic from DB
// orchestration. Kept here so it can be unit-tested (and mutation-tested)
// directly, independent of the aggregate query that feeds it.

export interface OrgRatingInput {
  totalOrders: number;
  fulfilledOrders: number;
  onTimeOrders: number;
  avgQualityRating: number | null;
}

/**
 * Composite score out of 100: 40% weight on fulfillment reliability (did a
 * shipped order actually arrive without a dispute), 30% on delivery
 * timeliness, 30% on the buyer's reported quality rating. Weighted toward
 * fulfillment since a partner who ships nothing on time and disputed is
 * worse than one who's merely slow — a single bad dispute should visibly
 * hurt more than a single late (but undisputed) delivery. Returns null when
 * there's no completed-order history yet to score.
 */
export function computeOverallScore(input: OrgRatingInput): number | null {
  if (input.totalOrders <= 0) return null;

  const fulfillmentRate = input.fulfilledOrders / input.totalOrders;
  const onTimeRate = input.onTimeOrders / input.totalOrders;
  // No quality ratings recorded yet (e.g. every order so far is disputed
  // with no quality score submitted) falls back to the fulfillment rate
  // rather than treating unknown quality as zero, which would double-punish
  // an otherwise-reliable partner for a gap in reported data.
  const qualityScore = input.avgQualityRating !== null ? input.avgQualityRating / 5 : fulfillmentRate;

  return Math.round((0.4 * fulfillmentRate + 0.3 * onTimeRate + 0.3 * qualityScore) * 1000) / 10;
}
