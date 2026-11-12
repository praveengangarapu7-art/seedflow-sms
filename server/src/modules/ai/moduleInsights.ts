import { pool } from '../../db/pool';
import { getQualityDashboard } from '../quality/dashboard.service';
import {
  forecastReport,
  labRiskReport,
  type ForecastReport,
  type LabRiskReport,
} from './ai.service';
import { AiProviderError, activeModelName, generateFromParts, isConfigured } from '../assistant/aiProvider';

/**
 * Per-module AI insights, so every SeedSphere module can show "what needs
 * attention here" and link back into the AI Center.
 *
 * Same rule as the rest of the AI Center: every number, ranking and flag is
 * computed from stored records. The language model (when configured) only
 * rewrites the already-computed findings into a short briefing; without a key
 * the rule-based wording below is what the user sees.
 *
 * Each module's query set is isolated: if a table is missing (an older
 * database) or a query fails, that finding is skipped and the rest still show.
 */

export type ModuleKey = 'production' | 'procurement' | 'warehouse' | 'rd' | 'processing' | 'laboratory' | 'quality' | 'administration';
export const MODULE_KEYS: ModuleKey[] = ['production', 'procurement', 'warehouse', 'rd', 'processing', 'laboratory', 'quality', 'administration'];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  production: 'Production Planning',
  procurement: 'Procurement',
  warehouse: 'Warehouse',
  rd: 'Research & Development',
  processing: 'Processing',
  laboratory: 'Laboratory',
  quality: 'Quality',
  administration: 'Administration',
};

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'good';

export interface ModuleInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  action: string | null;
  /** In-app route that opens the records behind this insight. */
  link: string | null;
  /** AI Center tab with the full analysis, when there is one. */
  aiTab: 'risk' | 'forecast' | null;
}

export interface ModuleMetric {
  label: string;
  value: string;
  tone: 'bad' | 'warn' | 'good' | 'neutral';
}

export interface ModuleInsights {
  module: ModuleKey;
  label: string;
  generatedAt: string;
  headline: string;
  metrics: ModuleMetric[];
  insights: ModuleInsight[];
  suggestedQuestions: string[];
  briefing: string | null;
  briefingSource: 'model' | 'rules';
  model: string | null;
}

// ------------------------------------------------------------------ shared data

interface Shared {
  risk: LabRiskReport;
  forecast: ForecastReport;
}

let cache: { at: number; value: Shared } | null = null;
const CACHE_MS = 45_000;

async function shared(): Promise<Shared> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const [risk, forecast] = await Promise.all([labRiskReport({ narrate: false }), forecastReport({ narrate: false })]);
  cache = { at: Date.now(), value: { risk, forecast } };
  return cache.value;
}

/** Runs one query-backed finding; a failure (missing table, etc.) yields the fallback instead of failing the module. */
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn(`[ai] module insight "${label}" skipped:`, error instanceof Error ? error.message : error);
    return fallback;
  }
}

const kg = (n: number) => `${Math.round(n).toLocaleString('en-IN')} kg`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const SEVERITY_RANK: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, good: 3 };

function insight(i: Omit<ModuleInsight, 'action' | 'link' | 'aiTab'> & Partial<Pick<ModuleInsight, 'action' | 'link' | 'aiTab'>>): ModuleInsight {
  return { action: null, link: null, aiTab: null, ...i };
}

// ------------------------------------------------------------------ modules

type Builder = (s: Shared) => Promise<{ metrics: ModuleMetric[]; insights: ModuleInsight[]; questions: string[] }>;

const riskLots = (s: Shared) => s.risk.lots.filter((l) => l.riskLevel === 'critical' || l.riskLevel === 'high');

