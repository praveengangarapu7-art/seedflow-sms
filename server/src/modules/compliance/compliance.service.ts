import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { fetchAncestorChain } from '../seedLots/genealogy.service';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import type {
  PhytosanitaryCertificateInput,
  PhytosanitaryCertificateRow,
  PurityTestInput,
  QualityCertificateRow,
  QualityMetricsSummary,
  RateSummary,
  ViabilityTestInput,
} from './compliance.types';

export async function recordPurityTest(input: PurityTestInput, user: AuthenticatedUser) {
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  if (!Number.isFinite(Number(input.sampleWeight)) || Number(input.sampleWeight) <= 0) {
    throw new ValidationError('sampleWeight must be a positive number');
  }
  if (!Number.isFinite(Number(input.pureSeedWeight)) || Number(input.pureSeedWeight) < 0) {
    throw new ValidationError('pureSeedWeight must be a non-negative number');
  }
  if (Number(input.pureSeedWeight) > Number(input.sampleWeight)) {
    throw new ValidationError('pureSeedWeight cannot exceed sampleWeight');
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO purity_tests (seed_lot_id, sample_weight, pure_seed_weight, tested_by, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [input.seedLotId, input.sampleWeight, input.pureSeedWeight, user.email, input.notes ?? null],
    );
    const created = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'purity_test',
      entityId: created.id,
      action: 'RECORD_PURITY_TEST',
      performedBy: user.email,
      afterState: created,
      metadata: { seedLotId: input.seedLotId },
    });
    return created;
  });
}

export async function recordViabilityTest(input: ViabilityTestInput, user: AuthenticatedUser) {
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  if (!Number.isInteger(Number(input.sampleSize)) || Number(input.sampleSize) <= 0) {
    throw new ValidationError('sampleSize must be a positive integer');
  }
  if (!Number.isInteger(Number(input.viableCount)) || Number(input.viableCount) < 0) {
    throw new ValidationError('viableCount must be a non-negative integer');
  }
  if (Number(input.viableCount) > Number(input.sampleSize)) {
    throw new ValidationError('viableCount cannot exceed sampleSize');
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO viability_tests (seed_lot_id, sample_size, viable_count, tested_by, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [input.seedLotId, input.sampleSize, input.viableCount, user.email, input.notes ?? null],
    );
    const created = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'viability_test',
      entityId: created.id,
      action: 'RECORD_VIABILITY_TEST',
      performedBy: user.email,
      afterState: created,
      metadata: { seedLotId: input.seedLotId },
    });
    return created;
  });
}

export async function recordPhytosanitaryCertificate(input: PhytosanitaryCertificateInput, user: AuthenticatedUser) {
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  if (!input.certificateNumber?.trim()) throw new ValidationError('certificateNumber is required');
  if (!input.issuingAuthority?.trim()) throw new ValidationError('issuingAuthority is required');
  if (!input.issueDate) throw new ValidationError('issueDate is required');
  if (input.expiryDate && input.expiryDate < input.issueDate) {
    throw new ValidationError('expiryDate cannot be before issueDate');
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO phytosanitary_certificates (seed_lot_id, certificate_number, issuing_authority, issue_date, expiry_date, issued_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        input.seedLotId,
        input.certificateNumber.trim(),
        input.issuingAuthority.trim(),
        input.issueDate,
        input.expiryDate ?? null,
        user.email,
        input.notes ?? null,
      ],
    );
    const created = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'phytosanitary_certificate',
      entityId: created.id,
      action: 'RECORD_PHYTOSANITARY_CERTIFICATE',
      performedBy: user.email,
      afterState: created,
      metadata: { seedLotId: input.seedLotId },
    });
    return created;
  });
}

async function computeRateSummary(table: 'purity_tests' | 'viability_tests' | 'germination_tests', seedLotId: string): Promise<RateSummary> {
  if (table === 'purity_tests') {
    const result = await pool.query(
      `SELECT SUM(sample_weight) AS total_sample, SUM(pure_seed_weight) AS total_pure, COUNT(*) AS test_count
       FROM purity_tests WHERE seed_lot_id = $1`,
      [seedLotId],
    );
    const row = result.rows[0];
    const totalSample = Number(row.total_sample ?? 0);
    const totalPure = Number(row.total_pure ?? 0);
    return {
      averagePercent: totalSample > 0 ? Math.round((totalPure / totalSample) * 1000) / 10 : null,
      testCount: Number(row.test_count),
    };
  }

  const countColumn = table === 'viability_tests' ? 'viable_count' : 'germinated_count';
  const result = await pool.query(
    `SELECT SUM(sample_size) AS total_sample, SUM(${countColumn}) AS total_success, COUNT(*) AS test_count
     FROM ${table} WHERE seed_lot_id = $1`,
    [seedLotId],
  );
  const row = result.rows[0];
  const totalSample = Number(row.total_sample ?? 0);
  const totalSuccess = Number(row.total_success ?? 0);
  return {
    averagePercent: totalSample > 0 ? Math.round((totalSuccess / totalSample) * 1000) / 10 : null,
    testCount: Number(row.test_count),
  };
}

