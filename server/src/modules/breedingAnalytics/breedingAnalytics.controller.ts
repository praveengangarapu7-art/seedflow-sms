import type { Request, Response } from 'express';
import * as breedingAnalyticsService from './breedingAnalytics.service';

// --- Trait measurements ---

export async function recordTraitMeasurement(req: Request, res: Response): Promise<void> {
  const data = await breedingAnalyticsService.recordTraitMeasurement(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Trait measurement recorded' });
}

export async function listTraitMeasurementsForLot(req: Request, res: Response): Promise<void> {
  const data = await breedingAnalyticsService.listTraitMeasurementsForLot(req.params.seedLotId);
  res.json({ success: true, data });
}

// --- Reports ---

function parseIds(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

export async function getLineageSummary(req: Request, res: Response): Promise<void> {
  const data = await breedingAnalyticsService.getLineageSummary(parseIds(req.query.rootLotIds));
  res.json({ success: true, data });
}

export async function analyzeTraitInheritance(req: Request, res: Response): Promise<void> {
  const data = await breedingAnalyticsService.analyzeTraitInheritance(req.query.traitType as string);
  res.json({ success: true, data });
}

export async function getGermplasmPoolRankings(_req: Request, res: Response): Promise<void> {
  const data = await breedingAnalyticsService.getGermplasmPoolRankings();
  res.json({ success: true, data });
}

export async function getBreedingCycleTimelines(req: Request, res: Response): Promise<void> {
  const data = await breedingAnalyticsService.getBreedingCycleTimelines(parseIds(req.query.rootLotIds));
  res.json({ success: true, data });
}

export async function getBreedingProgramRoi(req: Request, res: Response): Promise<void> {
  const data = await breedingAnalyticsService.getBreedingProgramRoi(parseIds(req.query.rootLotIds));
  res.json({ success: true, data });
}

// --- Hybrid cross predictions ---

export async function predictHybridCrossVigor(req: Request, res: Response): Promise<void> {
  const data = await breedingAnalyticsService.predictHybridCrossVigor(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Hybrid cross vigor predicted' });
}

export async function recordActualCrossOutcome(req: Request, res: Response): Promise<void> {
  const data = await breedingAnalyticsService.recordActualCrossOutcome(req.params.id, req.body, req.user!);
  res.json({ success: true, data, message: 'Actual cross outcome recorded' });
}

export async function listHybridCrossPredictions(req: Request, res: Response): Promise<void> {
  const data = await breedingAnalyticsService.listHybridCrossPredictions({
    lotId: req.query.lotId as string | undefined,
    traitType: req.query.traitType as string | undefined,
  });
  res.json({ success: true, data });
}

export async function getHybridCrossPrediction(req: Request, res: Response): Promise<void> {
  const data = await breedingAnalyticsService.getHybridCrossPrediction(req.params.id);
  res.json({ success: true, data });
}
