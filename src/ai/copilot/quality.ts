import type { CopilotAction, CopilotFinding, CopilotRecord, CopilotRecordType } from './types';
import { arr, clamp, daysFromToday, finding, lower, matchKeywords, num, pick, plural, riskTone, sortFindings, str, unique } from './util';

// ------------------------------------------------------------------ problem knowledge
// Seed-industry failure modes, mapped to the 6M (Ishikawa) categories, with
// the checks that confirm or rule each one out. Used by NCR root-cause,
// CAPA drafting and complaint triage so all three speak the same language.

export type Problem = 'germination' | 'moisture' | 'physical_purity' | 'genetic_purity' | 'pest' | 'treatment' | 'packaging' | 'labelling' | 'storage' | 'supplier' | 'documentation' | 'yield' | 'delivery';

const KEYWORDS: Record<Problem, string[]> = {
  germination: ['germination', 'germinat', 'did not sprout', 'not sprout', 'no emergence', 'emergence', 'vigour', 'vigor', 'dead seed', 'viability'],
  moisture: ['moisture', 'damp', 'wet', 'fungus', 'fungal', 'mould', 'mold'],
  physical_purity: ['purity', 'inert', 'weed seed', 'other crop', 'impurity', 'broken', 'chaff', 'stone', 'admixture'],
  genetic_purity: ['off-type', 'off type', 'offtype', 'genetic purity', 'mixture', 'mixed variety', 'rogue', 'segregat', 'not true to type', 'different plant', 'grow-out'],
  pest: ['insect', 'pest', 'weevil', 'bruchid', 'infest'],
  treatment: ['treatment', 'treated', 'fungicide', 'insecticide', 'coating', 'dosage', 'thiram', 'imidacloprid', 'chemical'],
  packaging: ['packet', 'packing', 'bag', 'torn', 'seal', 'leak', 'weight short', 'underweight', 'short weight'],
  labelling: ['label', 'tag', 'expiry', 'batch number', 'lot number', 'misprint', 'qr'],
  storage: ['storage', 'godown', 'warehouse', 'temperature', 'humidity'],
  supplier: ['supplier', 'vendor', 'grower', 'contract farmer', 'incoming', 'raw material'],
  documentation: ['record', 'document', 'sop', 'register', 'not recorded', 'missing certificate', 'certificate'],
  yield: ['yield', 'low production', 'poor crop', 'cob', 'boll', 'grain fill'],
  delivery: ['late', 'delay', 'not delivered', 'dispatch', 'transport'],
};

interface ProblemInfo {
  label: string;
  category: 'Man' | 'Machine' | 'Method' | 'Material' | 'Measurement' | 'Environment';
  causes: string[];
  checks: string[];
  corrective: string[];
  preventive: string[];
}

