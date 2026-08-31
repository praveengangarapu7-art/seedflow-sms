import type { Request, Response } from 'express';
import * as authenticityService from './authenticity.service';

export async function getChain(req: Request, res: Response): Promise<void> {
  const data = await authenticityService.getHashChain(req.params.seedLotId);
  res.json({ success: true, data });
}

export async function verifyChainIntegrity(req: Request, res: Response): Promise<void> {
  const data = await authenticityService.verifyStoredChainIntegrity(req.params.seedLotId);
  res.json({ success: true, data });
}

export async function issueCertificate(req: Request, res: Response): Promise<void> {
  const data = await authenticityService.issueCertificate(req.params.seedLotId, req.user!);
  res.status(201).json({ success: true, data, message: 'Authenticity certificate issued' });
}

export async function listCertificates(req: Request, res: Response): Promise<void> {
  const data = await authenticityService.listCertificatesForLot(req.params.seedLotId);
  res.json({ success: true, data });
}

export async function revokeCertificate(req: Request, res: Response): Promise<void> {
  const data = await authenticityService.revokeCertificate(req.params.certificateId, req.body?.reason, req.user!);
  res.json({ success: true, data, message: 'Certificate revoked' });
}

// --- Public (unauthenticated) — reachable by scanning a QR with no login ---

export async function publicVerify(req: Request, res: Response): Promise<void> {
  const data = await authenticityService.verifyByCertificateId(req.params.certificateId);
  res.json({ success: true, data });
}

export async function publicCertificateBundle(req: Request, res: Response): Promise<void> {
  const data = await authenticityService.getCertificateBundle(req.params.certificateId);
  res.json({ success: true, data });
}

export async function publicKey(_req: Request, res: Response): Promise<void> {
  const data = await authenticityService.getPublicKeyInfo();
  res.json({ success: true, data });
}
