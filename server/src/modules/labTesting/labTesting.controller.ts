import type { Request, Response } from 'express';
import * as labTestingService from './labTesting.service';

export async function submit(req: Request, res: Response): Promise<void> {
  const data = await labTestingService.submitSampleBatch(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Sample batch submitted to lab' });
}

export async function list(req: Request, res: Response): Promise<void> {
  const { seedLotId, labOrganizationId, status } = req.query;
  const data = await labTestingService.listSubmissions({
    seedLotId: typeof seedLotId === 'string' ? seedLotId : undefined,
    labOrganizationId: typeof labOrganizationId === 'string' ? labOrganizationId : undefined,
    status: typeof status === 'string' ? status : undefined,
  });
  res.json({ success: true, data });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const data = await labTestingService.getSubmissionById(req.params.id);
  res.json({ success: true, data });
}

export async function recordResult(req: Request, res: Response): Promise<void> {
  const data = await labTestingService.recordTestResult(req.params.id, req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Test result recorded' });
}

export async function bulkUpload(req: Request, res: Response): Promise<void> {
  const rows = Array.isArray(req.body?.results) ? req.body.results : [];
  const data = await labTestingService.bulkUploadResults(req.params.id, rows, req.user!);
  res.status(201).json({ success: true, data, message: 'Results uploaded' });
}

export async function listFlags(req: Request, res: Response): Promise<void> {
  const { resolved, seedLotId } = req.query;
  const data = await labTestingService.listQualityFlags({
    resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
    seedLotId: typeof seedLotId === 'string' ? seedLotId : undefined,
  });
  res.json({ success: true, data });
}

export async function resolveFlag(req: Request, res: Response): Promise<void> {
  const data = await labTestingService.resolveQualityFlag(req.params.id, req.body?.resolutionNotes, req.user!);
  res.json({ success: true, data, message: 'Quality flag resolved' });
}

export async function labPerformance(_req: Request, res: Response): Promise<void> {
  const data = await labTestingService.getLabPerformanceMetrics();
  res.json({ success: true, data });
}

export async function generatePhytosanitary(req: Request, res: Response): Promise<void> {
  const data = await labTestingService.generatePhytosanitaryCertificateForSubmission(req.params.id, req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Phytosanitary certificate generated' });
}

export async function listIssuedCertificates(_req: Request, res: Response): Promise<void> {
  const data = await labTestingService.listCertificatesIssuedFromSubmissions();
  res.json({ success: true, data });
}
