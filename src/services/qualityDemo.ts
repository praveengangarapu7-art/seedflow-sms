/**
 * Offline demo set for the Quality module.
 *
 * Built from qualityDemo.json — the same file the server's `seed:quality`
 * script loads into Postgres — so the pages show the same SOPs, NCRs, CAPAs,
 * complaints, holds and compliance picture whether they read the database or
 * fall back to this. Dates in the JSON are day offsets from today, so overdue
 * items stay overdue and reviews stay due however long ago this was written.
 *
 * Read-only: writes never reach here (the client queues them and echoes the
 * submission), and the shapes below mirror the server's list/detail responses.
 */
import type {
  CapaItem,
  ComplaintDetail,
  ComplaintItem,
  LotHold,
  LotImpact,
  NcrDetail,
  NcrListItem,
  PendingSopAcknowledgement,
  QualityDashboardData,
  QualityDepartment,
  RequirementDetail,
  RequirementItem,
  SopDetail,
  SopListItem,
  SopVersion,
  ComplianceDashboardData,
} from './seedLotRealtimeClient';
import raw from './qualityDemo.json';

/* eslint-disable @typescript-eslint/no-explicit-any */
const data = raw as any;

export interface DemoLotRef {
  id: string;
  lot_code: string;
  crop: string;
  variety: string;
  stage: string;
  status: string;
  testing_status: string;
  quantity_total: number;
  quantity_allocated: number;
  unit: string;
}

const DEPARTMENTS: QualityDepartment[] = [
  'procurement', 'production', 'rd', 'laboratory', 'warehouse', 'logistics', 'operations', 'quality', 'hr_training',
];
const OPEN_NCR = ['open', 'investigating'];
const OPEN_CAPA = ['open', 'in_progress', 'implemented'];
const OPEN_COMPLAINT = ['received', 'investigating'];

