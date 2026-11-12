import type { CopilotAction, CopilotFinding, CopilotRecordType } from './types';
import { arr, clamp, daysBetween, daysFromToday, finding, healthTone, inr, lower, num, obj, pct, plural, riskTone, round, sortFindings, str } from './util';

const CLOSED_PO = ['closed', 'completed', 'cancelled', 'received', 'fully received', 'delivered'];

// ------------------------------------------------------------------ Purchase order

const poPriceCheck: CopilotAction = {
  id: 'price_check',
  label: 'Price & tax check',
  description: 'Line totals, price vs estimate, tax rates and concentration of spend.',
  modelTask: 'Review this purchase order for pricing problems: arithmetic errors, prices above estimate, unusual GST rates for the item type, and anything a procurement manager should question before approving.',
  run: (r) => {
    const lines = arr(r.lineItems ?? r.line_items);
    const findings: CopilotFinding[] = [];
    let computed = 0;
    lines.forEach((l, i) => {
      const q = num(l.quantity) ?? 0;
      const price = num(l.unitPrice ?? l.unit_price) ?? 0;
      const total = num(l.total) ?? q * price;
      computed += total;
      const name = str(l.description) || `Line ${i + 1}`;
      if (q > 0 && price > 0 && Math.abs(q * price - total) > Math.max(1, total * 0.005)) findings.push(finding('warning', `${name}: ${q} × ${inr(price)} = ${inr(q * price)}, but the line total is ${inr(total)}.`));
      const est = num(l.estimatedPrice ?? l.estimated_price);
      if (est && price > est * 1.1) findings.push(finding('warning', `${name}: price ${inr(price)} is ${round(pct(price - est, est), 0)}% above the estimate of ${inr(est)}.`));
      const tax = num(l.taxPercent ?? l.tax_percent);
      const d = name.toLowerCase();
      if (tax !== null && /seed/.test(d) && !/(treat|chemical|fungicide|coating|packing|bag)/.test(d) && tax > 0) findings.push(finding('info', `${name}: ${tax}% GST charged. Seed for sowing is normally nil-rated (HSN 1209); confirm with the finance team.`));
      if (tax !== null && /(fungicide|insecticide|pesticide)/.test(d) && tax !== 18) findings.push(finding('info', `${name}: ${tax}% GST; crop-protection chemicals are usually 18%. Confirm the rate.`));
    });
    const total = num(r.totalAmount ?? r.total_amount) ?? computed;
    if (lines.length && Math.abs(total - computed) > Math.max(1, total * 0.01)) findings.push(finding('warning', `Order total ${inr(total)} does not match the sum of lines ${inr(computed)} (tax may be excluded).`));
    if (lines.length) {
      const top = [...lines].sort((a, b) => (num(b.total) ?? 0) - (num(a.total) ?? 0))[0];
      const share = pct(num(top.total) ?? 0, computed, 0);
      if (lines.length > 1 && share > 80) findings.push(finding('info', `${str(top.description)} is ${share}% of the order value.`));
    }
    if (!str(r.prReference ?? r.pr_reference)) findings.push(finding('info', 'No purchase requisition linked; check that the purchase was approved by the department.'));
    if (findings.filter((f) => f.severity === 'warning').length === 0) findings.push(finding('good', 'Line arithmetic and prices look consistent.'));
    return {
      title: 'Price & tax check',
      summary: `${plural(lines.length, 'line')}, ${inr(total)} in total.`,
      findings: sortFindings(findings),
      suggestions: ['Compare unit prices with the last three orders for the same item.', 'Ask for a rate contract if this item is bought every season.'],
    };
  },
};