const procurement: Builder = async (s) => {
  const short = s.forecast.crops.filter((c) => c.status === 'shortage' || c.status === 'tight');
  const slow = s.forecast.crops.filter((c) => c.status === 'slow-moving');
  const pos = await safe(
    'purchase orders',
    async () =>
      (
        await pool.query<{ open_total: number; overdue: number; overdue_code: string | null }>(`
          SELECT COUNT(*) FILTER (WHERE status IN ('draft','sent','acknowledged'))::int AS open_total,
                 COUNT(*) FILTER (WHERE status IN ('sent','acknowledged') AND expected_delivery_date < CURRENT_DATE)::int AS overdue,
                 (SELECT po_number FROM purchase_orders WHERE status IN ('sent','acknowledged') AND expected_delivery_date < CURRENT_DATE
                   ORDER BY expected_delivery_date LIMIT 1) AS overdue_code
            FROM purchase_orders`)
      ).rows[0],
    { open_total: 0, overdue: 0, overdue_code: null },
  );
  const supplierNcrs = await safe(
    'supplier NCRs',
    async () =>
      (await pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM non_conformances WHERE source = 'supplier' AND status IN ('open','investigating')`)).rows[0].n,
    0,
  );

  const insights: ModuleInsight[] = [];
  for (const c of short.slice(0, 3)) {
    insights.push(
      insight({
        id: `short-${c.crop}`,
        severity: c.status === 'shortage' ? 'critical' : 'warning',
        title: `${c.crop} stock is ${c.status === 'shortage' ? 'short' : 'tight'}: ${c.monthsOfCover} months of cover`,
        detail: `${kg(c.quantityAvailable)} available against about ${kg(c.monthlyVelocity)} dispatched a month. Projected stock-out ${c.projectedStockoutDate ?? 'unknown'}.`,
        action: `Raise a ${c.crop} requisition or production plan now.`,
        link: '/procurement/requisitions',
        aiTab: 'forecast',
      }),
    );
  }
  if (pos.overdue > 0) {
    insights.push(
      insight({
        id: 'po-overdue',
        severity: 'warning',
        title: `${plural(pos.overdue, 'purchase order')} past the expected delivery date`,
        detail: `${pos.overdue_code ?? 'The oldest order'} is the longest overdue. Late seed lands after the sowing window.`,
        action: 'Chase the supplier or move the order to another source.',
        link: '/procurement/orders',
      }),
    );
  }
  if (supplierNcrs > 0) {
    insights.push(
      insight({
        id: 'supplier-ncr',
        severity: 'warning',
        title: `${plural(supplierNcrs, 'open supplier non-conformance', 'open supplier non-conformances')}`,
        detail: 'Quality problems traced to suppliers should count against their approval before the next order.',
        action: 'Review supplier scorecards before placing new orders.',
        link: '/quality/ncrs',
      }),
    );
  }
  if (slow.length > 0) {
    insights.push(
      insight({
        id: 'slow',
        severity: 'info',
        title: `Slow-moving stock: ${slow.map((c) => c.crop).join(', ')}`,
        detail: 'These crops have little or no dispatch in the last 90 days. Buying more ties up cash and storage.',
        action: 'Hold new purchases of these crops.',
        aiTab: 'forecast',
      }),
    );
  }
  if (insights.length === 0) {
    insights.push(insight({ id: 'ok', severity: 'good', title: 'Supply cover and orders look healthy', detail: 'No crop is short and no orders are overdue.' }));
  }
  return {
    metrics: [
      { label: 'Crops short or tight', value: String(short.length), tone: short.length ? 'bad' : 'good' },
      { label: 'Open purchase orders', value: String(pos.open_total), tone: 'neutral' },
      { label: 'Overdue orders', value: String(pos.overdue), tone: pos.overdue ? 'warn' : 'good' },
      { label: 'Slow-moving crops', value: String(slow.length), tone: slow.length ? 'warn' : 'good' },
    ],
    insights,
    questions: ['Which crops are running short?', 'Which purchase orders are overdue?', 'What should we buy before the next season?'],
  };
};

const warehouse: Builder = async (s) => {
  const lowStock = await safe(
    'low stock',
    async () =>
      (
        await pool.query<{ lot_code: string; crop: string; available: number; threshold: number }>(`
          SELECT lot_code, crop, (quantity_total - quantity_allocated)::float AS available, low_stock_threshold::float AS threshold
            FROM seed_lots WHERE status = 'active' AND (quantity_total - quantity_allocated) <= low_stock_threshold
           ORDER BY (quantity_total - quantity_allocated)`)
      ).rows,
    [],
  );
  const conditions = await safe(
    'storage conditions',
    async () =>
      (
        await pool.query<{ code: string; temp: number; target_temp: number; hum: number; target_hum: number }>(`
          SELECT DISTINCT ON (l.id) l.code, c.recorded_temperature_c::float AS temp, l.target_temperature_c::float AS target_temp,
                 c.recorded_humidity_percent::float AS hum, l.target_humidity_percent::float AS target_hum
            FROM storage_locations l JOIN storage_condition_logs c ON c.storage_location_id = l.id
           WHERE l.status = 'active' ORDER BY l.id, c.created_at DESC`)
      ).rows,
    [],
  );
  const outOfRange = conditions.filter((c) => Math.abs(c.temp - c.target_temp) > 3 || Math.abs(c.hum - c.target_hum) > 10);
  const onHold = await safe(
    'active holds',
    async () => (await pool.query<{ n: number }>('SELECT COUNT(*)::int AS n FROM quality_lot_holds WHERE released_at IS NULL')).rows[0].n,
    0,
  );
  const expiring = s.forecast.expiring;
  const expQty = expiring.reduce((sum, l) => sum + l.quantityAvailable, 0);
  const risky = riskLots(s);

  const insights: ModuleInsight[] = [];
  if (expiring.length > 0) {
    insights.push(
      insight({
        id: 'expiry',
        severity: expiring[0].daysToExpiry <= 30 ? 'critical' : 'warning',
        title: `${plural(expiring.length, 'lot')} reach label validity within 90 days (${kg(expQty)})`,
        detail: `${expiring[0].lotCode} is first, in ${expiring[0].daysToExpiry} days. Dispatch these first-expiry-first-out or re-validate.`,
        action: 'Move the oldest lots to the front of the picking queue.',
        link: '/warehouse/outbound',
        aiTab: 'forecast',
      }),
    );
  }
  if (risky.length > 0) {
    insights.push(
      insight({
        id: 'risk-stock',
        severity: s.risk.summary.critical > 0 ? 'critical' : 'warning',
        title: `${kg(s.risk.summary.quantityAtRisk)} in storage is at critical or high quality risk`,
        detail: `${risky.slice(0, 3).map((l) => l.lotCode).join(', ')}${risky.length > 3 ? ` and ${risky.length - 3} more` : ''}. Stock below the germination minimum should not be dispatched.`,
        action: 'Block dispatch of critical lots until they are re-tested.',
        link: '/warehouse/inventory',
        aiTab: 'risk',
      }),
    );
  }
  if (outOfRange.length > 0) {
    insights.push(
      insight({
        id: 'conditions',
        severity: 'warning',
        title: `${plural(outOfRange.length, 'storage location')} outside the target temperature or humidity`,
        detail: `${outOfRange.map((c) => `${c.code} (${c.temp.toFixed(1)}°C, ${c.hum.toFixed(0)}% RH)`).slice(0, 3).join('; ')}. Warm, humid storage speeds up germination loss.`,
        action: 'Check the cooling and dehumidifier on these locations.',
        link: '/warehouse/locations',
      }),
    );
  }
  if (lowStock.length > 0) {
    insights.push(
      insight({
        id: 'low-stock',
        severity: 'warning',
        title: `${plural(lowStock.length, 'lot')} at or below the low-stock threshold`,
        detail: lowStock.slice(0, 3).map((l) => l.lot_code).join(', '),
        action: 'Ask procurement or processing to replenish.',
        link: '/warehouse/inventory',
      }),
    );
  }
  if (onHold > 0) {
    insights.push(
      insight({
        id: 'holds',
        severity: 'info',
        title: `${plural(onHold, 'lot')} on quality hold`,
        detail: 'Held lots cannot be allocated or packaged until quality releases them.',
        link: '/quality/holds',
      }),
    );
  }
  if (insights.length === 0) {
    insights.push(insight({ id: 'ok', severity: 'good', title: 'Stock, expiry and storage conditions look healthy', detail: 'Nothing needs action in the warehouse.' }));
  }
  return {
    metrics: [
      { label: 'Lots expiring in 90 days', value: String(expiring.length), tone: expiring.length ? 'warn' : 'good' },
      { label: 'Stock at quality risk', value: kg(s.risk.summary.quantityAtRisk), tone: s.risk.summary.quantityAtRisk ? 'bad' : 'good' },
      { label: 'Low-stock lots', value: String(lowStock.length), tone: lowStock.length ? 'warn' : 'good' },
      { label: 'Lots on hold', value: String(onHold), tone: onHold ? 'warn' : 'good' },
    ],
    insights,
    questions: ['Which lots are low on stock?', 'Which lots expire soonest?', 'Show inventory by crop'],
  };
};

const laboratory: Builder = async (s) => {
  const submissions = await safe(
    'submissions',
    async () =>
      (
        await pool.query<{ overdue: number; open_flags: number; pending: number }>(`
          SELECT (SELECT COUNT(*) FROM lab_test_submissions WHERE completed_at IS NULL AND expected_completion_date < CURRENT_DATE)::int AS overdue,
                 (SELECT COUNT(*) FROM lab_quality_flags WHERE resolved = false)::int AS open_flags,
                 (SELECT COUNT(*) FROM lab_test_submissions WHERE completed_at IS NULL)::int AS pending`)
      ).rows[0],
    { overdue: 0, open_flags: 0, pending: 0 },
  );
  const untested = s.risk.lots.filter((l) => l.testingStatus === 'not_submitted' && l.quantityAvailable > 0);
  const declining = s.risk.lots.filter(
    (l) => l.predictedGermination90d !== null && l.germination !== null && l.predictedGermination90d < l.minGermination && l.germination >= l.minGermination,
  );
  const risky = riskLots(s);

  const insights: ModuleInsight[] = [];
  for (const l of risky.slice(0, 3)) {
    insights.push(
      insight({
        id: `lot-${l.lotCode}`,
        severity: l.riskLevel === 'critical' ? 'critical' : 'warning',
        title: `${l.lotCode} (${l.crop}): ${l.factors[0]?.label ?? 'needs review'}`,
        detail: l.recommendation,
        action: 'Submit a fresh sample for re-test.',
        link: `/seed-lot-detail/${l.seedLotId}`,
        aiTab: 'risk',
      }),
    );
  }
  if (declining.length > 0) {
    insights.push(
      insight({
        id: 'declining',
        severity: 'warning',
        title: `${plural(declining.length, 'passing lot')} forecast to fall below the minimum within 90 days`,
        detail: `${declining.slice(0, 3).map((l) => `${l.lotCode} (${l.germination}% now, ~${l.predictedGermination90d}% in 90 days)`).join('; ')}.`,
        action: 'Schedule an early re-test before the season.',
        aiTab: 'risk',
      }),
    );
  }
  if (submissions.overdue > 0) {
    insights.push(
      insight({
        id: 'overdue-subs',
        severity: 'warning',
        title: `${plural(submissions.overdue, 'lab submission')} past the expected completion date`,
        detail: 'Results are holding up releases and allocations.',
        link: '/lab/submissions',
      }),
    );
  }
  if (untested.length > 0) {
    insights.push(
      insight({
        id: 'untested',
        severity: 'info',
        title: `${plural(untested.length, 'lot')} with stock but no lab submission`,
        detail: `${untested.slice(0, 3).map((l) => l.lotCode).join(', ')}. Untested seed cannot be certified for sale.`,
        action: 'Submit samples for these lots.',
        link: '/lab/submissions',
      }),
    );
  }
  if (insights.length === 0) {
    insights.push(insight({ id: 'ok', severity: 'good', title: 'Test results look healthy', detail: 'No lot is at elevated risk and no submissions are late.' }));
  }
  return {
    metrics: [
      { label: 'Critical-risk lots', value: String(s.risk.summary.critical), tone: s.risk.summary.critical ? 'bad' : 'good' },
      { label: 'High-risk lots', value: String(s.risk.summary.high), tone: s.risk.summary.high ? 'warn' : 'good' },
      { label: 'Open quality flags', value: String(submissions.open_flags), tone: submissions.open_flags ? 'warn' : 'good' },
      { label: 'Overdue submissions', value: String(submissions.overdue), tone: submissions.overdue ? 'warn' : 'good' },
    ],
    insights,
    questions: ['Any failing lab results?', 'Which lots need re-testing?', 'Which lots will drop below minimum germination?'],
  };
};

const quality: Builder = async (s) => {
  const dash = await safe('quality dashboard', () => getQualityDashboard(), null);
  const repeat = await safe(
    'repeat departments',
    async () =>
      (
        await pool.query<{ department: string; n: number }>(`
          SELECT department, COUNT(*)::int AS n FROM non_conformances
           WHERE created_at > now() - interval '90 days' AND status <> 'cancelled'
           GROUP BY department HAVING COUNT(*) >= 2 ORDER BY n DESC LIMIT 3`)
      ).rows,
    [],
  );
  const repeatLots = await safe(
    'repeat lots',
    async () =>
      (
        await pool.query<{ lot_code: string; n: number }>(`
          SELECT l.lot_code, COUNT(*)::int AS n FROM non_conformances x JOIN seed_lots l ON l.id = x.seed_lot_id
           WHERE x.status <> 'cancelled' GROUP BY l.lot_code HAVING COUNT(*) >= 2 ORDER BY n DESC LIMIT 3`)
      ).rows,
    [],
  );
  const labDriven = await safe(
    'lab-driven NCRs',
    async () =>
      (await pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM non_conformances WHERE source = 'lab_oos' AND status IN ('open','investigating')`)).rows[0].n,
    0,
  );

  const insights: ModuleInsight[] = [];
  if (dash) {
    if (dash.nonConformances.open_critical > 0) {
      insights.push(
        insight({
          id: 'ncr-critical',
          severity: 'critical',
          title: `${plural(dash.nonConformances.open_critical, 'critical non-conformance')} open`,
          detail: `${dash.holds.active} lot(s) are on hold; ${dash.complaints.recall_recommended} complaint(s) have a recall recommended.`,
          action: 'Confirm the held lots are blocked and the investigation has an owner.',
          link: '/quality/ncrs',
        }),
      );
    }
    if (dash.capas.overdue > 0 || dash.nonConformances.overdue > 0) {
      insights.push(
        insight({
          id: 'overdue',
          severity: 'warning',
          title: `${plural(dash.nonConformances.overdue, 'overdue non-conformance')} and ${plural(dash.capas.overdue, 'overdue action')}`,
          detail: 'Overdue corrective actions are the first thing an auditor asks about.',
          action: 'Reset due dates with the owners or escalate.',
          link: '/quality/capas',
        }),
      );
    }
    if (dash.capas.failed_verification > 0) {
      insights.push(
        insight({
          id: 'capa-failed',
          severity: 'warning',
          title: `${plural(dash.capas.failed_verification, 'action')} failed effectiveness verification`,
          detail: 'The fix did not work, so the root cause is probably not the one recorded.',
          action: 'Reopen the root-cause analysis for these actions.',
          link: '/quality/capas',
        }),
      );
    }
    if (dash.sops.reviewOverdue > 0 || dash.sops.departmentsCovered < dash.sops.departmentsTotal) {
      insights.push(
        insight({
          id: 'sop',
          severity: 'info',
          title: `SOP coverage ${dash.sops.coveragePercent}%; ${plural(dash.sops.reviewOverdue, 'SOP')} past review`,
          detail: `${dash.sops.departmentsTotal - dash.sops.departmentsCovered} department(s) have no SOP in force.`,
          link: '/quality/sops',
        }),
      );
    }
  }
  if (repeat.length > 0) {
    insights.push(
      insight({
        id: 'pattern-dept',
        severity: 'warning',
        title: `Repeat problems: ${repeat.map((r) => `${r.department} (${r.n})`).join(', ')} in 90 days`,
        detail: 'Two or more non-conformances in one department in a quarter usually point to a process gap, not isolated mistakes.',
        action: 'Review the SOP for these departments.',
        link: '/quality/ncrs',
      }),
    );
  }
  if (repeatLots.length > 0) {
    insights.push(
      insight({
        id: 'pattern-lot',
        severity: 'warning',
        title: `Lots with more than one non-conformance: ${repeatLots.map((r) => r.lot_code).join(', ')}`,
        detail: 'A lot that keeps coming back is a candidate for a hold or a source review.',
        link: '/quality/ncrs',
      }),
    );
  }
  if (labDriven > 0) {
    insights.push(
      insight({
        id: 'lab-oos',
        severity: 'info',
        title: `${plural(labDriven, 'non-conformance')} raised from laboratory out-of-spec results`,
        detail: `${s.risk.summary.critical + s.risk.summary.high} lot(s) are at high or critical quality risk right now.`,
        aiTab: 'risk',
      }),
    );
  }
  if (insights.length === 0) {
    insights.push(insight({ id: 'ok', severity: 'good', title: 'No open quality issues', detail: 'Non-conformances, actions and complaints are all under control.' }));
  }
  return {
    metrics: dash
      ? [
          { label: 'Open non-conformances', value: String(dash.nonConformances.open_total), tone: dash.nonConformances.open_critical ? 'bad' : dash.nonConformances.open_total ? 'warn' : 'good' },
          { label: 'Overdue actions', value: String(dash.capas.overdue), tone: dash.capas.overdue ? 'bad' : 'good' },
          { label: 'Open complaints', value: String(dash.complaints.open_total), tone: dash.complaints.open_critical ? 'bad' : dash.complaints.open_total ? 'warn' : 'good' },
          { label: 'Lots on hold', value: String(dash.holds.active), tone: dash.holds.active ? 'warn' : 'good' },
        ]
      : [{ label: 'Quality records', value: 'not loaded', tone: 'neutral' }],
    insights,
    questions: ['What is awaiting my approval?', 'Which NCRs are overdue?', 'Where do problems keep repeating?'],
  };
};

