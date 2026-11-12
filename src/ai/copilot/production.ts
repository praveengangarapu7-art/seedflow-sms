import type { CopilotAction, CopilotFinding, CopilotRecordType } from './types';
import { arr, clamp, daysBetween, daysFromToday, finding, healthTone, lower, num, obj, pct, plural, qty, riskTone, round, sortFindings, str, unique } from './util';
import { STANDARDS_NOTE, cropStandard } from './standards';

// ------------------------------------------------------------------ Crop plan

const planReview: CopilotAction = {
  id: 'plan_review',
  label: 'Review crop plan',
  description: 'Season timing, seed allocation vs area, yield target, isolation and inspection schedule.',
  modelTask: 'Review this seed production crop plan as a production agronomist: timing, seed quantity, yield target, isolation and certification inspections; list risks and recommendations.',
  run: (r) => {
    const { key, std } = cropStandard(r.crop);
    const area = num(r.targetArea ?? r.targetAreaAcres ?? r.target_area);
    const seed = num(r.seedLotAllocatedQty ?? r.seed_lot_allocated_qty);
    const yieldT = num(r.targetYield ?? r.target_yield);
    const prod = num(r.targetProduction ?? r.target_production);
    const findings: CopilotFinding[] = [];
    const span = daysBetween(r.sowingDate ?? r.sowing_date, r.harvestDate ?? r.harvest_date);
    if (span !== null) {
      if (span < 60) findings.push(finding('warning', `Only ${span} days from sowing to harvest; most seed crops need 90–150 days.`));
      else if (span > 210) findings.push(finding('warning', `${span} days from sowing to harvest is unusually long; check the dates.`));
    } else findings.push(finding('info', 'Sowing or harvest date not set.'));
    if (area && seed !== null && std.seedRateKgPerAcre) {
      const rate = seed / area;
      const [lo, hi] = std.seedRateKgPerAcre;
      if (seed === 0) findings.push(finding('warning', 'No parent seed allocated to this plan.'));
      else if (rate < lo * 0.8) findings.push(finding('warning', `${round(rate, 2)} kg/acre allocated; ${key} usually needs ${lo}–${hi} kg/acre. Needed: ${qty(lo * area)}–${qty(hi * area)}.`));
      else if (rate > hi * 1.3) findings.push(finding('info', `${round(rate, 2)} kg/acre allocated, above the usual ${lo}–${hi} kg/acre; surplus parent seed may be tied up.`));
      else findings.push(finding('good', `Seed allocation ${round(rate, 2)} kg/acre fits the usual ${lo}–${hi} kg/acre.`));
    } else if (!str(r.seedLotId ?? r.seed_lot_id)) findings.push(finding('warning', 'No parent seed lot linked; the plan cannot be traced back to foundation seed.'));
    if (area && prod && yieldT && Math.abs(area * yieldT - prod) > prod * 0.15) findings.push(finding('info', `Target production ${prod} does not match area × yield (${round(area * yieldT, 0)}).`));
    if (std.isolation) findings.push(finding('info', `Isolation for ${key}: at least ${std.isolation[0]} m (foundation) / ${std.isolation[1]} m (certified) from other varieties of the same crop. Verify at the first field inspection.`));
    const insp = arr(r.fieldInspections ?? r.inspections);
    const sow = daysFromToday(r.sowingDate ?? r.sowing_date);
    if (sow !== null && sow < -45 && insp.length === 0) findings.push(finding('warning', `Sown ${-sow} days ago with no field inspection recorded. Certification needs inspections at the vegetative and flowering stages.`));
    const low = insp.filter((i) => (num(i.healthScore) ?? 100) < 60 || i.diseaseDetected === true);
    if (low.length) findings.push(finding('warning', `${plural(low.length, 'inspection')} found disease or a low health score.`));
    return {
      title: 'Crop plan review',
      summary: `${str(r.planCode ?? r.plan_code)} ${str(r.crop)} ${str(r.season)}${area ? `, ${area} acres` : ''}.`,
      findings: sortFindings(findings),
      suggestions: unique([
        'Book field inspections at vegetative, flowering and pre-harvest stages.',
        key === 'maize' || key === 'cotton' ? 'Schedule detasselling / emasculation supervision for hybrid seed production.' : '',
        'Record roguing (off-type removal) after each inspection.',
      ].filter(Boolean)),
      draft: { label: 'Basis', text: STANDARDS_NOTE },
    };
  },
};

