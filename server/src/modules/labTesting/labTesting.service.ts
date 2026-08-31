import type { Pool, PoolClient } from 'pg';
import { assertOwnsOrganization } from '../../auth/ownership';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { sendPushToAllDevices } from '../pushNotifications/pushNotifications.service';
import { broadcast } from '../../ws/server';
import { computeResultValue, isPassingResult } from './labTesting.validation';
import {
  CERTIFICATION_THRESHOLDS,
  TEST_TYPES,
  type GeneratePhytosanitaryFromSubmissionInput,
  type LabPerformanceEntry,
  type LabQualityFlag,
  type LabQualityFlagWithContext,
  type LabTestResult,
  type LabTestSubmissionWithResults,
  type RecordTestResultInput,
  type SubmitSampleBatchInput,
  type TestMetrics,
  type TestType,
} from './labTesting.types';

type Queryable = Pool | PoolClient;

function mapResultRow(row: any): LabTestResult {
  return {
    id: row.id,
    submission_id: row.submission_id,
    test_type: row.test_type,
    metrics: row.metrics,
    result_value: Number(row.result_value),
    threshold_used: Number(row.threshold_used),
    passed: row.passed,
    source: row.source,
    recorded_by: row.recorded_by,
    recorded_at: row.recorded_at,
    notes: row.notes,
  };
}

async function buildSubmissionDetail(executor: Queryable, id: string): Promise<LabTestSubmissionWithResults> {
  const result = await executor.query(
    `SELECT s.*, o.name AS lab_organization_name, sl.lot_code
     FROM lab_test_submissions s
     JOIN organizations o ON o.id = s.lab_organization_id
     JOIN seed_lots sl ON sl.id = s.seed_lot_id
     WHERE s.id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Lab test submission ${id} not found`);

  const resultsResult = await executor.query('SELECT * FROM lab_test_results WHERE submission_id = $1 ORDER BY recorded_at ASC', [
    id,
  ]);

  return {
    id: row.id,
    seed_lot_id: row.seed_lot_id,
    lab_organization_id: row.lab_organization_id,
    requested_tests: row.requested_tests,
    sample_quantity: Number(row.sample_quantity),
    sample_unit: row.sample_unit,
    status: row.status,
    submitted_by: row.submitted_by,
    submitted_at: row.submitted_at,
    expected_completion_date: row.expected_completion_date,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    lab_organization_name: row.lab_organization_name,
    lot_code: row.lot_code,
    results: resultsResult.rows.map(mapResultRow),
  };
}

