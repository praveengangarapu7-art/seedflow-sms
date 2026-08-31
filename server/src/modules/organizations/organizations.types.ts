export const ORGANIZATION_TYPES = [
  'breeder',
  'producer',
  'laboratory',
  'certification_agency',
  'warehouse',
  'dealer',
  'government_authority',
] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export interface Organization {
  id: string;
  name: string;
  type: string;
  location: string | null;
  contact_person: string | null;
  certification_type: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationInput {
  name: string;
  type: string;
  location?: string;
  contactPerson?: string;
  certificationType?: string;
  active?: boolean;
}

export interface UpdateOrganizationInput {
  name?: string;
  type?: string;
  location?: string;
  contactPerson?: string;
  certificationType?: string;
  active?: boolean;
}
