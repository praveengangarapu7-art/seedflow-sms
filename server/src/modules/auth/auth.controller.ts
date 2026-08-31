import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../errors';
import * as authService from './auth.service';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: REFRESH_COOKIE_PATH,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
}

export async function register(req: Request, res: Response): Promise<void> {
  const data = await authService.register(req.body);
  res.status(201).json({ success: true, data, message: 'User created' });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { user, accessToken, refreshToken } = await authService.login(req.body, req.header('user-agent'));
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user, accessToken } });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new UnauthorizedError('Missing refresh token');

  const { user, accessToken, refreshToken } = await authService.refresh(token, req.header('user-agent'));
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user, accessToken } });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await authService.logout(token);
  }
  clearRefreshCookie(res);
  res.json({ success: true, data: { loggedOut: true } });
}

export async function me(req: Request, res: Response): Promise<void> {
  const data = await authService.me(req.user!.id);
  res.json({ success: true, data });
}