export async function submitSampleBatch(
  input: SubmitSampleBatchInput,
  user: AuthenticatedUser,
): Promise<LabTestSubmissionWithResults> {
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  if (!input.labOrganizationId) throw new ValidationError('labOrganizationId is required');
  if (!Array.isArray(input.requestedTests) || input.requestedTests.length === 0) {
    throw new ValidationError('requestedTests must include at least one test type');
  }
  for (const testType of input.requestedTests) {
    if (!TEST_TYPES.includes(testType)) {
      throw new ValidationError(`Invalid test type: ${testType} — must be one of ${TEST_TYPES.join(', ')}`);
    }
  }
  const uniqueTests = Array.from(new Set(input.requestedTests));
  if (!Number.isFinite(Number(input.sampleQuantity)) || Number(input.sampleQuantity) <= 0) {
    throw new ValidationError('sampleQuantity must be a positive number');
  }

  const lotResult = await pool.query('SELECT id, organization_id FROM seed_lots WHERE id = $1', [input.seedLotId]);
  const lot = lotResult.rows[0];
  if (!lot) throw new NotFoundError(`Seed lot ${input.seedLotId} not found`);
  assertOwnsOrganization(user, lot.organization_id, 'You can only submit samples for seed lots owned by your organization');

  const labResult = await pool.query('SELECT id, type FROM organizations WHERE id = $1', [input.labOrganizationId]);
  const lab = labResult.rows[0];
  if (!lab) throw new NotFoundError(`Organization ${input.labOrganizationId} not found`);
  if (lab.type !== 'laboratory') {
    throw new ValidationError(`Organization ${input.labOrganizationId} is not a testing laboratory`);
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO lab_test_submissions (seed_lot_id, lab_organization_id, requested_tests, sample_quantity, sample_unit, submitted_by, expected_completion_date)
       VALUES ($1, $2, $3::jsonb, $4, COALESCE($5, 'g'), $6, COALESCE($7::date, CURRENT_DATE + INTERVAL '14 days'))
       RETURNING id`,
      [
        input.seedLotId,
        input.labOrganizationId,
        JSON.stringify(uniqueTests),
        input.sampleQuantity,
        input.sampleUnit ?? null,
        user.email,
        input.expectedCompletionDate ?? null,
      ],
    );
    const createdId = result.rows[0].id;

    const lotUpdateResult = await client.query<{ id: string; lot_code: string; testing_status: string }>(
      `UPDATE seed_lots SET testing_status = 'testing', updated_at = now() WHERE id = $1 RETURNING id, lot_code, testing_status`,
      [input.seedLotId],
    );
    const updatedLot = lotUpdateResult.rows[0];

    await insertAuditLog(client, {
      entityType: 'lab_test_submission',
      entityId: createdId,
      action: 'SUBMIT_SAMPLE_BATCH',
      performedBy: user.email,
      metadata: { seedLotId: input.seedLotId, labOrganizationId: input.labOrganizationId, requestedTests: uniqueTests },
    });

    broadcast('SEED_LOT_TESTING_STATUS_CHANGED', {
      seedLotId: updatedLot.id,
      lotCode: updatedLot.lot_code,
      testingStatus: updatedLot.testing_status,
      submissionId: createdId,
    });

    return buildSubmissionDetail(client, createdId);
  });
}

export async function listSubmissions(filters: {
  seedLotId?: string;
  labOrganizationId?: string;
  status?: string;
}): Promise<LabTestSubmissionWithResults[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.seedLotId) {
    values.push(filters.seedLotId);
    conditions.push(`s.seed_lot_id = $${values.length}`);
  }
  if (filters.labOrganizationId) {
    values.push(filters.labOrganizationId);
    conditions.push(`s.lab_organization_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`s.status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(`SELECT s.id FROM lab_test_submissions s ${whereClause} ORDER BY s.submitted_at DESC`, values);
  return Promise.all(result.rows.map((row) => buildSubmissionDetail(pool, row.id)));
}

export async function getSubmissionById(id: string): Promise<LabTestSubmissionWithResults> {
  return buildSubmissionDetail(pool, id);
}

async function applyResult(
  client: PoolClient,
  submissionId: string,
  testType: TestType,
  metrics: TestMetrics,
  notes: string | undefined,
  source: 'manual' | 'file_upload',
  user: AuthenticatedUser,
): Promise<LabTestResult> {
  const resultValue = computeResultValue(testType, metrics);
  const threshold = CERTIFICATION_THRESHOLDS[testType];
  const passed = isPassingResult(testType, resultValue);

  const result = await client.query(
    `INSERT INTO lab_test_results (submission_id, test_type, metrics, result_value, threshold_used, passed, source, recorded_by, notes)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [submissionId, testType, JSON.stringify(metrics), resultValue, threshold, passed, source, user.email, notes?.trim() ?? null],
  );
  const created = result.rows[0];

  if (!passed) {
    const reason = `${testType} result ${resultValue}% is below the certification threshold of ${threshold}%`;
    await client.query(
      `INSERT INTO lab_quality_flags (seed_lot_id, submission_id, test_type, reason)
       VALUES ((SELECT seed_lot_id FROM lab_test_submissions WHERE id = $1), $1, $2, $3)`,
      [submissionId, testType, reason],
    );

    const lotResult = await client.query<{ lot_code: string }>(
      `SELECT sl.lot_code FROM lab_test_submissions s JOIN seed_lots sl ON sl.id = s.seed_lot_id WHERE s.id = $1`,
      [submissionId],
    );
    const lotCode = lotResult.rows[0]?.lot_code ?? 'a seed lot';
    await sendPushToAllDevices('Quality Flag Raised', `${lotCode}: ${reason}`, { type: 'QUALITY_FLAG', submissionId, testType });
  }

  return mapResultRow(created);
}

