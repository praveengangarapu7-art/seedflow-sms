import { pool } from '../../db/pool';
import { ValidationError } from '../../errors';
import {
  AiProviderError,
  activeModelName,
  extractJson,
  generateFromParts,
  isConfigured,
  providerLabel,
} from '../assistant/aiProvider';

/**
 * AI Center services: lab quality risk, stock and expiry forecasts, and
 * photo analysis.
 *
 * Design rule shared with the assistant: every score and number is computed
 * deterministically from the database, so results are reproducible and
 * auditable. The language model only (a) writes the executive narrative over
 * those computed numbers and (b) does photo analysis, which has no
 * deterministic equivalent. With no AI key configured, risk and forecasts
 * still work fully; photo analysis says plainly that it needs a key.
 */

// ---------------------------------------------------------------------------
// Certification minimums
// ---------------------------------------------------------------------------
// Working minimums per crop used to score lots. They follow the commonly
// applied Indian Minimum Seed Certification Standards values, but standards
// differ by class and are revised, so treat these as configuration: confirm
// them with the client's QA head and the current notified standards.
const MIN_GERMINATION: Record<string, number> = {
  maize: 90, cotton: 65, soybean: 70, paddy: 80, rice: 80, wheat: 85, tomato: 70,
  chilli: 60, bajra: 75, sunflower: 70, groundnut: 70, jowar: 75, mustard: 85,
};
const MIN_PURITY = 98;
const DEFAULT_MIN_GERMINATION = 80;

// Typical germination loss per 30 days in ambient godown storage. Oilseeds
// (soybean, sunflower, groundnut) and cotton age fastest.
const MONTHLY_DECLINE: Record<string, number> = {
  soybean: 2.0, groundnut: 1.8, sunflower: 1.5, cotton: 1.4, chilli: 1.2, tomato: 0.8,
};
const DEFAULT_MONTHLY_DECLINE = 0.8;

/** Label validity used for the expiry forecast (days from production/test). */
const LABEL_VALIDITY_DAYS = 270;

