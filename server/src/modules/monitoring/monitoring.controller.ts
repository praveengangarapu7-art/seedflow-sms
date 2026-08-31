import type { Request, Response } from 'express';
import * as monitoringService from './monitoring.service';

function parseHoursParam(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

export async function reportFrontendError(req: Request, res: Response): Promise<void> {
  await monitoringService.logError({
    source: 'frontend',
    level: req.body?.level === 'warning' ? 'warning' : 'error',
    message: String(req.body?.message ?? 'Unknown frontend error'),
    stackTrace: req.body?.stackTrace,
    route: req.body?.route,
    userEmail: req.user?.email,
    context: req.body?.context,
  });
  res.status(201).json({ success: true, data: null });
}

export async function listErrors(req: Request, res: Response): Promise<void> {
  const { source, windowHours } = req.query;
  const data = await monitoringService.listErrorLogs({
    source: typeof source === 'string' ? source : undefined,
    windowHours: parseHoursParam(windowHours),
  });
  res.json({ success: true, data });
}

export async function apiPerformance(req: Request, res: Response): Promise<void> {
  const data = await monitoringService.getApiPerformance(parseHoursParam(req.query.windowHours));
  res.json({ success: true, data });
}

export async function failedOperations(req: Request, res: Response): Promise<void> {
  const data = await monitoringService.getFailedOperations(parseHoursParam(req.query.windowHours));
  res.json({ success: true, data });
}

export async function userActivity(req: Request, res: Response): Promise<void> {
  const data = await monitoringService.getUserActivitySummary(parseHoursParam(req.query.windowHours));
  res.json({ success: true, data });
}

export async function dataConsistency(_req: Request, res: Response): Promise<void> {
  const data = await monitoringService.getDataConsistencySummary();
  res.json({ success: true, data });
}

export async function anomalies(_req: Request, res: Response): Promise<void> {
  const data = await monitoringService.getBusinessMetricAnomalies();
  res.json({ success: true, data });
}
