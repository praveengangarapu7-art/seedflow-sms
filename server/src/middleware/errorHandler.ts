import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors';
import { buildRoutePattern } from './apiMetrics';
import { logError } from '../modules/monitoring/monitoring.service';

interface PgError extends Error {
  code?: string;
  detail?: string;
}

const PG_CODE_TO_STATUS: Record<string, number> = {
  '23505': 409, // unique_violation
  '23503': 400, // foreign_key_violation
  '23514': 400, // check_violation (includes our RAISE EXCEPTION ... USING ERRCODE = 'check_violation')
  '23502': 400, // not_null_violation
  '22P02': 400, // invalid_text_representation — e.g. a malformed UUID passed to a `WHERE id = $1` lookup
};

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }

  const pgError = err as PgError;
  if (pgError && typeof pgError.code === 'string' && PG_CODE_TO_STATUS[pgError.code]) {
    res.status(PG_CODE_TO_STATUS[pgError.code]).json({
      success: false,
      message: pgError.message.replace(/^error: /i, ''),
    });
    return;
  }

  // Only genuinely unexpected exceptions reach here (ApiError and known PG
  // constraint violations are handled, and reported, above) — this is the
  // "real bug" path that error_logs exists to capture.
  console.error('[error]', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  logError({
    source: 'backend',
    message,
    stackTrace: err instanceof Error ? err.stack : undefined,
    route: buildRoutePattern(req),
    method: req.method,
    statusCode: 500,
    userEmail: req.user?.email,
  }).catch((logErr) => console.error('[errorHandler] failed to persist error log:', logErr));

  res.status(500).json({ success: false, message: 'Internal server error' });
}