export const PROBLEMS: Record<Problem, ProblemInfo> = {
  germination: {
    label: 'Low germination / vigour', category: 'Material',
    causes: ['Seed aged in storage beyond its safe period', 'Harvest at high moisture or delayed drying', 'Mechanical damage during threshing or processing', 'Over-dosed seed treatment', 'Field conditions at sowing (not a seed defect)'],
    checks: ['Retest the retained guard sample of the lot (germination and vigour)', 'Compare with the original lab result and test date', 'Check storage temperature and humidity logs for the lot', 'Review the drying and processing records of the batch'],
    corrective: ['Place the lot on quality hold and stop dispatch', 'Retest; if below standard, downgrade or reject the lot', 'Replace or compensate affected farmers'],
    preventive: ['Set a re-validation test before dispatch for lots older than 6 months', 'Add a moisture check at intake and after drying', 'Review threshing and grading machine settings for seed damage'],
  },
  moisture: {
    label: 'High moisture / fungal growth', category: 'Environment',
    causes: ['Inadequate drying before packing', 'Humid storage or roof leakage', 'Packing material not moisture-proof'],
    checks: ['Measure moisture of retained and field samples', 'Check dryer logs and the final moisture recorded', 'Inspect storage zone humidity history'],
    corrective: ['Re-dry the lot if still in stock', 'Hold and retest germination', 'Move stock to a dry, ventilated zone'],
    preventive: ['Make final-moisture sign-off mandatory before packing', 'Add humidity alerts for seed storage zones', 'Use moisture-proof packing for long storage'],
  },
  physical_purity: {
    label: 'Physical purity / inert matter', category: 'Machine',
    causes: ['Cleaner or grader screens worn or wrongly set', 'Inadequate cleaning between lots', 'High inert matter in raw intake'],
    checks: ['Purity test on retained sample', 'Inspect cleaner and grader screen settings', 'Check intake inspection records for the source lots'],
    corrective: ['Re-clean and re-grade the remaining stock', 'Retest purity before release'],
    preventive: ['Add a screen-condition check to the machine start-up checklist', 'Mandate line clearance between lots'],
  },
  genetic_purity: {
    label: 'Genetic purity / off-types', category: 'Method',
    causes: ['Isolation distance not maintained at the production field', 'Incomplete roguing during field inspection', 'Admixture at harvest, threshing or processing', 'Wrong parent seed used'],
    checks: ['Grow-out test (GOT) of the retained sample', 'Review field inspection reports for isolation and off-type counts', 'Trace the lot genealogy back to the parent seed', 'Check processing line clearance records'],
    corrective: ['Hold all lots from the same production field', 'Run GOT before any further dispatch', 'Assess recall of dispatched stock if GOT confirms'],
    preventive: ['Verify isolation distance at the first field inspection', 'Add a roguing completion sign-off', 'Enforce line clearance between varieties'],
  },
  pest: {
    label: 'Storage insect damage', category: 'Environment',
    causes: ['Fumigation schedule missed', 'Infested stock stored next to clean stock', 'Old stock or spillage left in the godown'],
    checks: ['Inspect stock and stacks in the zone', 'Check the fumigation log', 'Check whether nearby lots are affected'],
    corrective: ['Segregate and fumigate affected stock', 'Re-clean and retest before release'],
    preventive: ['Fix a fumigation calendar with sign-off', 'Add monthly pest inspection to the warehouse checklist'],
  },
  treatment: {
    label: 'Seed treatment problem', category: 'Method',
    causes: ['Wrong dosage or unapproved recipe', 'Uneven coating from treater calibration', 'Treatment chemical expired'],
    checks: ['Compare the batch record with the approved recipe', 'Check treater calibration records', 'Test a sample for coverage'],
    corrective: ['Hold the batch and re-treat or reject', 'Recalibrate the treater'],
    preventive: ['Require recipe approval before each treatment run', 'Add treater calibration to preventive maintenance'],
  },
  packaging: {
    label: 'Packaging / net weight', category: 'Machine',
    causes: ['Filling machine out of calibration', 'Packing material quality', 'Handling damage in transit'],
    checks: ['Check weigh-scale calibration certificate', 'Sample-weigh packets from the same batch', 'Inspect packing material lot'],
    corrective: ['Re-weigh and repack affected stock', 'Replace damaged packets at the dealer'],
    preventive: ['Add hourly check-weighing on the packing line', 'Incoming inspection of packing material'],
  },
  labelling: {
    label: 'Label / tag error', category: 'Method',
    causes: ['Label data entered manually', 'Wrong label roll used for the lot', 'Certification tag not issued for the lot'],
    checks: ['Compare the printed label with the lot and certification records', 'Check the label print log'],
    corrective: ['Relabel affected stock', 'Inform dealers holding the stock'],
    preventive: ['Print labels only from system data (lot, test date, validity)', 'Add a label verification step before dispatch'],
  },
  storage: {
    label: 'Storage conditions', category: 'Environment',
    causes: ['Temperature or humidity above safe limits', 'No stacking on pallets', 'Mixed storage with fertiliser or chemicals'],
    checks: ['Review sensor history for the zone', 'Inspect stacking and segregation'],
    corrective: ['Move stock to a controlled zone', 'Retest germination of exposed lots'],
    preventive: ['Set temperature and humidity alerts per zone', 'Daily storage condition log'],
  },
  supplier: {
    label: 'Supplier or grower quality', category: 'Material',
    causes: ['Raw seed below specification at intake', 'Grower did not follow the production protocol'],
    checks: ['Check intake inspection (GRN) results for the source', 'Review the supplier or grower history of NCRs'],
    corrective: ['Raise a supplier NCR and request their corrective action', 'Return or downgrade the material'],
    preventive: ['Tighten incoming inspection for this supplier', 'Include quality clauses in the grower agreement'],
  },
  documentation: {
    label: 'Records / documentation', category: 'Man',
    causes: ['Step not defined in an SOP', 'Staff not trained on the SOP', 'Paper records not transferred'],
    checks: ['Check whether a current SOP covers the step', 'Check training records of the staff involved'],
    corrective: ['Complete the missing records', 'Retrain the staff involved'],
    preventive: ['Write or revise the SOP and require acknowledgement', 'Move the record to a system form'],
  },
  yield: {
    label: 'Poor field performance', category: 'Environment',
    causes: ['Weather, sowing time or agronomy (not a seed defect)', 'Seed vigour lower than label', 'Variety not suited to the region'],
    checks: ['Visit the field and record conditions', 'Compare with other farmers who sowed the same lot', 'Retest the retained sample'],
    corrective: ['Share agronomy advice with the farmer', 'Compensate if the lot is found defective'],
    preventive: ['Publish region-wise sowing advice with the product', 'Track field performance per lot'],
  },
  delivery: {
    label: 'Delivery / dispatch delay', category: 'Method',
    causes: ['Stock not available at the planned time', 'Transport planning'],
    checks: ['Check order and dispatch dates', 'Check stock availability on the order date'],
    corrective: ['Expedite the dispatch and inform the customer'],
    preventive: ['Plan dispatch against the season calendar', 'Review demand forecast accuracy'],
  },
};