async function finalizeSubmissionIfComplete(
  client: PoolClient,
  submissionId: string,
  requestedTests: TestType[],
  currentStatus: string,
): Promise<void> {
  const resultsResult = await client.query<{ test_type: TestType; passed: boolean }>(
    'SELECT test_type, passed FROM lab_test_results WHERE submission_id = $1',
    [submissionId],
  );
  const recordedTypes = new Set(resultsResult.rows.map((r) => r.test_type));
  const allRecorded = requestedTests.every((t) => recordedTypes.has(t));

  if (allRecorded) {
    const anyFailed = resultsResult.rows.some((r) => !r.passed);
    await client.query(`UPDATE lab_test_submissions SET status = $1, completed_at = now(), updated_at = now() WHERE id = $2`, [
      anyFailed ? 'failed' : 'completed',
      submissionId,
    ]);

    // Carry the outcome onto the seed lot itself — this is the "Testing ->
    // Certified/Rejected" transition the seed-testing feature is about.
    // Only this submission's own lot moves; an unrelated earlier
    // submission for the same lot (if any) is superseded by this one.
    const testingStatus = anyFailed ? 'rejected' : 'certified';
    const lotUpdateResult = await client.query<{ id: string; lot_code: string; testing_status: string }>(
      `UPDATE seed_lots SET testing_status = $1, updated_at = now()
       WHERE id = (SELECT seed_lot_id FROM lab_test_submissions WHERE id = $2)
       RETURNING id, lot_code, testing_status`,
      [testingStatus, submissionId],
    );
    const updatedLot = lotUpdateResult.rows[0];
    if (updatedLot) {
      broadcast('SEED_LOT_TESTING_STATUS_CHANGED', {
        seedLotId: updatedLot.id,
        lotCode: updatedLot.lot_code,
        testingStatus: updatedLot.testing_status,
        submissionId,
      });
    }
  } else if (currentStatus === 'submitted') {
    await client.query(`UPDATE lab_test_submissions SET status = 'in_progress', updated_at = now() WHERE id = $1`, [submissionId]);
  }
}

async function assertResultRecordable(
  client: PoolClient,
  submissionId: string,
  testType: TestType,
): Promise<{ requestedTests: TestType[]; status: string }> {
  const submissionResult = await client.query('SELECT * FROM lab_test_submissions WHERE id = $1 FOR UPDATE', [submissionId]);
  const submission = submissionResult.rows[0];
  if (!submission) throw new NotFoundError(`Lab test submission ${submissionId} not found`);
  if (submission.status === 'completed' || submission.status === 'failed') {
    throw new ConflictError(`Submission is already ${submission.status} — no further results can be recorded`);
  }
  const requestedTests: TestType[] = submission.requested_tests;
  if (!requestedTests.includes(testType)) {
    throw new ValidationError(`${testType} was not among the tests requested for this submission`);
  }
  const existingResult = await client.query('SELECT id FROM lab_test_results WHERE submission_id = $1 AND test_type = $2', [
    submissionId,
    testType,
  ]);
  if (existingResult.rows.length > 0) {
    throw new ConflictError(`A ${testType} result has already been recorded for this submission`);
  }
  return { requestedTests, status: submission.status };
}

export async function recordTestResult(
  submissionId: string,
  input: RecordTestResultInput,
  user: AuthenticatedUser,
): Promise<LabTestSubmissionWithResults> {
  if (!TEST_TYPES.includes(input.testType)) {
    throw new ValidationError(`testType must be one of: ${TEST_TYPES.join(', ')}`);
  }
  if (!input.metrics || typeof input.metrics !== 'object') throw new ValidationError('metrics is required');

  return withTransaction(async (client) => {
    const { requestedTests, status } = await assertResultRecordable(client, submissionId, input.testType);

    await applyResult(client, submissionId, input.testType, input.metrics, input.notes, 'manual', user);
    await finalizeSubmissionIfComplete(client, submissionId, requestedTests, status);

    await insertAuditLog(client, {
      entityType: 'lab_test_submission',
      entityId: submissionId,
      action: 'RECORD_TEST_RESULT',
      performedBy: user.email,
      metadata: { testType: input.testType, source: 'manual' },
    });

    return buildSubmissionDetail(client, submissionId);
  });
}

