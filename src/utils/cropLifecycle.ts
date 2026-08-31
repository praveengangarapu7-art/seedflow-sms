import type { CropPlan, FieldInspection } from '@/services/api';

/**
 * Crop lifecycle model — Phase 5.
 *
 * A crop plan only stores a sowing date and a harvest date. The nine biological
 * stages a seed crop passes through are derived from that window, so every stage
 * gets a concrete start/end date without needing extra backend fields.
 */

export const cropLifecycleStageKeys = [
  'land-preparation',
  'sowing',
  'germination',
  'vegetative-growth',
  'flowering',
  'pollination',
  'seed-development',
  'maturity',
  'harvest',
] as const;

export type CropLifecycleStageKey = (typeof cropLifecycleStageKeys)[number];

export type CropLifecycleStageStatus = 'completed' | 'current' | 'upcoming' | 'skipped';

export interface CropLifecycleStageDefinition {
  key: CropLifecycleStageKey;
  /** 1-based position in the lifecycle. */
  order: number;
  label: string;
  shortLabel: string;
  description: string;
  /**
   * Where the stage begins, expressed as a fraction of the sowing → harvest
   * window. Negative values fall before sowing (land preparation).
   */
  startFraction: number;
  /** Inspection `cropStage` values that belong to this stage. */
  aliases: string[];
}

/** The nine stages, in biological order. */
export const CROP_LIFECYCLE_STAGES: CropLifecycleStageDefinition[] = [
  {
    key: 'land-preparation',
    order: 1,
    label: 'Land Preparation',
    shortLabel: 'Land Prep',
    description: 'Ploughing, levelling, basal fertiliser and isolation distance checks before sowing.',
    startFraction: -0.12,
    aliases: ['land preparation', 'land prep', 'field preparation', 'pre sowing'],
  },
  {
    key: 'sowing',
    order: 2,
    label: 'Sowing',
    shortLabel: 'Sowing',
    description: 'Seed placement at the planned spacing and depth, with source lot recorded.',
    startFraction: 0,
    aliases: ['sowing', 'planting', 'seeding'],
  },
  {
    key: 'germination',
    order: 3,
    label: 'Germination',
    shortLabel: 'Germination',
    description: 'Emergence counts and gap filling to confirm the target plant population.',
    startFraction: 0.04,
    aliases: ['germination', 'emergence', 'seedling'],
  },
  {
    key: 'vegetative-growth',
    order: 4,
    label: 'Vegetative Growth',
    shortLabel: 'Vegetative',
    description: 'Canopy build-up, nutrition and weed management ahead of reproductive stages.',
    startFraction: 0.14,
    aliases: ['vegetative growth', 'vegetative', 'growth', 'tillering'],
  },
  {
    key: 'flowering',
    order: 5,
    label: 'Flowering',
    shortLabel: 'Flowering',
    description: 'Flower initiation — the critical window for roguing off-type plants.',
    startFraction: 0.42,
    aliases: ['flowering', 'bloom', 'blooming'],
  },
  {
    key: 'pollination',
    order: 6,
    label: 'Pollination',
    shortLabel: 'Pollination',
    description: 'Controlled or open pollination, detasselling and isolation enforcement.',
    startFraction: 0.52,
    aliases: ['pollination', 'detasselling', 'anthesis'],
  },
  {
    key: 'seed-development',
    order: 7,
    label: 'Seed Development',
    shortLabel: 'Seed Dev',
    description: 'Seed set and filling — moisture and pest pressure drive final seed quality.',
    startFraction: 0.62,
    aliases: ['seed development', 'seed set', 'seed filling', 'fruiting', 'grain filling'],
  },
  {
    key: 'maturity',
    order: 8,
    label: 'Maturity',
    shortLabel: 'Maturity',
    description: 'Physiological maturity reached; moisture drops towards the harvest threshold.',
    startFraction: 0.82,
    aliases: ['maturity', 'ripening', 'physiological maturity'],
  },
  {
    key: 'harvest',
    order: 9,
    label: 'Harvest',
    shortLabel: 'Harvest',
    description: 'Harvesting, threshing and hand-over of the raw seed lot to processing.',
    startFraction: 0.94,
    aliases: ['harvest', 'harvesting', 'threshing'],
  },
];