const MS_DAY = 86_400_000;
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const iso = (offset: number) => new Date(Date.now() + offset * MS_DAY).toISOString();
const date = (offset: number) => iso(offset).slice(0, 10);
const orNull = <T,>(v: T | null | undefined) => (v === undefined ? null : v);
const isPast = (offset: number | null | undefined) => offset !== null && offset !== undefined && offset < 0;
const fakeId = (kind: number, n: number) => `c${kind}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const year = new Date().getFullYear();
const yr = (code: string) => code.replace(/-\d{4}-/, `-${year}-`);

interface Built {
  sops: { list: SopListItem; detail: SopDetail }[];
  ncrs: NcrListItem[];
  capas: CapaItem[];
  complaints: ComplaintItem[];
  holds: LotHold[];
  requirements: { item: RequirementItem; evidence: RequirementDetail['evidence'] }[];
}

let built: Built | null = null;
let builtOn = '';
let lotLookup: (code: string) => DemoLotRef | undefined = () => undefined;

function lotFor(ref: string | null | undefined): DemoLotRef | null {
  if (!ref) return null;
  const code = data.lots[ref]?.demo as string | undefined;
  return (code && lotLookup(code)) || null;
}

function build(): Built {
  const admin = data.users.admin as string;

  // ---- SOPs
  const sops = (data.sops as any[]).map((s, i) => {
    const docId = fakeId(1, i + 1);
    const versions: SopVersion[] = (s.versions as any[]).map((v) => ({
      id: fakeId(2, (i + 1) * 10 + v.n),
      sop_id: docId,
      version_number: v.n,
      title: s.title,
      content: v.content || `Superseded revision ${v.n} of ${s.title}. See the current version for the procedure in force.`,
      change_summary: v.summary,
      status: v.status,
      created_by: v.created_by,
      submitted_at: v.submitted_offset !== null ? iso(v.submitted_offset) : null,
      approved_by: v.status === 'effective' || v.status === 'superseded' ? v.approved_by : null,
      approved_at: v.status === 'effective' || v.status === 'superseded' ? iso(v.effective_offset) : null,
      rejection_reason: null,
      effective_date: v.status === 'effective' || v.status === 'superseded' ? date(v.effective_offset) : null,
      next_review_date: v.status === 'effective' || v.status === 'superseded' ? date(v.next_review_offset) : null,
      acknowledgement_count: (v.acks as string[]).length,
    }));
    const eff = (s.versions as any[]).find((v) => v.status === 'effective');
    const open = (s.versions as any[]).find((v) => v.status === 'draft' || v.status === 'in_review');
    const reviewOffset: number | null = eff ? eff.next_review_offset : null;
    const reviewStatus: SopListItem['review_status'] = !eff
      ? 'not_effective'
      : reviewOffset! < 0
        ? 'overdue'
        : reviewOffset! <= 30
          ? 'due_soon'
          : 'current';
    const list: SopListItem = {
      id: docId,
      sop_code: s.code,
      title: s.title,
      department: s.department,
      owner_email: s.owner,
      review_interval_months: s.interval,
      effective_version: eff ? eff.n : null,
      effective_date: eff ? date(eff.effective_offset) : null,
      next_review_date: eff ? date(eff.next_review_offset) : null,
      approved_by: eff ? eff.approved_by : null,
      open_version: open ? open.n : null,
      open_version_status: open ? open.status : null,
      review_status: reviewStatus,
      acknowledgement_count: eff ? (eff.acks as string[]).length : 0,
    };
    const detail: SopDetail = {
      document: { id: docId, sop_code: s.code, title: s.title, department: s.department, owner_email: s.owner, review_interval_months: s.interval },
      versions: [...versions].sort((a, b) => b.version_number - a.version_number),
      acknowledgements: (s.versions as any[]).flatMap((v, vi) =>
        (v.acks as string[]).map((email) => ({
          sop_version_id: versions[vi].id,
          user_email: email,
          acknowledged_at: iso((v.effective_offset ?? -30) + 3),
        })),
      ),
      acknowledgedByMe: !!eff && (eff.acks as string[]).includes(admin),
    };
    return { list, detail };
  });
  const sopByCode = new Map(sops.map((s) => [s.list.sop_code, s.list]));

  // ---- Complaints, NCRs (two passes: they reference each other)
  const complaintIds: Record<string, string> = {};
  (data.complaints as any[]).forEach((c, i) => (complaintIds[c.key] = fakeId(3, i + 1)));
  const ncrIds: Record<string, string> = {};
  (data.ncrs as any[]).forEach((n, i) => (ncrIds[n.key] = fakeId(4, i + 1)));
  const capaIds: Record<string, string> = {};
  (data.capas as any[]).forEach((c, i) => (capaIds[c.key] = fakeId(5, i + 1)));

  const ncrCodeByKey: Record<string, string> = Object.fromEntries((data.ncrs as any[]).map((n) => [n.key, yr(n.code)]));
  const complaintCodeByKey: Record<string, string> = Object.fromEntries((data.complaints as any[]).map((c) => [c.key, yr(c.code)]));

  const capas: CapaItem[] = (data.capas as any[]).map((c) => ({
    id: capaIds[c.key],
    capa_code: yr(c.code),
    ncr_id: c.ncr ? ncrIds[c.ncr] : null,
    ncr_code: c.ncr ? ncrCodeByKey[c.ncr] : null,
    complaint_id: c.complaint ? complaintIds[c.complaint] : null,
    complaint_code: c.complaint ? complaintCodeByKey[c.complaint] : null,
    action_type: c.type,
    title: c.title,
    description: c.description,
    owner_email: c.owner,
    due_date: date(c.due),
    status: c.status,
    implementation_notes: orNull(c.implementation_notes),
    implemented_at: c.implemented !== null ? iso(c.implemented) : null,
    verified_by: orNull(c.verified_by),
    verified_at: c.verified !== null ? iso(c.verified) : null,
    effectiveness_result: orNull(c.result),
    effectiveness_notes: orNull(c.verification_notes),
    verification_count: c.verification_count,
    is_overdue: OPEN_CAPA.includes(c.status) && isPast(c.due),
    created_by: c.created_by,
    created_at: iso(c.created),
  }));

  const ncrs: NcrListItem[] = (data.ncrs as any[]).map((n) => {
    const lot = lotFor(n.lot);
    const mine = capas.filter((c) => c.ncr_id === ncrIds[n.key]);
    return {
      id: ncrIds[n.key],
      ncr_code: yr(n.code),
      title: n.title,
      description: n.description,
      department: n.department,
      source: n.source,
      severity: n.severity,
      seed_lot_id: lot?.id ?? null,
      lot_code: lot?.lot_code ?? null,
      status: n.status,
      raised_by: n.raised_by,
      assigned_to: orNull(n.assigned),
      due_date: date(n.due),
      root_cause: orNull(n.root),
      closure_notes: orNull(n.closure),
      closed_by: orNull(n.closed_by),
      closed_at: n.closed !== null ? iso(n.closed) : null,
      complaint_id: n.complaint ? complaintIds[n.complaint] : null,
      is_overdue: OPEN_NCR.includes(n.status) && isPast(n.due),
      capa_count: mine.length,
      open_capa_count: mine.filter((c) => OPEN_CAPA.includes(c.status)).length,
      created_at: iso(n.created),
    };
  });

  const complaints: ComplaintItem[] = (data.complaints as any[]).map((c) => {
    const lot = lotFor(c.lot);
    const ncrKey = c.ncr as string | null;
    const endOffset = c.closed ?? c.resolved ?? 0;
    return {
      id: complaintIds[c.key],
      complaint_code: yr(c.code),
      source: c.source,
      complainant_name: c.name,
      complainant_contact: orNull(c.contact),
      seed_lot_id: lot?.id ?? null,
      lot_code: lot?.lot_code ?? null,
      ncr_id: ncrKey ? ncrIds[ncrKey] : null,
      ncr_code: ncrKey ? ncrCodeByKey[ncrKey] : null,
      title: c.title,
      description: c.description,
      severity: c.severity,
      status: c.status,
      received_date: date(c.received),
      assigned_to: orNull(c.assigned),
      root_cause: orNull(c.root),
      resolution: orNull(c.resolution),
      recall_recommended: c.recall,
      resolved_at: c.resolved !== null ? iso(c.resolved) : null,
      closed_at: c.closed !== null ? iso(c.closed) : null,
      age_days: Math.max(0, Math.round(endOffset - c.received)),
    };
  });

  const holds: LotHold[] = (data.holds as any[])
    .map((h, i) => {
      const lot = lotFor(h.lot);
      if (!lot) return null;
      const sourceId = h.source === 'ncr' ? ncrIds[h.source_key] : complaintIds[h.source_key];
      return {
        id: fakeId(6, i + 1),
        seed_lot_id: lot.id,
        lot_code: lot.lot_code,
        crop: lot.crop,
        variety: lot.variety,
        reason: h.reason,
        source_type: h.source,
        source_id: sourceId ?? null,
        placed_by: h.placed_by,
        placed_at: iso(h.placed),
        released_by: orNull(h.released_by),
        released_at: h.released !== null ? iso(h.released) : null,
        release_notes: orNull(h.release_notes),
      } as LotHold;
    })
    .filter((h): h is LotHold => h !== null);

  // ---- Compliance register
  const requirements = (data.starter as any[]).map((t, idx) => {
    const a = (data.requirements as any[]).find((r) => r.i === idx);
    const status = a?.status ?? 'not_assessed';
    const targetOffset: number | null = a?.target ?? null;
    const gap = status === 'partially_compliant' || status === 'non_compliant';
    const ncrKey: string | null = a?.ncr ?? null;
    const item: RequirementItem = {
      id: fakeId(7, idx + 1),
      req_code: `REQ-${String(idx + 1).padStart(3, '0')}`,
      regulation: t.regulation,
      reference: null,
      title: t.title,
      description: t.description,
      category: t.category,
      department: t.department,
      status,
      current_status: orNull(a?.current),
      gap: orNull(a?.gap),
      risk: orNull(a?.risk),
      corrective_action: orNull(a?.action),
      responsible_email: orNull(a?.responsible),
      target_date: targetOffset !== null ? date(targetOffset) : null,
      sop_id: a?.sop ? (sopByCode.get(a.sop)?.id ?? null) : null,
      sop_code: a?.sop ?? null,
      ncr_id: ncrKey ? ncrIds[ncrKey] : null,
      ncr_code: ncrKey ? ncrCodeByKey[ncrKey] : null,
      ncr_status: ncrKey ? (ncrs.find((n) => n.id === ncrIds[ncrKey])?.status ?? null) : null,
      assessed_by: status === 'not_assessed' ? null : (a?.responsible ?? data.users.inspector),
      assessed_at: status === 'not_assessed' ? null : iso(-14),
      next_review_date: a?.review !== undefined && a?.review !== null ? date(a.review) : null,
      evidence_count: (a?.evidence ?? []).length,
      is_overdue: gap && isPast(targetOffset),
      review_overdue: false,
    };
    const evidence = ((a?.evidence ?? []) as [string, string][]).map(([title, reference], k) => ({
      id: fakeId(8, idx * 10 + k + 1),
      title,
      reference,
      description: null,
      added_by: data.users.inspector as string,
      added_at: iso(-14),
    }));
    return { item, evidence };
  });

  return { sops, ncrs, capas, complaints, holds, requirements };
}

function ensureBuilt(): Built {
  const today = date(0);
  if (!built || builtOn !== today) {
    built = build();
    builtOn = today;
  }
  return built;
}

// ---- dashboards

function dashboard(b: Built): QualityDashboardData {
  const today = todayStart().getTime();
  const openNcr = b.ncrs.filter((n) => OPEN_NCR.includes(n.status));
  const closedNcr = b.ncrs.filter((n) => n.status === 'closed');
  const days = (from: string, to: string | null) => (new Date(to ?? from).getTime() - new Date(from).getTime()) / MS_DAY;
  const within30 = (stamp: string | null) => !!stamp && new Date(stamp).getTime() >= today - 30 * MS_DAY;
  const openCapa = b.capas.filter((c) => OPEN_CAPA.includes(c.status));
  const openCmp = b.complaints.filter((c) => OPEN_COMPLAINT.includes(c.status));
  const effective = b.sops.filter((s) => s.list.effective_version !== null);
  const resolved90 = b.complaints.filter((c) => c.resolved_at && new Date(c.resolved_at).getTime() >= today - 90 * MS_DAY);
  const departmentCoverage = DEPARTMENTS.map((department) => {
    const n = effective.filter((s) => s.list.department === department).length;
    return { department, effectiveSops: n, covered: n > 0 };
  });
  const covered = departmentCoverage.filter((d) => d.covered).length;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    generatedAt: new Date().toISOString(),
    nonConformances: {
      open_total: openNcr.length,
      open_critical: openNcr.filter((n) => n.severity === 'critical').length,
      open_major: openNcr.filter((n) => n.severity === 'major').length,
      open_minor: openNcr.filter((n) => n.severity === 'minor').length,
      overdue: openNcr.filter((n) => n.is_overdue).length,
      closed_last_30d: closedNcr.filter((n) => within30(n.closed_at)).length,
      avg_days_to_close: closedNcr.length ? round1(closedNcr.reduce((s, n) => s + days(n.created_at, n.closed_at), 0) / closedNcr.length) : null,
    },
    capas: {
      open_total: openCapa.length,
      overdue: openCapa.filter((c) => c.is_overdue).length,
      awaiting_verification: b.capas.filter((c) => c.status === 'implemented').length,
      closed_last_30d: b.capas.filter((c) => c.status === 'closed' && within30(c.verified_at)).length,
      failed_verification: b.capas.filter((c) => c.verification_count > 0 && c.effectiveness_result === 'ineffective').length,
      closed_total: b.capas.filter((c) => c.status === 'closed').length,
    },
    complaints: {
      open_total: openCmp.length,
      open_critical: openCmp.filter((c) => c.severity === 'critical').length,
      recall_recommended: b.complaints.filter((c) => c.recall_recommended && c.status !== 'closed').length,
      received_last_30d: b.complaints.filter((c) => new Date(c.received_date).getTime() >= today - 30 * MS_DAY).length,
      avg_days_to_resolve_90d: resolved90.length ? round1(resolved90.reduce((s, c) => s + c.age_days, 0) / resolved90.length) : null,
    },
    sops: {
      effective: effective.length,
      draft: b.sops.filter((s) => s.list.open_version_status === 'draft').length,
      in_review: b.sops.filter((s) => s.list.open_version_status === 'in_review').length,
      reviewOverdue: effective.filter((s) => s.list.review_status === 'overdue').length,
      reviewDueSoon: effective.filter((s) => s.list.review_status === 'due_soon').length,
      departmentCoverage,
      departmentsCovered: covered,
      departmentsTotal: DEPARTMENTS.length,
      coveragePercent: Math.round((covered / DEPARTMENTS.length) * 100),
    },
    holds: { active: b.holds.filter((h) => !h.released_at).length },
  };
}

function complianceDashboard(b: Built): ComplianceDashboardData {
  const items = b.requirements.map((r) => r.item);
  const count = (s: string) => items.filter((i) => i.status === s).length;
  const gaps = items.filter((i) => i.status === 'partially_compliant' || i.status === 'non_compliant');
  const categories = Array.from(new Set(items.map((i) => i.category))).sort();
  const applicable = items.length - count('not_applicable');
  const riskCount = (r: string) => gaps.filter((g) => g.risk === r).length;
  return {
    totals: {
      total: items.length,
      not_assessed: count('not_assessed'),
      compliant: count('compliant'),
      partially_compliant: count('partially_compliant'),
      non_compliant: count('non_compliant'),
      not_applicable: count('not_applicable'),
      overdue_gaps: gaps.filter((g) => g.is_overdue).length,
      gaps_without_ncr: gaps.filter((g) => !g.ncr_id).length,
      reviews_overdue: items.filter((i) => i.review_overdue).length,
    },
    assessedOfApplicable: { assessed: applicable - count('not_assessed'), applicable },
    byCategory: categories.map((category) => {
      const inCat = items.filter((i) => i.category === category);
      return {
        category,
        total: inCat.length,
        compliant: inCat.filter((i) => i.status === 'compliant').length,
        gaps: inCat.filter((i) => i.status === 'partially_compliant' || i.status === 'non_compliant').length,
        not_assessed: inCat.filter((i) => i.status === 'not_assessed').length,
      };
    }),
    openGapsByRisk: { low: riskCount('low'), medium: riskCount('medium'), high: riskCount('high'), critical: riskCount('critical') },
    nextGapsDue: [...gaps]
      .sort((a, b2) => (a.target_date ?? '').localeCompare(b2.target_date ?? ''))
      .slice(0, 5)
      .map((g) => ({
        id: g.id,
        req_code: g.req_code,
        title: g.title,
        status: g.status,
        risk: g.risk!,
        target_date: g.target_date!,
        responsible_email: g.responsible_email!,
      })),
  };
}

function lotImpact(b: Built, lotId: string): LotImpact | undefined {
  const lot = [...Object.values(data.lots as Record<string, { demo: string }>)]
    .map((l) => lotLookup(l.demo))
    .find((l) => l?.id === lotId);
  if (!lot) return undefined;
  const holds = b.holds.filter((h) => h.seed_lot_id === lotId);
  const ncrs = b.ncrs.filter((n) => n.seed_lot_id === lotId);
  const complaints = b.complaints.filter((c) => c.seed_lot_id === lotId);
  const packaged = Math.round(lot.quantity_total / 5);
  const distributed = Math.round(packaged * 0.6);
  const sold = Math.round(distributed * 0.7);
  return {
    lot: { id: lot.id, lot_code: lot.lot_code, crop: lot.crop, variety: lot.variety, stage: lot.stage, status: lot.status, testing_status: lot.testing_status, quantity_total: lot.quantity_total, quantity_allocated: lot.quantity_allocated, unit: lot.unit },
    packagingBatches: [
      { id: fakeId(9, 1), batch_code: `PKG-${lot.lot_code}-A`, unit_count: packaged, unit_size: 5, unit_of_measure: 'kg', total_quantity: packaged * 5, status: 'distributed', units_packaged: packaged, units_distributed: distributed, units_sold: sold, units_damaged: 4 },
    ],
    allocations: [
      { id: fakeId(9, 2), allocated_to: 'Sai Agro Traders', quantity: Math.round(lot.quantity_allocated / 2), status: 'active', created_at: iso(-30) },
      { id: fakeId(9, 3), allocated_to: 'Kisan Seeds Distributors', quantity: Math.round(lot.quantity_allocated / 2), status: 'active', created_at: iso(-24) },
    ],
    holds,
    nonConformances: ncrs.map((n) => ({ id: n.id, ncr_code: n.ncr_code, title: n.title, severity: n.severity, status: n.status })),
    complaints: complaints.map((c) => ({ id: c.id, complaint_code: c.complaint_code, title: c.title, severity: c.severity, status: c.status, recall_recommended: c.recall_recommended })),
    summary: {
      activeHold: holds.some((h) => !h.released_at),
      packagingBatchCount: 1,
      unitsPackaged: packaged,
      unitsDistributed: distributed,
      unitsSold: sold,
      unitsInField: sold,
      activeAllocationCount: 2,
      recipients: ['Sai Agro Traders', 'Kisan Seeds Distributors'],
      recallRecommended: complaints.some((c) => c.recall_recommended),
    },
  };
}

/**
 * Returns the demo response for a /quality/* GET, or undefined when the path
 * has no fixture. `lookup` resolves a demo lot code to its record (demoData
 * owns the lot list, so lot ids line up with the rest of the app).
 */
export function resolveQualityDemo(
  path: string,
  query: URLSearchParams,
  lookup: (code: string) => DemoLotRef | undefined,
): unknown | undefined {
  lotLookup = lookup;
  const b = ensureBuilt();
  const eq = (field: string | undefined, param: string) => !query.get(param) || field === query.get(param);

  if (path === '/quality/dashboard') return dashboard(b);

  if (path === '/quality/sops/pending-acknowledgement') {
    const out: PendingSopAcknowledgement[] = b.sops
      .filter((s) => s.list.effective_version !== null && !s.detail.acknowledgedByMe)
      .map((s) => ({
        id: s.list.id,
        sop_code: s.list.sop_code,
        title: s.list.title,
        department: s.list.department,
        version_number: s.list.effective_version!,
        effective_date: s.list.effective_date!,
      }));
    return out;
  }
  if (path === '/quality/sops') {
    return b.sops.map((s) => s.list).filter((s) => eq(s.department, 'department') && eq(s.review_status, 'reviewStatus'));
  }
  if (path.startsWith('/quality/sops/')) return b.sops.find((s) => s.list.id === path.split('/')[3])?.detail;

  if (path === '/quality/ncrs') {
    return b.ncrs.filter(
      (n) =>
        eq(n.status, 'status') && eq(n.severity, 'severity') && eq(n.department, 'department') && eq(n.seed_lot_id ?? undefined, 'seedLotId') &&
        (query.get('overdue') !== 'true' || n.is_overdue),
    );
  }
  if (path.startsWith('/quality/ncrs/')) {
    const n = b.ncrs.find((x) => x.id === path.split('/')[3]);
    if (!n) return undefined;
    const { capa_count: _c, open_capa_count: _o, ...rest } = n;
    void _c;
    void _o;
    const cmp = b.complaints.find((c) => c.id === n.complaint_id);
    const detail: NcrDetail = {
      ...rest,
      capas: b.capas.filter((c) => c.ncr_id === n.id),
      complaint: cmp ? { id: cmp.id, complaint_code: cmp.complaint_code, title: cmp.title, severity: cmp.severity, status: cmp.status } : null,
      holds: b.holds.filter((h) => h.source_type === 'ncr' && h.source_id === n.id),
    };
    return detail;
  }

  if (path === '/quality/capas') {
    return b.capas.filter(
      (c) =>
        eq(c.status, 'status') && eq(c.ncr_id ?? undefined, 'ncrId') && eq(c.complaint_id ?? undefined, 'complaintId') &&
        eq(c.owner_email, 'owner') && (query.get('overdue') !== 'true' || c.is_overdue),
    );
  }

  if (path === '/quality/complaints') {
    return b.complaints.filter((c) => eq(c.status, 'status') && eq(c.severity, 'severity') && eq(c.seed_lot_id ?? undefined, 'seedLotId'));
  }
  if (path.startsWith('/quality/complaints/')) {
    const c = b.complaints.find((x) => x.id === path.split('/')[3]);
    if (!c) return undefined;
    const ncr = b.ncrs.find((n) => n.id === c.ncr_id);
    const lot = Object.values(data.lots as Record<string, { demo: string }>)
      .map((l) => lotLookup(l.demo))
      .find((l) => l?.id === c.seed_lot_id);
    const detail: ComplaintDetail = {
      ...c,
      crop: lot?.crop ?? null,
      variety: lot?.variety ?? null,
      ncr: ncr ? { id: ncr.id, ncr_code: ncr.ncr_code, title: ncr.title, severity: ncr.severity, status: ncr.status } : null,
      capas: b.capas.filter((x) => x.complaint_id === c.id),
    };
    return detail;
  }

  if (path === '/quality/holds') {
    const active = query.get('active');
    return b.holds.filter((h) => (active === null ? true : active === 'true' ? !h.released_at : !!h.released_at) && eq(h.seed_lot_id, 'seedLotId'));
  }
  if (path.startsWith('/quality/lots/') && path.endsWith('/impact')) return lotImpact(b, path.split('/')[3]);

  if (path === '/quality/compliance/dashboard') return complianceDashboard(b);
  if (path === '/quality/compliance/requirements') {
    const q = (query.get('q') ?? '').toLowerCase();
    return b.requirements
      .map((r) => r.item)
      .filter(
        (r) =>
          eq(r.status, 'status') && eq(r.category, 'category') && eq(r.department, 'department') && eq(r.risk ?? undefined, 'risk') &&
          (query.get('overdue') !== 'true' || r.is_overdue) &&
          (!q || r.title.toLowerCase().includes(q) || r.regulation.toLowerCase().includes(q) || r.req_code.toLowerCase().includes(q)),
      );
  }
  if (path.startsWith('/quality/compliance/requirements/')) {
    const r = b.requirements.find((x) => x.item.id === path.split('/')[4]);
    if (!r) return undefined;
    const detail: RequirementDetail = {
      requirement: r.item,
      evidence: r.evidence,
      capas: b.capas
        .filter((c) => r.item.ncr_id && c.ncr_id === r.item.ncr_id)
        .map((c) => ({ id: c.id, capa_code: c.capa_code, title: c.title, action_type: c.action_type, status: c.status, owner_email: c.owner_email, due_date: c.due_date })),
    };
    return detail;
  }
  return undefined;
}
