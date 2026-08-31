// Selective field visibility, based on the role/exposure audit for this
// task: Admin, Producer, and Warehouse Manager all have an existing,
// legitimate operational reason to see a farmer's real contact details
// (the same three roles already gated on POST /farmers and on seed-request
// fulfillment/delivery and crop-plan reservation, which is exactly where
// a phone number/location is actually used to reach or deliver to someone).
// Breeder and Inspector have no such flow anywhere in this codebase — they
// see a farmer's region (needed for legitimate aggregate/environmental
// analysis) but not their name, phone, or exact location.
const ROLES_WITH_FULL_FARMER_PII = new Set(['Admin', 'Producer', 'Warehouse Manager']);

export function canViewFullFarmerPII(role: string): boolean {
  return ROLES_WITH_FULL_FARMER_PII.has(role);
}

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return `${parts[0].slice(0, 1)}.`;
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].slice(0, 1);
  return `${first} ${lastInitial}.`;
}

/**
 * Masks farmer PII fields for a viewer role without full-PII access.
 * `name` is pseudonymized (first name + last initial) rather than fully
 * redacted, since roles like Inspector/Breeder still need to visually tell
 * farmers apart across a list — only phone/location, which have no such
 * legitimate need here, are fully redacted.
 */
export function maskFarmerFields<
  T extends { name: string; phone: string | null; email?: string | null; location: string | null },
>(row: T, viewerRole: string): T {
  if (canViewFullFarmerPII(viewerRole)) return row;
  return { ...row, name: maskName(row.name), phone: null, email: null, location: null };
}

export function maskFarmerFieldsList<
  T extends { name: string; phone: string | null; email?: string | null; location: string | null },
>(rows: T[], viewerRole: string): T[] {
  if (canViewFullFarmerPII(viewerRole)) return rows;
  return rows.map((row) => maskFarmerFields(row, viewerRole));
}

/**
 * For rows that only carry a denormalized farmer_name (not the full
 * farmer object) — e.g. crop_plans, distribution lists.
 */
export function maskFarmerNameField<T extends { farmer_name: string }>(row: T, viewerRole: string): T {
  if (canViewFullFarmerPII(viewerRole)) return row;
  return { ...row, farmer_name: maskName(row.farmer_name) };
}

export function maskFarmerNameFieldList<T extends { farmer_name: string }>(rows: T[], viewerRole: string): T[] {
  if (canViewFullFarmerPII(viewerRole)) return rows;
  return rows.map((row) => maskFarmerNameField(row, viewerRole));
}

/** For the seedRequests distribution-list shape: farmer_name/farmer_phone/farmer_location on each row. */
export function maskDistributionListEntry<
  T extends { farmer_name: string; farmer_phone: string | null; farmer_location: string | null },
>(row: T, viewerRole: string): T {
  if (canViewFullFarmerPII(viewerRole)) return row;
  return { ...row, farmer_name: maskName(row.farmer_name), farmer_phone: null, farmer_location: null };
}

