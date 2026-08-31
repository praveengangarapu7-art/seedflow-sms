import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as authController from './auth.controller';

export const authRouter = Router();

// Login is the one credential-guessing surface in this app — worth
// throttling per IP. The limit is generous rather than tight: this app's
// frontend pages all use a demo account-switcher that calls login() on
// every dropdown change, so a real user exploring several roles across
// several pages can legitimately log in dozens of times in one session.
// Skipped entirely in the test env, since the integration suite logs in
// through this same real endpoint ~90 times per run from one address.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'test',
  message: { success: false, message: 'Too many login attempts — please try again later.' },
});

authRouter.post('/login', loginLimiter, asyncHandler(authController.login));
authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.post('/logout', asyncHandler(authController.logout));
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
// Bootstrapping the very first Admin happens via `npm run seed:auth`; this
// endpoint is how an existing Admin provisions everyone after that.
authRouter.post('/register', requireAuth, requireRole('Admin'), asyncHandler(authController.register));
