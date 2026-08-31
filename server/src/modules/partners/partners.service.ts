import { randomUUID } from 'crypto';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { assertOwnsOrganization } from '../../auth/ownership';
import { ConflictError, ForbiddenError, InsufficientQuantityError, NotFoundError, ValidationError } from '../../errors';

import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { allocate, release } from '../allocations/allocations.service';
import { getQualityMetrics } from '../compliance/compliance.service';
import { createSeedLot, getSeedLotById, updateSeedLot } from '../seedLots/seedLots.service';
import { withAvailability, type SeedLot } from '../seedLots/seedLots.types';
import { computeOverallScore } from './partnerScoring';
import type {
  CreatePartnerOrderInput,
  PartnerCatalogEntry,
  PartnerInventorySyncLogRow,
  PartnerLinkRow,
  PartnerLinkStatus,
  PartnerOrderRow,
  PartnerPerformanceRatingRow,
  QualityComparisonEntry,
  ReceiveOrderInput,
} from './partners.types';

// Auto-confirming an order reserves stock on the PARTNER's own lot — an
// action the partner org's staff would take, not something the ordering
// org's user is authorized to do to another org's inventory (allocate()
// enforces exactly that ownership check). Since this step is genuinely
// system-triggered (no partner staff clicked anything), it's attributed to
// a synthetic system actor rather than borrowing the buyer's identity,
// mirroring the SYSTEM_USER pattern used for the hash-chain backfill script.
const SYSTEM_USER: AuthenticatedUser = {
  id: 'system',
  email: 'system:partner-auto-confirm@seedflow.internal',
  role: 'Admin',
  organizationId: null,
};

// Same exemption allocations.service.ts already grants for allocate/release:
// a Warehouse Manager distributes and receives stock across organizations
// as a cross-org logistics role, so they act on behalf of whichever
// organization a partner order names, not only their own.
const OWNERSHIP_EXEMPT_ROLES = ['Admin', 'Warehouse Manager'];

function assertActsForOrg(user: AuthenticatedUser, organizationId: string, message: string): void {
  if (OWNERSHIP_EXEMPT_ROLES.includes(user.role)) return;
  assertOwnsOrganization(user, organizationId, message);
}

async function getOrganizationName(organizationId: string): Promise<string> {
  const result = await pool.query<{ name: string }>('SELECT name FROM organizations WHERE id = $1', [organizationId]);
  if (!result.rows[0]) throw new NotFoundError(`Organization ${organizationId} not found`);
  return result.rows[0].name;
}

// --- Partner links (the handshake that must exist before orders can flow) ---