export async function getQualityMetrics(seedLotId: string): Promise<QualityMetricsSummary> {
  const lotResult = await pool.query('SELECT id, lot_code, crop, variety, stage FROM seed_lots WHERE id = $1', [seedLotId]);
  const lot = lotResult.rows[0];
  if (!lot) throw new NotFoundError(`Seed lot ${seedLotId} not found`);

  const [purity, viability, germination, phytosanitaryResult] = await Promise.all([
    computeRateSummary('purity_tests', seedLotId),
    computeRateSummary('viability_tests', seedLotId),
    computeRateSummary('germination_tests', seedLotId),
    pool.query<PhytosanitaryCertificateRow>(
      'SELECT * FROM phytosanitary_certificates WHERE seed_lot_id = $1 ORDER BY issue_date DESC',
      [seedLotId],
    ),
  ]);

  return {
    seedLotId: lot.id,
    lotCode: lot.lot_code,
    crop: lot.crop,
    variety: lot.variety,
    stage: lot.stage,
    purity,
    viability,
    germination,
    phytosanitary: phytosanitaryResult.rows,
  };
}

export async function getComplianceChain(seedLotId: string): Promise<{
  focus: QualityMetricsSummary;
  ancestorChain: QualityMetricsSummary[];
}> {
  const ancestors = await fetchAncestorChain(seedLotId);
  if (ancestors.length === 0) throw new NotFoundError(`Seed lot ${seedLotId} not found`);

  const chain = await Promise.all(ancestors.map((lot) => getQualityMetrics(lot.id)));
  return {
    focus: chain[chain.length - 1],
    ancestorChain: chain,
  };
}

export async function generateCertificate(seedLotId: string, user: AuthenticatedUser): Promise<QualityCertificateRow> {
  const snapshot = await getQualityMetrics(seedLotId);

  return withTransaction(async (client) => {
    // Postgres rejects FOR UPDATE combined with an aggregate, so lock the
    // existing version rows for this lot first and compute the max in JS —
    // this still serializes concurrent generateCertificate calls for the
    // same lot against each other via the row lock.
    const existingResult = await client.query<{ version: number }>(
      'SELECT version FROM quality_certificates WHERE seed_lot_id = $1 FOR UPDATE',
      [seedLotId],
    );
    const nextVersion = existingResult.rows.reduce((max, row) => Math.max(max, row.version), 0) + 1;

    const result = await client.query(
      `INSERT INTO quality_certificates (seed_lot_id, version, status, snapshot, generated_by)
       VALUES ($1, $2, 'draft', $3::jsonb, $4) RETURNING *`,
      [seedLotId, nextVersion, JSON.stringify(snapshot), user.email],
    );
    const created = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'quality_certificate',
      entityId: created.id,
      action: 'GENERATE_CERTIFICATE',
      performedBy: user.email,
      afterState: created,
      metadata: { seedLotId, version: nextVersion },
    });

    return created;
  });
}

export async function signCertificate(certificateId: string, user: AuthenticatedUser): Promise<QualityCertificateRow> {
  return withTransaction(async (client) => {
    const certResult = await client.query('SELECT * FROM quality_certificates WHERE id = $1 FOR UPDATE', [certificateId]);
    const certificate = certResult.rows[0];
    if (!certificate) throw new NotFoundError(`Certificate ${certificateId} not found`);
    if (certificate.status !== 'draft') {
      throw new ConflictError(`Certificate ${certificateId} is already ${certificate.status} — only a draft can be signed`);
    }

    // Signing this version supersedes whichever version currently holds
    // "issued" for this lot — history is kept, not deleted.
    await client.query(
      `UPDATE quality_certificates SET status = 'superseded' WHERE seed_lot_id = $1 AND status = 'issued'`,
      [certificate.seed_lot_id],
    );

    const updatedResult = await client.query(
      `UPDATE quality_certificates
       SET status = 'issued', signed_by = $1, signature_role = $2, signed_at = now()
       WHERE id = $3
       RETURNING *`,
      [user.email, user.role, certificateId],
    );
    const updated = updatedResult.rows[0];

    await insertAuditLog(client, {
      entityType: 'quality_certificate',
      entityId: certificateId,
      action: 'SIGN_CERTIFICATE',
      performedBy: user.email,
      beforeState: { status: certificate.status },
      afterState: { status: updated.status, signedBy: updated.signed_by, signatureRole: updated.signature_role },
      metadata: { seedLotId: certificate.seed_lot_id, version: certificate.version },
    });

    return updated;
  });
}

export async function listCertificates(seedLotId: string): Promise<QualityCertificateRow[]> {
  const result = await pool.query<QualityCertificateRow>(
    'SELECT * FROM quality_certificates WHERE seed_lot_id = $1 ORDER BY version DESC',
    [seedLotId],
  );
  return result.rows;
}

export async function getCertificateById(id: string): Promise<QualityCertificateRow> {
  const result = await pool.query<QualityCertificateRow>('SELECT * FROM quality_certificates WHERE id = $1', [id]);
  const certificate = result.rows[0];
  if (!certificate) throw new NotFoundError(`Certificate ${id} not found`);
  return certificate;
}