const poDeliveryRisk: CopilotAction = {
  id: 'delivery_risk',
  label: 'Delivery & matching risk',
  description: 'Overdue delivery, missing goods receipts and invoice matching gaps.',
  modelTask: 'Assess the delivery and three-way-match risk for this purchase order and recommend the next follow-up.',
  run: (r) => {
    const status = lower(r.status);
    const due = daysFromToday(r.expectedDelivery ?? r.expected_delivery_date);
    const grns = arr(r.grns);
    const invoices = arr(r.invoices);
    const findings: CopilotFinding[] = [];
    let risk = 0;
    const closed = CLOSED_PO.includes(status);
    if (!closed && due !== null) {
      if (due < 0) { risk += 40; findings.push(finding('critical', `Delivery is ${plural(-due, 'day')} late.`)); }
      else if (due <= 3) { risk += 15; findings.push(finding('warning', `Delivery due in ${plural(due, 'day')}.`)); }
      else findings.push(finding('good', `Delivery due in ${plural(due, 'day')}.`));
    }
    if (!closed && grns.length === 0 && due !== null && due < 0) { risk += 15; findings.push(finding('warning', 'No goods receipt recorded yet.')); }
    if (invoices.length > grns.length) { risk += 25; findings.push(finding('critical', `${plural(invoices.length, 'invoice')} against ${plural(grns.length, 'goods receipt')}: do not pay before goods are received and inspected.`)); }
    if (/advance|100% (in )?advance/i.test(str(r.paymentTerms ?? r.payment_terms))) { risk += 10; findings.push(finding('warning', `Payment terms "${str(r.paymentTerms)}": money is at risk until delivery.`)); }
    const log = arr(r.activityLog);
    if (log.length === 0) findings.push(finding('info', 'No activity recorded on this order.'));
    const s = clamp(risk);
    return {
      title: 'Delivery & matching risk',
      summary: closed ? `Order is ${status}.` : `Delivery risk is ${s >= 60 ? 'high' : s >= 30 ? 'medium' : 'low'}.`,
      score: { label: 'Risk', value: s, max: 100, tone: riskTone(s) },
      findings: sortFindings(findings),
      suggestions: s >= 30 ? [`Call ${str(r.supplier)} for a confirmed dispatch date and vehicle number.`, 'If the material is needed for sowing, plan an alternative source now.'] : [],
    };
  },
};

// ------------------------------------------------------------------ Supplier

const supplierRisk: CopilotAction = {
  id: 'risk_profile',
  label: 'Supplier risk profile',
  description: 'Scorecard, compliance documents, dependency and recommended classification.',
  modelTask: 'Profile this supplier for a seed company: performance, compliance and dependency risk, and whether its classification should change.',
  run: (r) => {
    const q = num(r.qualityScore ?? r.quality_score);
    const d = num(r.deliveryScore ?? r.delivery_score);
    const c = num(r.costScore ?? r.cost_score);
    const overall = num(r.overallScore ?? r.overall_score) ?? (q !== null && d !== null && c !== null ? round(q * 0.5 + d * 0.3 + c * 0.2, 0) : null);
    const cls = str(r.classification);
    const findings: CopilotFinding[] = [];
    if (lower(cls) === 'blacklisted') findings.push(finding('critical', `Blacklisted${str(r.blacklistReason) ? `: ${str(r.blacklistReason)}` : ''}. Do not issue new orders.`));
    if (q !== null && q < 70) findings.push(finding('critical', `Quality score ${q} is below 70.`));
    else if (q !== null && q < 85) findings.push(finding('warning', `Quality score ${q}; tighten incoming inspection.`));
    if (d !== null && d < 75) findings.push(finding('warning', `Delivery score ${d}; plan buffers for seasonal orders.`));
    if (!str(r.gst)) findings.push(finding('warning', 'GSTIN missing.'));
    if (!str(r.pan)) findings.push(finding('warning', 'PAN missing.'));
    const docs = arr(r.documents);
    if (docs.length === 0) findings.push(finding('warning', 'No documents on file (agreement, licence, certificates).'));
    const lastPo = daysFromToday(r.lastPODate ?? r.last_po_date);
    if (lastPo !== null && lastPo < -365) findings.push(finding('info', `No order in ${Math.round(-lastPo / 30)} months; re-verify details before reuse.`));
    const cat = lower(r.category);
    if (/seed|grower/.test(cat) && !docs.some((x) => /licen|certif|registration/i.test(str(x.name)))) findings.push(finding('warning', 'Seed supplier with no seed licence or certification document uploaded (Seeds Control Order 1983 requires a dealer licence).'));
    let suggested = cls;
    if (overall !== null) suggested = overall >= 85 ? 'Preferred' : overall >= 70 ? 'Approved' : 'Registered';
    if (lower(cls) === 'blacklisted') suggested = 'Blacklisted';
    if (suggested && suggested !== cls) findings.push(finding('info', `Scorecard suggests "${suggested}" instead of "${cls}".`));
    const health = overall ?? 60;
    return {
      title: 'Supplier risk profile',
      summary: `${str(r.name) || 'Supplier'}: overall score ${overall ?? 'not available'}${num(r.totalSpend) ? `, ${inr(num(r.totalSpend) ?? 0)} total spend` : ''}.`,
      score: { label: 'Overall', value: clamp(health), max: 100, tone: healthTone(health) },
      findings: sortFindings(findings),
      suggestions: ['Review the scorecard with the supplier each season.', 'Raise a supplier NCR for any rejected delivery so the score reflects it.'],
    };
  },
};

