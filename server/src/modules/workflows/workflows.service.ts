import type { PoolClient } from 'pg';
import { assertOwnsOrganization } from '../../auth/ownership';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { broadcast } from '../../ws/server';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import type { SeedLot } from '../seedLots/seedLots.types';
import {
  stageDefinition,
  WORKFLOW_STAGE_DEFINITIONS,
  type WorkflowInstanceRow,
  type WorkflowStageKey,
  type WorkflowStageRow,
  type WorkflowWithStages,
} from './workflows.types';

async function getSeedLot(client: PoolClient, id: string): Promise<SeedLot> {
  const result = await client.query<SeedLot>('SELECT * FROM seed_lots WHERE id = $1', [id]);
  const lot = result.rows[0];
  if (!lot) throw new NotFoundError(`Seed lot ${id} not found`);
  return lot;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function startWorkflow(seedLotId: string, user: AuthenticatedUser): Promise<WorkflowWithStages> {
  const result = await withTransaction(async (client) => {
    const lot = await getSeedLot(client, seedLotId);
    if (lot.stage !== 'Foundation') {
      throw new ValidationError(`A production workflow must start from a Foundation-stage lot (this lot is ${lot.stage})`);
    }
    assertOwnsOrganization(
      user,
      lot.organization_id,
      'You can only start a production workflow for a lot owned by your organization',
    );

    const existingResult = await client.query(
      "SELECT id FROM workflow_instances WHERE seed_lot_id = $1 AND status = 'in_progress'",
      [seedLotId],
    );
    if (existingResult.rows.length > 0) {
      throw new ConflictError(`An in-progress workflow already exists for seed lot ${lot.lot_code}`);
    }

    const workflowResult = await client.query<WorkflowInstanceRow>(
      'INSERT INTO workflow_instances (seed_lot_id, started_by) VALUES ($1, $2) RETURNING *',
      [seedLotId, user.email],
    );
    const workflow = workflowResult.rows[0];

    const now = new Date();
    const stages: WorkflowStageRow[] = [];
    for (const definition of WORKFLOW_STAGE_DEFINITIONS) {
      const isFirst = definition.sequence === 1;
      const isSecond = definition.sequence === 2;
      const status = isFirst ? 'approved' : isSecond ? 'ready' : 'pending';

      const stageResult = await client.query<WorkflowStageRow>(
        `INSERT INTO workflow_stages (workflow_id, stage_key, sequence, department, status, started_at, due_at, approved_by, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          workflow.id,
          definition.key,
          definition.sequence,
          definition.department,
          status,
          isFirst || isSecond ? now.toISOString() : null,
          isSecond ? addDays(now, definition.durationDays).toISOString() : null,
          isFirst ? user.email : null,
          isFirst ? now.toISOString() : null,
        ],
      );
      stages.push(stageResult.rows[0]);
    }

    await insertAuditLog(client, {
      entityType: 'workflow_instance',
      entityId: workflow.id,
      action: 'START_WORKFLOW',
      performedBy: user.email,
      afterState: workflow,
      metadata: { seedLotId },
    });

    return { ...workflow, stages };
  });

  broadcast('WORKFLOW_STARTED', { workflowId: result.id, seedLotId: result.seed_lot_id, startedBy: result.started_by });
  return result;
}

export async function getWorkflow(id: string): Promise<WorkflowWithStages> {
  const workflowResult = await pool.query<WorkflowInstanceRow>('SELECT * FROM workflow_instances WHERE id = $1', [id]);
  const workflow = workflowResult.rows[0];
  if (!workflow) throw new NotFoundError(`Workflow ${id} not found`);

  const stagesResult = await pool.query<WorkflowStageRow>(
    'SELECT * FROM workflow_stages WHERE workflow_id = $1 ORDER BY sequence ASC',
    [id],
  );
  return { ...workflow, stages: stagesResult.rows };
}

export async function listWorkflows(filters: { seedLotId?: string; status?: string }): Promise<WorkflowWithStages[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.seedLotId) {
    values.push(filters.seedLotId);
    conditions.push(`seed_lot_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const workflowsResult = await pool.query<WorkflowInstanceRow>(
    `SELECT * FROM workflow_instances ${whereClause} ORDER BY started_at DESC`,
    values,
  );
  const workflows = workflowsResult.rows;
  if (workflows.length === 0) return [];

  const stagesResult = await pool.query<WorkflowStageRow>(
    'SELECT * FROM workflow_stages WHERE workflow_id = ANY($1::uuid[]) ORDER BY sequence ASC',
    [workflows.map((workflow) => workflow.id)],
  );

  const stagesByWorkflow = new Map<string, WorkflowStageRow[]>();
  for (const stage of stagesResult.rows) {
    const existing = stagesByWorkflow.get(stage.workflow_id) ?? [];
    existing.push(stage);
    stagesByWorkflow.set(stage.workflow_id, existing);
  }

  return workflows.map((workflow) => ({ ...workflow, stages: stagesByWorkflow.get(workflow.id) ?? [] }));
}

/**
 * The real business rules behind each approval gate — this is what makes
 * the workflow enforce something instead of just tracking a status label.
 */
async function validateStageApproval(
  client: PoolClient,
  stageKey: WorkflowStageKey,
  workflow: WorkflowInstanceRow,
): Promise<{ certifiedLotId?: string }> {
  switch (stageKey) {
    case 'PRE_CERTIFIED_INSPECTION': {
      const result = await client.query<{ test_count: string }>(
        `SELECT
           (SELECT COUNT(*) FROM germination_tests WHERE seed_lot_id = $1) +
           (SELECT COUNT(*) FROM viability_tests WHERE seed_lot_id = $1) AS test_count`,
        [workflow.seed_lot_id],
      );
      if (Number(result.rows[0].test_count) === 0) {
        throw new ValidationError(
          'Pre-certified inspection requires at least one germination or viability test on record for the Foundation lot',
        );
      }
      return {};
    }

    case 'CERTIFIED_PRODUCTION': {
      const result = await client.query<{ id: string }>(
        "SELECT id FROM seed_lots WHERE parent_lot_id = $1 AND stage = 'Certified' ORDER BY created_at ASC LIMIT 1",
        [workflow.seed_lot_id],
      );
      const certifiedLot = result.rows[0];
      if (!certifiedLot) {
        throw new ValidationError(
          'Certified production requires at least one Certified child lot to exist for this Foundation lot — create it first',
        );
      }
      return { certifiedLotId: certifiedLot.id };
    }

    case 'QUALITY_TESTING': {
      if (!workflow.certified_lot_id) {
        throw new ValidationError(
          'Quality testing requires the Certified Production stage to be approved first (no certified lot linked yet)',
        );
      }
      const result = await client.query<{ total_sample: string; total_germinated: string }>(
        'SELECT SUM(sample_size) AS total_sample, SUM(germinated_count) AS total_germinated FROM germination_tests WHERE seed_lot_id = $1',
        [workflow.certified_lot_id],
      );
      const totalSample = Number(result.rows[0].total_sample ?? 0);
      const totalGerminated = Number(result.rows[0].total_germinated ?? 0);
      if (totalSample === 0) {
        throw new ValidationError('Quality testing requires at least one germination test on the certified lot');
      }
      const rate = (totalGerminated / totalSample) * 100;
      if (rate < 85) {
        throw new ValidationError(
          `Certified lot germination rate (${rate.toFixed(1)}%) is below the 85% quality threshold required for release`,
        );
      }
      return {};
    }

    case 'MARKET_READY_RELEASE': {
      if (!workflow.certified_lot_id) {
        throw new ValidationError('Market-ready release requires a certified lot to be linked (approve earlier stages first)');
      }
      const certResult = await client.query(
        "SELECT id FROM quality_certificates WHERE seed_lot_id = $1 AND status = 'issued' LIMIT 1",
        [workflow.certified_lot_id],
      );
      if (certResult.rows.length === 0) {
        throw new ValidationError('Market-ready release requires a signed, issued quality certificate for the certified lot');
      }
      const phytoResult = await client.query(
        "SELECT id FROM phytosanitary_certificates WHERE seed_lot_id = $1 AND status = 'valid' LIMIT 1",
        [workflow.certified_lot_id],
      );
      if (phytoResult.rows.length === 0) {
        throw new ValidationError('Market-ready release requires a valid phytosanitary certificate for the certified lot');
      }
      return {};
    }

    default:
      return {};
  }
}

export async function approveStage(
  workflowId: string,
  stageKey: WorkflowStageKey,
  user: AuthenticatedUser,
  notes: string | undefined,
): Promise<WorkflowWithStages> {
  const definition = stageDefinition(stageKey);

  const result = await withTransaction(async (client) => {
    const workflowResult = await client.query<WorkflowInstanceRow>(
      'SELECT * FROM workflow_instances WHERE id = $1 FOR UPDATE',
      [workflowId],
    );
    const workflow = workflowResult.rows[0];
    if (!workflow) throw new NotFoundError(`Workflow ${workflowId} not found`);
    if (workflow.status !== 'in_progress') {
      throw new ConflictError(`Workflow is ${workflow.status} — no further stages can be approved`);
    }
    if (!definition.approverRoles.includes(user.role)) {
      throw new ForbiddenError(
        `Approving "${definition.label}" requires one of these roles: ${definition.approverRoles.join(', ')}`,
      );
    }

    const stageResult = await client.query<WorkflowStageRow>(
      'SELECT * FROM workflow_stages WHERE workflow_id = $1 AND stage_key = $2 FOR UPDATE',
      [workflowId, stageKey],
    );
    const stage = stageResult.rows[0];
    if (!stage) throw new NotFoundError(`Stage ${stageKey} not found for this workflow`);
    if (stage.status === 'pending') {
      throw new ConflictError(`Stage "${definition.label}" is not yet reachable — the previous stage must be approved first`);
    }
    if (stage.status === 'approved') {
      throw new ConflictError(`Stage "${definition.label}" is already approved`);
    }

    const { certifiedLotId } = await validateStageApproval(client, stageKey, workflow);

    const now = new Date();
    await client.query(
      "UPDATE workflow_stages SET status = 'approved', approved_by = $1, approved_at = $2, notes = COALESCE($3, notes) WHERE id = $4",
      [user.email, now.toISOString(), notes ?? null, stage.id],
    );

    if (certifiedLotId) {
      await client.query('UPDATE workflow_instances SET certified_lot_id = $1 WHERE id = $2', [certifiedLotId, workflowId]);
    }

    const nextDefinition = WORKFLOW_STAGE_DEFINITIONS.find((d) => d.sequence === definition.sequence + 1);
    if (nextDefinition) {
      await client.query(
        "UPDATE workflow_stages SET status = 'ready', started_at = $1, due_at = $2 WHERE workflow_id = $3 AND stage_key = $4",
        [now.toISOString(), addDays(now, nextDefinition.durationDays).toISOString(), workflowId, nextDefinition.key],
      );
    } else {
      await client.query("UPDATE workflow_instances SET status = 'completed', completed_at = $1 WHERE id = $2", [
        now.toISOString(),
        workflowId,
      ]);
    }

    await insertAuditLog(client, {
      entityType: 'workflow_stage',
      entityId: stage.id,
      action: 'APPROVE_STAGE',
      performedBy: user.email,
      beforeState: { status: stage.status },
      afterState: { status: 'approved' },
      metadata: { workflowId, stageKey },
    });

    const stagesResult = await client.query<WorkflowStageRow>(
      'SELECT * FROM workflow_stages WHERE workflow_id = $1 ORDER BY sequence ASC',
      [workflowId],
    );
    const finalWorkflowResult = await client.query<WorkflowInstanceRow>('SELECT * FROM workflow_instances WHERE id = $1', [
      workflowId,
    ]);

    return { ...finalWorkflowResult.rows[0], stages: stagesResult.rows };
  });

  broadcast('WORKFLOW_STAGE_APPROVED', {
    workflowId,
    stageKey,
    approvedBy: user.email,
    workflowStatus: result.status,
  });

  return result;
}

export async function rejectStage(
  workflowId: string,
  stageKey: WorkflowStageKey,
  user: AuthenticatedUser,
  reason: string,
): Promise<WorkflowWithStages> {
  if (!reason?.trim()) throw new ValidationError('A rejection reason is required');
  const definition = stageDefinition(stageKey);

  const result = await withTransaction(async (client) => {
    const workflowResult = await client.query<WorkflowInstanceRow>(
      'SELECT * FROM workflow_instances WHERE id = $1 FOR UPDATE',
      [workflowId],
    );
    const workflow = workflowResult.rows[0];
    if (!workflow) throw new NotFoundError(`Workflow ${workflowId} not found`);
    if (workflow.status !== 'in_progress') {
      throw new ConflictError(`Workflow is ${workflow.status} — no further stages can be rejected`);
    }
    if (!definition.approverRoles.includes(user.role)) {
      throw new ForbiddenError(
        `Rejecting "${definition.label}" requires one of these roles: ${definition.approverRoles.join(', ')}`,
      );
    }

    const stageResult = await client.query<WorkflowStageRow>(
      'SELECT * FROM workflow_stages WHERE workflow_id = $1 AND stage_key = $2 FOR UPDATE',
      [workflowId, stageKey],
    );
    const stage = stageResult.rows[0];
    if (!stage) throw new NotFoundError(`Stage ${stageKey} not found for this workflow`);
    if (stage.status === 'pending') throw new ConflictError(`Stage "${definition.label}" is not yet reachable`);
    if (stage.status === 'approved') {
      throw new ConflictError(`Stage "${definition.label}" is already approved and cannot be rejected`);
    }

    await client.query("UPDATE workflow_stages SET status = 'rejected', rejection_reason = $1 WHERE id = $2", [
      reason.trim(),
      stage.id,
    ]);

    await insertAuditLog(client, {
      entityType: 'workflow_stage',
      entityId: stage.id,
      action: 'REJECT_STAGE',
      performedBy: user.email,
      afterState: { status: 'rejected', rejectionReason: reason.trim() },
      metadata: { workflowId, stageKey },
    });

    const stagesResult = await client.query<WorkflowStageRow>(
      'SELECT * FROM workflow_stages WHERE workflow_id = $1 ORDER BY sequence ASC',
      [workflowId],
    );
    return { ...workflow, stages: stagesResult.rows };
  });

  broadcast('WORKFLOW_STAGE_REJECTED', { workflowId, stageKey, rejectedBy: user.email, reason });
  return result;
}

export async function cancelWorkflow(workflowId: string, user: AuthenticatedUser): Promise<WorkflowInstanceRow> {
  const result = await withTransaction(async (client) => {
    const updateResult = await client.query<WorkflowInstanceRow>(
      "UPDATE workflow_instances SET status = 'cancelled' WHERE id = $1 AND status = 'in_progress' RETURNING *",
      [workflowId],
    );
    if (updateResult.rows.length === 0) {
      const existing = await client.query<{ status: string }>('SELECT status FROM workflow_instances WHERE id = $1', [
        workflowId,
      ]);
      if (existing.rows.length === 0) throw new NotFoundError(`Workflow ${workflowId} not found`);
      throw new ConflictError(`Workflow is already ${existing.rows[0].status}`);
    }

    const cancelled = updateResult.rows[0];
    await insertAuditLog(client, {
      entityType: 'workflow_instance',
      entityId: workflowId,
      action: 'CANCEL_WORKFLOW',
      performedBy: user.email,
      afterState: cancelled,
    });
    return cancelled;
  });

  broadcast('WORKFLOW_CANCELLED', { workflowId, cancelledBy: user.email });
  return result;
}