function cropKey(crop: string): string {
  return crop.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Lab quality risk
// ---------------------------------------------------------------------------

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface RiskFactor {
  label: string;
  points: number;
}

export interface LotRisk {
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  stage: string;
  testingStatus: string;
  quantityAvailable: number;
  unit: string;
  ageDays: number;
  germination: number | null;
  purity: number | null;
  viability: number | null;
  minGermination: number;
  predictedGermination90d: number | null;
  openQualityFlags: number;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  recommendation: string;
}

export interface LabRiskReport {
  generatedAt: string;
  summary: { total: number; critical: number; high: number; medium: number; low: number; quantityAtRisk: number };
  lots: LotRisk[];
  narrative: string;
  narrativeSource: 'model' | 'rules';
  model: string | null;
}

export interface LotRow {
  id: string;
  lot_code: string;
  crop: string;
  variety: string;
  stage: string;
  testing_status: string;
  quantity_total: number;
  quantity_allocated: number;
  unit: string;
  age_days: number;
  germination: number | null;
  purity: number | null;
  viability: number | null;
  open_flags: number;
}

async function loadLots(): Promise<LotRow[]> {
  const result = await pool.query<LotRow>(`
    SELECT l.id, l.lot_code, l.crop, l.variety, l.stage, l.testing_status,
           l.quantity_total, l.quantity_allocated, l.unit,
           GREATEST(0, CURRENT_DATE - COALESCE(l.production_date, l.created_at::date))::int AS age_days,
           (SELECT ROUND(100.0 * g.germinated_count / NULLIF(g.sample_size, 0), 1)
              FROM germination_tests g WHERE g.seed_lot_id = l.id ORDER BY g.created_at DESC LIMIT 1)::float AS germination,
           (SELECT ROUND(100.0 * p.pure_seed_weight / NULLIF(p.sample_weight, 0), 2)
              FROM purity_tests p WHERE p.seed_lot_id = l.id ORDER BY p.created_at DESC LIMIT 1)::float AS purity,
           (SELECT ROUND(100.0 * v.viable_count / NULLIF(v.sample_size, 0), 1)
              FROM viability_tests v WHERE v.seed_lot_id = l.id ORDER BY v.created_at DESC LIMIT 1)::float AS viability,
           (SELECT COUNT(*) FROM lab_quality_flags f
             WHERE f.seed_lot_id = l.id AND f.resolved_at IS NULL)::int AS open_flags
      FROM seed_lots l
     WHERE l.status = 'active'
     ORDER BY l.lot_code
  `);
  return result.rows;
}

export function scoreLot(row: LotRow): LotRisk {
  const key = cropKey(row.crop);
  const minGerm = MIN_GERMINATION[key] ?? DEFAULT_MIN_GERMINATION;
  const decline = MONTHLY_DECLINE[key] ?? DEFAULT_MONTHLY_DECLINE;
  const factors: RiskFactor[] = [];
  const add = (label: string, points: number) => {
    if (points > 0) factors.push({ label, points });
  };

  const germ = row.germination;
  if (germ === null) {
    add('No germination test on record', 25);
  } else {
    const margin = germ - minGerm;
    if (margin < 0) add(`Germination ${germ}% is below the ${minGerm}% minimum`, 45 + Math.round(-margin * 3));
    else if (margin < 3) add(`Germination ${germ}% is within 3 points of the ${minGerm}% minimum`, 25);
    else if (margin < 6) add(`Germination margin is only ${margin.toFixed(1)} points`, 12);
  }

  if (row.purity !== null) {
    if (row.purity < MIN_PURITY) add(`Physical purity ${row.purity}% is below ${MIN_PURITY}%`, 20);
    else if (row.purity < MIN_PURITY + 0.5) add(`Physical purity ${row.purity}% is close to the ${MIN_PURITY}% limit`, 8);
  }

  if (germ !== null && row.viability !== null && row.viability - germ > 4) {
    add(`Viability exceeds germination by ${(row.viability - germ).toFixed(1)} points (dormancy or seedling vigour issue)`, 5);
  }

  if (row.age_days > 240) add(`Stored ${row.age_days} days: label validity nearly over`, 20);
  else if (row.age_days > 180) add(`Stored ${row.age_days} days: ageing risk`, 12);
  else if (row.age_days > 120) add(`Stored ${row.age_days} days`, 5);

  if (row.testing_status === 'rejected') add('Lot was rejected by the lab', 15);
  else if (row.testing_status === 'not_submitted') add('Never submitted for lab testing', 10);
  else if (row.testing_status === 'testing') add('Lab result pending', 3);

  if (row.open_flags > 0) add(`${row.open_flags} open lab quality flag(s)`, Math.min(20, row.open_flags * 10));

  const score = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0));
  const level: RiskLevel = score >= 60 ? 'critical' : score >= 35 ? 'high' : score >= 15 ? 'medium' : 'low';
  const predicted = germ === null ? null : Math.max(0, Math.round((germ - decline * 3) * 10) / 10);

  let recommendation: string;
  if (germ !== null && germ < minGerm) {
    recommendation = 'Hold the lot: re-test germination on a fresh working sample; if it fails again, reprocess (grading or gravity separation) or downgrade.';
  } else if (row.testing_status === 'not_submitted' || germ === null) {
    recommendation = 'Submit a sample to the lab before any dispatch.';
  } else if (predicted !== null && predicted < minGerm) {
    recommendation = `Sell first: germination is forecast to fall to about ${predicted}% within 90 days. Prioritise this lot in FEFO picking or re-validate before the season.`;
  } else if (row.age_days > 240) {
    recommendation = 'Schedule re-validation testing before the label validity expires.';
  } else if (score >= 15) {
    recommendation = 'Monitor: re-check at the next scheduled test and keep storage conditions in range.';
  } else {
    recommendation = 'No action needed.';
  }

  return {
    seedLotId: row.id,
    lotCode: row.lot_code,
    crop: row.crop,
    variety: row.variety,
    stage: row.stage,
    testingStatus: row.testing_status,
    quantityAvailable: Number(row.quantity_total) - Number(row.quantity_allocated),
    unit: row.unit,
    ageDays: row.age_days,
    germination: germ,
    purity: row.purity,
    viability: row.viability,
    minGermination: minGerm,
    predictedGermination90d: predicted,
    openQualityFlags: row.open_flags,
    riskScore: score,
    riskLevel: level,
    factors: factors.sort((a, b) => b.points - a.points),
    recommendation,
  };
}

