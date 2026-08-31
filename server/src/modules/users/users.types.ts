export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: string;
  organizationId?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}
