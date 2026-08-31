import type { Request, Response } from 'express';
import * as marketIntelligenceService from './marketIntelligence.service';

// --- Market prices ---

export async function recordMarketPrice(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.recordMarketPrice(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Market price recorded' });
}

export async function listMarketPrices(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.listMarketPrices({
    crop: req.query.crop as string | undefined,
    variety: req.query.variety as string | undefined,
  });
  res.json({ success: true, data });
}

// --- Ministry forecasts ---

export async function recordMinistryForecast(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.recordMinistryForecast(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Ministry demand forecast recorded' });
}

export async function listMinistryForecasts(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.listMinistryForecasts({
    crop: req.query.crop as string | undefined,
    variety: req.query.variety as string | undefined,
  });
  res.json({ success: true, data });
}

// --- Weather outlooks ---

export async function recordWeatherOutlook(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.recordWeatherOutlook(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Weather outlook recorded' });
}

export async function listWeatherOutlooks(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.listWeatherOutlooks({
    crop: req.query.crop as string | undefined,
    region: req.query.region as string | undefined,
  });
  res.json({ success: true, data });
}

// --- Crop insurance ---

export async function recordCropInsurance(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.recordCropInsurance(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Crop insurance record recorded' });
}

export async function listCropInsuranceRecords(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.listCropInsuranceRecords({
    crop: req.query.crop as string | undefined,
    variety: req.query.variety as string | undefined,
  });
  res.json({ success: true, data });
}

// --- Demand forecasts ---

export async function generateDemandForecast(req: Request, res: Response): Promise<void> {
  const { crop, variety, season } = req.body ?? {};
  const data = await marketIntelligenceService.generateDemandForecast(crop, variety, season, req.user!);
  res.status(201).json({ success: true, data, message: 'Demand forecast generated' });
}

export async function listDemandForecasts(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.listDemandForecasts({
    crop: req.query.crop as string | undefined,
    variety: req.query.variety as string | undefined,
    season: req.query.season as string | undefined,
  });
  res.json({ success: true, data });
}

export async function getLatestDemandForecasts(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.getLatestDemandForecasts(req.query.season as string);
  res.json({ success: true, data });
}

export async function getDemandForecast(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.getDemandForecast(req.params.id);
  res.json({ success: true, data });
}

// --- Breeding priority recommendations ---

export async function getBreedingPriorityRecommendations(req: Request, res: Response): Promise<void> {
  const data = await marketIntelligenceService.getBreedingPriorityRecommendations(req.query.season as string);
  res.json({ success: true, data });
}