async function narrate(
  rulesOnly: boolean,
  title: string,
  facts: unknown,
  fallback: string,
): Promise<{ text: string; source: 'model' | 'rules' }> {
  if (rulesOnly || !isConfigured()) return { text: fallback, source: 'rules' };
  try {
    const text = await generateFromParts(
      'You are the quality and supply analyst inside SeedSphere, a seed-company ERP used in India. ' +
        'Write a short executive briefing for the operations head. Use only the numbers in the JSON you are given; never invent figures. ' +
        'Format: 3 to 5 bullet points starting with "- ", each one sentence, most urgent first, naming lot codes or crops. Then one line starting "Next step:".',
      [{ type: 'text', text: `${title}\n\n${JSON.stringify(facts)}` }],
      600,
    );
    return { text, source: 'model' };
  } catch (error) {
    if (!(error instanceof AiProviderError)) console.error('[ai] narrative failed', error);
    return { text: fallback, source: 'rules' };
  }
}

export async function labRiskReport(options: { narrate?: boolean } = {}): Promise<LabRiskReport> {
  const lots = (await loadLots()).map(scoreLot).sort((a, b) => b.riskScore - a.riskScore);
  const count = (level: RiskLevel) => lots.filter((l) => l.riskLevel === level).length;
  const atRisk = lots.filter((l) => l.riskLevel === 'critical' || l.riskLevel === 'high');
  const summary = {
    total: lots.length,
    critical: count('critical'),
    high: count('high'),
    medium: count('medium'),
    low: count('low'),
    quantityAtRisk: atRisk.reduce((sum, l) => sum + Math.max(0, l.quantityAvailable), 0),
  };

  const top = atRisk.slice(0, 5);
  const fallback = [
    `- ${summary.critical} critical and ${summary.high} high-risk lot(s) out of ${summary.total} active lots; ${summary.quantityAtRisk.toLocaleString('en-IN')} kg is exposed.`,
    ...top.map((l) => `- ${l.lotCode} (${l.crop}, ${l.variety}): ${l.factors[0]?.label ?? 'review'}. ${l.recommendation}`),
    `Next step: ${top[0] ? `put ${top[0].lotCode} on hold and re-test it this week.` : 'no urgent action; keep the routine test schedule.'}`,
  ].join('\n');

  const narrative = await narrate(
    options.narrate === false,
    'Seed lot quality risk report (scores computed by SeedSphere).',
    { summary, topRiskLots: top.map(({ factors, ...rest }) => ({ ...rest, reasons: factors.map((f) => f.label) })) },
    fallback,
  );

  return {
    generatedAt: new Date().toISOString(),
    summary,
    lots,
    narrative: narrative.text,
    narrativeSource: narrative.source,
    model: narrative.source === 'model' ? activeModelName() : null,
  };
}

// ---------------------------------------------------------------------------
// Forecasts: stock cover by crop and label-validity expiry
// ---------------------------------------------------------------------------

export interface CropForecast {
  crop: string;
  lots: number;
  quantityAvailable: number;
  allocatedLast90d: number;
  monthlyVelocity: number;
  monthsOfCover: number | null;
  projectedStockoutDate: string | null;
  status: 'shortage' | 'tight' | 'healthy' | 'slow-moving';
}

export interface ExpiryForecast {
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  quantityAvailable: number;
  unit: string;
  daysToExpiry: number;
  expiryDate: string;
}

export interface ForecastReport {
  generatedAt: string;
  horizonDays: number;
  crops: CropForecast[];
  expiring: ExpiryForecast[];
  narrative: string;
  narrativeSource: 'model' | 'rules';
  model: string | null;
}

