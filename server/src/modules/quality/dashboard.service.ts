import { pool } from '../../db/pool';
import { DEPARTMENTS } from './quality.common';

/**
 * Foundation dashboard for the Quality Spine. Every figure is a straight
 * count or average over stored records — there is deliberately no composite
 * "compliance score" here: a single number invented before there is data to
 * ground it would be the fabricated kind of KPI an auditor distrusts. The
 * Phase 2 compliance assessment supplies the scoring model.
 */
export async function getQualityDashboard() {
  const [ncr, capa, complaints, sops, coverage, holds, reviewDue] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('open','investigating'))::int AS open_total,
         COUNT(*) FILTER (WHERE status IN ('open','investigating') AND severity = 'critical')::int AS open_critical,
         COUNT(*) FILTER (WHERE status IN ('open','investigating') AND severity = 'major')::int AS open_major,
         COUNT(*) FILTER (WHERE status IN ('open','investigating') AND severity = 'minor')::int AS open_minor,
         COUNT(*) FILTER (WHERE status IN ('open','investigating') AND due_date < CURRENT_DATE)::int AS overdue,
         COUNT(*) FILTER (WHERE status = 'closed' AND closed_at >= now() - interval '30 days')::int AS closed_last_30d,
         ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400) FILTER (WHERE status = 'closed'), 1)::float AS avg_days_to_close
       FROM non_conformances`,
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('open','in_progress','implemented'))::int AS open_total,
         COUNT(*) FILTER (WHERE status IN ('open','in_progress','implemented') AND due_date < CURRENT_DATE)::int AS overdue,
         COUNT(*) FILTER (WHERE status = 'implemented')::int AS awaiting_verification,
         COUNT(*) FILTER (WHERE status = 'closed' AND verified_at >= now() - interval '30 days')::int AS closed_last_30d,
         COUNT(*) FILTER (WHERE verification_count > 0 AND effectiveness_result = 'ineffective')::int AS failed_verification,
         COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_total
       FROM capas`,
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('received','investigating'))::int AS open_total,
         COUNT(*) FILTER (WHERE status IN ('received','investigating') AND severity = 'critical')::int AS open_critical,
         COUNT(*) FILTER (WHERE recall_recommended AND status <> 'closed')::int AS recall_recommended,
         COUNT(*) FILTER (WHERE received_date >= CURRENT_DATE - 30)::int AS received_last_30d,
         ROUND(AVG(resolved_at::date - received_date) FILTER (WHERE resolved_at >= now() - interval '90 days'), 1)::float AS avg_days_to_resolve_90d
       FROM quality_complaints`,
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'effective')::int AS effective,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'in_review')::int AS in_review
       FROM sop_versions`,
    ),
    pool.query(
      `SELECT d.department, COUNT(v.id)::int AS effective_sops
         FROM sop_documents d LEFT JOIN sop_versions v ON v.sop_id = d.id AND v.status = 'effective'
        GROUP BY d.department`,
    ),
    pool.query('SELECT COUNT(*)::int AS active FROM quality_lot_holds WHERE released_at IS NULL'),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE next_review_date < CURRENT_DATE)::int AS overdue,
         COUNT(*) FILTER (WHERE next_review_date >= CURRENT_DATE AND next_review_date <= CURRENT_DATE + 30)::int AS due_soon
       FROM sop_versions WHERE status = 'effective'`,
    ),
  ]);

  const byDepartment = new Map(coverage.rows.map((r: { department: string; effective_sops: number }) => [r.department, r.effective_sops]));
  const departmentCoverage = DEPARTMENTS.map((department) => ({
    department,
    effectiveSops: byDepartment.get(department) ?? 0,
    covered: (byDepartment.get(department) ?? 0) > 0,
  }));
  const covered = departmentCoverage.filter((d) => d.covered).length;

  return {
    generatedAt: new Date().toISOString(),
    nonConformances: ncr.rows[0],
    capas: capa.rows[0],
    complaints: complaints.rows[0],
    sops: {
      ...sops.rows[0],
      reviewOverdue: reviewDue.rows[0].overdue,
      reviewDueSoon: reviewDue.rows[0].due_soon,
      departmentCoverage,
      departmentsCovered: covered,
      departmentsTotal: DEPARTMENTS.length,
      coveragePercent: Math.round((covered / DEPARTMENTS.length) * 100),
    },
    holds: holds.rows[0],
  };
}
