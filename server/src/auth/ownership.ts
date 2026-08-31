import { ForbiddenError } from '../errors';
import type { AuthenticatedUser } from '../middleware/requireAuth';

/**
 * Admin bypasses all ownership checks. Everyone else must belong to the
 * organization that owns the resource being modified.
 */
export function assertOwnsOrganization(
  user: AuthenticatedUser,
  organizationId: string | null,
  message: string,
): void {
  if (user.role === 'Admin') return;
  if (!organizationId || user.organizationId !== organizationId) {
    throw new ForbiddenError(message);
  }
}