export function detectProblems(record: CopilotRecord): Problem[] {
  const text = [pick(record, 'title'), pick(record, 'description'), pick(record, 'source'), pick(record, 'root_cause', 'rootCause')].map(str).join(' ');
  return matchKeywords(text, KEYWORDS);
}

const SEVERITY_WORDS = ['minor', 'major', 'critical'];

function sev(record: CopilotRecord): string {
  const s = lower(pick(record, 'severity'));
  return SEVERITY_WORDS.includes(s) ? s : 'major';
}

// ------------------------------------------------------------------ NCR

const ncrRootCause: CopilotAction = {
  id: 'root_cause',
  label: 'Root cause analysis',
  description: 'Likely causes (6M / fishbone), a 5-Why chain and the checks that confirm the cause.',
  modelTask: 'Act as a seed-industry quality engineer. Give the most likely root causes for this non-conformance with a 5-Why chain, and the checks that would confirm each one.',
  run: (r) => {
    const problems = detectProblems(r);
    const lot = str(pick(r, 'lot_code', 'lotCode'));
    const findings: CopilotFinding[] = [];
    if (problems.length === 0) findings.push(finding('info', 'The description does not name a specific failure mode; add what was observed, where, and on which lot.'));
    for (const p of problems.slice(0, 3)) {
      const info = PROBLEMS[p];
      findings.push(finding('warning', `${info.label} (${info.category}): most likely ${info.causes.slice(0, 2).join('; or ').toLowerCase()}.`));
    }
    if (!lot) findings.push(finding('warning', 'No seed lot is linked, so the problem cannot be traced or contained. Link the affected lot.'));
    if (str(pick(r, 'root_cause'))) findings.push(finding('good', `A root cause is already recorded: "${str(pick(r, 'root_cause')).slice(0, 140)}". Check it against the analysis below.`));

    const main = problems[0] ? PROBLEMS[problems[0]] : null;
    const why = main
      ? [
          `Why 1: ${str(pick(r, 'title')) || 'The non-conformance occurred'}.`,
          `Why 2: ${main.causes[0]}.`,
          `Why 3: The control that should catch this (${main.checks[0].toLowerCase()}) was missing or not done.`,
          'Why 4: The step is not defined clearly in an SOP, or the person was not trained on it.',
          'Why 5: No system check enforces the step before the lot moves on. Confirm or correct each answer with evidence.',
        ]
      : ['Why 1: Describe what happened.', 'Why 2-5: Ask "why" for each answer until you reach a process or system cause, not a person.'];

    return {
      title: 'Root cause analysis',
      summary: main ? `This looks like a ${main.label.toLowerCase()} problem. Confirm the cause with the checks below before closing.` : 'Not enough detail to suggest a cause yet.',
      findings: sortFindings(findings),
      suggestions: unique(problems.slice(0, 2).reduce<string[]>((acc, p) => acc.concat(PROBLEMS[p].checks), [])).slice(0, 6),
      draft: { label: '5-Why analysis', text: why.join('\n') },
    };
  },
};