const processing: Builder = async (s) => {
  const stats = await safe(
    'processing',
    async () =>
      (
        await pool.query<{ ready_lots: number; ready_qty: number; testing_aged: number; packaged_30d: number; recalled: number }>(`
          SELECT (SELECT COUNT(*) FROM seed_lots l WHERE l.status = 'active' AND l.testing_status = 'certified'
                    AND l.quantity_total > l.quantity_allocated AND NOT EXISTS (SELECT 1 FROM packaging_batches b WHERE b.seed_lot_id = l.id))::int AS ready_lots,
                 COALESCE((SELECT SUM(l.quantity_total - l.quantity_allocated) FROM seed_lots l WHERE l.status = 'active' AND l.testing_status = 'certified'
                    AND l.quantity_total > l.quantity_allocated AND NOT EXISTS (SELECT 1 FROM packaging_batches b WHERE b.seed_lot_id = l.id)), 0)::float AS ready_qty,
                 (SELECT COUNT(*) FROM seed_lots WHERE status = 'active' AND testing_status = 'testing' AND CURRENT_DATE - COALESCE(production_date, created_at::date) > 14)::int AS testing_aged,
                 (SELECT COUNT(*) FROM packaging_batches WHERE created_at > now() - interval '30 days')::int AS packaged_30d,
                 (SELECT COUNT(*) FROM packaging_batches WHERE status = 'recalled')::int AS recalled`)
      ).rows[0],
    { ready_lots: 0, ready_qty: 0, testing_aged: 0, packaged_30d: 0, recalled: 0 },
  );
  const packedRisk = await safe(
    'packed risky lots',
    async () => {
      const codes = riskLots(s).map((l) => l.lotCode);
      if (codes.length === 0) return [] as string[];
      const r = await pool.query<{ lot_code: string }>(
        `SELECT DISTINCT l.lot_code FROM packaging_batches b JOIN seed_lots l ON l.id = b.seed_lot_id
          WHERE b.status = 'active' AND l.lot_code = ANY($1::text[])`,
        [codes],
      );
      return r.rows.map((x) => x.lot_code);
    },
    [] as string[],
  );

  const insights: ModuleInsight[] = [];
  if (packedRisk.length > 0) {
    insights.push(
      insight({
        id: 'packed-risk',
        severity: 'critical',
        title: `${plural(packedRisk.length, 'high-risk lot')} already packaged`,
        detail: `${packedRisk.slice(0, 3).join(', ')}. Packed seed from a lot that fails the germination minimum will fail in the field.`,
        action: 'Hold the packaging batches and re-test before dispatch.',
        link: '/processing/packaging',
        aiTab: 'risk',
      }),
    );
  }
  if (stats.ready_lots > 0) {
    insights.push(
      insight({
        id: 'ready',
        severity: 'info',
        title: `${plural(stats.ready_lots, 'certified lot')} ready to pack (${kg(stats.ready_qty)})`,
        detail: 'Certified stock with no packaging batch yet. Pack the lots nearest label expiry first.',
        link: '/processing/packaging',
        aiTab: 'forecast',
      }),
    );
  }
  if (stats.testing_aged > 0) {
    insights.push(
      insight({
        id: 'testing-aged',
        severity: 'warning',
        title: `${plural(stats.testing_aged, 'lot')} waiting more than 14 days for test results`,
        detail: 'Processing capacity sits idle while results are pending.',
        link: '/lab/submissions',
      }),
    );
  }
  if (stats.recalled > 0) {
    insights.push(
      insight({
        id: 'recalled',
        severity: 'warning',
        title: `${plural(stats.recalled, 'packaging batch', 'packaging batches')} marked recalled`,
        detail: 'Check the trace to see where the units went.',
        link: '/processing/traceability',
      }),
    );
  }
  if (insights.length === 0) {
    insights.push(insight({ id: 'ok', severity: 'good', title: 'Processing and packaging look healthy', detail: 'No high-risk lots are packed and no lots are waiting long for results.' }));
  }
  return {
    metrics: [
      { label: 'Ready to pack', value: String(stats.ready_lots), tone: 'neutral' },
      { label: 'Packaged in 30 days', value: String(stats.packaged_30d), tone: 'neutral' },
      { label: 'Waiting on tests > 14 d', value: String(stats.testing_aged), tone: stats.testing_aged ? 'warn' : 'good' },
      { label: 'High-risk lots packed', value: String(packedRisk.length), tone: packedRisk.length ? 'bad' : 'good' },
    ],
    insights,
    questions: ['Which lots are ready to pack?', 'Any failing lab results?', 'Show inventory by crop'],
  };
};