// ------------------------------------------------------------------ Field inspection

const inspectionReview: CopilotAction = {
  id: 'inspection_review',
  label: 'Inspection review',
  description: 'Health, disease and pest risk, certification impact and follow-up.',
  modelTask: 'Review this seed production field inspection: crop health, disease and pest risk, impact on seed certification, and actions for the grower and inspector.',
  run: (r) => {
    const health = num(r.healthScore ?? r.health_score);
    const ai = obj(r.aiPrediction);
    const risk = num(ai.diseaseRiskPercent);
    const pests = arr<string>(ai.pestsDetected);
    const findings: CopilotFinding[] = [];
    if (health !== null) {
      if (health < 50) findings.push(finding('critical', `Health score ${health}/100.`));
      else if (health < 70) findings.push(finding('warning', `Health score ${health}/100.`));
      else findings.push(finding('good', `Health score ${health}/100.`));
    }
    if (r.diseaseDetected === true || r.disease_detected === true) findings.push(finding('critical', `Disease detected${str(r.diseaseName) ? `: ${str(r.diseaseName)}` : ''}. Seed-borne diseases can disqualify the field from certification.`));
    if (risk !== null && risk >= 40) findings.push(finding(risk >= 70 ? 'critical' : 'warning', `Predicted disease risk ${risk}%.`));
    if (pests.length) findings.push(finding('warning', `Pests seen: ${pests.join(', ')}.`));
    if (str(ai.nutrientDeficiency)) findings.push(finding('info', `Possible nutrient deficiency: ${str(ai.nutrientDeficiency)}.`));
    if (!arr(r.photos).length) findings.push(finding('info', 'No photos attached. Photos make the inspection auditable and allow AI photo screening.'));
    const notes = lower(r.notes);
    if (/off.?type|rogue/.test(notes)) findings.push(finding('warning', 'Notes mention off-types; record the off-type count and confirm roguing.'));
    if (/isolation/.test(notes)) findings.push(finding('warning', 'Notes mention isolation; measure the distance to the nearest same-crop field.'));
    const crit = findings.some((f) => f.severity === 'critical');
    return {
      title: 'Field inspection review',
      summary: `${str(r.inspectionCode ?? r.inspection_code)} at ${str(r.cropStage ?? r.crop_stage) || 'unknown stage'}: ${crit ? 'action needed before certification' : 'no certification blocker found'}.`,
      score: health !== null ? { label: 'Health', value: clamp(health), max: 100, tone: healthTone(health) } : null,
      findings: sortFindings(findings),
      suggestions: crit
        ? ['Re-inspect within 7 days after treatment.', 'Advise the grower on the recommended spray; record the product and date.', 'If seed-borne disease exceeds the permitted limit, reject the field for certification.']
        : ['Schedule the next inspection at the following crop stage.'],
    };
  },
};

// ------------------------------------------------------------------ Harvest request

const harvestReview: CopilotAction = {
  id: 'harvest_review',
  label: 'Harvest review',
  description: 'Readiness, estimate vs actual quantity, approval delays and transport.',
  modelTask: 'Review this harvest request for a seed company and recommend approve, hold or reject with reasons.',
  run: (r) => {
    const est = num(r.estimatedQuantityKg);
    const act = num(r.actualQuantityKg);
    const status = lower(r.status);
    const findings: CopilotFinding[] = [];
    if (est !== null && act !== null && est > 0) {
      const dev = pct(act - est, est, 0);
      if (Math.abs(dev) > 15) findings.push(finding('warning', `Actual ${qty(act)} is ${dev > 0 ? '+' : ''}${dev}% vs the ${qty(est)} estimate. Large variances can hint at mixing (over) or field loss (under).`));
      else findings.push(finding('good', `Actual quantity within ${Math.abs(dev)}% of the estimate.`));
    }
    const reqDate = daysFromToday(r.requestedHarvestDate);
    if (/pending|submitted|requested/.test(status) && reqDate !== null && reqDate < 0) findings.push(finding('warning', `Requested harvest date passed ${plural(-reqDate, 'day')} ago and it is still ${status}. Delay causes shattering and field loss.`));
    const age = daysFromToday(r.requestedAt);
    if (/pending/.test(status) && age !== null && age < -3) findings.push(finding('warning', `Waiting for approval for ${-age} days.`));
    const insp = arr(r.inspections ?? r.fieldInspections);
    const bad = insp.filter((i) => i.diseaseDetected === true || (num(i.healthScore) ?? 100) < 50);
    if (insp.length === 0) findings.push(finding('warning', 'No field inspection on record for this farm; the lot cannot be certified without one.'));
    if (bad.length) findings.push(finding('critical', `${plural(bad.length, 'inspection')} reported disease or poor health; check eligibility before approving.`));
    if (str(r.lotId) ) findings.push(finding('good', `Lot ${str(r.lotId)} created.`));
    if (/approved|harvested/.test(status) && !obj(r.transport).vehicleNumber && !str(obj(r.transport).id)) findings.push(finding('info', 'No transport authorisation yet.'));
    const crit = findings.some((f) => f.severity === 'critical');
    return {
      title: 'Harvest review',
      summary: `${str(r.requestCode)} ${str(r.crop)}: ${crit ? 'hold until the inspection issue is cleared' : 'no blocker found'}.`,
      findings: sortFindings(findings),
      suggestions: ['Harvest at physiological maturity and dry to safe moisture within 48 hours.', 'Keep the harvested seed separate per field until the lot ID is assigned.'],
    };
  },
};

