import type { CopilotAction, CopilotFinding, CopilotRecordType } from './types';
import { arr, clamp, daysFromToday, finding, healthTone, inr, lower, num, obj, pct, plural, qty, riskTone, round, sortFindings, str } from './util';
import { STANDARDS_NOTE, cropFromCode, cropStandard, harringtonSum } from './standards';

// ------------------------------------------------------------------ Lab submission

const TEST_LABEL: Record<string, string> = { germination: 'Germination', purity: 'Physical purity', viability: 'Viability', vigour: 'Vigour', vigor: 'Vigour', moisture: 'Moisture', got: 'Genetic purity (GOT)' };

const labInterpret: CopilotAction = {
  id: 'interpret',
  label: 'Interpret results',
  description: 'Reads each test against certification minimums and recommends release, retest or rejection.',
  modelTask: 'Interpret these seed lab results for a quality manager: what they mean for certification and sale, how close each is to the limit, and the recommended decision.',
  run: (r) => {
    const results = arr(r.results);
    const crop = str(r.crop) || cropFromCode(r.lot_code) || '';
    const { std } = cropStandard(crop);
    const findings: CopilotFinding[] = [];
    let failed = 0, marginal = 0;
    for (const res of results) {
      const type = lower(res.test_type);
      const value = num(res.result_value);
      const threshold = num(res.threshold_used) ?? (type === 'germination' ? std.germination : type === 'purity' ? std.purity : null);
      const label = TEST_LABEL[type] ?? type;
      if (value === null) continue;
      const passed = res.passed === true || (res.passed === undefined && threshold !== null && (type === 'moisture' ? value <= threshold : value >= threshold));
      if (!passed) { failed += 1; findings.push(finding('critical', `${label} ${value}% fails the ${threshold}% ${type === 'moisture' ? 'maximum' : 'minimum'}.`)); }
      else if (threshold !== null && type !== 'moisture' && value - threshold < 3) { marginal += 1; findings.push(finding('warning', `${label} ${value}% passes, but only ${round(value - threshold, 1)} points above ${threshold}%. Expect it to fall below within ${Math.max(1, Math.floor((value - threshold) / std.monthlyDecline))} months of storage.`)); }
      else findings.push(finding('good', `${label} ${value}% passes${threshold !== null ? ` (limit ${threshold}%)` : ''}.`));
    }
    const requested = arr<string>(r.requested_tests).map((t) => lower(t));
    const done = results.map((x) => lower(x.test_type));
    const pending = requested.filter((t) => !done.includes(t));
    if (pending.length) findings.push(finding('info', `Still pending: ${pending.map((t) => TEST_LABEL[t] ?? t).join(', ')}.`));
    const due = daysFromToday(r.expected_completion_date);
    if (pending.length && due !== null && due < 0) findings.push(finding('warning', `Lab is ${plural(-due, 'day')} past the expected completion date.`));
    if (results.length === 0) findings.push(finding('info', 'No results recorded yet.'));
    const decision = failed > 0 ? 'Reject or reprocess; do not certify or sell' : pending.length ? 'Wait for remaining tests' : marginal > 0 ? 'Release with a short validity and retest before dispatch' : results.length ? 'Release for certification' : 'Awaiting results';
    return {
      title: 'Lab result interpretation',
      summary: `${str(r.lot_code) || 'Lot'}${crop ? ` (${crop})` : ''}: ${decision}.`,
      findings: sortFindings(findings),
      suggestions: failed > 0
        ? ['Place the lot on quality hold.', 'Re-clean or re-grade if purity failed; germination failures usually cannot be recovered.', 'Raise an NCR so the cause (drying, storage, ageing) is investigated.']
        : marginal > 0 ? ['Dispatch this lot first (first-expiry-first-out).', 'Schedule a retest 60 days before the label validity ends.'] : [],
      draft: { label: 'Basis', text: STANDARDS_NOTE },
    };
  },
};

// ------------------------------------------------------------------ Processing batch

const LOSS_BAND: Record<string, [number, number]> = { cleaning: [2, 6], drying: [1, 4], grading: [4, 10], treatment: [0, 1.5], rejected: [0, 3] };