// ------------------------------------------------------------------ RFQ

const rfqCompare: CopilotAction = {
  id: 'compare_bids',
  label: 'Compare bids',
  description: 'Ranks quotations on price and delivery and flags suspicious bids.',
  modelTask: 'Compare the supplier bids on this RFQ and recommend which to award, with reasons and risks.',
  run: (r) => {
    const bids = arr(r.bids);
    const findings: CopilotFinding[] = [];
    if (bids.length === 0) return { title: 'Bid comparison', summary: 'No bids received yet.', findings: [finding('info', `${num(r.suppliersInvited) ?? 0} suppliers invited; deadline ${str(r.deadline) || 'not set'}.`)], suggestions: ['Send a reminder to invited suppliers before the deadline.'] };
    const prices = bids.map((b) => num(b.unitPrice) ?? num(b.total) ?? 0);
    const days = bids.map((b) => num(b.deliveryDays) ?? 30);
    const minP = Math.min(...prices); const maxP = Math.max(...prices);
    const minD = Math.min(...days); const maxD = Math.max(...days);
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const ranked = bids.map((b, i) => {
      const pScore = maxP === minP ? 100 : 100 * (1 - (prices[i] - minP) / (maxP - minP));
      const dScore = maxD === minD ? 100 : 100 * (1 - (days[i] - minD) / (maxD - minD));
      return { name: str(b.supplierName) || str(b.supplierId), price: prices[i], days: days[i], score: round(pScore * 0.7 + dScore * 0.3, 0), terms: str(b.terms) };
    }).sort((a, b) => b.score - a.score);
    if (bids.length === 1) findings.push(finding('warning', 'Only one bid: there is no price competition. Consider re-inviting.'));
    for (const b of ranked) if (median > 0 && b.price < median * 0.8) findings.push(finding('warning', `${b.name} is ${round(pct(median - b.price, median), 0)}% below the median price; confirm specification and quality before awarding.`));
    const best = ranked[0];
    findings.push(finding('good', `Best value: ${best.name} at ${inr(best.price)} per unit, ${best.days} days delivery (score ${best.score}/100).`));
    if (str(r.awardedTo) && str(r.awardedTo) !== best.name) findings.push(finding('info', `Awarded to ${str(r.awardedTo)}; record why it differs from the best-value bid.`));
    return {
      title: 'Bid comparison',
      summary: `${plural(bids.length, 'bid')} from ${num(r.suppliersInvited) ?? bids.length} invited. Price range ${inr(minP)}–${inr(maxP)}.`,
      findings: sortFindings(findings),
      suggestions: ['Weighting used: price 70%, delivery 30%. Add quality score from the supplier scorecard before final award.'],
      draft: { label: 'Ranking', text: ranked.map((b, i) => `${i + 1}. ${b.name} — ${inr(b.price)}/unit, ${b.days} days, score ${b.score}${b.terms ? ` (${b.terms})` : ''}`).join('\n') },
    };
  },
};

// ------------------------------------------------------------------ GRN

