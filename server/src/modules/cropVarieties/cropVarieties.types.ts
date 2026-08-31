export const CROP_VARIETY_STATUSES = ['draft', 'reviewed', 'approved'] as const;
export type CropVarietyStatus = (typeof CROP_VARIETY_STATUSES)[number];

// Approving is deliberately Admin-only (unlike the breeding-committee
// varieties.ts catalog, which lets Breeders review peers' submissions) —
// this simpler master-data workflow has no committee, just a single
// gatekeeper sign-off.
export const CROP_VARIETY_APPROVER_ROLES = ['Admin'];

export interface CropVariety {
  id: string;
  name: string;
  crop: string;
  description: string | null;
  category: string | null;
  breeder_organization_id: string | null;
  status: CropVarietyStatus;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCropVarietyInput {
  name: string;
  crop: string;
  description?: string;
  category?: string;
  breederOrganizationId?: string | null;
}

export interface UpdateCropVarietyInput {
  name?: string;
  crop?: string;
  description?: string;
  category?: string;
  breederOrganizationId?: string | null;
}

export interface RejectCropVarietyInput {
  reason: string;
}