const rd: Builder = async (s) => {
  const nucleus = s.risk.lots.filter((l) => l.stage === 'Breeder' || l.stage === 'Foundation');
  const weak = nucleus.filter((l) => l.germination !== null && l.germination < l.minGermination);
  const disease = await safe(
    'field inspections',
    async () =>
      (
        await pool.query<{ crop: string; n: number }>(`
          SELECT l.crop, COUNT(*)::int AS n FROM lot_field_inspections i JOIN seed_lots l ON l.id = i.seed_lot_id
           WHERE i.disease_detected AND i.inspection_date > CURRENT_DATE - 90 GROUP BY l.crop ORDER BY n DESC LIMIT 3`)
      ).rows,
    [],
  );
  const yields = await safe(
    'yields',
    async () =>
      (
        await pool.query<{ crop: string; ratio: number }>(`
          SELECT l.crop, ROUND((SUM(h.harvested_quantity) / NULLIF(SUM(h.sown_quantity), 0))::numeric, 1)::float AS ratio
            FROM harvest_yields h JOIN seed_lots l ON l.id = h.seed_lot_id GROUP BY l.crop HAVING SUM(h.sown_quantity) > 0 ORDER BY ratio LIMIT 3`)
      ).rows,
    [],
  );

  const insights: ModuleInsight[] = [];
  if (weak.length > 0) {
    insights.push(
      insight({
        id: 'weak-nucleus',
        severity: 'critical',
        title: `${plural(weak.length, 'breeder/foundation lot')} below the germination minimum`,
        detail: `${weak.map((l) => `${l.lotCode} (${l.germination}%)`).slice(0, 3).join(', ')}. Every later generation inherits this loss.`,
        action: 'Re-test and consider re-multiplying from fresh nucleus seed.',
        link: '/rd/germplasm',
        aiTab: 'risk',
      }),
    );
  }
  if (disease.length > 0) {
    insights.push(
      insight({
        id: 'disease',
        severity: 'warning',
        title: `Disease found in field inspections: ${disease.map((d) => `${d.crop} (${d.n})`).join(', ')}`,
        detail: 'Detected in the last 90 days. Check whether the same variety is affected across plots.',
        action: 'Use photo analysis to identify the symptom, then plan a seed-health test.',
        link: '/ai?tab=photo',
      }),
    );
  }
  if (yields.length > 0) {
    insights.push(
      insight({
        id: 'yield',
        severity: 'info',
        title: `Lowest multiplication ratio: ${yields.map((y) => `${y.crop} (${y.ratio}x)`).join(', ')}`,
        detail: 'Harvested kilograms per kilogram sown, from recorded yields. Low ratios cost extra generations.',
        link: '/rd/trials',
      }),
    );
  }
  if (insights.length === 0) {
    insights.push(insight({ id: 'ok', severity: 'good', title: 'Nucleus seed and trials look healthy', detail: 'No breeder or foundation lot is below standard and no disease was recorded.' }));
  }
  return {
    metrics: [
      { label: 'Breeder / foundation lots', value: String(nucleus.length), tone: 'neutral' },
      { label: 'Below germination minimum', value: String(weak.length), tone: weak.length ? 'bad' : 'good' },
      { label: 'Crops with disease reports', value: String(disease.length), tone: disease.length ? 'warn' : 'good' },
    ],
    insights,
    questions: ['Which breeder lots are below standard?', 'Where was disease found?', 'Which varieties multiply poorly?'],
  };
};