const batchLoss: CopilotAction = {
  id: 'loss_analysis',
  label: 'Loss analysis',
  description: 'Stage-wise loss against normal bands, yield recovery and value lost.',
  modelTask: 'Analyse the processing losses of this seed batch stage by stage, explain the likely causes of abnormal losses and how to reduce them.',
  run: (r) => {
    const input = num(r.inputQuantity ?? r.input_quantity) ?? 0;
    const losses = obj(r.losses);
    const findings: CopilotFinding[] = [];
    let total = 0;
    for (const [stage, band] of Object.entries(LOSS_BAND)) {
      const kg = num(losses[stage]) ?? 0;
      total += kg;
      const p = pct(kg, input, 1);
      if (input > 0 && kg > 0) {
        if (p > band[1]) findings.push(finding('warning', `${stage[0].toUpperCase()}${stage.slice(1)} loss ${p}% (${qty(kg)}) is above the usual ${band[0]}–${band[1]}%.`));
        else findings.push(finding('good', `${stage[0].toUpperCase()}${stage.slice(1)} loss ${p}% is within ${band[0]}–${band[1]}%.`));
      }
    }
    const out = num(r.outputQuantity ?? r.output_quantity);
    const recovery = out !== null && input > 0 ? pct(out, input, 1) : input > 0 ? pct(input - total, input, 1) : 0;
    const totalPct = pct(total, input, 1);
    if (totalPct > 18) findings.push(finding('critical', `Total loss ${totalPct}% is above the 18% alarm level.`));
    if (out !== null && input > 0 && Math.abs(input - total - out) > input * 0.01) findings.push(finding('warning', `Mass balance gap: input ${qty(input)} − losses ${qty(total)} ≠ output ${qty(out)}. ${qty(Math.abs(input - total - out))} unaccounted.`));
    if (total === 0 && lower(r.status) !== 'planned') findings.push(finding('info', 'No losses recorded yet.'));
    const grading = pct(num(losses.grading) ?? 0, input, 1);
    const tips: string[] = [];
    if (grading > LOSS_BAND.grading[1]) tips.push('High grading loss usually means undersized seed from the field or wrong screen size; check the screen against the variety\'s seed size.');
    if (pct(num(losses.cleaning) ?? 0, input) > LOSS_BAND.cleaning[1]) tips.push('High cleaning loss points to dirty raw intake; feed this back to procurement and the growers.');
    if (pct(num(losses.drying) ?? 0, input) > LOSS_BAND.drying[1]) tips.push('High drying loss means the seed arrived wet; tighten moisture limits at intake.');
    return {
      title: 'Processing loss analysis',
      summary: `${str(r.id)} ${str(r.crop)}: ${qty(input)} in, recovery ${recovery}%, total loss ${totalPct}%.`,
      score: { label: 'Recovery', value: clamp(recovery), max: 100, tone: recovery >= 85 ? 'good' : recovery >= 78 ? 'warn' : 'bad' },
      findings: sortFindings(findings),
      suggestions: tips,
    };
  },
};

