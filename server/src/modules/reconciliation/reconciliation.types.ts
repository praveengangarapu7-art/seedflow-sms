export type ReconciliationSeverity = 'error' | 'warning';

export interface ReconciliationIssue {
  entityType: 'farmer' | 'organization' | 'crop';
  entityId: string;
  entityName: string;
  rule: string;
  message: string;
  severity: ReconciliationSeverity;
}

export interface ReconciliationReport {
  generatedAt: string;
  totalChecked: number;
  issueCount: number;
  issues: ReconciliationIssue[];
}
