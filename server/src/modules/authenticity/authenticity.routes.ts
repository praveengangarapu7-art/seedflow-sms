import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as authenticityController from './authenticity.controller';

export const authenticityRouter = Router();

// These three are the first unauthenticated, data-returning endpoints in
// this app (every other route requires a login) — deliberately so: a
// farmer scanning a QR code in the field has no SeedSphere account. Rate
// limiting is the trade-off for that: a public endpoint with no session to
// throttle by is the one place in this app worth guarding against sheer
// request volume from a single source.
const publicVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification requests — please try again later.' },
});

authenticityRouter.get('/public-key', publicVerifyLimiter, asyncHandler(authenticityController.publicKey));
authenticityRouter.get(
  '/certificates/:certificateId/verify',
  publicVerifyLimiter,
  asyncHandler(authenticityController.publicVerify),
);
authenticityRouter.get(
  '/certificates/:certificateId/bundle',
  publicVerifyLimiter,
  asyncHandler(authenticityController.publicCertificateBundle),
);

// Everything else is staff-facing and authenticated.
authenticityRouter.use(requireAuth);

authenticityRouter.get('/seed-lots/:seedLotId/chain', asyncHandler(authenticityController.getChain));
authenticityRouter.get('/seed-lots/:seedLotId/verify-chain', asyncHandler(authenticityController.verifyChainIntegrity));
authenticityRouter.get('/seed-lots/:seedLotId/certificates', asyncHandler(authenticityController.listCertificates));

// Same authority as the existing compliance module's cert issuance
// (requireRole('Admin', 'Inspector') on quality/phytosanitary certificates).
authenticityRouter.post(
  '/seed-lots/:seedLotId/certificates',
  requireRole('Admin', 'Inspector'),
  asyncHandler(authenticityController.issueCertificate),
);
authenticityRouter.post(
  '/certificates/:certificateId/revoke',
  requireRole('Admin', 'Inspector'),
  asyncHandler(authenticityController.revokeCertificate),
);