// ------------------------------------------------------------------ Seed lot

const lotHealth: CopilotAction = {
  id: 'lot_health',
  label: 'Lot health',
  description: 'Testing status, age-related germination decline, stock and saleability.',
  modelTask: 'Summarise the health and saleability of this seed lot and recommend the next action.',
  run: (r) => {
    const { key, std } = cropStandard(r.crop);
    const ageDays = (() => { const d = daysFromToday(r.production_date ?? r.productionDate); return d === null ? null : -d; })();
    const testing = lower(r.testing_status ?? r.testingStatus);
    const avail = num(r.quantity_available ?? r.quantityAvailable) ?? 0;
    const total = num(r.quantity_total ?? r.quantityTotal) ?? 0;
    const germ = num(r.germination);
    const findings: CopilotFinding[] = [];
    let risk = 0;
    if (testing === 'rejected') { risk += 60; findings.push(finding('critical', 'Rejected by the lab. Must not be sold.')); }
    else if (testing === 'not_submitted') { risk += 25; findings.push(finding('warning', 'Not yet submitted for testing.')); }
    else if (testing === 'testing') findings.push(finding('info', 'Lab testing in progress.'));
    else if (testing === 'certified') findings.push(finding('good', 'Certified.'));
    if (ageDays !== null && ageDays > 0) {
      const decline = round((ageDays / 30) * std.monthlyDecline, 1);
      if (ageDays > 270) { risk += 25; findings.push(finding('warning', `${Math.round(ageDays / 30)} months old; label validity (about 9 months) has likely lapsed. Retest before sale.`)); }
      else if (ageDays > 180) { risk += 10; findings.push(finding('info', `${Math.round(ageDays / 30)} months old; expect about ${decline} points of germination loss since production.`)); }
      if (germ !== null && germ - decline < std.germination) { risk += 20; findings.push(finding('warning', `Estimated germination now about ${round(germ - decline, 1)}%, near or below the ${std.germination}% minimum${key ? ` for ${key}` : ''}.`)); }
    }
    if (r.is_low_stock === true) findings.push(finding('warning', `Low stock: ${avail} ${str(r.unit) || 'kg'} available.`));
    if (total > 0 && avail / total > 0.9 && ageDays !== null && ageDays > 150) findings.push(finding('info', `${pct(avail, total, 0)}% of the lot is still unallocated after ${Math.round(ageDays / 30)} months.`));
    if (r.approved_for_sale === false && testing === 'certified') findings.push(finding('info', 'Certified but not yet approved for sale.'));
    const s = clamp(risk);
    return {
      title: 'Lot health',
      summary: `${str(r.lot_code ?? r.lotCode)} ${str(r.crop)} ${str(r.variety)} (${str(r.stage)}): ${avail} of ${total} ${str(r.unit) || 'kg'} available.`,
      score: { label: 'Risk', value: s, max: 100, tone: riskTone(s) },
      findings: sortFindings(findings),
      suggestions: s >= 30 ? ['Submit a fresh germination test before the next dispatch.', 'Allocate this lot ahead of newer lots of the same variety.'] : [],
      draft: { label: 'Basis', text: STANDARDS_NOTE },
    };
  },
};

// ------------------------------------------------------------------ Farm