const batchRelease: CopilotAction = {
  id: 'release_readiness',
  label: 'Release readiness',
  description: 'Quality checkpoints and lab results needed before the finished lot can be dispatched.',
  modelTask: 'Decide whether this processed seed batch is ready to release, and list what is missing.',
  run: (r) => {
    const { std } = cropStandard(r.crop);
    const qc = obj(r.qualityCheckpoints);
    const labs = arr(r.labResults);
    const findings: CopilotFinding[] = [];
    for (const [k, label] of [['pre', 'Pre-processing'], ['inProcess', 'In-process'], ['final', 'Final']] as const) {
      const c = obj(qc[k]);
      if (!c.decision) { findings.push(finding(k === 'final' ? 'critical' : 'info', `${label} quality check not recorded.`)); continue; }
      if (str(c.decision) === 'Fail') findings.push(finding('critical', `${label} check failed${str(c.visualNotes) ? `: ${str(c.visualNotes)}` : ''}.`));
      const m = num(c.moisture);
      if (m !== null && m > std.moisture) findings.push(finding('warning', `${label} moisture ${m}% is above ${std.moisture}% for ${str(r.crop) || 'this crop'}.`));
      const p = num(c.purity);
      if (p !== null && p < std.purity) findings.push(finding('warning', `${label} purity ${p}% is below ${std.purity}%.`));
    }
    if (labs.length === 0) findings.push(finding('critical', 'No lab sample sent; germination must be tested before release.'));
    for (const l of labs) {
      if (str(l.status) === 'Pending') findings.push(finding('warning', `Lab sample ${str(l.sampleId)} pending since ${str(l.sentDate)}.`));
      if (str(l.status) === 'Failed') findings.push(finding('critical', `Lab sample ${str(l.sampleId)} failed${num(l.germination) !== null ? ` (germination ${num(l.germination)}%)` : ''}.`));
      const g = num(l.germination);
      if (g !== null && str(l.status) !== 'Failed' && g < std.germination) findings.push(finding('critical', `Germination ${g}% below the ${std.germination}% minimum.`));
    }
    if (lower(r.status) === 'quality hold') findings.push(finding('critical', 'Batch is on quality hold.'));
    const blockers = findings.filter((f) => f.severity === 'critical').length;
    if (blockers === 0) findings.push(finding('good', 'All checkpoints and lab results allow release.'));
    return {
      title: 'Release readiness',
      summary: blockers === 0 ? 'Ready for release and labelling.' : `${plural(blockers, 'blocker')} before release.`,
      score: { label: 'Readiness', value: clamp(100 - blockers * 30), max: 100, tone: blockers === 0 ? 'good' : 'bad' },
      findings: sortFindings(findings),
      suggestions: blockers ? ['Record the missing checks, then re-run this check.'] : ['Print labels from the system so test date and validity match the lab result.'],
    };
  },
};

// ------------------------------------------------------------------ Warehouse item

const stockAdvice: CopilotAction = {
  id: 'stock_advice',
  label: 'Stock advice',
  description: 'Expiry, reorder level, dispatch priority and value at risk.',
  modelTask: 'Advise the warehouse manager on this stock item: dispatch priority, reorder, expiry risk and storage.',
  run: (r) => {
    const q = num(r.quantity) ?? num(r.quantity_available) ?? 0;
    const reorder = num(r.reorderPoint ?? r.reorder_point);
    const expiry = daysFromToday(r.expiryDate ?? r.expiry_date);
    const value = num(r.totalValue) ?? (num(r.unitCost) ?? 0) * q;
    const findings: CopilotFinding[] = [];
    let risk = 0;
    if (expiry !== null) {
      if (expiry < 0) { risk += 60; findings.push(finding('critical', `Expired ${plural(-expiry, 'day')} ago. Block for sale; retest and revalidate or dispose.`)); }
      else if (expiry < 60) { risk += 35; findings.push(finding('warning', `Expires in ${plural(expiry, 'day')}. Dispatch first or retest to extend validity.`)); }
      else if (expiry < 120) { risk += 15; findings.push(finding('info', `Expires in ${plural(expiry, 'day')}; plan dispatch this season.`)); }
      else findings.push(finding('good', `${plural(expiry, 'day')} of validity left.`));
    }
    if (reorder !== null && q <= reorder) { risk += 15; findings.push(finding('warning', `Quantity ${q} ${str(r.uom)} is at or below the reorder point of ${reorder}.`)); }
    const st = lower(r.status);
    if (/(hold|quarantine|blocked|damaged)/.test(st)) { risk += 20; findings.push(finding('warning', `Status is ${str(r.status)}.`)); }
    if (str(r.abcClass) === 'A' && expiry !== null && expiry < 120) findings.push(finding('warning', `Class A item: ${inr(value)} at risk if not sold before expiry.`));
    const loc = obj(r.location);
    const s = clamp(risk);
    return {
      title: 'Stock advice',
      summary: `${str(r.name) || str(r.sku)} — ${q} ${str(r.uom)}${str(loc.zone) ? ` in ${str(loc.warehouse)} / ${str(loc.zone)}` : ''}, value ${inr(value)}.`,
      score: { label: 'Risk', value: s, max: 100, tone: riskTone(s) },
      findings: sortFindings(findings),
      suggestions: expiry !== null && expiry < 120 ? ['Move to the front of the pick sequence (FEFO).', 'Offer to dealers in regions where this variety sells now.'] : [],
    };
  },
};

