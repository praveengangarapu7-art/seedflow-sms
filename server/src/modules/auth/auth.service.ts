import { signAccessToken } from '../../auth/jwt';
import { hashPassword, verifyPassword } from '../../auth/password';
import { isRole, ROLES_REQUIRING_ORGANIZATION } from '../../auth/roles';
import { ConflictError, UnauthorizedError, ValidationError } from '../../errors';
import * as refreshTokensService from '../refreshTokens/refreshTokens.service';
import * as usersService from '../users/users.service';
import type { UserRecord } from '../users/users.service';
import type { AuthUser, LoginInput, RegisterInput } from '../users/users.types';

function toPublicUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organization_id,
  };
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  if (!input.email?.trim()) throw new ValidationError('email is required');
  if (!input.name?.trim()) throw new ValidationError('name is required');
  if (!input.password || input.password.length < 8) {
    throw new ValidationError('password must be at least 8 characters');
  }
  if (!isRole(input.role)) {
    throw new ValidationError(`role must be one of: Admin, Breeder, Producer, Inspector, Warehouse Manager`);
  }
  if (ROLES_REQUIRING_ORGANIZATION.includes(input.role) && !input.organizationId) {
    throw new ValidationError(`role "${input.role}" requires an organizationId`);
  }

  const existing = await usersService.findByEmail(input.email);
  if (existing) throw new ConflictError(`A user with email ${input.email} already exists`);

  const passwordHash = await hashPassword(input.password);
  const created = await usersService.createUser({ ...input, passwordHash });
  return toPublicUser(created);
}

export async function login(
  input: LoginInput,
  userAgent?: string,
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
  const user = input.email ? await usersService.findByEmail(input.email) : null;
  if (!user || !user.is_active) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const validPassword = await verifyPassword(input.password ?? '', user.password_hash);
  if (!validPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organization_id,
  });
  const { rawToken: refreshToken } = await refreshTokensService.createRefreshToken(user.id, userAgent);

  return { user: toPublicUser(user), accessToken, refreshToken };
}

export async function refresh(
  rawRefreshToken: string,
  userAgent?: string,
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
  const record = await refreshTokensService.findValidRefreshToken(rawRefreshToken);
  if (!record) throw new UnauthorizedError('Invalid or expired refresh token');

  const user = await usersService.findById(record.user_id);
  if (!user || !user.is_active) throw new UnauthorizedError('Invalid or expired refresh token');

  // Rotation: the presented token is revoked and replaced atomically with a
  // new one, so a stolen-and-replayed old token is a single-use dead end.
  const { rawToken: newRefreshToken, record: newRecord } = await refreshTokensService.createRefreshToken(
    user.id,
    userAgent,
  );
  await refreshTokensService.revokeRefreshToken(record.id, newRecord.id);

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organization_id,
  });

  return { user: toPublicUser(user), accessToken, refreshToken: newRefreshToken };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const record = await refreshTokensService.findValidRefreshToken(rawRefreshToken);
  if (record) {
    await refreshTokensService.revokeRefreshToken(record.id);
  }
}

export async function me(userId: string): Promise<AuthUser> {
  const user = await usersService.findById(userId);
  if (!user) throw new UnauthorizedError('User not found');
  return toPublicUser(user);
}
