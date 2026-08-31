export const ROLES = ['Admin', 'Breeder', 'Producer', 'Inspector', 'Warehouse Manager'] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

// These roles represent an organization acting in the value chain, so a
// user in one of them must be linked to an organization for ownership
// checks (seed lot create/update/allocate) to mean anything. Admin and
// Inspector are platform-level roles and may have no organization.
export const ROLES_REQUIRING_ORGANIZATION: Role[] = ['Breeder', 'Producer', 'Warehouse Manager'];
