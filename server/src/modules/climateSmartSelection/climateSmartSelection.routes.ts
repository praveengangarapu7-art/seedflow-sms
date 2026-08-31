import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as climateSmartSelectionController from './climateSmartSelection.controller';
import { CLIMATE_DATA_ROLES } from './climateSmartSelection.service';

export const climateSmartSelectionRouter = Router();

climateSmartSelectionRouter.use(requireAuth);

// Reads are open to every authenticated role, matching this app's general
// convention. Recording climate data / adaptation outcomes is gated to
// Admin/Breeder.
climateSmartSelectionRouter.get('/predictions', asyncHandler(climateSmartSelectionController.listClimatePredictions));
climateSmartSelectionRouter.post(
  '/predictions',
  requireRole(...CLIMATE_DATA_ROLES),
  asyncHandler(climateSmartSelectionController.recordClimatePrediction),
);

climateSmartSelectionRouter.get('/alerts', asyncHandler(climateSmartSelectionController.listClimateRiskAlerts));
climateSmartSelectionRouter.post('/alerts/:id/acknowledge', asyncHandler(climateSmartSelectionController.acknowledgeClimateRiskAlert));

climateSmartSelectionRouter.get('/recommendations', asyncHandler(climateSmartSelectionController.getClimateSmartRecommendations));
climateSmartSelectionRouter.get('/farms/:farmId/rotation-suggestions', asyncHandler(climateSmartSelectionController.suggestCropRotationForFarm));

climateSmartSelectionRouter.get('/adaptation-outcomes', asyncHandler(climateSmartSelectionController.listAdaptationOutcomes));
climateSmartSelectionRouter.post(
  '/adaptation-outcomes',
  requireRole(...CLIMATE_DATA_ROLES),
  asyncHandler(climateSmartSelectionController.recordAdaptationOutcome),
);
