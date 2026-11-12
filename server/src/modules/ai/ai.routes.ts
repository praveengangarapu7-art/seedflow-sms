import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { ValidationError } from '../../errors';
import { aiStatus, analyzePhoto, forecastReport, labRiskReport } from './ai.service';
import { ensureKnowledgeIndexed, knowledgeStats, reindexKnowledge, search as searchKnowledge } from './knowledge.service';
import { allModuleInsights, isModuleKey, moduleInsights } from './moduleInsights';
import { copilotCatalog, runCopilot } from './recordCopilot';

/**
 * AI Center endpoints. Read-only over existing data (like the assistant), so
 * any authenticated role may call them; photo analysis stores nothing.
 */
export const aiRouter = Router();

aiRouter.use(requireAuth);

aiRouter.get(
  '/status',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: { ...aiStatus(), knowledge: await knowledgeStats() } });
  }),
);

// Retrieval endpoints behind the assistant, exposed so the AI Center can show
// what the knowledge base holds and re-index it after records change.
aiRouter.get(
  '/knowledge/search',
  asyncHandler(async (req: Request, res: Response) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) throw new ValidationError('q is required');
    await ensureKnowledgeIndexed();
    res.json({ success: true, data: await searchKnowledge(q, 6) });
  }),
);

aiRouter.post(
  '/knowledge/reindex',
  requireRole('Admin'),
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: await reindexKnowledge(), message: 'Knowledge base re-indexed' });
  }),
);

aiRouter.get(
  '/lab-risk',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: await labRiskReport() });
  }),
);

aiRouter.get(
  '/forecasts',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: await forecastReport() });
  }),
);

aiRouter.get(
  '/insights',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: await allModuleInsights() });
  }),
);

aiRouter.get(
  '/insights/:module',
  asyncHandler(async (req: Request, res: Response) => {
    const key = String(req.params.module);
    if (!isModuleKey(key)) throw new ValidationError(`Unknown module "${key}"`);
    res.json({ success: true, data: await moduleInsights(key, { narrate: req.query.briefing === 'true' }) });
  }),
);

aiRouter.post(
  '/photo-analysis',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await analyzePhoto(req.body ?? {}) });
  }),
);

// Record-level AI: the catalogue of actions per record type, and running one
// over the record a detail page is showing.
aiRouter.get(
  '/copilot/types',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: copilotCatalog() });
  }),
);

aiRouter.post(
  '/copilot',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await runCopilot(req.body ?? {}) });
  }),
);