const farmProfile: CopilotAction = {
  id: 'farm_profile',
  label: 'Farm suitability',
  description: 'Crop rotation, soil and irrigation fit for seed production, and inspection history.',
  modelTask: 'Assess this farm for seed production: rotation and volunteer-plant risk, soil and irrigation suitability, and history.',
  run: (r) => {
    const history = arr<string>(r.cropHistory ?? r.crop_history).map(str).filter(Boolean);
    const current = str(r.currentCrop ?? r.current_crop);
    const findings: CopilotFinding[] = [];
    if (current && history.length && lower(history[history.length - 1]) === lower(current)) findings.push(finding('warning', `${current} grown again on the same land. Volunteer plants from the previous crop can cause off-types; most standards require the land not to have grown the same crop in the previous season unless it was the same variety and certified.`));
    const counts: Record<string, number> = {};
    history.forEach((h) => { counts[lower(h)] = (counts[lower(h)] ?? 0) + 1; });
    const repeated = Object.entries(counts).filter(([, n]) => n >= 3);
    if (repeated.length) findings.push(finding('info', `${repeated.map(([c, n]) => `${c} ${n} times`).join(', ')} in the history; rotate to break disease and pest cycles.`));
    const irr = lower(r.irrigationType ?? r.irrigation_type);
    if (!irr || /rain/.test(irr)) findings.push(finding('warning', 'Rain-fed or unknown irrigation; seed yield and quality are at risk in a dry spell.'));
    if (!str(r.gpsCoordinates ?? r.gps_coordinates)) findings.push(finding('info', 'No GPS location; isolation distance cannot be checked on a map.'));
    const insp = arr(r.inspections);
    const failed = insp.filter((i) => /fail|reject/.test(lower(i.status)));
    if (failed.length) findings.push(finding('warning', `${plural(failed.length, 'past inspection')} failed or rejected.`));
    if (!findings.some((f) => f.severity !== 'info')) findings.push(finding('good', 'No suitability concerns found.'));
    return {
      title: 'Farm suitability',
      summary: `${str(r.name)}${num(r.area) ? `, ${num(r.area)} acres` : ''}${str(r.soilType) ? `, ${str(r.soilType)}` : ''}.`,
      findings: sortFindings(findings),
      suggestions: ['Record the previous two seasons\' crops and varieties for certification.'],
    };
  },
};

// ------------------------------------------------------------------ R&D trial

const trialSummary: CopilotAction = {
  id: 'trial_summary',
  label: 'Trial summary',
  description: 'Design validity, check entries, location progress, data completeness and next steps.',
  modelTask: 'Summarise this breeding trial for an R&D manager: design validity, progress across locations, data gaps, and what is needed to reach a release decision.',
  run: (r) => {
    const entries = arr(r.entries);
    const locs = arr(r.locations);
    const reps = num(r.replications) ?? 0;
    const findings: CopilotFinding[] = [];
    const checks = entries.filter((e) => /check|control/i.test(str(e.type)));
    if (checks.length === 0) findings.push(finding('critical', 'No check (control) variety; results cannot be compared with the market standard.'));
    else findings.push(finding('good', `${plural(checks.length, 'check variety', 'check varieties')} included.`));
    if (reps < 3) findings.push(finding('warning', `${reps} replications; at least 3 are needed for a reliable statistical comparison.`));
    if (/multi|mlt/i.test(str(r.type)) && locs.length < 3) findings.push(finding('warning', `Multi-location trial with ${plural(locs.length, 'location')}; use 3 or more agro-climatic zones.`));
    const zones = unique(locs.map((l) => str(l.agroClimaticZone)).filter(Boolean));
    if (locs.length > 1 && zones.length === 1) findings.push(finding('info', 'All locations are in one agro-climatic zone; results may not generalise.'));
    const pending = locs.reduce((n, l) => n + (num(l.pendingObservations) ?? 0), 0);
    const done = locs.reduce((n, l) => n + (num(l.observations) ?? 0), 0);
    if (pending > 0) findings.push(finding('warning', `${pending} observations pending (${pct(done, done + pending, 0)}% complete).`));
    const stale = locs.filter((l) => { const d = daysFromToday(l.lastUpdateAt); return d !== null && d < -14 && !/harvested|cancelled/i.test(str(l.status)); });
    if (stale.length) findings.push(finding('warning', `No update for 2+ weeks at ${stale.map((l) => str(l.name)).join(', ')}.`));
    const harvest = daysFromToday(r.expectedHarvest);
    if (harvest !== null && harvest < 0 && !str(r.actualHarvest)) findings.push(finding('info', `Expected harvest was ${plural(-harvest, 'day')} ago; record the harvest.`));
    if (r.finalAnalysis) findings.push(finding('good', 'Final analysis is recorded.'));
    return {
      title: 'Trial summary',
      summary: `${str(r.name)} (${str(r.crop)}, ${str(r.season)}): ${plural(entries.length, 'entry', 'entries')}, ${plural(locs.length, 'location')}, ${reps} reps.`,
      findings: sortFindings(findings),
      suggestions: ['Analyse yield with location as a factor (G×E) before advancing any entry.', 'Advance only entries that beat the best check by a significant margin at most locations.'],
    };
  },
};

