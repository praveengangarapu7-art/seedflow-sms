export interface FarmerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  region: string;
  location: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFarmerInput {
  name: string;
  phone?: string;
  email: string;
  region: string;
  location?: string;
  organizationId?: string;
}

export interface UpdateFarmerInput {
  name?: string;
  phone?: string;
  email?: string;
  region?: string;
  location?: string;
  organizationId?: string | null;
}