export const CROP_LIFECYCLE_STAGE_COUNT = CROP_LIFECYCLE_STAGES.length;

/** Number of days of land preparation used when a plan has no harvest date. */
const DEFAULT_LAND_PREP_DAYS = 14;
/** Fallback growing window (sowing → harvest) when a plan has no harvest date. */
const DEFAULT_SEASON_DAYS = 120;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeStageText(value: string): string {
  return value.toLowerCase().replace(/[^a-z]+/g, ' ').trim();
}

const ALIAS_LOOKUP: Record<string, CropLifecycleStageKey> = CROP_LIFECYCLE_STAGES.reduce(
  (acc, stage) => {
    acc[normalizeStageText(stage.label)] = stage.key;
    acc[normalizeStageText(stage.shortLabel)] = stage.key;
    stage.aliases.forEach((alias) => {
      acc[normalizeStageText(alias)] = stage.key;
    });
    return acc;
  },
  {} as Record<string, CropLifecycleStageKey>,
);

/**
 * Maps a free-text inspection stage (e.g. the legacy `"Vegetative"` option) onto
 * one of the nine lifecycle stages. Returns `null` when nothing matches.
 */
export function normalizeInspectionStage(stage?: string | null): CropLifecycleStageKey | null {
  if (!stage) return null;
  const normalized = normalizeStageText(stage);
  if (!normalized) return null;
  if (ALIAS_LOOKUP[normalized]) return ALIAS_LOOKUP[normalized];

  const partial = Object.keys(ALIAS_LOOKUP).find(
    (alias) => normalized.includes(alias) || alias.includes(normalized),
  );
  return partial ? ALIAS_LOOKUP[partial] : null;
}

export function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}`.length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function diffInDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Formats an ISO date as `12 Jun 2026`. Returns a dash when unavailable. */
export function formatLifecycleDate(value?: string | null): string {
  const date = parseIsoDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Formats a start/end pair as `12 Jun – 04 Jul 2026`. */
export function formatLifecycleRange(start?: string | null, end?: string | null): string {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  if (!startDate && !endDate) return 'Dates unavailable';
  if (!startDate) return `Until ${formatLifecycleDate(end)}`;
  if (!endDate) return `From ${formatLifecycleDate(start)}`;

  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const startLabel = startDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${startLabel} – ${formatLifecycleDate(end)}`;
}

export interface CropLifecycleStage extends CropLifecycleStageDefinition {
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  status: CropLifecycleStageStatus;
  isCurrent: boolean;
  inspections: FieldInspection[];
  latestInspection: FieldInspection | null;
  averageHealthScore: number | null;
  diseaseCount: number;
}

export interface CropLifecycle {
  stages: CropLifecycleStage[];
  /** Index into `stages` of the stage the crop is in now, or -1 when none. */
  currentStageIndex: number;
  currentStage: CropLifecycleStage | null;
  /** 0–100, derived from elapsed days across the whole lifecycle. */
  progressPercent: number;
  completedStages: number;
  totalStages: number;
  /** Land preparation start — the first dated point of the lifecycle. */
  startDate: string | null;
  /** Harvest end — the last dated point of the lifecycle. */
  endDate: string | null;
  totalDays: number | null;
  daysElapsed: number | null;
  daysRemaining: number | null;
  inspectionCount: number;
  overallHealthScore: number | null;
  isComplete: boolean;
  isCancelled: boolean;
  hasDates: boolean;
  referenceDate: string;
}