// ------------------------------------------------------------------ Master data

const farmerProfile: CopilotAction = {
  id: 'farmer_profile',
  label: 'Farmer profile check',
  description: 'Contact completeness and data-privacy status.',
  modelTask: 'Check this grower record for completeness and anything a production manager should follow up.',
  run: (r) => {
    const findings: CopilotFinding[] = [];
    if (r.anonymized === true) findings.push(finding('info', 'This record is anonymised under the privacy policy; personal details cannot be restored.'));
    if (!str(r.phone)) findings.push(finding('warning', 'No phone number; SMS/WhatsApp advisories cannot reach this farmer.'));
    if (!str(r.location)) findings.push(finding('info', 'No village/location recorded.'));
    if (!str(r.region)) findings.push(finding('info', 'No region; region-wise sowing advice cannot be targeted.'));
    if (!findings.length) findings.push(finding('good', 'Profile is complete.'));
    return { title: 'Farmer profile check', summary: `${str(r.name)}, ${str(r.region)}.`, findings: sortFindings(findings), suggestions: [] };
  },
};

const varietyReview: CopilotAction = {
  id: 'variety_review',
  label: 'Variety record review',
  description: 'Approval status, description completeness and registration readiness.',
  modelTask: 'Review this crop variety master record and say what is needed for approval and notification under the Seeds Act.',
  run: (r) => {
    const status = lower(r.status);
    const findings: CopilotFinding[] = [];
    if (status === 'rejected') findings.push(finding('critical', `Rejected${str(r.rejection_reason) ? `: ${str(r.rejection_reason)}` : ''}.`));
    if (/pending|review|draft|submitted/.test(status)) {
      const age = daysFromToday(r.created_at);
      findings.push(finding(age !== null && age < -14 ? 'warning' : 'info', `Status ${status}${age !== null ? `, created ${-age} days ago` : ''}.`));
    }
    if (status === 'approved') findings.push(finding('good', 'Approved for use.'));
    const desc = str(r.description);
    if (desc.length < 40) findings.push(finding('warning', 'Description is missing or very short; add maturity days, yield potential, key traits and recommended regions.'));
    if (!str(r.category)) findings.push(finding('info', 'No category (hybrid / open-pollinated / research).'));
    if (!str(r.breeder_organization_id)) findings.push(finding('info', 'No breeder organisation linked.'));
    return {
      title: 'Variety record review',
      summary: `${str(r.name)} (${str(r.crop)}).`,
      findings: sortFindings(findings),
      suggestions: ['Only notified or registered varieties can be sold as certified seed; keep the notification reference with the record.'],
    };
  },
};

export const PRODUCTION_TYPES: CopilotRecordType[] = [
  { key: 'production.crop_plan', label: 'Crop plan', module: 'Production Planning', actions: [planReview] },
  { key: 'production.field_inspection', label: 'Field inspection', module: 'Production Planning', actions: [inspectionReview] },
  { key: 'production.harvest_request', label: 'Harvest request', module: 'Production Planning', actions: [harvestReview] },
  { key: 'production.seed_lot', label: 'Seed lot', module: 'Production Planning', actions: [lotHealth] },
  { key: 'production.farm', label: 'Farm', module: 'Production Planning', actions: [farmProfile] },
  { key: 'rd.trial', label: 'Trial', module: 'Research & Development', actions: [trialSummary] },
  { key: 'master.farmer', label: 'Farmer', module: 'Master data', actions: [farmerProfile] },
  { key: 'master.variety', label: 'Variety', module: 'Master data', actions: [varietyReview] },
];
