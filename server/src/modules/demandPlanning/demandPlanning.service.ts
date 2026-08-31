import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { broadcast } from '../../ws/server';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import type {
  DemandForecastEntry,
  DemandForecastResult,
  GeneratePurchaseOrderInput,
  InventoryOptimizationEntry,
  PlanningItemInput,
  PurchaseOrderRow,
} from './demandPlanning.types';

// kg of seed required per acre — a simplification for demo purposes, not an
// agronomic reference; unknown crops fall back to DEFAULT_SEED_RATE_PER_ACRE.
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

function monthsBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

/**
 * Groups planning items by crop+variety+season, sums their area, computes
 * required seed quantity from the per-acre rate, and compares it against
 * real available Certified-stage inventory for that variety. Items whose
 * sowing date falls outside the horizon are dropped entirely — this is a
 * forward-looking forecast, not a backlog.
 */
export async function computeDemandForecast(
  items: PlanningItemInput[],
  horizonMonths: number,
): Promise<DemandForecastResult> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('At least one planning item is required');
  }

  const now = new Date();
  const grouped = new Map<
    string,
    { crop: string; variety: string; season: string; totalArea: number; monthsAhead: number }
  >();

  for (const item of items) {
    if (!item.crop?.trim() || !item.variety?.trim() || !item.sowingDate) continue;
    const monthsAhead = Math.max(0, monthsBetween(now, new Date(item.sowingDate)));
    if (monthsAhead > horizonMonths) continue;

    const key = `${item.crop}::${item.variety}::${item.season}`;
    const existing = grouped.get(key);
    const area = Number(item.targetArea) || 0;
    if (existing) {
      existing.totalArea += area;
      existing.monthsAhead = Math.min(existing.monthsAhead, monthsAhead);
    } else {
      grouped.set(key, { crop: item.crop, variety: item.variety, season: item.season, totalArea: area, monthsAhead });
    }
  }

  const entries: DemandForecastEntry[] = [];
  for (const group of grouped.values()) {
    const seedRate = seedRateForCrop(group.crop);
    const requiredQuantity = Math.round(group.totalArea * seedRate * 100) / 100;

    const availabilityResult = await pool.query<{ total_available: string }>(
      `SELECT COALESCE(SUM(quantity_total - quantity_allocated), 0) AS total_available
       FROM seed_lots WHERE crop = $1 AND variety = $2 AND stage = 'Certified' AND status = 'active'`,
      [group.crop, group.variety],
    );
    const availableQuantity = Number(availabilityResult.rows[0].total_available);
    const gapQuantity = Math.max(0, Math.round((requiredQuantity - availableQuantity) * 100) / 100);

    entries.push({
      crop: group.crop,
      variety: group.variety,
      season: group.season,
      monthsAhead: group.monthsAhead,
      urgency: group.monthsAhead <= 3 ? 'urgent' : 'planned',
      seedRatePerAcre: seedRate,
      totalAreaAcres: group.totalArea,
      requiredQuantity,
      availableQuantity,
      gapQuantity,
      unit: 'kg',
    });
  }

  entries.sort((a, b) => a.monthsAhead - b.monthsAhead || b.gapQuantity - a.gapQuantity);

  return { horizonMonths, generatedAt: now.toISOString(), entries };
}

/**
 * Prefers the organization that owns a Breeder-stage lot for this exact
 * variety (so the PO goes to whoever actually breeds it); falls back to any
 * registered breeder organization.
 */
async function findBreederOrganizationId(crop: string, variety: string): Promise<string> {
  // A seed lot's stage ('Breeder') describes the seed class, not who owns
  // it — nothing stops a Producer org from holding a Breeder-stage lot in
  // this data model. Require the owning organization's *type* to actually
  // be 'breeder' too, or a PO could get routed to a non-breeder org.
  const specific = await pool.query<{ organization_id: string }>(
    `SELECT sl.organization_id
     FROM seed_lots sl
     JOIN organizations o ON o.id = sl.organization_id
     WHERE sl.crop = $1 AND sl.variety = $2 AND sl.stage = 'Breeder' AND o.type = 'breeder'
     LIMIT 1`,
    [crop, variety],
  );
  if (specific.rows[0]?.organization_id) return specific.rows[0].organization_id;

  const anyBreeder = await pool.query<{ id: string }>("SELECT id FROM organizations WHERE type = 'breeder' ORDER BY name ASC LIMIT 1");
  if (anyBreeder.rows[0]?.id) return anyBreeder.rows[0].id;

  throw new ValidationError(`No breeder organization is registered to receive a purchase order for ${variety}`);
}

