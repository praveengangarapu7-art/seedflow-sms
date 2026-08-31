import { pool } from '../../db/pool';
import type { ReconciliationIssue, ReconciliationReport } from './reconciliation.types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function checkFarmerEmails(issues: ReconciliationIssue[]): Promise<number> {
  const result = await pool.query<{ id: string; name: string; email: string | null }>(
    'SELECT id, name, email FROM farmers ORDER BY name',
  );
  for (const row of result.rows) {
    if (!row.email || !row.email.trim()) {
      issues.push({
        entityType: 'farmer',
        entityId: row.id,
        entityName: row.name,
        rule: 'farmer_email_required',
        message: `Farmer "${row.name}" has no email on file.`,
        severity: 'error',
      });
    } else if (!EMAIL_PATTERN.test(row.email.trim())) {
      issues.push({
        entityType: 'farmer',
        entityId: row.id,
        entityName: row.name,
        rule: 'farmer_email_invalid',
        message: `Farmer "${row.name}" has an invalid email on file: "${row.email}".`,
        severity: 'error',
      });
    }
  }

  // A duplicate email is a softer integrity signal than a missing one — two
  // farmer records may genuinely share a household inbox — so it's a
  // warning rather than an error.
  const dupes = await pool.query<{ email: string; count: string }>(
    `SELECT lower(email) AS email, count(*) AS count FROM farmers WHERE email IS NOT NULL AND email != ''
     GROUP BY lower(email) HAVING count(*) > 1`,
  );
  for (const dupe of dupes.rows) {
    const owners = await pool.query<{ id: string; name: string }>(
      'SELECT id, name FROM farmers WHERE lower(email) = $1',
      [dupe.email],
    );
    for (const owner of owners.rows) {
      issues.push({
        entityType: 'farmer',
        entityId: owner.id,
        entityName: owner.name,
        rule: 'farmer_email_duplicate',
        message: `Farmer "${owner.name}"'s email (${dupe.email}) is shared with ${Number(dupe.count) - 1} other farmer record(s).`,
        severity: 'warning',
      });
    }
  }

  return result.rows.length;
}

async function checkLabCertificationTypes(issues: ReconciliationIssue[]): Promise<number> {
  const result = await pool.query<{ id: string; name: string; certification_type: string | null }>(
    `SELECT id, name, certification_type FROM organizations WHERE type = 'laboratory' ORDER BY name`,
  );
  for (const row of result.rows) {
    if (!row.certification_type || !row.certification_type.trim()) {
      issues.push({
        entityType: 'organization',
        entityId: row.id,
        entityName: row.name,
        rule: 'lab_certification_type_required',
        message: `Lab "${row.name}" has no certification type on file.`,
        severity: 'error',
      });
    }
  }
  return result.rows.length;
}

async function checkCropsHaveApprovedVariety(issues: ReconciliationIssue[]): Promise<number> {
  const result = await pool.query<{ id: string; name: string; active: boolean }>(
    'SELECT id, name, active FROM crops ORDER BY name',
  );
  for (const crop of result.rows) {
    if (!crop.active) continue; // an inactive crop isn't expected to have a live, approved variety yet.
    const approved = await pool.query(
      `SELECT 1 FROM crop_varieties WHERE crop = $1 AND status = 'approved' LIMIT 1`,
      [crop.name],
    );
    if (approved.rows.length === 0) {
      issues.push({
        entityType: 'crop',
        entityId: crop.id,
        entityName: crop.name,
        rule: 'crop_missing_approved_variety',
        message: `Crop "${crop.name}" is active but has no approved variety yet.`,
        // A warning, not an error: unlike a farmer's email or a lab's
        // certification (single-record fields that can always be filled in
        // immediately), a crop's first variety has to be drafted, reviewed,
        // and approved through its own workflow — the crop record itself
        // isn't wrong, it's just still waiting on that to catch up.
        severity: 'warning',
      });
    }
  }

  // The inverse check: a variety naming a crop that master data doesn't
  // know about yet (a typo, or the crop record was renamed/deleted after
  // the variety was created — crop_varieties.crop is a free-text column,
  // not a foreign key, so nothing else catches this).
  const orphanVarieties = await pool.query<{ id: string; name: string; crop: string }>(
    `SELECT cv.id, cv.name, cv.crop FROM crop_varieties cv
     WHERE NOT EXISTS (SELECT 1 FROM crops c WHERE c.name = cv.crop)
     ORDER BY cv.crop, cv.name`,
  );
  for (const variety of orphanVarieties.rows) {
    issues.push({
      entityType: 'crop',
      entityId: variety.id,
      entityName: variety.name,
      rule: 'variety_unknown_crop',
      message: `Variety "${variety.name}" references crop "${variety.crop}", which isn't in the crop catalog.`,
      severity: 'warning',
    });
  }

  return result.rows.length;
}

export async function runReconciliation(): Promise<ReconciliationReport> {
  const issues: ReconciliationIssue[] = [];

  const [farmerCount, labCount, cropCount] = await Promise.all([
    checkFarmerEmails(issues),
    checkLabCertificationTypes(issues),
    checkCropsHaveApprovedVariety(issues),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    totalChecked: farmerCount + labCount + cropCount,
    issueCount: issues.length,
    issues,
  };
}