export async function bulkUploadResults(
  submissionId: string,
  rows: RecordTestResultInput[],
  user: AuthenticatedUser,
): Promise<LabTestSubmissionWithResults> {
  if (!Array.isArray(rows) || rows.length === 0) throw new ValidationError('At least one result row is required');

  const seenTypes = new Set<TestType>();
  for (const row of rows) {
    if (!TEST_TYPES.includes(row.testType)) throw new ValidationError(`Invalid test type in upload: ${row.testType}`);
    if (seenTypes.has(row.testType)) throw new ValidationError(`Duplicate ${row.testType} result in the same upload`);
    seenTypes.add(row.testType);
    if (!row.metrics || typeof row.metrics !== 'object') throw new ValidationError(`metrics is required for ${row.testType}`);
  }

  return withTransaction(async (client) => {
    const submissionResult = await client.query('SELECT * FROM lab_test_submissions WHERE id = $1 FOR UPDATE', [submissionId]);
    const submission = submissionResult.rows[0];
    if (!submission) throw new NotFoundError(`Lab test submission ${submissionId} not found`);
    if (submission.status === 'completed' || submission.status === 'failed') {
      throw new ConflictError(`Submission is already ${submission.status} — no further results can be recorded`);
    }
    const requestedTests: TestType[] = submission.requested_tests;

    for (const row of rows) {
      if (!requestedTests.includes(row.testType)) {
        throw new ValidationError(`${row.testType} was not among the tests requested for this submission`);
      }
      const existingResult = await client.query('SELECT id FROM lab_test_results WHERE submission_id = $1 AND test_type = $2', [
        submissionId,
        row.testType,
      ]);
      if (existingResult.rows.length > 0) {
        throw new ConflictError(`A ${row.testType} result has already been recorded for this submission`);
      }
    }

    for (const row of rows) {
      await applyResult(client, submissionId, row.testType, row.metrics, row.notes, 'file_upload', user);
    }

    await finalizeSubmissionIfComplete(client, submissionId, requestedTests, submission.status);

    await insertAuditLog(client, {
      entityType: 'lab_test_submission',
      entityId: submissionId,
      action: 'BULK_UPLOAD_RESULTS',
      performedBy: user.email,
      metadata: { testTypes: rows.map((r) => r.testType), source: 'file_upload' },
    });

    return buildSubmissionDetail(client, submissionId);
  });
}

export async function listQualityFlags(filters: { resolved?: boolean; seedLotId?: string }): Promise<LabQualityFlagWithContext[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.resolved !== undefined) {
    values.push(filters.resolved);
    conditions.push(`f.resolved = $${values.length}`);
  }
  if (filters.seedLotId) {
    values.push(filters.seedLotId);
    conditions.push(`f.seed_lot_id = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT f.*, sl.lot_code FROM lab_quality_flags f JOIN seed_lots sl ON sl.id = f.seed_lot_id ${whereClause} ORDER BY f.flagged_at DESC`,
    values,
  );
  return result.rows;
}

export async function resolveQualityFlag(id: string, resolutionNotes: string, user: AuthenticatedUser): Promise<LabQualityFlag> {
  if (!resolutionNotes?.trim()) throw new ValidationError('resolutionNotes is required to resolve a quality flag');

  return withTransaction(async (client) => {
    const existingResult = await client.query('SELECT * FROM lab_quality_flags WHERE id = $1 FOR UPDATE', [id]);
    const existing = existingResult.rows[0];
    if (!existing) throw new NotFoundError(`Quality flag ${id} not found`);
    if (existing.resolved) throw new ConflictError('Quality flag is already resolved');

    const result = await client.query(
      `UPDATE lab_quality_flags SET resolved = true, resolved_by = $1, resolved_at = now(), resolution_notes = $2 WHERE id = $3 RETURNING *`,
      [user.email, resolutionNotes.trim(), id],
    );
    const updated = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'lab_quality_flag',
      entityId: id,
      action: 'RESOLVE_QUALITY_FLAG',
      performedBy: user.email,
      beforeState: existing,
      afterState: updated,
    });

    return updated;
  });
}

export async function getLabPerformanceMetrics(): Promise<LabPerformanceEntry[]> {
  const result = await pool.query(
    `SELECT o.id AS lab_organization_id, o.name AS lab_organization_name,
            COUNT(s.id)::int AS total_submissions,
            COUNT(*) FILTER (WHERE s.status = 'completed')::int AS completed_count,
            COUNT(*) FILTER (WHERE s.status = 'failed')::int AS failed_count,
            AVG(EXTRACT(EPOCH FROM (s.completed_at - s.submitted_at)) / 86400.0) FILTER (WHERE s.completed_at IS NOT NULL) AS avg_turnaround_days,
            COUNT(*) FILTER (WHERE s.status IN ('submitted', 'in_progress') AND s.expected_completion_date < CURRENT_DATE)::int AS overdue_count
     FROM organizations o
     LEFT JOIN lab_test_submissions s ON s.lab_organization_id = o.id
     WHERE o.type = 'laboratory'
     GROUP BY o.id, o.name
     ORDER BY o.name`,
  );

  return result.rows.map((row) => {
    const completed = Number(row.completed_count);
    const failed = Number(row.failed_count);
    const finalized = completed + failed;
    return {
      labOrganizationId: row.lab_organization_id,
      labOrganizationName: row.lab_organization_name,
      totalSubmissions: Number(row.total_submissions),
      completedCount: completed,
      failedCount: failed,
      passRate: finalized > 0 ? Math.round((completed / finalized) * 1000) / 10 : null,
      avgTurnaroundDays: row.avg_turnaround_days != null ? Math.round(Number(row.avg_turnaround_days) * 10) / 10 : null,
      overdueCount: Number(row.overdue_count),
    };
  });
}