async function generatePoNumber(client: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const countResult = await client.query<{ count: string }>(
    'SELECT COUNT(*)::int AS count FROM purchase_orders WHERE po_number LIKE $1',
    [`PO-${year}-%`],
  );
  const next = Number(countResult.rows[0].count) + 1;
  return `PO-${year}-${String(next).padStart(4, '0')}`;
}

const LEAD_TIME_DAYS = 60;
const SAFETY_MARGIN = 1.1;

export async function generatePurchaseOrder(
  input: GeneratePurchaseOrderInput,
  user: AuthenticatedUser,
): Promise<PurchaseOrderRow> {
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.variety?.trim()) throw new ValidationError('variety is required');
  if (!Number.isFinite(Number(input.quantity)) || Number(input.quantity) <= 0) {
    throw new ValidationError('quantity must be a positive number');
  }

  const organizationId = await findBreederOrganizationId(input.crop, input.variety);
  const quantityWithBuffer = Math.round(Number(input.quantity) * SAFETY_MARGIN * 100) / 100;
  const expectedDelivery = new Date();
  expectedDelivery.setDate(expectedDelivery.getDate() + LEAD_TIME_DAYS);

  const created = await withTransaction(async (client) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const poNumber = await generatePoNumber(client);
      try {
        const insertResult = await client.query<PurchaseOrderRow>(
          `INSERT INTO purchase_orders (po_number, crop, variety, organization_id, quantity_requested, requested_by, expected_delivery_date, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'auto_generated')
           RETURNING *`,
          [
            poNumber,
            input.crop.trim(),
            input.variety.trim(),
            organizationId,
            quantityWithBuffer,
            user.email,
            expectedDelivery.toISOString().slice(0, 10),
          ],
        );
        const row = insertResult.rows[0];

        await insertAuditLog(client, {
          entityType: 'purchase_order',
          entityId: row.id,
          action: 'CREATE',
          performedBy: user.email,
          afterState: row,
          metadata: { autoGenerated: true },
        });

        return row;
      } catch (error) {
        if ((error as { code?: string }).code === '23505') continue; // po_number collision, retry
        throw error;
      }
    }
    throw new ConflictError('Unable to generate a unique purchase order number — please retry');
  });

  broadcast('PURCHASE_ORDER_CREATED', {
    id: created.id,
    poNumber: created.po_number,
    crop: created.crop,
    variety: created.variety,
    quantity: created.quantity_requested,
    organizationId: created.organization_id,
  });

  return created;
}

export async function listPurchaseOrders(filters: { status?: string; crop?: string }): Promise<PurchaseOrderRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<PurchaseOrderRow>(`SELECT * FROM purchase_orders ${whereClause} ORDER BY created_at DESC`, values);
  return result.rows;
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrderRow> {
  const result = await pool.query<PurchaseOrderRow>('SELECT * FROM purchase_orders WHERE id = $1', [id]);
  const po = result.rows[0];
  if (!po) throw new NotFoundError(`Purchase order ${id} not found`);
  return po;
}

// Who may move a PO TO a given status: procurement (Producer/Warehouse
// Manager) drives sent/cancelled, the receiving breeder drives
// acknowledged/fulfilled. Admin can always act.
const STATUS_APPROVER_ROLES: Record<string, string[]> = {
  sent: ['Admin', 'Producer', 'Warehouse Manager'],
  acknowledged: ['Admin', 'Breeder'],
  fulfilled: ['Admin', 'Breeder'],
  cancelled: ['Admin', 'Producer', 'Warehouse Manager'],
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['acknowledged', 'cancelled'],
  acknowledged: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
};

