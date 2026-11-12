import type { Request, Response } from 'express';
import * as capaService from './capa.service';
import * as complianceService from './compliance.service';
import * as complaintsService from './complaints.service';
import { getQualityDashboard } from './dashboard.service';
import * as holdsService from './holds.service';
import * as ncrService from './ncr.service';
import * as sopService from './sop.service';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const bool = (v: unknown): boolean | undefined => (v === 'true' ? true : v === 'false' ? false : undefined);
const body = (req: Request): Record<string, unknown> => (req.body && typeof req.body === 'object' ? req.body : {});
const ok = (res: Response, data: unknown, message?: string, status = 200) =>
  res.status(status).json({ success: true, data, ...(message ? { message } : {}) });

// ---- dashboard & holds
export const dashboard = async (_req: Request, res: Response) => ok(res, await getQualityDashboard());
export const listHolds = async (req: Request, res: Response) =>
  ok(res, await holdsService.listHolds({ active: bool(req.query.active), seedLotId: str(req.query.seedLotId) }));
export const placeHold = async (req: Request, res: Response) =>
  ok(res, await holdsService.placeManualHold(body(req), req.user!), 'Seed lot placed on quality hold', 201);
export const releaseHold = async (req: Request, res: Response) =>
  ok(res, await holdsService.releaseHold(req.params.id, body(req), req.user!), 'Quality hold released');
export const lotImpact = async (req: Request, res: Response) => ok(res, await holdsService.getLotImpact(req.params.lotId));

// ---- SOPs
export const listSops = async (req: Request, res: Response) =>
  ok(res, await sopService.listSops({ department: str(req.query.department), reviewStatus: str(req.query.reviewStatus) }));
export const pendingAcknowledgements = async (req: Request, res: Response) =>
  ok(res, await sopService.listPendingAcknowledgements(req.user!));
export const getSop = async (req: Request, res: Response) => ok(res, await sopService.getSop(req.params.id, req.user!));
export const createSop = async (req: Request, res: Response) => {
  const data = await sopService.createSop(body(req), req.user!);
  ok(res, data, `${data.document.sop_code} created as draft`, 201);
};
export const reviseSop = async (req: Request, res: Response) =>
  ok(res, await sopService.reviseSop(req.params.id, body(req), req.user!), 'Revision started', 201);
export const updateDraft = async (req: Request, res: Response) =>
  ok(res, await sopService.updateDraft(req.params.id, body(req), req.user!), 'Draft updated');
export const submitSop = async (req: Request, res: Response) =>
  ok(res, await sopService.submitForReview(req.params.id, req.user!), 'Submitted for review');
export const approveSop = async (req: Request, res: Response) =>
  ok(res, await sopService.approveSop(req.params.id, req.user!), 'SOP approved and now effective');
export const rejectSop = async (req: Request, res: Response) =>
  ok(res, await sopService.rejectSop(req.params.id, body(req), req.user!), 'SOP version rejected');
export const retireSop = async (req: Request, res: Response) =>
  ok(res, await sopService.retireSop(req.params.id, body(req), req.user!), 'SOP retired');
export const acknowledgeSop = async (req: Request, res: Response) =>
  ok(res, await sopService.acknowledgeSop(req.params.id, req.user!), 'Acknowledgement recorded');

// ---- NCRs
export const listNcrs = async (req: Request, res: Response) =>
  ok(
    res,
    await ncrService.listNcrs({
      status: str(req.query.status),
      severity: str(req.query.severity),
      department: str(req.query.department),
      seedLotId: str(req.query.seedLotId),
      overdue: bool(req.query.overdue),
    }),
  );
export const getNcr = async (req: Request, res: Response) => ok(res, await ncrService.getNcr(req.params.id));
export const createNcr = async (req: Request, res: Response) => {
  const data = await ncrService.createNcr(body(req), req.user!);
  ok(res, data, `${data.ncr.ncr_code} raised${data.holdPlaced ? ' — seed lot placed on quality hold' : ''}`, 201);
};
export const updateNcr = async (req: Request, res: Response) =>
  ok(res, await ncrService.updateNcr(req.params.id, body(req), req.user!), 'Non-conformance updated');
export const closeNcr = async (req: Request, res: Response) =>
  ok(res, await ncrService.closeNcr(req.params.id, body(req), req.user!), 'Non-conformance closed');
export const cancelNcr = async (req: Request, res: Response) =>
  ok(res, await ncrService.cancelNcr(req.params.id, body(req), req.user!), 'Non-conformance cancelled');