const ncrCapa: CopilotAction = {
  id: 'capa_plan',
  label: 'Draft CAPA plan',
  description: 'Corrective and preventive actions with timings to propose.',
  modelTask: 'Draft a corrective and preventive action (CAPA) plan for this non-conformance: containment, correction, corrective action on the root cause, and preventive action, each with a suggested owner role and due date in days.',
  run: (r) => {
    const problems = detectProblems(r);
    const s = sev(r);
    const days = s === 'critical' ? [2, 7, 30] : s === 'major' ? [3, 14, 45] : [7, 30, 60];
    const p = problems[0] ? PROBLEMS[problems[0]] : null;
    const lot = str(pick(r, 'lot_code', 'lotCode'));
    const corrective = p ? p.corrective : ['Contain affected material', 'Correct the immediate problem'];
    const preventive = p ? p.preventive : ['Update the SOP for the failed step', 'Train the team and verify after 30 days'];
    const capas = arr(r.capas);
    const findings: CopilotFinding[] = [];
    if (capas.length > 0) findings.push(finding('info', `${plural(capas.length, 'action')} already raised; compare them with this draft.`));
    if (s !== 'minor' && capas.length === 0) findings.push(finding('warning', `A ${s} NCR cannot be closed without at least one corrective or preventive action.`));
    findings.push(finding('info', `Suggested timing for a ${s} NCR: containment in ${days[0]} days, corrective action in ${days[1]} days, effectiveness check after ${days[2]} days.`));
    const text = [
      `Containment (within ${days[0]} days): ${lot ? `place lot ${lot} on quality hold; ` : ''}${corrective[0].toLowerCase()}.`,
      ...corrective.slice(1).map((c, i) => `Correction ${i + 1} (within ${days[1]} days): ${c}.`),
      ...preventive.map((c, i) => `Preventive ${i + 1} (within ${days[1] + 14} days): ${c}.`),
      `Effectiveness check (after ${days[2]} days): confirm no repeat of this problem on the next lots and close with evidence.`,
    ].join('\n');
    return {
      title: 'CAPA plan',
      summary: `Proposed plan for a ${s} non-conformance${p ? ` (${p.label.toLowerCase()})` : ''}. Assign an owner to each line when you raise it.`,
      findings,
      suggestions: ['Corrective actions go to the department that owns the failed step; preventive actions usually to Quality.', 'Attach evidence when each action is implemented so verification is quick.'],
      draft: { label: 'CAPA plan', text },
    };
  },
};

const ncrClosure: CopilotAction = {
  id: 'closure_check',
  label: 'Closure readiness',
  description: 'Checks whether this NCR meets the closure rules and whether it is overdue.',
  modelTask: 'Assess whether this non-conformance is ready to close and what is still missing.',
  run: (r) => {
    const findings: CopilotFinding[] = [];
    const capas = arr(r.capas).filter((c) => lower(c.status) !== 'cancelled');
    const open = capas.filter((c) => lower(c.status) !== 'closed');
    const status = lower(r.status);
    const done = status === 'closed' || status === 'cancelled';
    if (done) findings.push(finding('good', `This NCR is already ${status}.`));
    if (!str(r.root_cause)) findings.push(finding('critical', 'No root cause recorded.'));
    if (sev(r) !== 'minor' && capas.length === 0) findings.push(finding('critical', 'No corrective or preventive action raised.'));
    if (open.length > 0) findings.push(finding('warning', `${plural(open.length, 'action')} still open: ${open.map((c) => str(c.capa_code)).join(', ')}.`));
    const ineffective = capas.filter((c) => lower(c.effectiveness_result) === 'ineffective');
    if (ineffective.length > 0) findings.push(finding('critical', `${plural(ineffective.length, 'action')} verified as ineffective; raise a new action before closing.`));
    const due = daysFromToday(r.due_date);
    if (due !== null && due < 0 && !done) findings.push(finding('warning', `Overdue by ${plural(-due, 'day')}.`));
    const holds = arr(r.holds).filter((h) => !h.released_at);
    if (holds.length > 0) findings.push(finding('info', `${plural(holds.length, 'lot hold')} active; decide release or rejection when closing.`));
    const blockers = findings.filter((f) => f.severity === 'critical' || f.severity === 'warning').length;
    if (blockers === 0 && !done) findings.push(finding('good', 'All closure conditions are met.'));
    return {
      title: 'Closure readiness',
      summary: blockers === 0 ? (done ? 'Already closed.' : 'Ready to close.') : `${plural(blockers, 'item')} to resolve before closing.`,
      score: { label: 'Readiness', value: clamp(100 - blockers * 25), max: 100, tone: blockers === 0 ? 'good' : blockers > 2 ? 'bad' : 'warn' },
      findings: sortFindings(findings),
      suggestions: [],
    };
  },
};

