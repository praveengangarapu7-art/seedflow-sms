export type AccessType = 'view' | 'list' | 'export';
export type RetentionAction = 'anonymize' | 'archive';

export interface DataAccessLogInput {
  entityType: string;
  entityId: string;
  accessType: AccessType;
  accessedBy: string;
  accessedByRole: string;
  wasMasked: boolean;
  route?: string;
}

export interface DataAccessLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  access_type: AccessType;
  accessed_by: string;
  accessed_by_role: string;
  was_masked: boolean;
  route: string | null;
  created_at: string;
}

export interface RetentionPolicyRow {
  id: string;
  entity_type: string;
  retention_days: number;
  action: RetentionAction;
  description: string;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateRetentionPolicyInput {
  retentionDays?: number;
  isActive?: boolean;
  description?: string;
}

export interface RetentionCandidate {
  farmerId: string;
  name: string;
  region: string;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;
}

export interface FarmerExport {
  exportedAt: string;
  farmer: Record<string, unknown>;
  farms: Record<string, unknown>[];
  seedRequests: Record<string, unknown>[];
  performanceRatings: Record<string, unknown>[];
  cropPlans: Record<string, unknown>[];
  fieldInspections: Record<string, unknown>[];
}

export interface ComplianceAuditReport {
  totalFarmers: number;
  anonymizedFarmers: number;
  retentionCandidateCount: number;
  dataAccess: {
    windowDays: number;
    totalAccesses: number;
    unmaskedAccesses: number;
    exportCount: number;
    byRole: { role: string; count: number; unmaskedCount: number }[];
  };
  principles: {
    principle: string;
    status: 'met' | 'attention';
    note: string;
  }[];
}