const grnReview: CopilotAction = {
  id: 'inspection_review',
  label: 'Receipt inspection review',
  description: 'Shortages, damage, weighbridge check and moisture/impurity against spec.',
  modelTask: 'Review this goods receipt for a seed company and recommend accept, partial accept, hold or reject, with reasons.',
  run: (r) => {
    const lines = arr(r.lineItems ?? r.line_items);
    const findings: CopilotFinding[] = [];
    let ordered = 0, received = 0, damaged = 0, accepted = 0;
    for (const l of lines) {
      const o = num(l.orderedQty) ?? 0; const rc = num(l.receivedQty) ?? 0; const dm = num(l.damagedQty) ?? 0;
      ordered += o; received += rc; damaged += dm; accepted += num(l.acceptedQty) ?? 0;
      if (o > 0 && rc < o * 0.98) findings.push(finding('warning', `${str(l.description)}: received ${rc} of ${o} ${str(l.unit)} (${round(pct(o - rc, o), 1)}% short).`));
      if (o > 0 && rc > o * 1.02) findings.push(finding('info', `${str(l.description)}: received ${rc}, more than the ${o} ordered.`));
      if (rc > 0 && dm / rc > 0.02) findings.push(finding('warning', `${str(l.description)}: ${round(pct(dm, rc), 1)}% damaged.`));
    }
    const v = obj(r.vehicleEntry);
    const g = num(v.grossWeight); const t = num(v.tareWeight); const n = num(v.netWeight);
    if (g !== null && t !== null && n !== null && Math.abs(g - t - n) > Math.max(5, n * 0.005)) findings.push(finding('critical', `Weighbridge mismatch: gross ${g} − tare ${t} = ${g - t}, recorded net ${n}.`));
    const qc = obj(r.qualityChecks);
    const m = num(qc.moisture); const ms = obj(qc.moistureSpec);
    if (m !== null && num(ms.max) !== null && m > (num(ms.max) as number)) findings.push(finding('critical', `Moisture ${m}% exceeds the ${num(ms.max)}% limit. Dry before storage or reject.`));
    const imp = num(qc.impurity); const is = obj(qc.impuritySpec);
    if (imp !== null && num(is.max) !== null && imp > (num(is.max) as number)) findings.push(finding('warning', `Impurity ${imp}% exceeds the ${num(is.max)}% limit; cleaning loss will be higher.`));
    if (!r.qualityChecks && lower(r.status) === 'pending inspection') findings.push(finding('info', 'Quality inspection not done yet.'));
    const ai = num(r.aiQualityScore);
    if (ai !== null && ai < 70) findings.push(finding('warning', `AI image grade score ${ai}/100.`));
    const crit = findings.some((f) => f.severity === 'critical');
    const warn = findings.some((f) => f.severity === 'warning');
    const decision = crit ? 'Hold or reject' : warn ? 'Partial accept' : 'Accept';
    if (!crit && !warn) findings.push(finding('good', 'Quantities and quality are within limits.'));
    const daysToInspect = daysBetween(r.receivedDate, r.inspectionDate);
    if (daysToInspect !== null && daysToInspect > 2) findings.push(finding('info', `Inspected ${daysToInspect} days after receipt; raw seed should be inspected within 48 hours.`));
    return {
      title: 'Receipt inspection review',
      summary: `Suggested decision: ${decision}. Received ${received} of ${ordered} ordered, ${damaged} damaged, ${accepted} accepted.`,
      findings: sortFindings(findings),
      suggestions: crit || warn ? ['Record the shortage or rejection on the GRN so the invoice is matched to accepted quantity only.', `Raise a supplier NCR against ${str(r.supplier) || 'the supplier'} if the deviation is confirmed.`] : [],
    };
  },
};

export const PROCUREMENT_TYPES: CopilotRecordType[] = [
  { key: 'procurement.purchase_order', label: 'Purchase order', module: 'Procurement', actions: [poPriceCheck, poDeliveryRisk] },
  { key: 'procurement.supplier', label: 'Supplier', module: 'Procurement', actions: [supplierRisk] },
  { key: 'procurement.rfq', label: 'RFQ', module: 'Procurement', actions: [rfqCompare] },
  { key: 'procurement.grn', label: 'Goods receipt', module: 'Procurement', actions: [grnReview] },
];

