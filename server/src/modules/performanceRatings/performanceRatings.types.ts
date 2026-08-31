export interface SubmitRatingInput {
  farmerId: string;
  seedRequestId?: string;
  crop: string;
  variety: string;
  germinationRating: number;
  yieldRating: number;
  overallRating: number;
  harvestedQuantity?: number;
  feedbackText?: string;
}

export interface PerformanceRatingRow {
  id: string;
  farmer_id: string;
  seed_request_id: string | null;
  crop: string;
  variety: string;
  germination_rating: number;
  yield_rating: number;
  overall_rating: number;
  harvested_quantity: number | null;
  feedback_text: string | null;
  recorded_by: string;
  created_at: string;
}

export interface VarietyEffectivenessEntry {
  crop: string;
  variety: string;
  totalFarmersServed: number;
  farmersRated: number;
  // % of ALL farmers in the system who have received this variety at least once.
  adoptionRate: number;
  // % of served farmers who reported feedback at all.
  reportingRate: number;
  // % of served farmers who requested this variety more than once — a
  // satisfaction proxy independent of the rating scores themselves.
  repeatRequestRate: number;
  avgGerminationRating: number | null;
  avgYieldRating: number | null;
  avgOverallRating: number | null;
  ratingCount: number;
}