export async function forecastReport(options: { narrate?: boolean } = {}): Promise<ForecastReport> {
  const crops = await pool.query<{
    crop: string;
    lots: number;
    available: number;
    allocated_90: number;
  }>(`
    SELECT l.crop,
           COUNT(DISTINCT l.id)::int AS lots,
           SUM(l.quantity_total - l.quantity_allocated)::float AS available,
           COALESCE((SELECT SUM(a.quantity) FROM seed_lot_allocations a
                       JOIN seed_lots x ON x.id = a.seed_lot_id
                      WHERE x.crop = l.crop AND a.status <> 'cancelled'
                        AND a.created_at > now() - interval '90 days'), 0)::float AS allocated_90
      FROM seed_lots l
     WHERE l.status = 'active'
     GROUP BY l.crop
     ORDER BY l.crop
  `);

  const today = new Date();
  const cropForecasts: CropForecast[] = crops.rows.map((r) => {
    const monthly = r.allocated_90 / 3;
    const cover = monthly > 0 ? r.available / monthly : null;
    let status: CropForecast['status'];
    if (cover === null) status = 'slow-moving';
    else if (cover < 1.5) status = 'shortage';
    else if (cover < 3) status = 'tight';
    else if (cover > 12) status = 'slow-moving';
    else status = 'healthy';
    const stockout = cover === null ? null : new Date(today.getTime() + cover * 30 * 86_400_000).toISOString().slice(0, 10);
    return {
      crop: r.crop,
      lots: r.lots,
      quantityAvailable: Math.round(r.available),
      allocatedLast90d: Math.round(r.allocated_90),
      monthlyVelocity: Math.round(monthly),
      monthsOfCover: cover === null ? null : Math.round(cover * 10) / 10,
      projectedStockoutDate: stockout,
      status,
    };
  });

  const horizon = 90;
  const expiring = await pool.query<{
    id: string; lot_code: string; crop: string; variety: string; available: number; unit: string; days_left: number; expiry: string;
  }>(
    `SELECT id, lot_code, crop, variety, (quantity_total - quantity_allocated)::float AS available, unit,
            (COALESCE(production_date, created_at::date) + $1::int - CURRENT_DATE)::int AS days_left,
            to_char(COALESCE(production_date, created_at::date) + $1::int, 'YYYY-MM-DD') AS expiry
       FROM seed_lots
      WHERE status = 'active'
        AND quantity_total > quantity_allocated
        AND COALESCE(production_date, created_at::date) + $1::int <= CURRENT_DATE + $2::int
      ORDER BY days_left`,
    [LABEL_VALIDITY_DAYS, horizon],
  );
  const expiringLots: ExpiryForecast[] = expiring.rows.map((r) => ({
    seedLotId: r.id,
    lotCode: r.lot_code,
    crop: r.crop,
    variety: r.variety,
    quantityAvailable: Math.round(r.available),
    unit: r.unit,
    daysToExpiry: r.days_left,
    expiryDate: r.expiry,
  }));

  const shortages = cropForecasts.filter((c) => c.status === 'shortage' || c.status === 'tight');
  const slow = cropForecasts.filter((c) => c.status === 'slow-moving');
  const expQty = expiringLots.reduce((s, l) => s + l.quantityAvailable, 0);
  const fallback = [
    shortages.length
      ? `- Stock is short or tight for ${shortages.map((c) => `${c.crop} (${c.monthsOfCover} months of cover)`).join(', ')} at the last 90 days' dispatch rate.`
      : '- No crop is short of stock at the last 90 days\' dispatch rate.',
    expiringLots.length
      ? `- ${expiringLots.length} lot(s) holding ${expQty.toLocaleString('en-IN')} kg reach label validity within ${horizon} days; the first is ${expiringLots[0].lotCode} in ${expiringLots[0].daysToExpiry} days.`
      : `- No lots reach label validity within ${horizon} days.`,
    slow.length ? `- Slow-moving stock: ${slow.map((c) => c.crop).join(', ')}.` : '- No slow-moving crops.',
    `Next step: ${shortages[0] ? `raise the ${shortages[0].crop} production or procurement plan` : expiringLots[0] ? `push ${expiringLots[0].lotCode} to dealers or schedule re-validation` : 'keep the current plan'}.`,
  ].join('\n');

  const narrative = await narrate(
    options.narrate === false,
    'Seed stock cover and label-expiry forecast (computed by SeedSphere from allocations and production dates).',
    { horizonDays: horizon, crops: cropForecasts, expiring: expiringLots.slice(0, 8) },
    fallback,
  );

  return {
    generatedAt: new Date().toISOString(),
    horizonDays: horizon,
    crops: cropForecasts,
    expiring: expiringLots,
    narrative: narrative.text,
    narrativeSource: narrative.source,
    model: narrative.source === 'model' ? activeModelName() : null,
  };
}

// ---------------------------------------------------------------------------
// Photo analysis (field crop or seed sample)
// ---------------------------------------------------------------------------

export interface PhotoFinding {
  issue: string;
  severity: 'none' | 'low' | 'medium' | 'high';
  confidence: number;
  evidence: string;
}

export interface PhotoAnalysis {
  configured: boolean;
  model: string | null;
  subject: string;
  cropGuess: string | null;
  overallSeverity: 'none' | 'low' | 'medium' | 'high';
  findings: PhotoFinding[];
  recommendations: string[];
  followUpTests: string[];
  summary: string;
}

