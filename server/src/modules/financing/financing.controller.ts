import type { Request, Response } from 'express';
import * as financingService from './financing.service';

export async function requestFinancing(req: Request, res: Response): Promise<void> {
  const data = await financingService.requestFinancing(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Financing requested' });
}

export async function listFinancingAccounts(req: Request, res: Response): Promise<void> {
  const data = await financingService.listFinancingAccounts({
    financingType: req.query.financingType as string | undefined,
    borrowerOrganizationId: req.query.borrowerOrganizationId as string | undefined,
    borrowerFarmerId: req.query.borrowerFarmerId as string | undefined,
    seedLotId: req.query.seedLotId as string | undefined,
    allocationId: req.query.allocationId as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json({ success: true, data });
}

export async function getFinancingAccount(req: Request, res: Response): Promise<void> {
  const data = await financingService.getFinancingAccount(req.params.id);
  res.json({ success: true, data });
}

export async function approveFinancing(req: Request, res: Response): Promise<void> {
  const data = await financingService.approveFinancing(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Financing approved' });
}

export async function rejectFinancing(req: Request, res: Response): Promise<void> {
  const data = await financingService.rejectFinancing(req.params.id, req.body?.reason, req.user!);
  res.json({ success: true, data, message: 'Financing rejected' });
}

export async function disburseFinancing(req: Request, res: Response): Promise<void> {
  const data = await financingService.disburseFinancing(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Financing disbursed' });
}

export async function triggerPostHarvestRepayment(req: Request, res: Response): Promise<void> {
  const data = await financingService.triggerPostHarvestRepayment(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Repayment triggered' });
}

export async function recordRepayment(req: Request, res: Response): Promise<void> {
  const data = await financingService.recordRepayment(req.params.id, req.body, req.user!);
  res.json({ success: true, data, message: 'Repayment recorded' });
}

export async function markFinancingDefaulted(req: Request, res: Response): Promise<void> {
  const data = await financingService.markFinancingDefaulted(req.params.id, req.body?.reason, req.user!);
  res.json({ success: true, data, message: 'Financing marked as defaulted' });
}

export async function getAccruedInterest(req: Request, res: Response): Promise<void> {
  const data = await financingService.getAccruedInterest(req.params.id);
  res.json({ success: true, data });
}

export async function getFinancingCostsForLot(req: Request, res: Response): Promise<void> {
  const data = await financingService.getFinancingCostsForLot(req.params.seedLotId);
  res.json({ success: true, data });
}

export async function getInsuranceContext(req: Request, res: Response): Promise<void> {
  const data = await financingService.getInsuranceContext(req.query.crop as string, req.query.season as string | undefined);
  res.json({ success: true, data });
}
