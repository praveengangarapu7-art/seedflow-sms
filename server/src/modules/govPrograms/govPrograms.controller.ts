import type { Request, Response } from 'express';
import * as govProgramsService from './govPrograms.service';

// --- Registrations ---

export async function submitRegistration(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.submitRegistration(req.params.seedLotId, req.body?.authorityOrgId, req.user!);
  res.status(201).json({ success: true, data, message: 'Government registration submitted' });
}

export async function approveRegistration(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.decideRegistration(req.params.id, 'approved', undefined, req.user!);
  res.json({ success: true, data, message: 'Registration approved' });
}

export async function rejectRegistration(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.decideRegistration(req.params.id, 'rejected', req.body?.reason, req.user!);
  res.json({ success: true, data, message: 'Registration rejected' });
}

export async function listRegistrationsForLot(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.listRegistrationsForLot(req.params.seedLotId);
  res.json({ success: true, data });
}

export async function listRegistrations(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.listRegistrations({
    authorityOrgId: req.query.authorityOrgId as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json({ success: true, data });
}

// --- Subsidy programs ---

export async function createSubsidyProgram(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.createSubsidyProgram(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Subsidy program created' });
}

export async function listSubsidyPrograms(req: Request, res: Response): Promise<void> {
  const isActiveParam = req.query.isActive as string | undefined;
  const data = await govProgramsService.listSubsidyPrograms({
    crop: req.query.crop as string | undefined,
    isActive: isActiveParam !== undefined ? isActiveParam === 'true' : undefined,
  });
  res.json({ success: true, data });
}

export async function getSubsidyProgram(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.getSubsidyProgram(req.params.id);
  res.json({ success: true, data });
}

export async function activateSubsidyProgram(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.setSubsidyProgramActive(req.params.id, true, req.user!);
  res.json({ success: true, data, message: 'Subsidy program activated' });
}

export async function deactivateSubsidyProgram(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.setSubsidyProgramActive(req.params.id, false, req.user!);
  res.json({ success: true, data, message: 'Subsidy program deactivated' });
}

// --- Subsidy claims ---

export async function submitSubsidyClaim(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.submitSubsidyClaim(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Subsidy claim submitted' });
}

export async function listSubsidyClaims(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.listSubsidyClaims({
    farmerId: req.query.farmerId as string | undefined,
    programId: req.query.programId as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json({ success: true, data });
}

export async function getSubsidyClaim(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.getSubsidyClaim(req.params.id);
  res.json({ success: true, data });
}

export async function approveSubsidyClaim(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.approveSubsidyClaim(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Subsidy claim approved' });
}

export async function rejectSubsidyClaim(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.rejectSubsidyClaim(req.params.id, req.body?.reason, req.user!);
  res.json({ success: true, data, message: 'Subsidy claim rejected' });
}

export async function paySubsidyClaim(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.markSubsidyClaimPaid(req.params.id, req.body?.paymentReference, req.user!);
  res.json({ success: true, data, message: 'Subsidy claim marked as paid' });
}

// --- Reports ---

export async function generateReport(req: Request, res: Response): Promise<void> {
  const cropYear = req.body?.cropYear !== undefined ? Number(req.body.cropYear) : undefined;
  const data = await govProgramsService.generateGovernmentReport(req.params.reportType, cropYear, req.user!);
  res.status(201).json({ success: true, data, message: 'Report generated' });
}

export async function listReports(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.listGovernmentReports(req.query.reportType as string | undefined);
  res.json({ success: true, data });
}

export async function getReport(req: Request, res: Response): Promise<void> {
  const data = await govProgramsService.getGovernmentReport(req.params.id);
  res.json({ success: true, data });
}
