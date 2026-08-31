import type { NextFunction, Request, Response } from 'express';
import { recordApiMetric } from '../modules/monitoring/monitoring.service';

/**
 * req.route/req.baseUrl are layer-scoped bookkeeping Express resets as it
 * unwinds nested routers looking for error-handling middleware — by the
 * time a request that threw reaches the top-level errorHandler, req.params
 * has ALSO already been restored to the parent (empty) params, even though
 * the route did match deeper down. asyncHandler snapshots the matched
 * params onto req.matchedParams before that unwind happens, so this prefers
 * that snapshot and falls back to the live req.params for the normal
 * (non-error) case where nothing has unwound yet.
 */
export function buildRoutePattern(req: Request): string {
  const pathOnly = req.originalUrl.split('?')[0];
  const params = req.matchedParams ?? req.params ?? {};
  return Object.entries(params).reduce(
    (pattern, [key, value]) => (value ? pattern.split(String(value)).join(`:${key}`) : pattern),
    pathOnly,
  );
}

export function apiMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    void recordApiMetric({
      method: req.method,
      route: buildRoutePattern(req),
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      userEmail: req.user?.email ?? null,
    }).catch((error) => {
      console.error('[apiMetrics] failed to record request metric:', error);
    });
  });

  next();
}
