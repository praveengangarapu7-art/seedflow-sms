import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as breedingAnalyticsController from './breedingAnalytics.controller';
import { BREEDING_DATA_ROLES } from './breedingAnalytics.service';

export const breedingAnalyticsRouter = Router();

breedingAnalyticsRouter.use(requireAuth);

// Reads are open to every authenticated role, matching this app's general
// convention. Recording breeding data is gated to Admin/Breeder.
breedingAnalyticsRouter.get('/seed-lots/:seedLotId/traits', asyncHandler(breedingAnalyticsController.listTraitMeasurementsForLot));
breedingAnalyticsRouter.post('/traits', requireRole(...BREEDING_DATA_ROLES), asyncHandler(breedingAnalyticsController.recordTraitMeasurement));

breedingAnalyticsRouter.get('/lineage-summary', asyncHandler(breedingAnalyticsController.getLineageSummary));
breedingAnalyticsRouter.get('/trait-inheritance', asyncHandler(breedingAnalyticsController.analyzeTraitInheritance));
breedingAnalyticsRouter.get('/germplasm-rankings', asyncHandler(breedingAnalyticsController.getGermplasmPoolRankings));
breedingAnalyticsRouter.get('/cycle-timelines', asyncHandler(breedingAnalyticsController.getBreedingCycleTimelines));
breedingAnalyticsRouter.get('/program-roi', asyncHandler(breedingAnalyticsController.getBreedingProgramRoi));

breedingAnalyticsRouter.get('/hybrid-predictions', asyncHandler(breedingAnalyticsController.listHybridCrossPredictions));
breedingAnalyticsRouter.get('/hybrid-predictions/:id', asyncHandler(breedingAnalyticsController.getHybridCrossPrediction));
breedingAnalyticsRouter.post(
  '/hybrid-predictions',
  requireRole(...BREEDING_DATA_ROLES),
  asyncHandler(breedingAnalyticsController.predictHybridCrossVigor),
);
breedingAnalyticsRouter.post(
  '/hybrid-predictions/:id/actual-outcome',
  requireRole(...BREEDING_DATA_ROLES),
  asyncHandler(breedingAnalyticsController.recordActualCrossOutcome),
);