export async function updatePurchaseOrderStatus(
  id: string,
  targetStatus: string,
  user: AuthenticatedUser,
  extra: { fulfilledSeedLotId?: string; notes?: string },
): Promise<PurchaseOrderRow> {
  if (!VALID_TRANSITIONS[targetStatus]) throw new ValidationError(`Unknown status: ${targetStatus}`);
  const allowedRoles = STATUS_APPROVER_ROLES[targetStatus];
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(`Moving a purchase order to "${targetStatus}" requires one of these roles: ${allowedRoles.join(', ')}`);
  }

  const updated = await withTransaction(async (client) => {
    const result = await client.query<PurchaseOrderRow>('SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE', [id]);
    const po = result.rows[0];
    if (!po) throw new NotFoundError(`Purchase order ${id} not found`);

    const allowedNext = VALID_TRANSITIONS[po.status] ?? [];
    if (!allowedNext.includes(targetStatus)) {
      throw new ConflictError(
        `Purchase order is "${po.status}" — cannot move to "${targetStatus}" (allowed: ${allowedNext.join(', ') || 'none, this is terminal'})`,
      );
    }

    if (extra.fulfilledSeedLotId) {
      const lotCheck = await client.query('SELECT id FROM seed_lots WHERE id = $1', [extra.fulfilledSeedLotId]);
      if (lotCheck.rows.length === 0) throw new ValidationError(`Seed lot ${extra.fulfilledSeedLotId} not found`);
    }

    const isFulfilling = targetStatus === 'fulfilled';
    const updateResult = await client.query<PurchaseOrderRow>(
      `UPDATE purchase_orders SET
         status = $1,
         actual_delivery_date = CASE WHEN $2 THEN CURRENT_DATE ELSE actual_delivery_date END,
         fulfilled_seed_lot_id = COALESCE($3, fulfilled_seed_lot_id),
         notes = COALESCE($4, notes)
       WHERE id = $5
       RETURNING *`,
      [targetStatus, isFulfilling, extra.fulfilledSeedLotId ?? null, extra.notes ?? null, id],
    );
    const row = updateResult.rows[0];

    await insertAuditLog(client, {
      entityType: 'purchase_order',
      entityId: id,
      action: 'STATUS_CHANGE',
      performedBy: user.email,
      beforeState: { status: po.status },
      afterState: { status: row.status },
      metadata: { poNumber: po.po_number },
    });

    return row;
  });

  broadcast('PURCHASE_ORDER_STATUS_CHANGED', {
    id: updated.id,
    poNumber: updated.po_number,
    status: updated.status,
    changedBy: user.email,
  });

  return updated;
}

export async function getInventoryOptimization(): Promise<InventoryOptimizationEntry[]> {
  const lotsResult = await pool.query(
    "SELECT id, lot_code, crop, variety, quantity_total, quantity_allocated, low_stock_threshold FROM seed_lots WHERE stage = 'Certified' AND status = 'active' ORDER BY crop, variety",
  );
  const poResult = await pool.query<PurchaseOrderRow>(
    "SELECT * FROM purchase_orders WHERE status IN ('draft', 'sent', 'acknowledged') ORDER BY created_at DESC",
  );

  const covered = new Set<string>();
  const entries: InventoryOptimizationEntry[] = lotsResult.rows.map((lot) => {
    covered.add(`${lot.crop}::${lot.variety}`);
    const available = Number(lot.quantity_total) - Number(lot.quantity_allocated);
    const openPurchaseOrders = poResult.rows
      .filter((po) => po.crop === lot.crop && po.variety === lot.variety)
      .map((po) => ({ id: po.id, poNumber: po.po_number, status: po.status, quantityRequested: Number(po.quantity_requested) }));

    return {
      seedLotId: lot.id,
      lotCode: lot.lot_code,
      crop: lot.crop,
      variety: lot.variety,
      quantityAvailable: available,
      lowStockThreshold: Number(lot.low_stock_threshold),
      isLowStock: available <= Number(lot.low_stock_threshold),
      openPurchaseOrders,
    };
  });

  // A variety with an open PO but zero Certified inventory has no lot row
  // to attach to above — that's the most critical stockout case, so add a
  // synthetic zero-inventory entry instead of letting it go unlisted.
  const zeroInventoryKeys = new Set<string>();
  for (const po of poResult.rows) {
    const key = `${po.crop}::${po.variety}`;
    if (covered.has(key) || zeroInventoryKeys.has(key)) continue;
    zeroInventoryKeys.add(key);
    entries.push({
      seedLotId: null,
      lotCode: null,
      crop: po.crop,
      variety: po.variety,
      quantityAvailable: 0,
      lowStockThreshold: 0,
      isLowStock: true,
      openPurchaseOrders: poResult.rows
        .filter((p) => p.crop === po.crop && p.variety === po.variety)
        .map((p) => ({ id: p.id, poNumber: p.po_number, status: p.status, quantityRequested: Number(p.quantity_requested) })),
    });
  }

  return entries;
}