const administration: Builder = async (s) => {
  const audit = await safe(
    'audit activity',
    async () => (await pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM audit_logs WHERE created_at > now() - interval '24 hours'`)).rows[0].n,
    0,
  );
  const gaps = s.risk.lots.filter((l) => l.germination === null);
  const ai = isConfigured();

  const insights: ModuleInsight[] = [];
  if (!ai) {
    insights.push(
      insight({
        id: 'ai-off',
        severity: 'info',
        title: 'AI model not connected',
        detail: 'Scores and forecasts are computed from your records. Connect an AI key to turn them into written briefings and enable photo analysis.',
        action: 'Set AI_API_KEY on the server.',
        link: '/ai',
      }),
    );
  }
  if (gaps.length > 0) {
    insights.push(
      insight({
        id: 'data-gaps',
        severity: 'warning',
        title: `${plural(gaps.length, 'active lot')} with no germination result`,
        detail: `${gaps.slice(0, 3).map((l) => l.lotCode).join(', ')}. These cannot be risk-scored, so they hide quality problems.`,
        action: 'Ask the laboratory to test them.',
        link: '/lab/submissions',
        aiTab: 'risk',
      }),
    );
  }
  if (s.risk.summary.critical > 0) {
    insights.push(
      insight({
        id: 'critical',
        severity: 'critical',
        title: `${plural(s.risk.summary.critical, 'critical-risk lot')} across the company`,
        detail: `${kg(s.risk.summary.quantityAtRisk)} of stock is exposed. Make sure each critical lot has an owner.`,
        link: '/ai?tab=risk',
        aiTab: 'risk',
      }),
    );
  }
  insights.push(
    insight({ id: 'audit', severity: 'good', title: `${audit} audit-log events in the last 24 hours`, detail: 'Every change to lots, quality records and approvals is logged.', link: '/admin/audit-logs' }),
  );
  return {
    metrics: [
      { label: 'Audit events (24 h)', value: String(audit), tone: 'neutral' },
      { label: 'Lots without a result', value: String(gaps.length), tone: gaps.length ? 'warn' : 'good' },
      { label: 'Critical-risk lots', value: String(s.risk.summary.critical), tone: s.risk.summary.critical ? 'bad' : 'good' },
      { label: 'AI model', value: ai ? 'connected' : 'rules only', tone: ai ? 'good' : 'neutral' },
    ],
    insights,
    questions: ['Give me a company-wide summary', 'What is awaiting my approval?', 'Any failing lab results?'],
  };
};


const production: Builder = async (s) => {
  const plans = await safe(
    'crop plans',
    async () =>
      (
        await pool.query<{ open_plans: number; no_seed: number; stale_draft: number; stale_code: string | null; acres: number }>(`
          SELECT COUNT(*) FILTER (WHERE status IN ('draft','reserved','confirmed'))::int AS open_plans,
                 COUNT(*) FILTER (WHERE status IN ('draft','reserved') AND seed_lot_id IS NULL)::int AS no_seed,
                 COUNT(*) FILTER (WHERE status = 'draft' AND sowing_date IS NOT NULL AND sowing_date < CURRENT_DATE)::int AS stale_draft,
                 (SELECT crop FROM crop_plans WHERE status = 'draft' AND sowing_date < CURRENT_DATE ORDER BY sowing_date LIMIT 1) AS stale_code,
                 COALESCE(SUM(target_area_acres) FILTER (WHERE status IN ('reserved','confirmed')), 0)::float AS acres
            FROM crop_plans`)
      ).rows[0],
    { open_plans: 0, no_seed: 0, stale_draft: 0, stale_code: null, acres: 0 },
  );
  const field = await safe(
    'field inspections',
    async () =>
      (
        await pool.query<{ recent: number; diseased: number; low_health: number; disease: string | null }>(`
          SELECT COUNT(*)::int AS recent,
                 COUNT(*) FILTER (WHERE disease_detected)::int AS diseased,
                 COUNT(*) FILTER (WHERE health_score < 60)::int AS low_health,
                 (SELECT disease_name FROM lot_field_inspections WHERE disease_detected AND inspection_date >= CURRENT_DATE - 30
                   ORDER BY inspection_date DESC LIMIT 1) AS disease
            FROM lot_field_inspections WHERE inspection_date >= CURRENT_DATE - 30`)
      ).rows[0],
    { recent: 0, diseased: 0, low_health: 0, disease: null },
  );
  const untested = await safe(
    'untested lots',
    async () =>
      (await pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM seed_lots WHERE status = 'active' AND testing_status = 'not_submitted'`)).rows[0].n,
    0,
  );
  const short = s.forecast.crops.filter((c) => c.status === 'shortage' || c.status === 'tight');

  const insights: ModuleInsight[] = [];
  for (const c of short.slice(0, 2)) {
    insights.push(
      insight({
        id: `plan-short-${c.crop}`,
        severity: c.status === 'shortage' ? 'critical' : 'warning',
        title: `Plan more ${c.crop} production: ${c.monthsOfCover} months of stock cover`,
        detail: 'Demand is running ahead of available seed. Production planned this season is next year\'s stock.',
        action: `Raise crop plans for ${c.crop} or extend contract grower area.`,
        link: '/crop-planning',
        aiTab: 'forecast',
      }),
    );
  }
  if (field.diseased > 0 || field.low_health > 0) {
    insights.push(
      insight({
        id: 'field-health',
        severity: field.diseased > 0 ? 'critical' : 'warning',
        title: `${plural(field.diseased, 'field inspection')} found disease in the last 30 days${field.low_health ? `, ${field.low_health} with low health` : ''}`,
        detail: field.disease ? `Latest: ${field.disease}. Seed-borne disease above the limit disqualifies a field from certification.` : 'Low health scores put certification and yield at risk.',
        action: 'Re-inspect after treatment and record roguing.',
        link: '/inspections',
      }),
    );
  }
  if (plans.stale_draft > 0) {
    insights.push(
      insight({
        id: 'stale-drafts',
        severity: 'warning',
        title: `${plural(plans.stale_draft, 'crop plan')} still in draft after the sowing date`,
        detail: `${plans.stale_code ? `Oldest is for ${plans.stale_code}. ` : ''}Draft plans have no parent seed reserved, so sowing may have happened without traceable seed.`,
        action: 'Confirm or cancel these plans.',
        link: '/crop-planning',
      }),
    );
  }
  if (plans.no_seed > 0) {
    insights.push(
      insight({
        id: 'no-seed',
        severity: 'info',
        title: `${plural(plans.no_seed, 'open plan')} without a parent seed lot`,
        detail: 'Without a foundation lot the produced seed cannot be traced back for certification.',
        link: '/crop-planning',
      }),
    );
  }
  if (untested > 0) {
    insights.push(
      insight({
        id: 'untested',
        severity: 'warning',
        title: `${plural(untested, 'active lot')} not yet submitted for testing`,
        detail: 'Harvested lots need germination and purity results before they can be certified or sold.',
        action: 'Submit samples to the laboratory.',
        link: '/lab/submissions',
        aiTab: 'risk',
      }),
    );
  }
  if (insights.length === 0) {
    insights.push(insight({ id: 'ok', severity: 'good', title: 'Production plans and field inspections look on track', detail: `${plans.open_plans} open plans, ${field.recent} inspections in the last 30 days.` }));
  }
  return {
    metrics: [
      { label: 'Open crop plans', value: String(plans.open_plans), tone: 'neutral' },
      { label: 'Planned area', value: `${Math.round(plans.acres).toLocaleString('en-IN')} acres`, tone: 'neutral' },
      { label: 'Diseased fields (30 d)', value: String(field.diseased), tone: field.diseased ? 'bad' : 'good' },
      { label: 'Lots not tested', value: String(untested), tone: untested ? 'warn' : 'good' },
    ],
    insights,
    questions: ['Which crops should we plan more of?', 'Any field inspections with disease?', 'Which crop plans have no seed reserved?'],
  };
};