// ---- CAPAs
export const listCapas = async (req: Request, res: Response) =>
  ok(
    res,
    await capaService.listCapas({
      status: str(req.query.status),
      ncrId: str(req.query.ncrId),
      complaintId: str(req.query.complaintId),
      owner: str(req.query.owner),
      overdue: bool(req.query.overdue),
    }),
  );
export const getCapa = async (req: Request, res: Response) => ok(res, await capaService.getCapa(req.params.id));
export const createCapa = async (req: Request, res: Response) => {
  const data = await capaService.createCapa(body(req), req.user!);
  ok(res, data, `${data.capa_code} created`, 201);
};
export const startCapa = async (req: Request, res: Response) => ok(res, await capaService.startCapa(req.params.id, req.user!), 'CAPA started');
export const implementCapa = async (req: Request, res: Response) =>
  ok(res, await capaService.implementCapa(req.params.id, body(req), req.user!), 'CAPA marked implemented — awaiting verification');
export const verifyCapa = async (req: Request, res: Response) =>
  ok(res, await capaService.verifyCapa(req.params.id, body(req), req.user!), 'Effectiveness verification recorded');
export const cancelCapa = async (req: Request, res: Response) =>
  ok(res, await capaService.cancelCapa(req.params.id, body(req), req.user!), 'CAPA cancelled');

// ---- Complaints
export const listComplaints = async (req: Request, res: Response) =>
  ok(res, await complaintsService.listComplaints({ status: str(req.query.status), severity: str(req.query.severity), seedLotId: str(req.query.seedLotId) }));
export const getComplaint = async (req: Request, res: Response) => ok(res, await complaintsService.getComplaint(req.params.id));
export const createComplaint = async (req: Request, res: Response) => {
  const data = await complaintsService.createComplaint(body(req), req.user!);
  const extra = data.ncr ? ` — ${data.ncr.ncr_code} raised${data.hold ? ', seed lot placed on quality hold' : ''}` : '';
  ok(res, data, `${data.complaint.complaint_code} logged${extra}`, 201);
};
export const investigateComplaint = async (req: Request, res: Response) =>
  ok(res, await complaintsService.investigateComplaint(req.params.id, body(req), req.user!), 'Complaint under investigation');
export const resolveComplaint = async (req: Request, res: Response) =>
  ok(res, await complaintsService.resolveComplaint(req.params.id, body(req), req.user!), 'Complaint resolved');
export const closeComplaint = async (req: Request, res: Response) =>
  ok(res, await complaintsService.closeComplaint(req.params.id, req.user!), 'Complaint closed');

// ---- compliance register
const requirementFilters = (req: Request) => ({
  status: str(req.query.status),
  category: str(req.query.category),
  department: str(req.query.department),
  risk: str(req.query.risk),
  overdue: bool(req.query.overdue),
  q: str(req.query.q),
});
export const complianceDashboard = async (_req: Request, res: Response) => ok(res, await complianceService.getComplianceDashboard());
export const listRequirements = async (req: Request, res: Response) =>
  ok(res, await complianceService.listRequirements(requirementFilters(req)));
export const gapReport = async (req: Request, res: Response) => {
  const csv = await complianceService.buildGapReportCsv(requirementFilters(req));
  res
    .status(200)
    .type('text/csv; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="seed-compliance-gap-report-${new Date().toISOString().slice(0, 10)}.csv"`)
    .send(csv);
};
export const getRequirement = async (req: Request, res: Response) => ok(res, await complianceService.getRequirement(req.params.id));
export const createRequirement = async (req: Request, res: Response) => {
  const data = await complianceService.createRequirement(body(req), req.user!);
  ok(res, data, `${data.req_code} added to the register`, 201);
};
export const updateRequirement = async (req: Request, res: Response) =>
  ok(res, await complianceService.updateRequirement(req.params.id, body(req), req.user!), 'Requirement updated');
export const assessRequirement = async (req: Request, res: Response) =>
  ok(res, await complianceService.assessRequirement(req.params.id, body(req), req.user!), 'Assessment recorded');
export const addEvidence = async (req: Request, res: Response) =>
  ok(res, await complianceService.addEvidence(req.params.id, body(req), req.user!), 'Evidence added', 201);
export const removeEvidence = async (req: Request, res: Response) =>
  ok(res, await complianceService.removeEvidence(req.params.id, req.params.evidenceId, req.user!), 'Evidence removed');
export const raiseGapNcr = async (req: Request, res: Response) => {
  const data = await complianceService.raiseNcrForGap(req.params.id, req.user!);
  ok(res, data, `${data.ncr.ncr_code} raised for this gap`, 201);
};
export const loadStarterTemplate = async (req: Request, res: Response) => {
  const data = await complianceService.loadStarterTemplate(req.user!);
  ok(res, data, `${data.added} starter requirement(s) added`, 201);
};
