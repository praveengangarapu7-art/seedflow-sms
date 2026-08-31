import type { Request, Response } from 'express';
import * as partnersService from './partners.service';

// --- Links ---

export async function listLinks(req: Request, res: Response): Promise<void> {
  const data = await partnersService.listPartnerLinks(req.query.organizationId as string | undefined);
  res.json({ success: true, data });
}

export async function requestLink(req: Request, res: Response): Promise<void> {
  const { requestingOrgId, partnerOrgId, notes } = req.body ?? {};
  const data = await partnersService.requestPartnerLink(requestingOrgId, partnerOrgId, req.user!, notes);
  res.status(201).json({ success: true, data, message: 'Partner link requested' });
}

export async function approveLink(req: Request, res: Response): Promise<void> {
  const data = await partnersService.approvePartnerLink(req.params.linkId, req.user!);
  res.json({ success: true, data, message: 'Partner link approved' });
}

export async function rejectLink(req: Request, res: Response): Promise<void> {
  const data = await partnersService.rejectPartnerLink(req.params.linkId, req.user!);
  res.json({ success: true, data, message: 'Partner link rejected' });
}

export async function suspendLink(req: Request, res: Response): Promise<void> {
  const data = await partnersService.suspendPartnerLink(req.params.linkId, req.user!);
  res.json({ success: true, data, message: 'Partner link suspended' });
}

export async function reactivateLink(req: Request, res: Response): Promise<void> {
  const data = await partnersService.reactivatePartnerLink(req.params.linkId, req.user!);
  res.json({ success: true, data, message: 'Partner link reactivated' });
}

// --- Catalog / sync / quality comparison ---

export async function getCatalog(req: Request, res: Response): Promise<void> {
  const data = await partnersService.getPartnerCatalog(req.params.partnerOrgId, { crop: req.query.crop as string | undefined });
  res.json({ success: true, data });
}

export async function syncInventory(req: Request, res: Response): Promise<void> {
  const { buyerOrgId } = req.body ?? {};
  const data = await partnersService.syncPartnerInventory(buyerOrgId, req.params.partnerOrgId, req.user!);
  res.json({ success: true, data, message: 'Partner inventory synced' });
}

export async function getSyncHistory(req: Request, res: Response): Promise<void> {
  const data = await partnersService.listSyncHistory(req.query.buyerOrgId as string, req.params.partnerOrgId);
  res.json({ success: true, data });
}

export async function qualityComparison(req: Request, res: Response): Promise<void> {
  const data = await partnersService.compareQuality(req.query.crop as string, req.query.variety as string | undefined);
  res.json({ success: true, data });
}

// --- Orders ---

export async function listOrders(req: Request, res: Response): Promise<void> {
  const data = await partnersService.listPartnerOrders({
    buyerOrgId: req.query.buyerOrgId as string | undefined,
    partnerOrgId: req.query.partnerOrgId as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json({ success: true, data });
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const data = await partnersService.getPartnerOrder(req.params.id);
  res.json({ success: true, data });
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const { buyerOrgId, ...input } = req.body ?? {};
  const data = await partnersService.createPartnerOrder(buyerOrgId, input, req.user!);
  res.status(201).json({ success: true, data, message: 'Partner order placed' });
}

export async function confirmOrder(req: Request, res: Response): Promise<void> {
  const data = await partnersService.confirmPartnerOrder(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Partner order confirmed' });
}

export async function rejectOrder(req: Request, res: Response): Promise<void> {
  const data = await partnersService.rejectPartnerOrder(req.params.id, req.body?.reason, req.user!);
  res.json({ success: true, data, message: 'Partner order rejected' });
}

export async function shipOrder(req: Request, res: Response): Promise<void> {
  const data = await partnersService.markOrderShipped(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Partner order marked as shipped' });
}

export async function receiveOrder(req: Request, res: Response): Promise<void> {
  const data = await partnersService.markOrderReceived(req.params.id, req.body, req.user!);
  res.json({ success: true, data, message: 'Partner order received' });
}

export async function disputeOrder(req: Request, res: Response): Promise<void> {
  const data = await partnersService.disputeOrder(req.params.id, req.body?.reason, req.user!);
  res.json({ success: true, data, message: 'Partner order disputed' });
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const data = await partnersService.cancelPartnerOrder(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Partner order cancelled' });
}

// --- Ratings ---

export async function getRating(req: Request, res: Response): Promise<void> {
  const data = await partnersService.getPartnerRating(req.query.buyerOrgId as string, req.params.partnerOrgId);
  res.json({ success: true, data });
}

export async function listRatings(req: Request, res: Response): Promise<void> {
  const data = await partnersService.listRatingsForPartner(req.params.partnerOrgId);
  res.json({ success: true, data });
}