// ------------------------------------------------------------------ Complaint

function complaintCategory(r: CopilotRecord): { problems: Problem[]; recall: boolean; severity: 'minor' | 'major' | 'critical' } {
  const problems = detectProblems(r);
  let severity: 'minor' | 'major' | 'critical' = 'minor';
  if (problems.some((p) => p === 'germination' || p === 'genetic_purity' || p === 'treatment')) severity = 'major';
  const text = `${str(r.title)} ${str(r.description)}`.toLowerCase();
  if (/(many|several|multiple|all) (farmers|villages|dealers)|whole (field|crop)|crop (failure|loss)|acres? (failed|lost)/.test(text)) severity = 'critical';
  const recall = severity === 'critical' && problems.some((p) => p === 'genetic_purity' || p === 'germination' || p === 'treatment');
  return { problems, recall, severity };
}

const complaintTriage: CopilotAction = {
  id: 'triage',
  label: 'Triage complaint',
  description: 'Category, suggested severity, response deadline, recall risk and first steps.',
  modelTask: 'Triage this farmer or dealer complaint about seed: category, severity, whether a recall should be considered, and the first investigation steps.',
  run: (r) => {
    const { problems, recall, severity } = complaintCategory(r);
    const age = num(r.age_days) ?? 0;
    const status = lower(r.status);
    const closed = ['resolved', 'closed'].includes(status);
    const recorded = sev(r);
    const findings: CopilotFinding[] = [];
    findings.push(finding('info', problems.length ? `Category: ${problems.map((p) => PROBLEMS[p].label).join(', ')}.` : 'Category unclear from the description; record the symptoms, lot number and sowing date.'));
    if (SEVERITY_WORDS.indexOf(severity) > SEVERITY_WORDS.indexOf(recorded)) findings.push(finding('warning', `Recorded as ${recorded}, but the description suggests ${severity}.`));
    if (recall) findings.push(finding('critical', 'Recall risk: the description points to a lot-level defect affecting several customers. Hold the lot and check the other dealers who received it.'));
    if (!str(r.lot_code)) findings.push(finding('warning', 'No lot linked. Ask for the lot number on the bag tag so the lot can be traced.'));
    if (!closed) {
      if (age > 7) findings.push(finding('critical', `Open for ${age} days; the target is 7 days.`));
      else if (age > 3) findings.push(finding('warning', `Open for ${age} days; ${7 - age} days left in the 7-day target.`));
      if (!str(r.assigned_to)) findings.push(finding('warning', 'Not assigned to anyone.'));
    }
    if (problems.length === 1 && problems[0] === 'yield') findings.push(finding('info', 'Poor field performance is often agronomic. Visit the field before accepting a seed defect.'));
    if (!str(r.ncr_code) && severity !== 'minor') findings.push(finding('warning', 'No NCR raised. A major complaint should open an NCR so the cause gets fixed.'));
    const steps = unique([
      ...(str(r.lot_code) ? [`Pull the retained sample of ${str(r.lot_code)} and retest`] : []),
      ...(problems[0] ? PROBLEMS[problems[0]].checks : []),
      'Call the complainant within 24 hours and arrange a field visit',
    ]).slice(0, 6);
    return {
      title: 'Complaint triage',
      summary: `Suggested severity: ${severity}${recall ? ', with recall risk' : ''}. ${closed ? 'Already resolved.' : `Respond within ${Math.max(0, 7 - age)} days.`}`,
      findings: sortFindings(findings),
      suggestions: steps,
    };
  },
};

