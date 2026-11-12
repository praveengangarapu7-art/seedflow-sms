import { Router } from 'express';
import { asyncHandler as h } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as c from './quality.controller';

export const qualityRouter = Router();

qualityRouter.use(requireAuth);

// Authority model (backend roles):
//   any signed-in role  — read everything, raise NCRs, log complaints, acknowledge SOPs
//                         (a problem noticed on the warehouse floor must be reportable
//                         by whoever notices it)
//   Admin, Inspector    — author SOPs, investigate, own CAPAs, place lot holds
//   Admin only          — approve/reject/retire SOPs, close NCRs and complaints,
//                         verify CAPA effectiveness, release lot holds, cancel
const QUALITY_STAFF = ['Admin', 'Inspector'] as const;
const ADMIN = ['Admin'] as const;

qualityRouter.get('/dashboard', h(c.dashboard));

// Lot holds & impact tracing
qualityRouter.get('/holds', h(c.listHolds));
qualityRouter.post('/holds', requireRole(...QUALITY_STAFF), h(c.placeHold));
qualityRouter.post('/holds/:id/release', requireRole(...ADMIN), h(c.releaseHold));
qualityRouter.get('/lots/:lotId/impact', h(c.lotImpact));

// SOP register
qualityRouter.get('/sops', h(c.listSops));
qualityRouter.get('/sops/pending-acknowledgement', h(c.pendingAcknowledgements));
qualityRouter.get('/sops/:id', h(c.getSop));
qualityRouter.post('/sops', requireRole(...QUALITY_STAFF), h(c.createSop));
qualityRouter.post('/sops/:id/revise', requireRole(...QUALITY_STAFF), h(c.reviseSop));
qualityRouter.patch('/sops/:id/draft', requireRole(...QUALITY_STAFF), h(c.updateDraft));
qualityRouter.post('/sops/:id/submit', requireRole(...QUALITY_STAFF), h(c.submitSop));
qualityRouter.post('/sops/:id/approve', requireRole(...ADMIN), h(c.approveSop));
qualityRouter.post('/sops/:id/reject', requireRole(...ADMIN), h(c.rejectSop));
qualityRouter.post('/sops/:id/retire', requireRole(...ADMIN), h(c.retireSop));
qualityRouter.post('/sops/:id/acknowledge', h(c.acknowledgeSop));

// Non-conformances
qualityRouter.get('/ncrs', h(c.listNcrs));
qualityRouter.get('/ncrs/:id', h(c.getNcr));
qualityRouter.post('/ncrs', h(c.createNcr));
qualityRouter.patch('/ncrs/:id', requireRole(...QUALITY_STAFF), h(c.updateNcr));
qualityRouter.post('/ncrs/:id/close', requireRole(...ADMIN), h(c.closeNcr));
qualityRouter.post('/ncrs/:id/cancel', requireRole(...ADMIN), h(c.cancelNcr));

// CAPAs
qualityRouter.get('/capas', h(c.listCapas));
qualityRouter.get('/capas/:id', h(c.getCapa));
qualityRouter.post('/capas', requireRole(...QUALITY_STAFF), h(c.createCapa));
// start/implement are owner-or-Admin, enforced in the service (needs the CAPA row).
qualityRouter.post('/capas/:id/start', requireRole(...QUALITY_STAFF), h(c.startCapa));
qualityRouter.post('/capas/:id/implement', requireRole(...QUALITY_STAFF), h(c.implementCapa));
qualityRouter.post('/capas/:id/verify', requireRole(...ADMIN), h(c.verifyCapa));
qualityRouter.post('/capas/:id/cancel', requireRole(...ADMIN), h(c.cancelCapa));

// Complaints
qualityRouter.get('/complaints', h(c.listComplaints));
qualityRouter.get('/complaints/:id', h(c.getComplaint));
qualityRouter.post('/complaints', h(c.createComplaint));
qualityRouter.post('/complaints/:id/investigate', requireRole(...QUALITY_STAFF), h(c.investigateComplaint));
qualityRouter.post('/complaints/:id/resolve', requireRole(...QUALITY_STAFF), h(c.resolveComplaint));
qualityRouter.post('/complaints/:id/close', requireRole(...ADMIN), h(c.closeComplaint));

// Compliance register — same authority model: anyone reads, quality staff assess,
// Admin loads the starter template.
qualityRouter.get('/compliance/dashboard', h(c.complianceDashboard));
qualityRouter.get('/compliance/report.csv', h(c.gapReport));
qualityRouter.get('/compliance/requirements', h(c.listRequirements));
qualityRouter.get('/compliance/requirements/:id', h(c.getRequirement));
qualityRouter.post('/compliance/requirements', requireRole(...QUALITY_STAFF), h(c.createRequirement));
qualityRouter.post('/compliance/template/seed-company', requireRole(...ADMIN), h(c.loadStarterTemplate));
qualityRouter.put('/compliance/requirements/:id', requireRole(...QUALITY_STAFF), h(c.updateRequirement));
qualityRouter.post('/compliance/requirements/:id/assess', requireRole(...QUALITY_STAFF), h(c.assessRequirement));
qualityRouter.post('/compliance/requirements/:id/evidence', requireRole(...QUALITY_STAFF), h(c.addEvidence));
qualityRouter.delete('/compliance/requirements/:id/evidence/:evidenceId', requireRole(...QUALITY_STAFF), h(c.removeEvidence));
qualityRouter.post('/compliance/requirements/:id/raise-ncr', requireRole(...QUALITY_STAFF), h(c.raiseGapNcr));