// ------------------------------------------------------------------ IoT sensor

const sensorCheck: CopilotAction = {
  id: 'sensor_check',
  label: 'Sensor & storage check',
  description: 'Reading against limits, seed-safe storage, calibration, battery and data freshness.',
  modelTask: 'Explain this storage sensor status to a warehouse manager and say what to do for the seed stored in this zone.',
  run: (r) => {
    const v = num(r.currentValue);
    const min = num(r.thresholdMin); const max = num(r.thresholdMax);
    const type = lower(r.type);
    const unit = str(r.unit);
    const findings: CopilotFinding[] = [];
    let health = 100;
    if (v !== null && max !== null && v > max) { health -= 40; findings.push(finding('critical', `Reading ${v}${unit} is above the ${max}${unit} limit.`)); }
    else if (v !== null && min !== null && v < min) { health -= 30; findings.push(finding('warning', `Reading ${v}${unit} is below the ${min}${unit} limit.`)); }
    else if (v !== null) findings.push(finding('good', `Reading ${v}${unit} is within limits.`));
    if (v !== null && type.includes('temp') && v > 25) findings.push(finding('warning', 'Above 25 °C, seed germination declines noticeably faster; oilseeds and cotton are most sensitive.'));
    if (v !== null && type.includes('humid') && v > 60) findings.push(finding('warning', 'Relative humidity above 60% lets seed absorb moisture; keep seed stores under 50–55% RH.'));
    if (v !== null && type.includes('temp')) {
      const h = harringtonSum(v, 50);
      if (h > 100) findings.push(finding('info', `At ${v} °C and ~50% RH, Harrington's sum is ${h} (should stay below 100 for safe seed storage).`));
    }
    const cal = daysFromToday(r.nextCalibration);
    if (cal !== null && cal < 0) { health -= 20; findings.push(finding('warning', `Calibration overdue by ${plural(-cal, 'day')}; readings may be off.`)); }
    const bat = num(r.batteryPct);
    if (bat !== null && bat < 20) { health -= 15; findings.push(finding('warning', `Battery at ${bat}%.`)); }
    const sig = num(r.signalStrength);
    if (sig !== null && sig < 30) { health -= 10; findings.push(finding('info', `Weak signal (${sig}/100); readings may be missed.`)); }
    const last = Date.parse(str(r.lastReadingAt));
    if (!Number.isNaN(last)) {
      const hrs = round((Date.now() - last) / 3_600_000, 0);
      if (hrs > 2) { health -= 15; findings.push(finding('warning', `Last reading ${hrs} hours ago; the sensor may be offline.`)); }
    }
    const h = clamp(health);
    return {
      title: 'Sensor & storage check',
      summary: `${str(r.id)} (${str(r.type)}) in ${str(r.warehouse)} / ${str(r.zone)}.`,
      score: { label: 'Health', value: h, max: 100, tone: healthTone(h) },
      findings: sortFindings(findings),
      suggestions: findings.some((f) => f.severity === 'critical') ? ['Check doors, AC/dehumidifier and roof in this zone now.', 'List the lots stored in this zone and schedule a germination retest if the breach lasted more than 24 hours.'] : [],
    };
  },
};

export const OPERATIONS_TYPES: CopilotRecordType[] = [
  { key: 'lab.submission', label: 'Lab submission', module: 'Laboratory', actions: [labInterpret] },
  { key: 'processing.batch', label: 'Processing batch', module: 'Processing', actions: [batchLoss, batchRelease] },
  { key: 'warehouse.item', label: 'Inventory item', module: 'Warehouse', actions: [stockAdvice] },
  { key: 'warehouse.sensor', label: 'Storage sensor', module: 'Warehouse', actions: [sensorCheck] },
];
