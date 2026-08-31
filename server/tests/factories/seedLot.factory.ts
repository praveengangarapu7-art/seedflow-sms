import { pool } from '../../src/db/pool';
import { createTestOrganization } from './organization.factory';
import { uniqueSuffix } from './ids';

export interface TestSeedLot {
  id: string;
  lot_code: string;
  crop: string;
  variety: string;
  stage: string;
  quantity_total: number;
  quantity_allocated: number;
  unit: string;
  status: string;
  organization_id: string | null;
  low_stock_threshold: number;
  production_date: string;
  available_for_partner_order: boolean;
}

export interface SeedLotOverrides {
  lotCode?: string;
  crop?: string;
  variety?: string;
  parentLotId?: string | null;
  stage?: 'Breeder' | 'Foundation' | 'Certified';
  quantityTotal?: number;
  quantityAllocated?: number;
  unit?: string;
  status?: 'active' | 'archived';
  organizationId?: string;
  lowStockThreshold?: number;
  productionDate?: string;
  availableForPartnerOrder?: boolean;
}

/**
 * Inserts directly rather than going through seedLots.service — factories
 * need to produce arbitrary, possibly business-rule-adjacent fixture rows
 * (e.g. a specific quantity_allocated for a low-stock scenario) that the
 * real create path wouldn't accept as input, since quantity_allocated is
 * normally only ever moved by allocate()/release().
 */
export async function createTestSeedLot(overrides: SeedLotOverrides = {}): Promise<TestSeedLot> {
  const suffix = uniqueSuffix();
  const organizationId = overrides.organizationId ?? (await createTestOrganization()).id;

  const result = await pool.query<TestSeedLot>(
    `INSERT INTO seed_lots (lot_code, crop, variety, parent_lot_id, stage, quantity_total, quantity_allocated, unit, status, organization_id, low_stock_threshold, production_date, available_for_partner_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::date, CURRENT_DATE), $13)
     RETURNING id, lot_code, crop, variety, stage, quantity_total, quantity_allocated, unit, status, organization_id, low_stock_threshold, production_date, available_for_partner_order`,
    [
      overrides.lotCode ?? `SL-TEST-${suffix}`,
      overrides.crop ?? 'Paddy',
      overrides.variety ?? `TestVariety-${suffix}`,
      overrides.parentLotId ?? null,
      overrides.stage ?? 'Certified',
      overrides.quantityTotal ?? 1000,
      overrides.quantityAllocated ?? 0,
      overrides.unit ?? 'kg',
      overrides.status ?? 'active',
      organizationId,
      overrides.lowStockThreshold ?? 100,
      overrides.productionDate ?? null,
      overrides.availableForPartnerOrder ?? false,
    ],
  );
  return result.rows[0];
}