const complaintReply: CopilotAction = {
  id: 'reply_draft',
  label: 'Draft reply to customer',
  description: 'A polite message to the farmer or dealer with the next steps.',
  modelTask: 'Write a short, polite reply to the complainant (a farmer or dealer in India) acknowledging the complaint, explaining next steps and timeline. Plain language, no admission of liability.',
  run: (r) => {
    const name = str(r.complainant_name) || 'Sir/Madam';
    const code = str(r.complaint_code);
    const lot = str(r.lot_code);
    const resolved = ['resolved', 'closed'].includes(lower(r.status));
    const text = resolved
      ? `Dear ${name},\n\nThank you for your patience regarding complaint ${code}${lot ? ` about seed lot ${lot}` : ''}. We have completed our investigation.\n\nFindings: ${str(r.root_cause) || '[summarise the root cause]'}\nAction taken: ${str(r.resolution) || '[describe the resolution]'}\n\nIf you have any further concerns, please contact us. We value your trust in our seed.\n\nRegards,\nQuality Team`
      : `Dear ${name},\n\nThank you for informing us about "${str(r.title)}". We have registered your complaint as ${code}${lot ? ` against seed lot ${lot}` : ''}.\n\nOur next steps:\n1. Our field officer will contact you within 24 hours to arrange a visit.\n2. We will test the retained sample of the same lot in our laboratory.\n3. We will share our findings and the resolution within 7 days.\n\nPlease keep the seed bag, its tag and any remaining seed, as they help our investigation.\n\nRegards,\nQuality Team`;
    return {
      title: 'Reply to customer',
      summary: resolved ? 'Closure letter with the findings and resolution.' : 'Acknowledgement with the next steps and a 7-day timeline.',
      findings: [],
      suggestions: ["Translate into the customer's language (Telugu, Hindi, Marathi) before sending if needed."],
      draft: { label: 'Message', text },
    };
  },
};

// ------------------------------------------------------------------ SOP

const SOP_SECTIONS: [string, string][] = [
  ['purpose', 'Purpose'], ['scope', 'Scope'], ['responsib', 'Responsibilities'], ['procedure', 'Procedure'], ['record', 'Records'], ['reference', 'References'],
];

const sopReview: CopilotAction = {
  id: 'review',
  label: 'Review SOP',
  description: 'Checks structure, review dates, regulatory references and acknowledgements.',
  modelTask: 'Review this standard operating procedure for a seed company: structure, clarity, missing controls, regulatory references (Seeds Act 1966, Seeds Rules 1968, Seeds Control Order 1983) and suggest concrete improvements.',
  run: (r) => {
    const doc = r.document && typeof r.document === 'object' ? (r.document as CopilotRecord) : r;
    const versions = arr(r.versions);
    const current = versions.find((v) => lower(v.status) === 'effective') ?? versions[0] ?? r;
    const content = str(current.content);
    const findings: CopilotFinding[] = [];
    const missing = SOP_SECTIONS.filter(([k]) => !content.toLowerCase().includes(k));
    if (!content) findings.push(finding('critical', 'The SOP has no content.'));
    else {
      if (missing.length) findings.push(finding('warning', `Missing sections: ${missing.map(([, l]) => l.toLowerCase()).join(', ')}.`));
      else findings.push(finding('good', 'Has purpose, scope, responsibilities, procedure, records and references.'));
      const words = content.split(/\s+/).length;
      if (words < 120) findings.push(finding('warning', `Only ${words} words; procedures this short usually leave steps undefined.`));
      if (!/seeds? (act|rules|control order)/i.test(content)) findings.push(finding('info', 'No reference to the Seeds Act, Seeds Rules or Seeds Control Order. Add the clause this SOP satisfies.'));
      if (!/\d/.test(content)) findings.push(finding('info', 'No numeric limits (moisture %, temperature, sample size). Measurable limits make the SOP auditable.'));
    }
    const review = daysFromToday(current.next_review_date);
    if (review !== null && review < 0) findings.push(finding('critical', `Review overdue by ${plural(-review, 'day')}.`));
    else if (review !== null && review < 30) findings.push(finding('warning', `Review due in ${plural(review, 'day')}.`));
    const acks = num(current.acknowledgement_count) ?? arr(r.acknowledgements).length;
    if (lower(current.status) === 'effective' && acks === 0) findings.push(finding('warning', 'No staff have acknowledged the effective version.'));
    const pending = versions.find((v) => ['draft', 'in_review'].includes(lower(v.status)));
    if (pending) findings.push(finding('info', `Version ${str(pending.version_number)} is ${lower(pending.status).replace('_', ' ')}.`));
    return {
      title: `SOP review${str(doc.sop_code) ? `: ${str(doc.sop_code)}` : ''}`,
      summary: findings.some((f) => f.severity === 'critical') ? 'Needs attention before the next audit.' : 'Structure looks usable; see the improvements below.',
      findings: sortFindings(findings),
      suggestions: ['Write each step as "who does what, with which record".', 'Link the SOP to its compliance requirement so auditors can trace it.'],
      draft: missing.length && content ? { label: 'Missing section headings', text: missing.map(([, l]) => `## ${l}\n[to be written]`).join('\n\n') } : null,
    };
  },
};