export async function requestPartnerLink(
  requestingOrgId: string,
  partnerOrgId: string,
  user: AuthenticatedUser,
  notes?: string,
): Promise<PartnerLinkRow> {
  if (!requestingOrgId || !partnerOrgId) throw new ValidationError('requestingOrgId and partnerOrgId are required');
  if (requestingOrgId === partnerOrgId) throw new ValidationError('An organization cannot partner with itself');
  await getOrganizationName(requestingOrgId);
  await getOrganizationName(partnerOrgId);

  return withTransaction(async (client) => {
    const existing = await client.query<PartnerLinkRow>(
      'SELECT * FROM partner_links WHERE requesting_org_id = $1 AND partner_org_id = $2',
      [requestingOrgId, partnerOrgId],
    );
    if (existing.rows[0]) {
      throw new ConflictError(`A partner link already exists between these organizations (status: ${existing.rows[0].status})`);
    }

    const result = await client.query<PartnerLinkRow>(
      `INSERT INTO partner_links (requesting_org_id, partner_org_id, requested_by, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [requestingOrgId, partnerOrgId, user.email, notes?.trim() || null],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'partner_link',
      entityId: row.id,
      action: 'REQUEST',
      performedBy: user.email,
      afterState: row,
    });
    return row;
  });
}

async function transitionLinkStatus(
  linkId: string,
  fromStatuses: PartnerLinkStatus[],
  toStatus: PartnerLinkStatus,
  user: AuthenticatedUser,
  action: string,
): Promise<PartnerLinkRow> {
  return withTransaction(async (client) => {
    const existingResult = await client.query<PartnerLinkRow>('SELECT * FROM partner_links WHERE id = $1 FOR UPDATE', [linkId]);
    const link = existingResult.rows[0];
    if (!link) throw new NotFoundError(`Partner link ${linkId} not found`);
    if (!fromStatuses.includes(link.status)) {
      throw new ConflictError(`Partner link is "${link.status}" — expected one of: ${fromStatuses.join(', ')}`);
    }

    const isApproval = toStatus === 'active' && link.status === 'pending';
    const result = await client.query<PartnerLinkRow>(
      `UPDATE partner_links SET status = $1, approved_by = COALESCE($2, approved_by), approved_at = COALESCE($3, approved_at)
       WHERE id = $4 RETURNING *`,
      [toStatus, isApproval ? user.email : null, isApproval ? new Date().toISOString() : null, linkId],
    );
    const row = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'partner_link',
      entityId: linkId,
      action,
      performedBy: user.email,
      beforeState: { status: link.status },
      afterState: { status: row.status },
    });
    return row;
  });
}

export async function approvePartnerLink(linkId: string, user: AuthenticatedUser): Promise<PartnerLinkRow> {
  return transitionLinkStatus(linkId, ['pending'], 'active', user, 'APPROVE');
}

export async function rejectPartnerLink(linkId: string, user: AuthenticatedUser): Promise<PartnerLinkRow> {
  return transitionLinkStatus(linkId, ['pending'], 'terminated', user, 'REJECT');
}

export async function suspendPartnerLink(linkId: string, user: AuthenticatedUser): Promise<PartnerLinkRow> {
  return transitionLinkStatus(linkId, ['active'], 'suspended', user, 'SUSPEND');
}

export async function reactivatePartnerLink(linkId: string, user: AuthenticatedUser): Promise<PartnerLinkRow> {
  return transitionLinkStatus(linkId, ['suspended'], 'active', user, 'REACTIVATE');
}

export async function listPartnerLinks(organizationId?: string): Promise<PartnerLinkRow[]> {
  if (!organizationId) {
    const result = await pool.query<PartnerLinkRow>('SELECT * FROM partner_links ORDER BY requested_at DESC');
    return result.rows;
  }
  const result = await pool.query<PartnerLinkRow>(
    'SELECT * FROM partner_links WHERE requesting_org_id = $1 OR partner_org_id = $1 ORDER BY requested_at DESC',
    [organizationId],
  );
  return result.rows;
}

async function assertActiveLink(buyerOrgId: string, partnerOrgId: string): Promise<void> {
  const result = await pool.query(
    `SELECT 1 FROM partner_links WHERE requesting_org_id = $1 AND partner_org_id = $2 AND status = 'active'`,
    [buyerOrgId, partnerOrgId],
  );
  if (!result.rows[0]) {
    throw new ConflictError('No active partner link exists between these organizations — request and get one approved before ordering');
  }
}

// --- Catalog / discovery: querying available Foundation lots from a partner ---

export async function getPartnerCatalog(partnerOrgId: string, filters: { crop?: string } = {}): Promise<PartnerCatalogEntry[]> {
  await getOrganizationName(partnerOrgId);
  const conditions = ['organization_id = $1', "stage = 'Foundation'", 'available_for_partner_order = true', "status = 'active'"];
  const values: unknown[] = [partnerOrgId];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }

  const result = await pool.query<SeedLot>(`SELECT * FROM seed_lots WHERE ${conditions.join(' AND ')} ORDER BY crop ASC, variety ASC`, values);
  return result.rows
    .map(withAvailability)
    .filter((lot) => lot.quantity_available > 0)
    .map((lot) => ({
      id: lot.id,
      lot_code: lot.lot_code,
      crop: lot.crop,
      variety: lot.variety,
      stage: lot.stage,
      quantity_available: lot.quantity_available,
      unit: lot.unit,
      organization_id: lot.organization_id!,
      production_date: lot.production_date,
    }));
}

/**
 * Both organizations already live in the same database, so a "sync" is a
 * live re-query, not a network round-trip to a genuinely external system —
 * there's nothing to poll. This still gives "inventory synchronization" real
 * substance: an explicit, timestamped, auditable record of what a buyer saw
 * and when, rather than pretending to simulate a fake external API.
 */
export async function syncPartnerInventory(
  buyerOrgId: string,
  partnerOrgId: string,
  user: AuthenticatedUser,
): Promise<{ catalog: PartnerCatalogEntry[]; syncLog: PartnerInventorySyncLogRow }> {
  await assertActiveLink(buyerOrgId, partnerOrgId);
  const catalog = await getPartnerCatalog(partnerOrgId);
  const totalAvailableQuantity = catalog.reduce((sum, lot) => sum + lot.quantity_available, 0);

  const result = await pool.query<PartnerInventorySyncLogRow>(
    `INSERT INTO partner_inventory_sync_log (buyer_org_id, partner_org_id, synced_by, lots_synced, total_available_quantity)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [buyerOrgId, partnerOrgId, user.email, catalog.length, totalAvailableQuantity],
  );
  return { catalog, syncLog: result.rows[0] };
}

export async function listSyncHistory(buyerOrgId: string, partnerOrgId: string): Promise<PartnerInventorySyncLogRow[]> {
  const result = await pool.query<PartnerInventorySyncLogRow>(
    'SELECT * FROM partner_inventory_sync_log WHERE buyer_org_id = $1 AND partner_org_id = $2 ORDER BY synced_at DESC LIMIT 20',
    [buyerOrgId, partnerOrgId],
  );
  return result.rows;
}

// --- Quality metric comparison across partner orgs' catalog offerings ---

export async function compareQuality(crop: string, variety?: string): Promise<QualityComparisonEntry[]> {
  if (!crop?.trim()) throw new ValidationError('crop is required');

  const conditions = ["stage = 'Foundation'", 'available_for_partner_order = true', "status = 'active'", 'crop = $1'];
  const values: unknown[] = [crop.trim()];
  if (variety?.trim()) {
    values.push(variety.trim());
    conditions.push(`variety = $${values.length}`);
  }

  const lotsResult = await pool.query<SeedLot>(`SELECT * FROM seed_lots WHERE ${conditions.join(' AND ')}`, values);
  const lots = lotsResult.rows.map(withAvailability).filter((lot) => lot.quantity_available > 0);
  if (lots.length === 0) return [];

  const orgNames = new Map<string, string>();
  const entries = await Promise.all(
    lots.map(async (lot) => {
      if (!orgNames.has(lot.organization_id!)) {
        orgNames.set(lot.organization_id!, await getOrganizationName(lot.organization_id!));
      }
      const metrics = await getQualityMetrics(lot.id);
      const entry: QualityComparisonEntry = {
        seedLotId: lot.id,
        lotCode: lot.lot_code,
        organizationId: lot.organization_id!,
        organizationName: orgNames.get(lot.organization_id!)!,
        crop: lot.crop,
        variety: lot.variety,
        quantityAvailable: lot.quantity_available,
        purity: metrics.purity,
        viability: metrics.viability,
        germination: metrics.germination,
      };
      return entry;
    }),
  );

  // Best germination rate first — the single most decision-relevant metric
  // for "which partner's seed should I buy," with untested lots (null) last.
  return entries.sort((a, b) => (b.germination.averagePercent ?? -1) - (a.germination.averagePercent ?? -1));
}

// --- Ordering workflow ---

export async function createPartnerOrder(
  buyerOrgId: string,
  input: CreatePartnerOrderInput,
  user: AuthenticatedUser,
): Promise<PartnerOrderRow> {
  assertActsForOrg(user, buyerOrgId, 'You can only place partner orders on behalf of your own organization');
  if (!input.partnerOrgId) throw new ValidationError('partnerOrgId is required');
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  if (!Number.isFinite(Number(input.quantity)) || Number(input.quantity) <= 0) {
    throw new ValidationError('quantity must be a positive number');
  }
  if (buyerOrgId === input.partnerOrgId) throw new ValidationError('An organization cannot order from itself');

  await assertActiveLink(buyerOrgId, input.partnerOrgId);

  const lot = await getSeedLotById(input.seedLotId);
  if (lot.organization_id !== input.partnerOrgId) throw new ValidationError('That seed lot does not belong to the specified partner organization');
  if (lot.stage !== 'Foundation') throw new ValidationError('Only Foundation-stage lots can be ordered through the partner catalog');
  if (!lot.available_for_partner_order) throw new ConflictError('This lot is not currently opted in to the partner catalog');
  if (lot.status !== 'active') throw new ConflictError(`Seed lot ${lot.lot_code} is not active (status: ${lot.status})`);

  const quantity = Number(input.quantity);
  const buyerOrgName = await getOrganizationName(buyerOrgId);
  const orderNumber = `PORD-${randomUUID().slice(0, 8).toUpperCase()}`;

  const created = await withTransaction(async (client) => {
    const result = await client.query<PartnerOrderRow>(
      `INSERT INTO partner_orders (order_number, buyer_org_id, partner_org_id, seed_lot_id, crop, variety, quantity_requested, unit, requested_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [orderNumber, buyerOrgId, input.partnerOrgId, lot.id, lot.crop, lot.variety, quantity, lot.unit, user.email, input.notes ?? null],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'partner_order',
      entityId: row.id,
      action: 'REQUEST',
      performedBy: user.email,
      afterState: row,
      metadata: { partnerOrgId: input.partnerOrgId, seedLotId: lot.id },
    });
    return row;
  });

  // Automated ordering: reserve the stock immediately if enough is currently
  // available. Reusing allocate() here is the same documented two-transaction
  // tradeoff seedRequests.fulfillRequest already accepts elsewhere in this
  // codebase — allocate() commits on its own, and linking it back is a
  // second transaction just below. If the partner's stock can't cover it
  // right now (a genuine race, since we just checked availability above),
  // the order is left at "requested" for the partner to confirm manually
  // once more stock is available, rather than failing the whole request.
  try {
    const { allocation } = await allocate(
      lot.id,
      { quantity, allocatedTo: `Partner Order ${orderNumber} — ${buyerOrgName}`, notes: `Reserved for partner order ${orderNumber}` },
      SYSTEM_USER,
    );
    return withTransaction(async (client) => {
      const result = await client.query<PartnerOrderRow>(
        `UPDATE partner_orders SET status = 'confirmed', allocation_id = $1, confirmed_by = $2, confirmed_at = now() WHERE id = $3 RETURNING *`,
        [allocation.id, 'system:auto-confirm', created.id],
      );
      const row = result.rows[0];
      await insertAuditLog(client, {
        entityType: 'partner_order',
        entityId: created.id,
        action: 'AUTO_CONFIRM',
        performedBy: 'system:auto-confirm',
        beforeState: { status: 'requested' },
        afterState: { status: row.status, allocationId: allocation.id },
      });
      return row;
    });
  } catch (err) {
    if (err instanceof InsufficientQuantityError) return created;
    throw err;
  }
}

export async function confirmPartnerOrder(orderId: string, user: AuthenticatedUser): Promise<PartnerOrderRow> {
  const order = await getPartnerOrder(orderId);
  assertActsForOrg(user, order.partner_org_id, 'Only the partner organization fulfilling this order can confirm it');
  if (order.status !== 'requested') {
    throw new ConflictError(`Partner order is "${order.status}" — expected "requested" before it can be confirmed`);
  }

  const { allocation } = await allocate(
    order.seed_lot_id,
    { quantity: Number(order.quantity_requested), allocatedTo: `Partner Order ${order.order_number}`, notes: `Reserved for partner order ${order.order_number}` },
    user,
  );

  return withTransaction(async (client) => {
    const result = await client.query<PartnerOrderRow>(
      `UPDATE partner_orders SET status = 'confirmed', allocation_id = $1, confirmed_by = $2, confirmed_at = now() WHERE id = $3 RETURNING *`,
      [allocation.id, user.email, orderId],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'partner_order',
      entityId: orderId,
      action: 'CONFIRM',
      performedBy: user.email,
      beforeState: { status: order.status },
      afterState: { status: row.status },
    });
    return row;
  });
}

export async function rejectPartnerOrder(orderId: string, reason: string, user: AuthenticatedUser): Promise<PartnerOrderRow> {
  if (!reason?.trim()) throw new ValidationError('A rejection reason is required');
  const order = await getPartnerOrder(orderId);
  assertActsForOrg(user, order.partner_org_id, 'Only the partner organization fulfilling this order can reject it');
  if (order.status !== 'requested') {
    throw new ConflictError(`Partner order is "${order.status}" — expected "requested" before it can be rejected`);
  }

  return withTransaction(async (client) => {
    const result = await client.query<PartnerOrderRow>(
      `UPDATE partner_orders SET status = 'rejected', rejection_reason = $1 WHERE id = $2 RETURNING *`,
      [reason.trim(), orderId],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'partner_order',
      entityId: orderId,
      action: 'REJECT',
      performedBy: user.email,
      beforeState: { status: order.status },
      afterState: { status: row.status, rejectionReason: reason.trim() },
    });
    return row;
  });
}

/**
 * The moment the seed physically leaves the partner's warehouse: the
 * reservation is released (it's no longer "pending," it's gone) and the
 * partner's total inventory is permanently decremented by the shipped
 * quantity — the actual "inventory synchronization" correctness this
 * feature needs, not just a UI refresh button.
 */
export async function markOrderShipped(orderId: string, user: AuthenticatedUser): Promise<PartnerOrderRow> {
  const order = await getPartnerOrder(orderId);
  assertActsForOrg(user, order.partner_org_id, 'Only the partner organization fulfilling this order can mark it shipped');
  if (order.status !== 'confirmed') {
    throw new ConflictError(`Partner order is "${order.status}" — expected "confirmed" before it can be shipped`);
  }
  if (!order.allocation_id) throw new ConflictError('Confirmed order is missing its allocation record — cannot ship');

  // This function calls three independent operations across two other
  // modules, each its own transaction (the same documented tradeoff
  // seedRequests.fulfillRequest accepts elsewhere in this codebase) — if a
  // retry lands here after an earlier attempt released the allocation but
  // failed before the order's status was updated, calling release() again
  // would error on an already-released allocation. Checking first makes a
  // retry able to complete instead of getting stuck failing the same way
  // forever.
  const allocationResult = await pool.query<{ status: string }>('SELECT status FROM seed_lot_allocations WHERE id = $1', [order.allocation_id]);
  if (allocationResult.rows[0]?.status === 'allocated') {
    await release(order.allocation_id, { notes: `Shipped as partner order ${order.order_number}` }, user);
  }

  const lot = await getSeedLotById(order.seed_lot_id);
  const newTotal = Number(lot.quantity_total) - Number(order.quantity_requested);
  // updateSeedLot()'s own ownership check only bypasses for Admin, unlike
  // allocate()/release() above — it has no Warehouse Manager exemption,
  // since it's the general-purpose lot editor and broadening its ownership
  // rule is out of scope here. Falling back to SYSTEM_USER only when the
  // caller's own org differs from the lot's (a cross-org Warehouse Manager
  // shipping on the partner's behalf) keeps the audit trail attributed to
  // the real actor whenever the partner's own staff is the one shipping.
  const shippingUser = user.organizationId === order.partner_org_id ? user : SYSTEM_USER;
  await updateSeedLot(order.seed_lot_id, { quantityTotal: newTotal }, shippingUser);

  return withTransaction(async (client) => {
    const result = await client.query<PartnerOrderRow>(
      `UPDATE partner_orders SET status = 'shipped', shipped_at = now() WHERE id = $1 RETURNING *`,
      [orderId],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'partner_order',
      entityId: orderId,
      action: 'SHIP',
      performedBy: user.email,
      beforeState: { status: order.status },
      afterState: { status: row.status },
    });
    return row;
  });
}

/**
 * The buyer takes physical receipt: a brand-new seed lot is created under
 * the BUYER's own organization (not linked via parent_lot_id — that field
 * models same-org multiplication stage progression, e.g. Foundation ->
 * Certified, which doesn't apply here; the partner_orders row itself IS the
 * cross-org provenance record). This is what makes the purchased seed real,
 * usable inventory for the buyer rather than a status flag.
 */
export async function markOrderReceived(orderId: string, input: ReceiveOrderInput, user: AuthenticatedUser): Promise<PartnerOrderRow> {
  const order = await getPartnerOrder(orderId);
  assertActsForOrg(user, order.buyer_org_id, 'Only the buyer organization can confirm receipt of this order');
  if (order.status !== 'shipped') {
    throw new ConflictError(`Partner order is "${order.status}" — expected "shipped" before it can be marked received`);
  }
  if (!Number.isInteger(input.qualityRating) || input.qualityRating < 1 || input.qualityRating > 5) {
    throw new ValidationError('qualityRating must be an integer from 1 to 5');
  }
  if (typeof input.onTime !== 'boolean') throw new ValidationError('onTime must be true or false');

  const partnerOrgName = await getOrganizationName(order.partner_org_id);
  const sourceLot = await getSeedLotById(order.seed_lot_id);
  // createSeedLot()'s resolveOwningOrganizationId ignores the passed
  // organizationId for any non-Admin caller and uses the caller's OWN org
  // instead — correct for the normal "create my own lot" path, but wrong
  // when a Warehouse Manager (org-agnostic) processes receipt on the
  // buyer's behalf: they'd otherwise get the new lot created under their
  // OWN organization instead of the buyer's. Falling back to SYSTEM_USER
  // only in that cross-org case (not for the common case of the buyer's own
  // staff receiving) keeps the audit trail attributed to the real actor
  // whenever that's actually who's acting.
  const creatingUser = user.organizationId === order.buyer_org_id ? user : SYSTEM_USER;
  const receivedLot = await createSeedLot(
    {
      lotCode: `${order.order_number}-RECEIVED`,
      crop: order.crop,
      variety: order.variety,
      parentLotId: null,
      stage: 'Foundation',
      quantityTotal: Number(order.quantity_requested),
      unit: order.unit,
      notes: `Received via partner order ${order.order_number} from ${partnerOrgName} (source lot ${sourceLot.lot_code})`,
      organizationId: order.buyer_org_id,
    },
    creatingUser,
  );

  return withTransaction(async (client) => {
    const result = await client.query<PartnerOrderRow>(
      `UPDATE partner_orders
       SET status = 'received', received_at = now(), received_seed_lot_id = $1, quality_rating_at_receipt = $2, on_time = $3, notes = COALESCE($4, notes)
       WHERE id = $5 RETURNING *`,
      [receivedLot.id, input.qualityRating, input.onTime, input.notes ?? null, orderId],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'partner_order',
      entityId: orderId,
      action: 'RECEIVE',
      performedBy: user.email,
      beforeState: { status: order.status },
      afterState: { status: row.status, receivedSeedLotId: receivedLot.id },
    });
    return row;
  }).then(async (row) => {
    await recomputeOrgRating(order.buyer_org_id, order.partner_org_id);
    return row;
  });
}

export async function disputeOrder(orderId: string, reason: string, user: AuthenticatedUser): Promise<PartnerOrderRow> {
  if (!reason?.trim()) throw new ValidationError('A dispute reason is required');
  const order = await getPartnerOrder(orderId);
  assertActsForOrg(user, order.buyer_org_id, 'Only the buyer organization can dispute this order');
  if (order.status !== 'received') {
    throw new ConflictError(`Partner order is "${order.status}" — expected "received" before it can be disputed`);
  }

  const updated = await withTransaction(async (client) => {
    const result = await client.query<PartnerOrderRow>(
      `UPDATE partner_orders SET status = 'disputed', dispute_reason = $1 WHERE id = $2 RETURNING *`,
      [reason.trim(), orderId],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'partner_order',
      entityId: orderId,
      action: 'DISPUTE',
      performedBy: user.email,
      beforeState: { status: order.status },
      afterState: { status: row.status, disputeReason: reason.trim() },
    });
    return row;
  });

  await recomputeOrgRating(order.buyer_org_id, order.partner_org_id);
  return updated;
}

export async function cancelPartnerOrder(orderId: string, user: AuthenticatedUser): Promise<PartnerOrderRow> {
  const order = await getPartnerOrder(orderId);
  if (
    !OWNERSHIP_EXEMPT_ROLES.includes(user.role) &&
    user.organizationId !== order.buyer_org_id &&
    user.organizationId !== order.partner_org_id
  ) {
    throw new ForbiddenError('Only the buyer or partner organization involved in this order can cancel it');
  }
  if (!['requested', 'confirmed'].includes(order.status)) {
    throw new ConflictError(`Partner order is "${order.status}" — it can only be cancelled while "requested" or "confirmed"`);
  }

  if (order.status === 'confirmed' && order.allocation_id) {
    await release(order.allocation_id, { notes: `Cancelled partner order ${order.order_number}` }, user);
  }

  const updated = await withTransaction(async (client) => {
    const result = await client.query<PartnerOrderRow>(`UPDATE partner_orders SET status = 'cancelled' WHERE id = $1 RETURNING *`, [orderId]);
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'partner_order',
      entityId: orderId,
      action: 'CANCEL',
      performedBy: user.email,
      beforeState: { status: order.status },
      afterState: { status: row.status },
    });
    return row;
  });

  await recomputeOrgRating(order.buyer_org_id, order.partner_org_id);
  return updated;
}

export async function listPartnerOrders(filters: {
  buyerOrgId?: string;
  partnerOrgId?: string;
  status?: string;
}): Promise<PartnerOrderRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.buyerOrgId) {
    values.push(filters.buyerOrgId);
    conditions.push(`buyer_org_id = $${values.length}`);
  }
  if (filters.partnerOrgId) {
    values.push(filters.partnerOrgId);
    conditions.push(`partner_org_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<PartnerOrderRow>(`SELECT * FROM partner_orders ${whereClause} ORDER BY created_at DESC`, values);
  return result.rows;
}

export async function getPartnerOrder(id: string): Promise<PartnerOrderRow> {
  const result = await pool.query<PartnerOrderRow>('SELECT * FROM partner_orders WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Partner order ${id} not found`);
  return row;
}

// --- Performance ratings, recomputed from historical order outcomes ---

export async function recomputeOrgRating(buyerOrgId: string, partnerOrgId: string): Promise<PartnerPerformanceRatingRow> {
  const aggResult = await pool.query<{
    total_orders: string;
    fulfilled_orders: string;
    disputed_orders: string;
    cancelled_orders: string;
    on_time_orders: string;
    avg_quality_rating: string | null;
    last_order_at: string | null;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('received', 'disputed')) AS total_orders,
       COUNT(*) FILTER (WHERE status = 'received') AS fulfilled_orders,
       COUNT(*) FILTER (WHERE status = 'disputed') AS disputed_orders,
       COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
       COUNT(*) FILTER (WHERE status IN ('received', 'disputed') AND on_time = true) AS on_time_orders,
       AVG(quality_rating_at_receipt) FILTER (WHERE status IN ('received', 'disputed')) AS avg_quality_rating,
       MAX(received_at) AS last_order_at
     FROM partner_orders
     WHERE buyer_org_id = $1 AND partner_org_id = $2`,
    [buyerOrgId, partnerOrgId],
  );
  const agg = aggResult.rows[0];
  const totalOrders = Number(agg.total_orders);
  const fulfilledOrders = Number(agg.fulfilled_orders);
  const disputedOrders = Number(agg.disputed_orders);
  const cancelledOrders = Number(agg.cancelled_orders);
  const onTimeOrders = Number(agg.on_time_orders);
  const avgQualityRating = agg.avg_quality_rating !== null ? Number(agg.avg_quality_rating) : null;

  const overallScore = computeOverallScore({ totalOrders, fulfilledOrders, onTimeOrders, avgQualityRating });

  const result = await pool.query<PartnerPerformanceRatingRow>(
    `INSERT INTO partner_performance_ratings
       (buyer_org_id, partner_org_id, total_orders, fulfilled_orders, disputed_orders, cancelled_orders, on_time_orders, avg_quality_rating, overall_score, last_order_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT (buyer_org_id, partner_org_id) DO UPDATE SET
       total_orders = EXCLUDED.total_orders,
       fulfilled_orders = EXCLUDED.fulfilled_orders,
       disputed_orders = EXCLUDED.disputed_orders,
       cancelled_orders = EXCLUDED.cancelled_orders,
       on_time_orders = EXCLUDED.on_time_orders,
       avg_quality_rating = EXCLUDED.avg_quality_rating,
       overall_score = EXCLUDED.overall_score,
       last_order_at = EXCLUDED.last_order_at,
       updated_at = now()
     RETURNING *`,
    [buyerOrgId, partnerOrgId, totalOrders, fulfilledOrders, disputedOrders, cancelledOrders, onTimeOrders, avgQualityRating, overallScore, agg.last_order_at],
  );
  return result.rows[0];
}

export async function getPartnerRating(buyerOrgId: string, partnerOrgId: string): Promise<PartnerPerformanceRatingRow | null> {
  const result = await pool.query<PartnerPerformanceRatingRow>(
    'SELECT * FROM partner_performance_ratings WHERE buyer_org_id = $1 AND partner_org_id = $2',
    [buyerOrgId, partnerOrgId],
  );
  return result.rows[0] ?? null;
}

export async function listRatingsForPartner(partnerOrgId: string): Promise<PartnerPerformanceRatingRow[]> {
  const result = await pool.query<PartnerPerformanceRatingRow>(
    'SELECT * FROM partner_performance_ratings WHERE partner_org_id = $1 ORDER BY overall_score DESC NULLS LAST',
    [partnerOrgId],
  );
  return result.rows;
}
