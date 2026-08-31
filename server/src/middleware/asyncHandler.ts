import type { NextFunction, Request, Response } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    // Express restores req.params to the parent router's value as it
    // unwinds looking for error-handling middleware, so a route param
    // (e.g. :id) is already gone by the time a thrown error reaches the
    // top-level errorHandler. Every route is wrapped in asyncHandler, so
    // this is the last point where req.params still reflects the route
    // that actually matched — snapshotting it here is what lets
    // errorHandler/apiMetrics report the right route pattern for failures.
    matchedParams?: Record<string, string>;
  }
}

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.matchedParams = { ...req.params };
    handler(req, res, next).catch(next);
  };
}