// ------------------------------------------------------------------ Compliance requirement

const complianceGap: CopilotAction = {
  id: 'gap_assessment',
  label: 'Gap assessment',
  description: 'How exposed this requirement is, and what evidence and actions close the gap.',
  modelTask: 'Assess this regulatory compliance requirement for an Indian seed company: exposure, what evidence an inspector would expect, and the steps to close the gap.',
  run: (r) => {
    const req = r.requirement && typeof r.requirement === 'object' ? (r.requirement as CopilotRecord) : r;
    const evidence = arr(r.evidence);
    const capas = arr(r.capas);
    const status = lower(req.status);
    const risk = lower(req.risk);
    let score = 0;
    const findings: CopilotFinding[] = [];
    if (status === 'non_compliant') { score += 45; findings.push(finding('critical', 'Assessed as non-compliant.')); }
    else if (status.startsWith('partial')) { score += 25; findings.push(finding('warning', 'Partially compliant.')); }
    else if (status === 'compliant') findings.push(finding('good', 'Assessed as compliant.'));
    else { score += 20; findings.push(finding('warning', 'Not yet assessed.')); }
    if (risk === 'high' || risk === 'critical') score += 20;
    const evCount = num(req.evidence_count) ?? evidence.length;
    if (evCount === 0) { score += 15; findings.push(finding('warning', 'No evidence attached. An inspector will ask for records, not statements.')); }
    if (!str(req.sop_code) && !str(req.sop_id)) { score += 5; findings.push(finding('info', 'No SOP linked to this requirement.')); }
    if (!str(req.responsible_email)) { score += 5; findings.push(finding('warning', 'No responsible person.')); }
    if (req.is_overdue === true) { score += 10; findings.push(finding('critical', `Target date ${str(req.target_date)} has passed.`)); }
    if (req.review_overdue === true) findings.push(finding('warning', 'Periodic review is overdue.'));
    if (str(req.gap) && capas.length === 0 && !str(req.ncr_code)) findings.push(finding('warning', 'A gap is recorded but no NCR or CAPA tracks closing it.'));
    const s = clamp(score);
    return {
      title: `Gap assessment${str(req.req_code) ? `: ${str(req.req_code)}` : ''}`,
      summary: `${str(req.regulation) || 'Regulatory'} requirement, exposure ${s >= 60 ? 'high' : s >= 30 ? 'medium' : 'low'}.`,
      score: { label: 'Exposure', value: s, max: 100, tone: riskTone(s) },
      findings: sortFindings(findings),
      suggestions: unique([
        evCount === 0 ? 'Attach the register, certificate or report that proves compliance' : '',
        str(req.gap) ? `Close the gap: ${str(req.gap).slice(0, 160)}` : '',
        !str(req.sop_code) ? 'Link or write the SOP that makes this repeatable' : '',
        'Schedule the next review date',
      ].filter(Boolean)),
    };
  },
};

export const QUALITY_TYPES: CopilotRecordType[] = [
  { key: 'quality.ncr', label: 'Non-conformance', module: 'Quality', actions: [ncrRootCause, ncrCapa, ncrClosure] },
  { key: 'quality.complaint', label: 'Complaint', module: 'Quality', actions: [complaintTriage, complaintReply] },
  { key: 'quality.sop', label: 'SOP', module: 'Quality', actions: [sopReview] },
  { key: 'quality.compliance', label: 'Compliance requirement', module: 'Quality', actions: [complianceGap] },
];