export async function generatePhytosanitaryCertificateForSubmission(
  submissionId: string,
  input: GeneratePhytosanitaryFromSubmissionInput,
  user: AuthenticatedUser,
) {
  return withTransaction(async (client) => {
    const submissionResult = await client.query(
      `SELECT s.*, o.name AS lab_name, sl.lot_code
       FROM lab_test_submissions s
       JOIN organizations o ON o.id = s.lab_organization_id
       JOIN seed_lots sl ON sl.id = s.seed_lot_id
       WHERE s.id = $1
       FOR UPDATE OF s`,
      [submissionId],
    );
    const submission = submissionResult.rows[0];
    if (!submission) throw new NotFoundError(`Lab test submission ${submissionId} not found`);
    if (submission.status !== 'completed') {
      throw new ConflictError(
        `Submission is ${submission.status} — a phytosanitary certificate can only be generated once all requested tests have passed`,
      );
    }

    const existingCert = await client.query('SELECT id FROM phytosanitary_certificates WHERE submission_id = $1', [submissionId]);
    if (existingCert.rows.length > 0) {
      throw new ConflictError('A phytosanitary certificate has already been generated for this submission');
    }

    const certificateNumber =
      input.certificateNumber?.trim() || `PHYTO-${submission.lot_code}-${submissionId.slice(0, 8).toUpperCase()}`;
    const issuingAuthority = input.issuingAuthority?.trim() || submission.lab_name;

    const result = await client.query(
      `INSERT INTO phytosanitary_certificates (seed_lot_id, certificate_number, issuing_authority, issue_date, expiry_date, issued_by, notes, submission_id)
       VALUES ($1, $2, $3, CURRENT_DATE, $4::date, $5, $6, $7)
       RETURNING *`,
      [
        submission.seed_lot_id,
        certificateNumber,
        issuingAuthority,
        input.expiryDate ?? null,
        user.email,
        input.notes?.trim() ?? null,
        submissionId,
      ],
    );
    const created = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'phytosanitary_certificate',
      entityId: created.id,
      action: 'GENERATE_PHYTOSANITARY_FROM_SUBMISSION',
      performedBy: user.email,
      afterState: created,
      metadata: { submissionId },
    });

    return created;
  });
}

export interface LabIssuedCertificate {
  id: string;
  certificate_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  issued_by: string;
  notes: string | null;
  seed_lot_id: string;
  lot_code: string;
  submission_id: string | null;
  lab_organization_name: string | null;
}

/**
 * Phytosanitary certificates that originated from a lab submission — the
 * `submission_id` link migration 028 added exists precisely so a certificate
 * is traceable back to the tests that justified it. Certificates written
 * directly by the compliance module (submission_id IS NULL) are excluded:
 * this is the Laboratory module's own issue log, not a duplicate of the
 * compliance module's per-lot certificate list.
 */
export async function listCertificatesIssuedFromSubmissions(): Promise<LabIssuedCertificate[]> {
  const result = await pool.query<LabIssuedCertificate>(
    `SELECT pc.id, pc.certificate_number, pc.issuing_authority, pc.issue_date, pc.expiry_date,
            pc.status, pc.issued_by, pc.notes, pc.seed_lot_id, pc.submission_id,
            sl.lot_code,
            o.name AS lab_organization_name
       FROM phytosanitary_certificates pc
       JOIN seed_lots sl ON sl.id = pc.seed_lot_id
       LEFT JOIN lab_test_submissions s ON s.id = pc.submission_id
       LEFT JOIN organizations o ON o.id = s.lab_organization_id
      WHERE pc.submission_id IS NOT NULL
      ORDER BY pc.issue_date DESC, pc.certificate_number`,
  );
  return result.rows;
}
