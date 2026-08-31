export const PARTNER_LINK_STATUSES = ['pending', 'active', 'suspended', 'terminated'] as const;
export type PartnerLinkStatus = (typeof PARTNER_LINK_STATUSES)[number];

export interface PartnerLinkRow {
  id: string;
  requesting_org_id: string;
  partner_org_id: string;
  status: PartnerLinkStatus;
  requested_by: string;
  approved_by: string | null;
  requested_at: string;
  approved_at: string | null;
  notes: string | null;
}

export const PARTNER_ORDER_STATUSES = [
  'requested',
  'confirmed',
  'rejected',
  'shipped',
  'received',
  'disputed',
  'cancelled',
] as const;
export type PartnerOrderStatus = (typeof PARTNER_ORDER_STATUSES)[number];

export interface PartnerOrderRow {
  id: string;
  order_number: string;
  buyer_org_id: string;
  partner_org_id: string;
  seed_lot_id: string;
  crop: string;
  variety: string;
  quantity_requested: number;
  unit: string;
  status: PartnerOrderStatus;
  allocation_id: string | null;
  received_seed_lot_id: string | null;
  requested_by: string;
  confirmed_by: string | null;
  rejection_reason: string | null;
  dispute_reason: string | null;
  quality_rating_at_receipt: number | null;
  on_time: boolean | null;
  notes: string | null;
  requested_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePartnerOrderInput {
  partnerOrgId: string;
  seedLotId: string;
  quantity: number;
  notes?: string;
}

export interface ReceiveOrderInput {
  qualityRating: number;
  onTime: boolean;
  notes?: string;
}

export interface PartnerPerformanceRatingRow {
  id: string;
  buyer_org_id: string;
  partner_org_id: string;
  total_orders: number;
  fulfilled_orders: number;
  disputed_orders: number;
  cancelled_orders: number;
  on_time_orders: number;
  avg_quality_rating: number | null;
  overall_score: number | null;
  last_order_at: string | null;
  updated_at: string;
}

export interface PartnerInventorySyncLogRow {
  id: string;
  buyer_org_id: string;
  partner_org_id: string;
  synced_by: string;
  lots_synced: number;
  total_available_quantity: number;
  synced_at: string;
}

export interface PartnerCatalogEntry {
  id: string;
  lot_code: string;
  crop: string;
  variety: string;
  stage: string;
  quantity_available: number;
  unit: string;
  organization_id: string;
  production_date: string;
}

export interface QualityComparisonEntry {
  seedLotId: string;
  lotCode: string;
  organizationId: string;
  organizationName: string;
  crop: string;
  variety: string;
  quantityAvailable: number;
  purity: { averagePercent: number | null; testCount: number };
  viability: { averagePercent: number | null; testCount: number };
  germination: { averagePercent: number | null; testCount: number };
}
