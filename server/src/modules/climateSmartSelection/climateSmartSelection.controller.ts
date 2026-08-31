import type { Request, Response } from 'express';
import * as climateSmartSelectionService from './climateSmartSelection.service';

// --- Climate predictions ---

export async function recordClimatePrediction(req: Request, res: Response): Promise<void> {
  const data = await climateSmartSelectionService.recordClimatePrediction(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Climate prediction recorded' });
}

export async function listClimatePredictions(req: Request, res: Response): Promise<void> {
  const data = await climateSmartSelectionService.listClimatePredictions({
    region: req.query.region as string | undefined,
    season: req.query.season as string | undefined,
  });
  res.json({ success: true, data });
}

// --- Climate risk alerts ---

export async function listClimateRiskAlerts(req: Request, res: Response): Promise<void> {
  const acknowledgedParam = req.query.acknowledged as string | undefined;
  const data = await climateSmartSelectionService.listClimateRiskAlerts({
    farmId: req.query.farmId as string | undefined,
    farmerId: req.query.farmerId as string | undefined,
    acknowledged: acknowledgedParam !== undefined ? acknowledgedParam === 'true' : undefined,
  });
  res.json({ success: true, data });
}

export async function acknowledgeClimateRiskAlert(req: Request, res: Response): Promise<void> {
  const data = await climateSmartSelectionService.acknowledgeClimateRiskAlert(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Alert acknowledged' });
}

// --- Recommendations & rotation ---

export async function getClimateSmartRecommendations(req: Request, res: Response): Promise<void> {
  const data = await climateSmartSelectionService.getClimateSmartRecommendations(
    req.query.farmerId as string,
    req.query.farmId as string,
    req.query.crop as string,
  );
  res.json({ success: true, data });
}

export async function suggestCropRotationForFarm(req: Request, res: Response): Promise<void> {
  const data = await climateSmartSelectionService.suggestCropRotationForFarm(req.params.farmId);
  res.json({ success: true, data });
}

// --- Adaptation outcomes ---

export async function recordAdaptationOutcome(req: Request, res: Response): Promise<void> {
  const data = await climateSmartSelectionService.recordAdaptationOutcome(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Adaptation outcome recorded' });
}

export async function listAdaptationOutcomes(req: Request, res: Response): Promise<void> {
  const data = await climateSmartSelectionService.listAdaptationOutcomes({
    farmId: req.query.farmId as string | undefined,
    varietyId: req.query.varietyId as string | undefined,
  });
  res.json({ success: true, data });
}
