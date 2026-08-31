import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as marketIntelligenceController from './marketIntelligence.controller';
import { MARKET_DATA_ROLES } from './marketIntelligence.service';

export const marketIntelligenceRouter = Router();

marketIntelligenceRouter.use(requireAuth);

// Reads are open to every authenticated role, matching this app's general
// convention (see seedLots.routes.ts). Recording a market signal or
// generating a forecast is gated to Admin/Breeder — the same
// "market/breeding judgment" authority varieties.ts's COMMITTEE_ROLES uses.
marketIntelligenceRouter.get('/prices', asyncHandler(marketIntelligenceController.listMarketPrices));
marketIntelligenceRouter.post('/prices', requireRole(...MARKET_DATA_ROLES), asyncHandler(marketIntelligenceController.recordMarketPrice));

marketIntelligenceRouter.get('/ministry-forecasts', asyncHandler(marketIntelligenceController.listMinistryForecasts));
marketIntelligenceRouter.post(
  '/ministry-forecasts',
  requireRole(...MARKET_DATA_ROLES),
  asyncHandler(marketIntelligenceController.recordMinistryForecast),
);

marketIntelligenceRouter.get('/weather-outlooks', asyncHandler(marketIntelligenceController.listWeatherOutlooks));
marketIntelligenceRouter.post(
  '/weather-outlooks',
  requireRole(...MARKET_DATA_ROLES),
  asyncHandler(marketIntelligenceController.recordWeatherOutlook),
);

marketIntelligenceRouter.get('/insurance-records', asyncHandler(marketIntelligenceController.listCropInsuranceRecords));
marketIntelligenceRouter.post(
  '/insurance-records',
  requireRole(...MARKET_DATA_ROLES),
  asyncHandler(marketIntelligenceController.recordCropInsurance),
);

// Registered ahead of /demand-forecasts/:id so "latest" is never swallowed as an id.
marketIntelligenceRouter.get('/demand-forecasts/latest', asyncHandler(marketIntelligenceController.getLatestDemandForecasts));
marketIntelligenceRouter.get('/demand-forecasts', asyncHandler(marketIntelligenceController.listDemandForecasts));
marketIntelligenceRouter.get('/demand-forecasts/:id', asyncHandler(marketIntelligenceController.getDemandForecast));
marketIntelligenceRouter.post(
  '/demand-forecasts',
  requireRole(...MARKET_DATA_ROLES),
  asyncHandler(marketIntelligenceController.generateDemandForecast),
);

marketIntelligenceRouter.get('/breeding-priority', asyncHandler(marketIntelligenceController.getBreedingPriorityRecommendations));
