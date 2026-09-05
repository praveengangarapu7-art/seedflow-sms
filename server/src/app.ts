import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { apiMetricsMiddleware } from './middleware/apiMetrics';
import { errorHandler } from './middleware/errorHandler';
import { allocationsRouter } from './modules/allocations/allocations.routes';
import { analyticsRouter } from './modules/analytics/analytics.routes';
import { auditLogsRouter } from './modules/auditLogs/auditLogs.routes';
import { breedingAnalyticsRouter } from './modules/breedingAnalytics/breedingAnalytics.routes';
import { climateSmartSelectionRouter } from './modules/climateSmartSelection/climateSmartSelection.routes';
import { authRouter } from './modules/auth/auth.routes';
import { authenticityRouter } from './modules/authenticity/authenticity.routes';
import { complianceRouter } from './modules/compliance/compliance.routes';
import { cropPlanningRouter } from './modules/cropPlanning/cropPlanning.routes';
import { cropVarietiesRouter } from './modules/cropVarieties/cropVarieties.routes';
import { cropsRouter } from './modules/crops/crops.routes';
import { dataGovernanceRouter } from './modules/dataGovernance/dataGovernance.routes';
import { demandPlanningRouter } from './modules/demandPlanning/demandPlanning.routes';
import { farmerEducationRouter } from './modules/farmerEducation/farmerEducation.routes';
import { farmersRouter } from './modules/farmers/farmers.routes';
import { financingRouter } from './modules/financing/financing.routes';
import { feedbackLoopRouter } from './modules/feedbackLoop/feedbackLoop.routes';
import { govProgramsRouter } from './modules/govPrograms/govPrograms.routes';
import { marketIntelligenceRouter } from './modules/marketIntelligence/marketIntelligence.routes';
import { labTestingRouter } from './modules/labTesting/labTesting.routes';
import { assistantRouter } from './modules/assistant/assistant.routes';
import { monitoringRouter } from './modules/monitoring/monitoring.routes';
import { organizationsRouter } from './modules/organizations/organizations.routes';
import { packagingRouter } from './modules/packaging/packaging.routes';
import { partnersRouter } from './modules/partners/partners.routes';
import { performanceRatingsRouter } from './modules/performanceRatings/performanceRatings.routes';
import { privacyRouter } from './modules/privacy/privacy.routes';
import { reconciliationRouter } from './modules/reconciliation/reconciliation.routes';
import { pushNotificationsRouter } from './modules/pushNotifications/pushNotifications.routes';
import { seedLotsRouter } from './modules/seedLots/seedLots.routes';
import { seedRequestsRouter } from './modules/seedRequests/seedRequests.routes';
import { storageRouter } from './modules/storage/storage.routes';
import { usersRouter } from './modules/users/users.routes';
import { varietiesRouter } from './modules/varieties/varieties.routes';
import { workflowsRouter } from './modules/workflows/workflows.routes';

export function createApp() {
  const app = express();

  // credentials:true requires a specific origin (not '*') so the browser
  // will actually send/accept the httpOnly refresh-token cookie cross-port.
  app.use(cors({ origin: env.frontendOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(apiMetricsMiddleware);

  app.get('/api/v1/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/organizations', organizationsRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/production/seed-lots', seedLotsRouter);
  app.use('/api/v1/production/allocations', allocationsRouter);
  app.use('/api/v1/audit-logs', auditLogsRouter);
  app.use('/api/v1/production/analytics', analyticsRouter);
  app.use('/api/v1/production/compliance', complianceRouter);
  app.use('/api/v1/production/workflows', workflowsRouter);
  app.use('/api/v1/production/demand-planning', demandPlanningRouter);
  app.use('/api/v1/farmers', farmersRouter);
  app.use('/api/v1/production/seed-requests', seedRequestsRouter);
  app.use('/api/v1/production/performance-ratings', performanceRatingsRouter);
  app.use('/api/v1/production/packaging', packagingRouter);
  app.use('/api/v1/production/storage', storageRouter);
  app.use('/api/v1/production/field-inspections', feedbackLoopRouter);
  app.use('/api/v1/production/data-governance', dataGovernanceRouter);
  app.use('/api/v1/production/varieties', varietiesRouter);
  app.use('/api/v1/crops', cropsRouter);
  app.use('/api/v1/crop-varieties', cropVarietiesRouter);
  app.use('/api/v1/production/lab-testing', labTestingRouter);
  app.use('/api/v1/production/crop-planning', cropPlanningRouter);
  app.use('/api/v1/push-notifications', pushNotificationsRouter);
  app.use('/api/v1/monitoring', monitoringRouter);
  app.use('/api/v1/privacy', privacyRouter);
  app.use('/api/v1/master-data', reconciliationRouter);
  app.use('/api/v1/authenticity', authenticityRouter);
  app.use('/api/v1/partners', partnersRouter);
  app.use('/api/v1/government-programs', govProgramsRouter);
  app.use('/api/v1/production/market-intelligence', marketIntelligenceRouter);
  app.use('/api/v1/production/breeding-analytics', breedingAnalyticsRouter);
  app.use('/api/v1/production/climate-smart', climateSmartSelectionRouter);
  app.use('/api/v1/financing', financingRouter);
  app.use('/api/v1/farmer-education', farmerEducationRouter);
  app.use('/api/v1/assistant', assistantRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}