const BUILDERS: Record<ModuleKey, Builder> = { production, procurement, warehouse, laboratory, quality, processing, rd, administration };

// ------------------------------------------------------------------ public API

function moduleBriefingFallback(label: string, insights: ModuleInsight[]): string {
  const actionable = insights.filter((i) => i.severity !== 'good').slice(0, 4);
  if (actionable.length === 0) return `${label}: nothing needs attention right now.`;
  return actionable.map((i) => `- ${i.title}.`).join('\n') + (actionable[0].action ? `\nNext step: ${actionable[0].action}` : '');
}

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as string[]).includes(value);
}

export async function moduleInsights(module: ModuleKey, options: { narrate?: boolean } = {}): Promise<ModuleInsights> {
  const data = await shared();
  const built = await BUILDERS[module](data);
  const insights = built.insights.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const label = MODULE_LABELS[module];
  const top = insights[0];
  const headline = top && top.severity !== 'good' ? top.title : 'Nothing urgent here';

  let briefing = moduleBriefingFallback(label, insights);
  let briefingSource: 'model' | 'rules' = 'rules';
  if (options.narrate && isConfigured() && insights.some((i) => i.severity !== 'good')) {
    try {
      briefing = await generateFromParts(
        `You are the AI analyst inside SeedSphere, a seed-company ERP used in India, writing for the ${label} team. ` +
          'Rewrite the findings in the JSON as a short briefing: 2 to 4 bullet points starting with "- ", most urgent first, then one line starting "Next step:". ' +
          'Use only the facts given; never invent numbers or lot codes.',
        [{ type: 'text', text: JSON.stringify({ module: label, metrics: built.metrics, findings: insights.map(({ severity, title, detail, action }) => ({ severity, title, detail, action })) }) }],
        500,
      );
      briefingSource = 'model';
    } catch (error) {
      if (!(error instanceof AiProviderError)) console.error('[ai] module briefing failed', error);
    }
  }

  return {
    module,
    label,
    generatedAt: new Date().toISOString(),
    headline,
    metrics: built.metrics,
    insights,
    suggestedQuestions: built.questions,
    briefing,
    briefingSource,
    model: briefingSource === 'model' ? activeModelName() : null,
  };
}

/** Compact all-modules view for the AI Center "Across modules" tab. */
export async function allModuleInsights(): Promise<
  { module: ModuleKey; label: string; headline: string; severity: InsightSeverity; counts: Record<InsightSeverity, number>; metrics: ModuleMetric[]; top: ModuleInsight[] }[]
> {
  const results = await Promise.all(MODULE_KEYS.map((m) => moduleInsights(m)));
  return results.map((r) => {
    const counts: Record<InsightSeverity, number> = { critical: 0, warning: 0, info: 0, good: 0 };
    r.insights.forEach((i) => (counts[i.severity] += 1));
    return {
      module: r.module,
      label: r.label,
      headline: r.headline,
      severity: r.insights[0]?.severity ?? 'good',
      counts,
      metrics: r.metrics,
      top: r.insights.filter((i) => i.severity !== 'good').slice(0, 3),
    };
  });
}
