import type { Request, Response } from 'express';
import { hashPassword } from '../../auth/password';
import { isRole, ROLES, ROLES_REQUIRING_ORGANIZATION } from '../../auth/roles';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import * as usersService from './users.service';

function actor(req: Request): string {
  // audit_logs.performed_by stores the acting user's email everywhere else
  // in this codebase, so keep that convention rather than inventing an id.
  return req.user?.email ?? 'unknown';
}

function parseBool(value: unknown): boolean | undefined {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
}

export async function list(req: Request, res: Response): Promise<void> {
  const { role, organizationId, isActive, q } = req.query;
  const data = await usersService.listUsers({
    role: typeof role === 'string' ? role : undefined,
    organizationId: typeof organizationId === 'string' ? organizationId : undefined,
    isActive: parseBool(isActive),
    q: typeof q === 'string' ? q : undefined,
  });
  res.json({ success: true, data });
}

export async function stats(_req: Request, res: Response): Promise<void> {
  const data = await usersService.getUserStats();
  res.json({ success: true, data });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const data = await usersService.getAdminUserById(req.params.id);
  if (!data) throw new NotFoundError(`User ${req.params.id} not found`);
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { email, name, password, role, organizationId } = req.body ?? {};

  if (!email?.trim()) throw new ValidationError('email is required');
  if (!name?.trim()) throw new ValidationError('name is required');
  if (!password || String(password).length < 8) {
    throw new ValidationError('password must be at least 8 characters');
  }
  if (!isRole(role)) throw new ValidationError(`role must be one of: ${ROLES.join(', ')}`);
  if (ROLES_REQUIRING_ORGANIZATION.includes(role) && !organizationId) {
    throw new ValidationError(`role "${role}" requires an organizationId`);
  }

  const existing = await usersService.findByEmail(email);
  if (existing) throw new ConflictError(`A user with email ${email} already exists`);

  const passwordHash = await hashPassword(password);
  const created = await usersService.adminCreateUser(
    { email, name, password, role, organizationId: organizationId ?? null, passwordHash },
    actor(req),
  );

  res.status(201).json({
    success: true,
    data: {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      organization_id: created.organization_id,
      is_active: created.is_active,
      created_at: created.created_at,
      updated_at: created.updated_at,
    },
    message: 'User created',
  });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { name, role, organizationId, isActive } = req.body ?? {};

  if (role !== undefined) {
    if (!isRole(role)) throw new ValidationError(`role must be one of: ${ROLES.join(', ')}`);
    if (ROLES_REQUIRING_ORGANIZATION.includes(role)) {
      // Either the request supplies an organization or the account already
      // has one — otherwise the role's ownership checks would be meaningless.
      const current = await usersService.getAdminUserById(req.params.id);
      const resolvedOrg = organizationId !== undefined ? organizationId : current?.organization_id;
      if (!resolvedOrg) throw new ValidationError(`role "${role}" requires an organizationId`);
    }
  }

  // The last active Admin must stay active and stay an Admin — otherwise a
  // single click can lock every human out of the platform for good.
  const target = await usersService.getAdminUserById(req.params.id);
  if (!target) throw new NotFoundError(`User ${req.params.id} not found`);
  const losingAdmin = target.role === 'Admin' && ((role !== undefined && role !== 'Admin') || isActive === false);
  if (losingAdmin) {
    const activeAdmins = await usersService.listUsers({ role: 'Admin', isActive: true });
    if (activeAdmins.length <= 1) {
      throw new ConflictError(
        'This is the last active Admin account — promote another user to Admin before changing this one.',
      );
    }
  }

  if (req.user?.id === req.params.id && isActive === false) {
    throw new ValidationError('You cannot deactivate your own account');
  }

  const updated = await usersService.adminUpdateUser(
    req.params.id,
    { name, role, organizationId, isActive: parseBool(isActive) },
    actor(req),
  );

  res.json({
    success: true,
    data: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      organization_id: updated.organization_id,
      is_active: updated.is_active,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    },
    message: 'User updated',
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { password } = req.body ?? {};
  if (!password || String(password).length < 8) {
    throw new ValidationError('password must be at least 8 characters');
  }
  const passwordHash = await hashPassword(password);
  await usersService.adminResetPassword(req.params.id, passwordHash, actor(req));
  res.json({ success: true, data: { reset: true }, message: 'Password reset' });
}

export async function roles(_req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: ROLES.map((role) => ({
      role,
      requiresOrganization: ROLES_REQUIRING_ORGANIZATION.includes(role),
    })),
  });
}
