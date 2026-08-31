import type { Request, Response } from 'express';
import * as privacyService from './privacy.service';

export async function exportFarmer(req: Request, res: Response): Promise<void> {
  const format = req.query.format === 'csv' ? 'csv' : 'json';
  const data = await privacyService.exportFarmerData(req.params.id, req.user!);

  if (format === 'csv') {
    const sections = privacyService.toCsvSections(data);
    const combined = sections.map((s) => `## ${s.name}\n${s.csv || '(no records)'}`).join('\n\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="farmer-${req.params.id}-export.csv"`);
    res.send(combined);
    return;
  }

  res.setHeader('Content-Disposition', `attachment; filename="farmer-${req.params.id}-export.json"`);
  res.json({ success: true, data });
}

export async function anonymizeFarmer(req: Request, res: Response): Promise<void> {
  await privacyService.anonymizeFarmer(req.params.id, req.body?.reason, req.user!);
  res.json({ success: true, data: null, message: 'Farmer anonymized' });
}

export async function listRetentionPolicies(_req: Request, res: Response): Promise<void> {
  const data = await privacyService.listRetentionPolicies();
  res.json({ success: true, data });
}

export async function updateRetentionPolicy(req: Request, res: Response): Promise<void> {
  const data = await privacyService.updateRetentionPolicy(req.params.entityType, req.body, req.user!);
  res.json({ success: true, data, message: 'Retention policy updated' });
}

export async function retentionCandidates(_req: Request, res: Response): Promise<void> {
  const data = await privacyService.scanRetentionCandidates();
  res.json({ success: true, data });
}

export async function complianceAudit(_req: Request, res: Response): Promise<void> {
  const data = await privacyService.getComplianceAudit();
  res.json({ success: true, data });
}

export async function accessLogs(req: Request, res: Response): Promise<void> {
  const { entityId, windowHours } = req.query;
  const data = await privacyService.listDataAccessLogs({
    entityId: typeof entityId === 'string' ? entityId : undefined,
    windowHours: typeof windowHours === 'string' ? Number(windowHours) : undefined,
  });
  res.json({ success: true, data });
}