export interface BuildCropLifecycleInput {
  plan?: CropPlan | null;
  inspections?: FieldInspection[];
  /** Defaults to today. Accepts an ISO date so the view is testable. */
  referenceDate?: string | Date;
}

/** Fallback stage index when a plan carries no usable dates. */
const STATUS_STAGE_INDEX: Record<string, number> = {
  planned: 0,
  sown: 1,
  growing: 3,
  harvested: CROP_LIFECYCLE_STAGE_COUNT - 1,
  cancelled: -1,
};

function averageOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Builds the full nine-stage lifecycle for a crop plan: stage dates derived from
 * the plan window, inspections bucketed into their stage, and the current stage
 * plus progress resolved against `referenceDate`.
 */
export function buildCropLifecycle({
  plan,
  inspections = [],
  referenceDate,
}: BuildCropLifecycleInput): CropLifecycle {
  const reference = referenceDate instanceof Date
    ? new Date(referenceDate.getTime())
    : parseIsoDate(referenceDate) ?? new Date();
  reference.setHours(0, 0, 0, 0);

  const planStatus = (plan?.status ?? '').toLowerCase();
  const isCancelled = planStatus === 'cancelled';

  const sowingDate = parseIsoDate(plan?.sowingDate);
  const harvestDate = parseIsoDate(plan?.harvestDate);

  // Derive the sowing → harvest window. A plan with only one of the two dates
  // still produces a usable timeline via the default season length.
  let windowStart: Date | null = sowingDate;
  let windowEnd: Date | null = harvestDate;
  if (windowStart && !windowEnd) windowEnd = addDays(windowStart, DEFAULT_SEASON_DAYS);
  if (!windowStart && windowEnd) windowStart = addDays(windowEnd, -DEFAULT_SEASON_DAYS);
  if (windowStart && windowEnd && windowEnd.getTime() <= windowStart.getTime()) {
    windowEnd = addDays(windowStart, DEFAULT_SEASON_DAYS);
  }

  const hasDates = Boolean(windowStart && windowEnd);
  const seasonDays = hasDates ? Math.max(1, diffInDays(windowStart!, windowEnd!)) : null;

  const stageStartDates: (Date | null)[] = CROP_LIFECYCLE_STAGES.map((stage) => {
    if (!hasDates || seasonDays === null) return null;
    if (stage.startFraction < 0) {
      const prepDays = Math.max(
        DEFAULT_LAND_PREP_DAYS,
        Math.round(Math.abs(stage.startFraction) * seasonDays),
      );
      return addDays(windowStart!, -prepDays);
    }
    return addDays(windowStart!, Math.round(stage.startFraction * seasonDays));
  });

  const inspectionsByStage = new Map<CropLifecycleStageKey, FieldInspection[]>();
  inspections.forEach((inspection) => {
    const key = normalizeInspectionStage(inspection.cropStage);
    if (!key) return;
    const bucket = inspectionsByStage.get(key);
    if (bucket) bucket.push(inspection);
    else inspectionsByStage.set(key, [inspection]);
  });

  const stages: CropLifecycleStage[] = CROP_LIFECYCLE_STAGES.map((definition, index) => {
    const start = stageStartDates[index];
    const nextStart = stageStartDates[index + 1] ?? null;
    const isLast = index === CROP_LIFECYCLE_STAGES.length - 1;
    const end = isLast ? windowEnd : nextStart ? addDays(nextStart, -1) : null;

    const stageInspections = [...(inspectionsByStage.get(definition.key) ?? [])].sort((a, b) => {
      const aTime = parseIsoDate(a.inspectionDate)?.getTime() ?? 0;
      const bTime = parseIsoDate(b.inspectionDate)?.getTime() ?? 0;
      return aTime - bTime;
    });

    return {
      ...definition,
      startDate: start ? toIsoDate(start) : null,
      endDate: end ? toIsoDate(end) : null,
      durationDays: start && end ? Math.max(1, diffInDays(start, end) + 1) : null,
      status: 'upcoming' as CropLifecycleStageStatus,
      isCurrent: false,
      inspections: stageInspections,
      latestInspection: stageInspections.length > 0 ? stageInspections[stageInspections.length - 1] : null,
      averageHealthScore: averageOf(stageInspections.map((item) => item.healthScore)),
      diseaseCount: stageInspections.filter((item) => item.diseaseDetected).length,
    };
  });

  const lifecycleStart = stages[0].startDate;
  const lifecycleEnd = stages[stages.length - 1].endDate;
  const lifecycleStartDate = parseIsoDate(lifecycleStart);
  const lifecycleEndDate = parseIsoDate(lifecycleEnd);

  // Resolve the current stage.
  let currentStageIndex = -1;
  let isComplete = false;

  if (isCancelled) {
    currentStageIndex = -1;
  } else if (planStatus === 'harvested') {
    currentStageIndex = stages.length - 1;
    isComplete = true;
  } else if (hasDates && lifecycleStartDate && lifecycleEndDate) {
    if (reference.getTime() < lifecycleStartDate.getTime()) {
      currentStageIndex = 0;
    } else if (reference.getTime() > lifecycleEndDate.getTime()) {
      currentStageIndex = stages.length - 1;
      isComplete = true;
    } else {
      const matched = stages.findIndex((stage) => {
        const start = parseIsoDate(stage.startDate);
        const end = parseIsoDate(stage.endDate);
        if (!start || !end) return false;
        return reference.getTime() >= start.getTime() && reference.getTime() <= end.getTime();
      });
      currentStageIndex = matched === -1 ? 0 : matched;
    }
  } else {
    currentStageIndex = STATUS_STAGE_INDEX[planStatus] ?? 0;
  }

  stages.forEach((stage, index) => {
    if (isCancelled) {
      stage.status = 'skipped';
      stage.isCurrent = false;
      return;
    }
    if (isComplete || index < currentStageIndex) stage.status = 'completed';
    else if (index === currentStageIndex) stage.status = 'current';
    else stage.status = 'upcoming';
    stage.isCurrent = index === currentStageIndex;
  });

  // Progress: date-driven when the plan has dates, stage-driven otherwise.
  let progressPercent = 0;
  if (isCancelled) {
    progressPercent = 0;
  } else if (isComplete) {
    progressPercent = 100;
  } else if (lifecycleStartDate && lifecycleEndDate) {
    const totalSpan = Math.max(1, diffInDays(lifecycleStartDate, lifecycleEndDate));
    progressPercent = clampPercent((diffInDays(lifecycleStartDate, reference) / totalSpan) * 100);
  } else if (currentStageIndex >= 0) {
    progressPercent = clampPercent((currentStageIndex / (stages.length - 1)) * 100);
  }

  const allInspections = stages.flatMap((stage) => stage.inspections);

  return {
    stages,
    currentStageIndex,
    currentStage: currentStageIndex >= 0 ? stages[currentStageIndex] : null,
    progressPercent,
    completedStages: stages.filter((stage) => stage.status === 'completed').length,
    totalStages: stages.length,
    startDate: lifecycleStart,
    endDate: lifecycleEnd,
    totalDays: lifecycleStartDate && lifecycleEndDate ? diffInDays(lifecycleStartDate, lifecycleEndDate) : null,
    daysElapsed: lifecycleStartDate ? Math.max(0, diffInDays(lifecycleStartDate, reference)) : null,
    daysRemaining: lifecycleEndDate ? Math.max(0, diffInDays(reference, lifecycleEndDate)) : null,
    inspectionCount: allInspections.length,
    overallHealthScore: averageOf(allInspections.map((item) => item.healthScore)),
    isComplete,
    isCancelled,
    hasDates,
    referenceDate: toIsoDate(reference),
  };
}
