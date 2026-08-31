import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { listAuditLogs } from './auditLogs.service';

export const auditLogsRouter = Router();

// Audit trail visibility is sensitive: only platform Admins and Inspectors
// (the compliance/inspection role) can read it.
auditLogsRouter.use(requireAuth, requireRole('Admin', 'Inspector'));

auditLogsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { entityType, entityId, limit, offset } = req.query;
    const data = await listAuditLogs({
      entityType: typeof entityType === 'string' ? entityType : undefined,
      entityId: typeof entityId === 'string' ? entityId : undefined,
      limit: typeof limit === 'string' ? Number(limit) : undefined,
      offset: typeof offset === 'string' ? Number(offset) : undefined,
    });
    res.json({ success: true, data });
  }),
);