const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function analyzePhoto(input: {
  imageBase64?: unknown;
  mediaType?: unknown;
  kind?: unknown;
  crop?: unknown;
  notes?: unknown;
}): Promise<PhotoAnalysis> {
  const base64 = typeof input.imageBase64 === 'string' ? input.imageBase64.replace(/^data:[^;]+;base64,/, '') : '';
  const mediaType = typeof input.mediaType === 'string' ? input.mediaType : 'image/jpeg';
  const kind = input.kind === 'seed' ? 'seed' : 'field';
  const crop = typeof input.crop === 'string' && input.crop.trim() ? input.crop.trim().slice(0, 60) : null;
  const notes = typeof input.notes === 'string' ? input.notes.trim().slice(0, 500) : '';

  if (!base64) throw new ValidationError('imageBase64 is required');
  if (!ALLOWED_MEDIA.has(mediaType)) throw new ValidationError('Image must be JPEG, PNG, WebP or GIF');
  if (base64.length > 5_500_000) throw new ValidationError('Image is too large; resize it below about 4 MB');

  if (!isConfigured()) {
    return {
      configured: false,
      model: null,
      subject: kind === 'seed' ? 'Seed sample' : 'Field crop',
      cropGuess: crop,
      overallSeverity: 'none',
      findings: [],
      recommendations: ['Add an AI API key (AI_API_KEY) to the server environment to enable photo analysis.'],
      followUpTests: [],
      summary: 'Photo analysis needs a vision-capable AI model. No AI key is configured on this deployment, so the photo was not analysed.',
    };
  }

  const system =
    kind === 'seed'
      ? 'You are a seed technologist in an ISTA-accredited seed testing lab in India. You inspect photos of seed samples for physical quality: ' +
        'inert matter, weed seeds, other crop or other distinguishable variety seeds, broken or shrivelled seed, discolouration, fungal growth, insect damage, and treatment coating uniformity. '
      : 'You are a seed-production field inspector and plant pathologist in India. You inspect photos of seed-production crops for diseases, pests, nutrient deficiency, ' +
        'off-types and rogues, and isolation or pollination problems relevant to seed certification field inspection. ';

  const prompt =
    `${system}Be careful and honest: if the image is unclear or not of a crop or seed, say so with low confidence. ` +
    'Reply with ONLY a JSON object, no prose, in this shape: ' +
    '{"subject": string, "cropGuess": string|null, "overallSeverity": "none"|"low"|"medium"|"high", ' +
    '"findings": [{"issue": string, "severity": "none"|"low"|"medium"|"high", "confidence": number 0-1, "evidence": string}], ' +
    '"recommendations": [string], "followUpTests": [string], "summary": string}. ' +
    'Keep at most 5 findings and 5 recommendations; each string under 30 words.';

  let raw: string;
  try {
    raw = await generateFromParts(
      prompt,
      [
        { type: 'image', mediaType, base64 },
        { type: 'text', text: `Photo type: ${kind}. Crop (as entered by the user): ${crop ?? 'not given'}. Notes: ${notes || 'none'}.` },
      ],
      1200,
    );
  } catch (error) {
    console.error('[ai] photo analysis failed', error);
    throw new ValidationError('The AI model could not analyse this photo right now. Try again, or use a clearer image.');
  }

  const parsed = extractJson<Partial<PhotoAnalysis>>(raw);
  const sev = (s: unknown): PhotoAnalysis['overallSeverity'] =>
    s === 'low' || s === 'medium' || s === 'high' ? s : 'none';

  return {
    configured: true,
    model: activeModelName(),
    subject: String(parsed?.subject ?? (kind === 'seed' ? 'Seed sample' : 'Field crop')),
    cropGuess: (parsed?.cropGuess as string | null) ?? crop,
    overallSeverity: sev(parsed?.overallSeverity),
    findings: Array.isArray(parsed?.findings)
      ? parsed!.findings.slice(0, 5).map((f) => ({
          issue: String(f.issue ?? ''),
          severity: sev(f.severity),
          confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0)),
          evidence: String(f.evidence ?? ''),
        }))
      : [],
    recommendations: Array.isArray(parsed?.recommendations) ? parsed!.recommendations.slice(0, 5).map(String) : [],
    followUpTests: Array.isArray(parsed?.followUpTests) ? parsed!.followUpTests.slice(0, 5).map(String) : [],
    summary: String(parsed?.summary ?? raw.slice(0, 600)),
  };
}

export function aiStatus(): {
  configured: boolean;
  model: string | null;
  provider: string;
  models: { chat: string; fast: string; vision: string } | null;
} {
  const on = isConfigured();
  return {
    configured: on,
    model: on ? activeModelName() : null,
    provider: providerLabel(),
    models: on ? { chat: activeModelName('chat'), fast: activeModelName('fast'), vision: activeModelName('vision') } : null,
  };
}
