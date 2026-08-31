import type { Request, Response } from 'express';
import * as complianceService from './compliance.service';

export async function recordPurityTest(req: Request, res: Response): Promise<void> {
  const data = await complianceService.recordPurityTest(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Purity test recorded' });
}

export async function recordViabilityTest(req: Request, res: Response): Promise<void> {
  const data = await complianceService.recordViabilityTest(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Viability test recorded' });
}

export async function recordPhytosanitaryCertificate(req: Request, res: Response): Promise<void> {
  const data = await complianceService.recordPhytosanitaryCertificate(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Phytosanitary certificate recorded' });
}

export async function getQualityMetrics(req: Request, res: Response): Promise<void> {
  const data = await complianceService.getQualityMetrics(req.params.id);
  res.json({ success: true, data });
}

export async function getComplianceChain(req: Request, res: Response): Promise<void> {
  const data = await complianceService.getComplianceChain(req.params.id);
  res.json({ success: true, data });
}

export async function generateCertificate(req: Request, res: Response): Promise<void> {
  const data = await complianceService.generateCertificate(req.params.id, req.user!);
  res.status(201).json({ success: true, data, message: 'Certificate version generated' });
}

export async function listCertificates(req: Request, res: Response): Promise<void> {
  const data = await complianceService.listCertificates(req.params.id);
  res.json({ success: true, data });
}

export async function getCertificate(req: Request, res: Response): Promise<void> {
  const data = await complianceService.getCertificateById(req.params.certificateId);
  res.json({ success: true, data });
}

export async function signCertificate(req: Request, res: Response): Promise<void> {
  const data = await complianceService.signCertificate(req.params.certificateId, req.user!);
  res.json({ success: true, data, message: 'Certificate signed and issued' });
}
